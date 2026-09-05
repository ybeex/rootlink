import { getDb, persons, vitalEvents, relationships, mediaAssets, researchHints, editHistory } from '@rootlink/db';
import { eq, and, isNull, ne, or, ilike, between, inArray, sql } from 'drizzle-orm';
import { getDisplayName } from '@rootlink/shared';
import { createAppError } from '../lib/errors.js';
import { cacheDelPattern } from '../lib/redis.js';

// ─── Similarity heuristic ───────────────────────────────────────────────────
//
// Deliberately simple and explainable rather than a black-box similarity
// model — per the continuation plan, this is meant to catch obvious
// GEDCOM-reimport and fat-finger duplicates ("John Smith b.1930, Springfield"
// entered twice), not to be a general-purpose entity-resolution system. A
// false positive here just shows a dismissable suggestion; it never blocks
// or auto-merges anything.

function normalizeName(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Classic edit-distance, used only on already-narrowed candidate pairs. */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const curr = [i];
    for (let j = 1; j <= n; j++) {
      curr[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j - 1], prev[j], curr[j - 1]);
    }
    prev = curr;
  }
  return prev[n];
}

function nameScore(candidateFirst: string, candidateLast: string, otherFirst: string, otherLast: string): number {
  const cf = normalizeName(candidateFirst), cl = normalizeName(candidateLast);
  const of_ = normalizeName(otherFirst), ol = normalizeName(otherLast);
  if (!cl && !ol && !cf && !of_) return 0;

  const lastExact = cl.length > 0 && cl === ol;
  const firstExact = cf.length > 0 && cf === of_;
  // Fuzzy only kicks in on short edit distances relative to name length —
  // avoids "Amy" vs "Amelia" scoring as a near-match just because both are
  // short-ish strings.
  const firstFuzzy = !firstExact && cf.length >= 3 && of_.length >= 3
    && levenshtein(cf, of_) <= 2;
  const lastFuzzy = !lastExact && cl.length >= 3 && ol.length >= 3
    && levenshtein(cl, ol) <= 2;

  if (lastExact && firstExact) return 0.55;
  if (lastExact && firstFuzzy) return 0.4;
  if (lastFuzzy && firstExact) return 0.35;
  if (lastExact) return 0.25; // last name matches, first name unrelated — weak on its own
  if (lastFuzzy && firstFuzzy) return 0.2;
  return 0;
}

export interface DuplicateCandidateInput {
  firstName?: string | null;
  lastName?: string | null;
  birthYear?: number | null;
  birthPlace?: string | null;
}

export interface DuplicateMatch {
  personId: string;
  displayName: string;
  birthYear: number | null;
  score: number;
  reasons: string[];
}

const SURFACE_THRESHOLD = 0.55;

export async function findPotentialDuplicates(
  treeId: string,
  candidate: DuplicateCandidateInput,
  excludePersonId?: string,
): Promise<DuplicateMatch[]> {
  const hasLastName = !!candidate.lastName?.trim();
  const hasFirstName = !!candidate.firstName?.trim();
  const hasBirthYear = typeof candidate.birthYear === 'number';

  // No signal to narrow on at all — deliberately bail rather than scan
  // every person in a tree that can hold up to 100,000 (Pro tier).
  if (!hasLastName && !hasFirstName && !hasBirthYear) return [];

  const { db } = getDb();

  const narrowingConditions = [];
  if (hasLastName) narrowingConditions.push(ilike(persons.lastName, candidate.lastName!.trim()));
  if (hasFirstName) narrowingConditions.push(ilike(persons.firstName, candidate.firstName!.trim()));
  if (hasBirthYear) {
    narrowingConditions.push(between(persons.birthYear, candidate.birthYear! - 1, candidate.birthYear! + 1));
  }

  const whereClauses = [
    eq(persons.treeId, treeId),
    isNull(persons.deletedAt),
    or(...narrowingConditions),
  ];
  if (excludePersonId) whereClauses.push(ne(persons.id, excludePersonId));

  const rows = await db
    .select({
      id: persons.id,
      firstName: persons.firstName,
      lastName: persons.lastName,
      birthYear: persons.birthYear,
    })
    .from(persons)
    .where(and(...whereClauses))
    .limit(200); // a narrowed candidate set should never realistically exceed this

  if (rows.length === 0) return [];

  // Birthplace comparison needs each candidate's birth event, fetched only
  // for the already-narrowed set (never for the whole tree).
  const birthPlacesByPerson = new Map<string, string | null>();
  if (candidate.birthPlace?.trim()) {
    const events = await db
      .select({ personId: vitalEvents.personId, place: vitalEvents.placeDisplayName })
      .from(vitalEvents)
      .where(and(eq(vitalEvents.type, 'birth'), inArray(vitalEvents.personId, rows.map((r) => r.id))));
    for (const e of events) birthPlacesByPerson.set(e.personId, e.place);
  }

  const candidatePlace = normalizeName(candidate.birthPlace);
  const matches: DuplicateMatch[] = [];

  for (const row of rows) {
    const reasons: string[] = [];
    let score = nameScore(candidate.firstName ?? '', candidate.lastName ?? '', row.firstName ?? '', row.lastName ?? '');
    if (score > 0) reasons.push('similar name');

    if (hasBirthYear && row.birthYear != null) {
      if (row.birthYear === candidate.birthYear) {
        score += 0.3;
        reasons.push('same birth year');
      } else if (Math.abs(row.birthYear - candidate.birthYear!) === 1) {
        score += 0.15;
        reasons.push('birth year within a year');
      }
    }

    if (candidatePlace) {
      const otherPlace = normalizeName(birthPlacesByPerson.get(row.id));
      if (otherPlace && (otherPlace === candidatePlace || otherPlace.includes(candidatePlace) || candidatePlace.includes(otherPlace))) {
        score += 0.2;
        reasons.push('same birthplace');
      }
    }

    score = Math.min(1, score);
    if (score >= SURFACE_THRESHOLD) {
      matches.push({
        personId: row.id,
        displayName: getDisplayName({ firstName: row.firstName, middleName: null, lastName: row.lastName, preferredName: null }),
        birthYear: row.birthYear,
        score,
        reasons,
      });
    }
  }

  return matches.sort((a, b) => b.score - a.score).slice(0, 5);
}

/**
 * Bulk variant for GEDCOM import: scans every newly-imported person against
 * the rest of the tree (including against each other) and writes a
 * researchHints row per match found, so results surface in the existing
 * Research Hints panel for the user to review after the (asynchronous,
 * unattended) import finishes — there's no user present mid-import to show
 * a synchronous confirmation to.
 */
export async function scanTreeForDuplicatesAfterImport(
  treeId: string,
  newlyImportedPersonIds: string[],
): Promise<number> {
  if (newlyImportedPersonIds.length === 0) return 0;
  const { db } = getDb();

  const imported = await db
    .select({
      id: persons.id,
      firstName: persons.firstName,
      lastName: persons.lastName,
      birthYear: persons.birthYear,
    })
    .from(persons)
    .where(and(eq(persons.treeId, treeId), inArray(persons.id, newlyImportedPersonIds), isNull(persons.deletedAt)));

  const birthEvents = await db
    .select({ personId: vitalEvents.personId, place: vitalEvents.placeDisplayName })
    .from(vitalEvents)
    .where(and(eq(vitalEvents.type, 'birth'), inArray(vitalEvents.personId, newlyImportedPersonIds)));
  const placeByPersonId = new Map(birthEvents.map((e) => [e.personId, e.place]));

  let hintsCreated = 0;
  const seenPairs = new Set<string>(); // avoid writing both (A,B) and (B,A) as separate hints

  for (const person of imported) {
    const matches = await findPotentialDuplicates(
      treeId,
      {
        firstName: person.firstName,
        lastName: person.lastName,
        birthYear: person.birthYear,
        birthPlace: placeByPersonId.get(person.id) ?? null,
      },
      person.id,
    );

    for (const match of matches) {
      const pairKey = [person.id, match.personId].sort().join(':');
      if (seenPairs.has(pairKey)) continue;
      seenPairs.add(pairKey);

      try {
        await db.insert(researchHints).values({
          personId: person.id,
          treeId,
          provider: 'duplicate_detection',
          externalRecordId: match.personId,
          title: `Possible duplicate: ${match.displayName}`,
          description: `This imported person looks similar to an existing person in this tree (${match.reasons.join(', ')}). Review before treating them as separate people.`,
          confidence: match.score,
          status: 'pending',
        });
        hintsCreated++;
      } catch {
        // Unique index on (personId, provider, externalRecordId) — a hint
        // for this exact pair already exists from a prior scan. Not an
        // error worth surfacing, just skip it.
      }
    }
  }

  return hintsCreated;
}

// ─── Merge ──────────────────────────────────────────────────────────────────
//
// v1 semantics, chosen to be a well-defined, explainable operation rather
// than a granular per-field editor: the user picks which record to KEEP.
// Everything the OTHER record points to (relationships, vital events, media
// tags, hints) is re-pointed onto the kept record; any of the kept record's
// own blank fields are filled in from the removed record's values; the
// removed record is then soft-deleted, same as any other person deletion.
// No data is hard-deleted — the merged-away person's row still exists with
// deletedAt set, same recoverability guarantee as a normal delete.

export interface MergePreview {
  keep: { id: string; displayName: string };
  remove: { id: string; displayName: string };
  fieldsFilledFromRemoved: string[];
  relationshipsToMove: number;
  eventsToMove: number;
  mediaTagsToMove: number;
}

const MERGEABLE_TEXT_FIELDS = [
  'middleName', 'maidenName', 'suffix', 'preferredName', 'biography', 'notes',
] as const;

export async function getMergePreview(treeId: string, keepId: string, removeId: string): Promise<MergePreview> {
  const { db } = getDb();
  const [keep, remove] = await Promise.all([
    db.select().from(persons).where(and(eq(persons.id, keepId), eq(persons.treeId, treeId), isNull(persons.deletedAt))).limit(1),
    db.select().from(persons).where(and(eq(persons.id, removeId), eq(persons.treeId, treeId), isNull(persons.deletedAt))).limit(1),
  ]);
  if (!keep[0] || !remove[0]) throw createAppError('PERSON_NOT_FOUND', 'Person not found', 404);
  if (keepId === removeId) throw createAppError('VALIDATION_ERROR', 'Cannot merge a person with themselves', 400);

  const fieldsFilledFromRemoved = MERGEABLE_TEXT_FIELDS.filter(
    (f) => !keep[0][f] && remove[0][f],
  );

  const [relCount] = await db
    .select({ n: count() })
    .from(relationships)
    .where(and(eq(relationships.treeId, treeId), or(eq(relationships.fromPersonId, removeId), eq(relationships.toPersonId, removeId))));
  const [eventCount] = await db
    .select({ n: count() })
    .from(vitalEvents)
    .where(eq(vitalEvents.personId, removeId));
  const [mediaCount] = await db
    .select({ n: count() })
    .from(mediaAssets)
    .where(sql`${mediaAssets.taggedPersonIds} @> ${JSON.stringify([removeId])}::jsonb`);

  return {
    keep: { id: keep[0].id, displayName: getDisplayName(keep[0]) },
    remove: { id: remove[0].id, displayName: getDisplayName(remove[0]) },
    fieldsFilledFromRemoved,
    relationshipsToMove: Number(relCount?.n ?? 0),
    eventsToMove: Number(eventCount?.n ?? 0),
    mediaTagsToMove: Number(mediaCount?.n ?? 0),
  };
}

export async function mergePersons(
  treeId: string,
  userId: string,
  keepId: string,
  removeId: string,
): Promise<{ keepId: string }> {
  const preview = await getMergePreview(treeId, keepId, removeId); // also validates both exist

  const { db } = getDb();

  // Fill blank fields on the kept record from the removed one.
  if (preview.fieldsFilledFromRemoved.length > 0) {
    const [removedPerson] = await db.select().from(persons).where(eq(persons.id, removeId)).limit(1);
    const patch: Record<string, unknown> = {};
    for (const field of preview.fieldsFilledFromRemoved) patch[field] = removedPerson![field];
    await db.update(persons).set({ ...patch, lastEditedBy: userId, updatedAt: new Date() }).where(eq(persons.id, keepId));
  }

  // Re-point vital events.
  await db.update(vitalEvents).set({ personId: keepId }).where(eq(vitalEvents.personId, removeId));

  // Re-point relationships, dropping any that would become self-relationships
  // (both ends now the same person) or exact duplicates of a relationship
  // the kept person already has.
  const existingRels = await db
    .select({ fromPersonId: relationships.fromPersonId, toPersonId: relationships.toPersonId, type: relationships.type })
    .from(relationships)
    .where(and(eq(relationships.treeId, treeId), or(eq(relationships.fromPersonId, keepId), eq(relationships.toPersonId, keepId))));
  const existingKey = (f: string, t: string, ty: string) => `${f}:${t}:${ty}`;
  const existingSet = new Set(existingRels.map((r) => existingKey(r.fromPersonId, r.toPersonId, r.type)));

  const relsToRepoint = await db
    .select()
    .from(relationships)
    .where(and(eq(relationships.treeId, treeId), or(eq(relationships.fromPersonId, removeId), eq(relationships.toPersonId, removeId))));

  for (const rel of relsToRepoint) {
    const newFrom = rel.fromPersonId === removeId ? keepId : rel.fromPersonId;
    const newTo = rel.toPersonId === removeId ? keepId : rel.toPersonId;

    if (newFrom === newTo || existingSet.has(existingKey(newFrom, newTo, rel.type))) {
      await db.delete(relationships).where(eq(relationships.id, rel.id));
      continue;
    }
    existingSet.add(existingKey(newFrom, newTo, rel.type));
    await db.update(relationships).set({ fromPersonId: newFrom, toPersonId: newTo }).where(eq(relationships.id, rel.id));
  }

  // Re-tag media: replace removeId with keepId in taggedPersonIds, deduping.
  const taggedMedia = await db
    .select({ id: mediaAssets.id, taggedPersonIds: mediaAssets.taggedPersonIds })
    .from(mediaAssets)
    .where(sql`${mediaAssets.taggedPersonIds} @> ${JSON.stringify([removeId])}::jsonb`);
  for (const media of taggedMedia) {
    const ids = (media.taggedPersonIds as string[]).map((id) => (id === removeId ? keepId : id));
    await db.update(mediaAssets).set({ taggedPersonIds: Array.from(new Set(ids)) }).where(eq(mediaAssets.id, media.id));
  }

  // Re-point any research/duplicate hints pointing at the removed record
  // (either as the subject, or as the "possible duplicate of" target) so
  // they don't silently orphan.
  await db.update(researchHints).set({ personId: keepId }).where(eq(researchHints.personId, removeId));
  await db.update(researchHints).set({ externalRecordId: keepId })
    .where(and(eq(researchHints.provider, 'duplicate_detection'), eq(researchHints.externalRecordId, removeId)));

  // Soft-delete the removed record — same recoverability as a normal delete.
  await db.update(persons).set({ deletedAt: new Date(), lastEditedBy: userId }).where(eq(persons.id, removeId));

  await db.insert(editHistory).values({
    treeId,
    entityType: 'person',
    entityId: keepId,
    action: 'merge',
    changedFields: { _merge: { before: { removedPersonId: removeId }, after: { keptPersonId: keepId } } },
    performedBy: userId,
  });

  await cacheDelPattern(`persons:${treeId}:*`);
  await cacheDelPattern(`person:${treeId}:*`);

  return { keepId };
}
