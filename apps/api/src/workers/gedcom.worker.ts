import { Worker } from 'bullmq';
import {
  S3Client, GetObjectCommand, PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getRedis } from '../lib/redis.js';
import { getDb, persons, vitalEvents, relationships, trees, notifications } from '@rootlink/db';
import { eq, and, sql } from 'drizzle-orm';
import { scanTreeForDuplicatesAfterImport } from '../services/duplicate.service.js';
import { QUEUE_NAMES } from '@rootlink/shared';
import { env } from '../config/env.js';
import type { GedcomImportJob, GedcomExportJob } from './queues.js';
import pino from 'pino';

const logger = pino({ name: 'gedcom-worker' });

// ── Minimal GEDCOM 5.5.1 parser ────────────────────────────────────────────

interface GedcomIndividual {
  id: string;
  firstName: string | null;
  lastName: string | null;
  sex: 'male' | 'female' | 'unknown';
  birthYear: number | null;
  birthPlace: string | null;
  deathYear: number | null;
  deathPlace: string | null;
}

interface GedcomFamily {
  id: string;
  husbandId: string | null;
  wifeId: string | null;
  childIds: string[];
  marriageYear: number | null;
}

interface GedcomData {
  individuals: GedcomIndividual[];
  families: GedcomFamily[];
}

function parseGedcom(content: string): GedcomData {
  const lines = content.split(/\r?\n/);
  const individuals: GedcomIndividual[] = [];
  const families: GedcomFamily[] = [];

  let currentIndi: Partial<GedcomIndividual> | null = null;
  let currentFam: Partial<GedcomFamily> | null = null;
  let inBirt = false;
  let inDeat = false;
  let inMarr = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const parts = line.split(/\s+/);
    const level = parseInt(parts[0] ?? '0', 10);
    const tag = parts[1] ?? '';
    const value = parts.slice(2).join(' ');

    if (level === 0) {
      // Save previous records
      if (currentIndi?.id) {
        individuals.push({
          id: currentIndi.id,
          firstName: currentIndi.firstName ?? null,
          lastName: currentIndi.lastName ?? null,
          sex: currentIndi.sex ?? 'unknown',
          birthYear: currentIndi.birthYear ?? null,
          birthPlace: currentIndi.birthPlace ?? null,
          deathYear: currentIndi.deathYear ?? null,
          deathPlace: currentIndi.deathPlace ?? null,
        });
      }
      if (currentFam?.id) {
        families.push({
          id: currentFam.id,
          husbandId: currentFam.husbandId ?? null,
          wifeId: currentFam.wifeId ?? null,
          childIds: currentFam.childIds ?? [],
          marriageYear: currentFam.marriageYear ?? null,
        });
      }

      currentIndi = null;
      currentFam = null;
      inBirt = false;
      inDeat = false;
      inMarr = false;

      const idMatch = tag.match(/^@(.+)@$/);
      if (!idMatch) continue;

      const recordId = idMatch[1] ?? '';
      if (value === 'INDI') {
        currentIndi = { id: `@${recordId}@`, childIds: [] };
      } else if (value === 'FAM') {
        currentFam = { id: `@${recordId}@`, childIds: [] };
      }
      continue;
    }

    // Individual fields
    if (currentIndi) {
      if (level === 1) {
        inBirt = tag === 'BIRT';
        inDeat = tag === 'DEAT';

        if (tag === 'NAME') {
          const nameParts = value.replace(/\//g, '').trim().split(/\s+/);
          const surnameMatch = value.match(/\/(.+?)\//);
          if (surnameMatch) {
            currentIndi.lastName = surnameMatch[1] ?? null;
            currentIndi.firstName = value.split('/')[0]?.trim() ?? null;
          } else {
            currentIndi.firstName = nameParts.slice(0, -1).join(' ') || null;
            currentIndi.lastName = nameParts[nameParts.length - 1] ?? null;
          }
        } else if (tag === 'SEX') {
          currentIndi.sex = value === 'M' ? 'male' : value === 'F' ? 'female' : 'unknown';
        }
      }
      if (level === 2 && inBirt) {
        if (tag === 'DATE') {
          const year = parseInt(value.split(' ').pop() ?? '0', 10);
          if (!isNaN(year) && year > 0) currentIndi.birthYear = year;
        } else if (tag === 'PLAC') {
          currentIndi.birthPlace = value;
        }
      }
      if (level === 2 && inDeat) {
        if (tag === 'DATE') {
          const year = parseInt(value.split(' ').pop() ?? '0', 10);
          if (!isNaN(year) && year > 0) currentIndi.deathYear = year;
        } else if (tag === 'PLAC') {
          currentIndi.deathPlace = value;
        }
      }
    }

    // Family fields
    if (currentFam) {
      if (level === 1) {
        inMarr = tag === 'MARR';
        if (tag === 'HUSB') {
          currentFam.husbandId = value.replace(/^@|@$/g, '') ? value : null;
        } else if (tag === 'WIFE') {
          currentFam.wifeId = value.replace(/^@|@$/g, '') ? value : null;
        } else if (tag === 'CHIL') {
          currentFam.childIds ??= [];
          currentFam.childIds.push(value);
        }
      }
      if (level === 2 && inMarr && tag === 'DATE') {
        const year = parseInt(value.split(' ').pop() ?? '0', 10);
        if (!isNaN(year) && year > 0) currentFam.marriageYear = year;
      }
    }
  }

  // Save final records
  if (currentIndi?.id) {
    individuals.push({
      id: currentIndi.id,
      firstName: currentIndi.firstName ?? null,
      lastName: currentIndi.lastName ?? null,
      sex: currentIndi.sex ?? 'unknown',
      birthYear: currentIndi.birthYear ?? null,
      birthPlace: currentIndi.birthPlace ?? null,
      deathYear: currentIndi.deathYear ?? null,
      deathPlace: currentIndi.deathPlace ?? null,
    });
  }
  if (currentFam?.id) {
    families.push({
      id: currentFam.id,
      husbandId: currentFam.husbandId ?? null,
      wifeId: currentFam.wifeId ?? null,
      childIds: currentFam.childIds ?? [],
      marriageYear: currentFam.marriageYear ?? null,
    });
  }

  return { individuals, families };
}

// ── GEDCOM exporter ────────────────────────────────────────────────────────

async function buildGedcom(treeId: string): Promise<string> {
  const { db } = getDb();
  const lines: string[] = [];

  lines.push('0 HEAD');
  lines.push('1 SOUR RootLink');
  lines.push('2 VERS 1.0');
  lines.push('1 GEDC');
  lines.push('2 VERS 5.5.1');
  lines.push('1 CHAR UTF-8');
  lines.push(`1 DATE ${new Date().toDateString()}`);

  const allPersons = await db
    .select()
    .from(persons)
    .where(and(eq(persons.treeId, treeId)));

  const allEvents = await db
    .select()
    .from(vitalEvents)
    .where(eq(vitalEvents.treeId, treeId));

  const allRelationships = await db
    .select()
    .from(relationships)
    .where(eq(relationships.treeId, treeId));

  const eventsByPerson = new Map<string, typeof allEvents>();
  for (const ev of allEvents) {
    const list = eventsByPerson.get(ev.personId) ?? [];
    list.push(ev);
    eventsByPerson.set(ev.personId, list);
  }

  // Write INDI records
  for (const person of allPersons) {
    lines.push(`0 @I${person.id}@ INDI`);

    const nameParts = [person.firstName, person.lastName ? `/${person.lastName}/` : null]
      .filter(Boolean).join(' ');
    if (nameParts) lines.push(`1 NAME ${nameParts}`);
    if (person.sex === 'male') lines.push('1 SEX M');
    else if (person.sex === 'female') lines.push('1 SEX F');

    const personEvents = eventsByPerson.get(person.id) ?? [];
    for (const ev of personEvents) {
      if (ev.type === 'birth') {
        lines.push('1 BIRT');
        if (ev.dateYear) {
          const date = [ev.dateDay, ev.dateMonth ? new Date(2000, ev.dateMonth - 1).toLocaleString('en', { month: 'short' }).toUpperCase() : null, ev.dateYear].filter(Boolean).join(' ');
          lines.push(`2 DATE ${date}`);
        }
        if (ev.placeDisplayName) lines.push(`2 PLAC ${ev.placeDisplayName}`);
      } else if (ev.type === 'death') {
        lines.push('1 DEAT Y');
        if (ev.dateYear) lines.push(`2 DATE ${ev.dateYear}`);
        if (ev.placeDisplayName) lines.push(`2 PLAC ${ev.placeDisplayName}`);
      }
    }
  }

  // Collect spouse relationships to build FAM records
  const spouseRels = allRelationships.filter((r) =>
    r.type === 'spouse' || r.type === 'partner',
  );
  const parentRels = allRelationships.filter((r) =>
    r.type === 'biological_parent' || r.type === 'adoptive_parent' || r.type === 'step_parent',
  );

  let famIdx = 1;
  for (const spouseRel of spouseRels) {
    const famId = `F${famIdx++}`;
    lines.push(`0 @${famId}@ FAM`);
    lines.push(`1 HUSB @I${spouseRel.fromPersonId}@`);
    lines.push(`1 WIFE @I${spouseRel.toPersonId}@`);
    if (spouseRel.startDateYear) lines.push('1 MARR');

    // Find children of both parents
    const childrenOfFrom = parentRels
      .filter((r) => r.fromPersonId === spouseRel.fromPersonId)
      .map((r) => r.toPersonId);
    const childrenOfTo = parentRels
      .filter((r) => r.fromPersonId === spouseRel.toPersonId)
      .map((r) => r.toPersonId);
    const sharedChildren = childrenOfFrom.filter((id) => childrenOfTo.includes(id));

    for (const childId of sharedChildren) {
      lines.push(`1 CHIL @I${childId}@`);
    }
  }

  lines.push('0 TRLR');
  return lines.join('\n');
}

// ── Workers ────────────────────────────────────────────────────────────────

export function startGedcomWorkers() {
  const s3 = new S3Client({
    region: env.STORAGE_REGION,
    ...(env.STORAGE_ENDPOINT && { endpoint: env.STORAGE_ENDPOINT }),
    credentials: {
      accessKeyId: env.STORAGE_ACCESS_KEY_ID,
      secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY,
    },
    forcePathStyle: !!env.STORAGE_ENDPOINT,
  });

  // ── Import worker ──────────────────────────────────────────────────────
  const importWorker = new Worker<GedcomImportJob>(
    QUEUE_NAMES.gedcomImport,
    async (job) => {
      const { treeId, userId, storageKey } = job.data;
      const { db } = getDb();

      job.log(`Starting GEDCOM import for tree ${treeId}`);

      // Fetch file from S3
      const obj = await s3.send(new GetObjectCommand({
        Bucket: env.STORAGE_BUCKET,
        Key: storageKey,
      }));

      if (!obj.Body) throw new Error('Empty GEDCOM file');

      const chunks: Buffer[] = [];
      for await (const chunk of obj.Body as AsyncIterable<Buffer>) {
        chunks.push(chunk);
      }
      const content = Buffer.concat(chunks).toString('utf-8');

      const { individuals, families } = parseGedcom(content);
      job.log(`Parsed ${individuals.length} individuals, ${families.length} families`);

      // Map GEDCOM IDs to DB IDs
      const gedcomToDbId = new Map<string, string>();

      // Insert persons
      for (const indi of individuals) {
        const [person] = await db.insert(persons).values({
          treeId,
          firstName: indi.firstName,
          lastName: indi.lastName,
          sex: indi.sex,
          isLiving: indi.deathYear === null,
          birthYear: indi.birthYear,
          deathYear: indi.deathYear,
          gedcomId: indi.id,
          privacyLevel: 'family',
          dataQualityScore: 0,
          createdBy: userId,
          lastEditedBy: userId,
        }).returning({ id: persons.id });

        if (!person) continue;
        gedcomToDbId.set(indi.id, person.id);

        // Insert birth event
        if (indi.birthYear) {
          await db.insert(vitalEvents).values({
            personId: person.id,
            treeId,
            type: 'birth',
            dateYear: indi.birthYear,
            placeDisplayName: indi.birthPlace,
            certainty: 'probable',
            sourceIds: [],
            sortOrder: 0,
          });
        }

        // Insert death event
        if (indi.deathYear) {
          await db.insert(vitalEvents).values({
            personId: person.id,
            treeId,
            type: 'death',
            dateYear: indi.deathYear,
            placeDisplayName: indi.deathPlace,
            certainty: 'probable',
            sourceIds: [],
            sortOrder: 1,
          });
        }
      }

      // Insert relationships from FAM records
      for (const fam of families) {
        const husbandDbId = fam.husbandId ? gedcomToDbId.get(fam.husbandId) : null;
        const wifeDbId = fam.wifeId ? gedcomToDbId.get(fam.wifeId) : null;

        if (husbandDbId && wifeDbId) {
          await db.insert(relationships).values({
            treeId,
            fromPersonId: husbandDbId,
            toPersonId: wifeDbId,
            type: 'spouse',
            certainty: 'probable',
            sourceIds: [],
          }).onConflictDoNothing();
        }

        for (const childGedcomId of fam.childIds) {
          const childDbId = gedcomToDbId.get(childGedcomId);
          if (!childDbId) continue;

          if (husbandDbId) {
            await db.insert(relationships).values({
              treeId,
              fromPersonId: husbandDbId,
              toPersonId: childDbId,
              type: 'biological_parent',
              certainty: 'probable',
              sourceIds: [],
            }).onConflictDoNothing();
          }

          if (wifeDbId) {
            await db.insert(relationships).values({
              treeId,
              fromPersonId: wifeDbId,
              toPersonId: childDbId,
              type: 'biological_parent',
              certainty: 'probable',
              sourceIds: [],
            }).onConflictDoNothing();
          }
        }
      }

      // Update tree person count. Increment, not overwrite — a flat
      // `personCount: individuals.length` here would silently wipe out
      // the correct total on any tree that already had persons before
      // this import (e.g. a second GEDCOM import into an existing tree),
      // corrupting the person-limit enforcement in person.service.ts's
      // createPerson, which reads this same column.
      await db.update(trees)
        .set({ personCount: sql`${trees.personCount} + ${individuals.length}`, updatedAt: new Date() })
        .where(eq(trees.id, treeId));

      // Duplicate-detection scan (see §5.1/§5.2 of the continuation plan):
      // GEDCOM re-imports are the single most common source of duplicate
      // person records, and there's no user present mid-import (this runs
      // unattended in a worker) to show a synchronous confirmation to —
      // so results are written as researchHints for review afterward via
      // the existing Research Hints panel, rather than blocking the import.
      try {
        const importedIds = Array.from(gedcomToDbId.values());
        const hintsCreated = await scanTreeForDuplicatesAfterImport(treeId, importedIds);
        if (hintsCreated > 0) job.log(`Found ${hintsCreated} possible duplicate(s) — see Research Hints`);
      } catch (err) {
        // Never fail the import itself over a best-effort detection pass.
        job.log(`Duplicate scan failed (non-fatal): ${err instanceof Error ? err.message : String(err)}`);
      }

      // Notify user
      await db.insert(notifications).values({
        userId,
        type: 'edit_made',
        title: 'GEDCOM import complete',
        body: `Successfully imported ${individuals.length} people and ${families.length} families.`,
        data: { treeId, imported: individuals.length },
      });

      job.log(`Import complete: ${individuals.length} persons, ${families.length} families`);
    },
    { connection: getRedis(), concurrency: 2 },
  );

  // ── Export worker ──────────────────────────────────────────────────────
  const exportWorker = new Worker<GedcomExportJob>(
    QUEUE_NAMES.gedcomExport,
    async (job) => {
      const { treeId, userId, requestId } = job.data;
      const { db } = getDb();

      job.log(`Starting GEDCOM export for tree ${treeId}`);

      const gedcomContent = await buildGedcom(treeId);
      const storageKey = `exports/${treeId}/gedcom_${requestId}.ged`;

      await s3.send(new PutObjectCommand({
        Bucket: env.STORAGE_BUCKET,
        Key: storageKey,
        Body: gedcomContent,
        ContentType: 'text/plain; charset=utf-8',
        ContentDisposition: `attachment; filename="rootlink-export-${treeId}.ged"`,
      }));

      // Update tree's last export time
      await db.update(trees)
        .set({ gedcomExportedAt: new Date() })
        .where(eq(trees.id, treeId));

      // Notify user with download key
      await db.insert(notifications).values({
        userId,
        type: 'edit_made',
        title: 'GEDCOM export ready',
        body: 'Your GEDCOM file is ready for download.',
        data: { treeId, storageKey, requestId },
      });

      job.log(`Export complete: ${storageKey}`);
    },
    { connection: getRedis(), concurrency: 2 },
  );

  importWorker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'GEDCOM import job failed');
  });

  exportWorker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'GEDCOM export job failed');
  });

  return { importWorker, exportWorker };
}
