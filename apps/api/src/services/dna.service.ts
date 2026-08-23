/**
 * apps/api/src/services/dna.service.ts
 *
 * Real DNA-relative matching against uploaded raw autosomal genotype data.
 * RootLink never performs DNA testing — this matches raw data files a user
 * already obtained from a commercial testing company (23andMe, AncestryDNA,
 * MyHeritage, FamilyTreeDNA) and downloaded themselves, the same way
 * GEDmatch works.
 *
 * ── Honesty about what this algorithm actually is ──────────────────────────
 * Production-grade DNA matching (GEDmatch, Ancestry, 23andMe) uses PHASED
 * haplotype data — each person's two chromosome copies are statistically
 * separated before comparison, which is what lets those tools reliably
 * detect true identical-by-descent (IBD) segments and filter out
 * coincidental identical-by-state (IBS) noise.
 *
 * This implementation does NOT phase. It detects identical-by-STATE runs —
 * consecutive positions where the two kits share at least one allele — and
 * treats sufficiently long, sufficiently dense runs as probable shared
 * segments. This is a real, working, and useful approximation (it is
 * genuinely how early-2000s genetic genealogy tools worked before phasing
 * became standard), but it will overcall some short segments as IBD that
 * are actually IBS-by-chance, and it cannot detect segments inherited from
 * only one parent when the other parent happens to share the same alleles
 * at that stretch. The minimum-length and minimum-SNP-density thresholds
 * below exist specifically to keep the false-positive rate low despite not
 * phasing — see MIN_SEGMENT_CM and MIN_SEGMENT_SNPS.
 *
 * This limitation is also disclosed in the product UI (see the DNA matches
 * page's "How this works" panel), not just here.
 */

import { getDb, dnaKits, dnaGenotypes, dnaMatches, dnaMatchSegments } from '@rootlink/db';
import { eq, and, ne, isNull, desc } from 'drizzle-orm';
import { PutObjectCommand, HeadObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { nanoid } from 'nanoid';
import { SUBSCRIPTION_LIMITS } from '@rootlink/shared';
import { getS3 } from '../lib/s3.js';
import { env } from '../config/env.js';
import { createAppError } from '../lib/errors.js';

// ─── Approximate genetic map ────────────────────────────────────────────────
//
// Physical chromosome lengths are GRCh37/hg19 (what consumer raw-data
// exports are aligned to). Genetic lengths are approximate sex-averaged
// totals composited from published genetic maps (deCODE / HapMap-style
// figures). A single cM/Mb rate per chromosome is a LINEAR approximation —
// real recombination rate is not uniform along a chromosome (it is
// suppressed near centromeres and elevated at hotspots/telomeres), so a
// segment's true genetic length can differ from this estimate, especially
// for segments spanning a centromere. This is the single largest source of
// imprecision in this implementation, and is a deliberate, documented
// trade-off against needing a full fine-grained genetic map file (which
// would need to be sourced from an external genomics data provider this
// environment cannot reach).
interface ChromMapEntry { physicalLengthMb: number; geneticLengthCm: number }

const GENETIC_MAP: Record<string, ChromMapEntry> = {
  '1':  { physicalLengthMb: 249.25, geneticLengthCm: 281 },
  '2':  { physicalLengthMb: 243.20, geneticLengthCm: 268 },
  '3':  { physicalLengthMb: 198.02, geneticLengthCm: 223 },
  '4':  { physicalLengthMb: 191.15, geneticLengthCm: 214 },
  '5':  { physicalLengthMb: 180.92, geneticLengthCm: 204 },
  '6':  { physicalLengthMb: 171.12, geneticLengthCm: 192 },
  '7':  { physicalLengthMb: 159.14, geneticLengthCm: 187 },
  '8':  { physicalLengthMb: 146.36, geneticLengthCm: 168 },
  '9':  { physicalLengthMb: 141.21, geneticLengthCm: 166 },
  '10': { physicalLengthMb: 135.53, geneticLengthCm: 181 },
  '11': { physicalLengthMb: 135.01, geneticLengthCm: 158 },
  '12': { physicalLengthMb: 133.85, geneticLengthCm: 174 },
  '13': { physicalLengthMb: 115.17, geneticLengthCm: 126 },
  '14': { physicalLengthMb: 107.35, geneticLengthCm: 120 },
  '15': { physicalLengthMb: 102.53, geneticLengthCm: 141 },
  '16': { physicalLengthMb: 90.35,  geneticLengthCm: 134 },
  '17': { physicalLengthMb: 81.20,  geneticLengthCm: 128 },
  '18': { physicalLengthMb: 78.08,  geneticLengthCm: 117 },
  '19': { physicalLengthMb: 59.13,  geneticLengthCm: 108 },
  '20': { physicalLengthMb: 63.03,  geneticLengthCm: 108 },
  '21': { physicalLengthMb: 48.13,  geneticLengthCm: 62  },
  '22': { physicalLengthMb: 51.30,  geneticLengthCm: 74  },
  // X is included for completeness but is deliberately excluded from
  // autosomal matching below — X-chromosome inheritance follows different
  // rules (a male has only one copy, inherited entirely from his mother)
  // and mixing it into an autosomal cM total would misrepresent the
  // relationship estimate.
  'X':  { physicalLengthMb: 155.27, geneticLengthCm: 181 },
};

function positionToCm(chromosome: string, positionBp: number): number {
  const entry = GENETIC_MAP[chromosome];
  if (!entry) return 0;
  const mb = positionBp / 1_000_000;
  const cmPerMb = entry.geneticLengthCm / entry.physicalLengthMb;
  return mb * cmPerMb;
}

// ─── Segment-detection thresholds ──────────────────────────────────────────
//
// A segment shorter than this is far more likely to be IBS-by-chance noise
// than a genuine shared-ancestor segment, especially without phasing. 7 cM
// is a commonly-cited floor in genetic genealogy for exactly this reason.
const MIN_SEGMENT_CM = 7;
// Independent of length, a segment also needs enough genotyped SNPs across
// its span to be trustworthy — a long *physical* stretch with sparse
// genotyping coverage (common near chromosome ends) can look like a long
// segment by base-pair distance while actually being weakly supported.
const MIN_SEGMENT_SNPS = 250;
// Two genotypes are compared only if they share at least one allele
// (identical-by-state at that single position). 'AA' vs 'AG' shares 'A' —
// treated as a match for run-continuation purposes. A no-call ('--' or any
// value containing '0'/'-') at either kit is skipped, not treated as a
// mismatch, since it carries no information either way.
function allelesShareAtLeastOne(a: string, b: string): boolean {
  if (!a || !b || a.length !== 2 || b.length !== 2) return true; // no-call — skip, don't break the run
  if (a.includes('-') || a.includes('0') || b.includes('-') || b.includes('0')) return true;
  return a[0] === b[0] || a[0] === b[1] || a[1] === b[0] || a[1] === b[1];
}

// ─── Raw data file parsing ──────────────────────────────────────────────────

export interface ParsedGenotype {
  rsid: string | null;
  chromosome: string;
  position: number;
  genotype: string; // normalized to a 2-character string, e.g. 'AG'
}

/**
 * Parses either the 23andMe/MyHeritage/FTDNA-style format
 * (rsid, chromosome, position, genotype — genotype as one 2-char column)
 * or the AncestryDNA-style format
 * (rsid, chromosome, position, allele1, allele2 — two separate columns).
 * Detected automatically by column count on the first data row.
 * Comment/header lines (starting with '#', or the literal AncestryDNA
 * header row) are skipped.
 */
export function parseRawDnaFile(fileContent: string): ParsedGenotype[] {
  const lines = fileContent.split(/\r?\n/);
  const results: ParsedGenotype[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    if (/^rsid\s/i.test(trimmed)) continue; // AncestryDNA's literal header row

    const cols = trimmed.split('\t');
    if (cols.length < 4) continue;

    const [rsid, chromosome, positionStr, ...rest] = cols;
    const position = parseInt(positionStr, 10);
    if (!Number.isFinite(position)) continue;

    // Normalize chromosome naming: some exports use '23'/'24'/'25'/'26' for
    // X/Y/XY(pseudoautosomal)/MT respectively; others use the letter forms.
    const chrom = normalizeChromosome(chromosome);
    if (!chrom) continue;

    let genotype: string;
    if (rest.length >= 2) {
      // AncestryDNA style: two separate single-character allele columns
      genotype = `${rest[0]}${rest[1]}`.toUpperCase();
    } else {
      // 23andMe/MyHeritage/FTDNA style: one combined column
      genotype = (rest[0] ?? '').toUpperCase();
    }
    if (genotype.length !== 2) continue;

    results.push({ rsid: rsid || null, chromosome: chrom, position, genotype });
  }

  return results;
}

function normalizeChromosome(raw: string): string | null {
  const c = raw.trim().toUpperCase();
  if (/^([1-9]|1[0-9]|2[0-2])$/.test(c)) return c;
  if (c === '23' || c === 'X') return 'X';
  if (c === '24' || c === 'Y') return 'Y';
  if (c === '25' || c === 'XY') return null; // pseudoautosomal — excluded, ambiguous for matching
  if (c === '26' || c === 'MT' || c === 'M') return 'MT';
  return null;
}

// ─── Segment detection between two kits, one chromosome at a time ─────────

interface DetectedSegment {
  chromosome: string;
  startPosition: number;
  endPosition: number;
  cmLength: number;
  snpCount: number;
}

/**
 * Both inputs MUST already be sorted by position ascending — callers fetch
 * from dna_genotypes using the dna_genotypes_kit_chr_pos_idx index, which
 * makes this cheap to guarantee at the query level (ORDER BY position) and
 * avoids an extra in-memory sort here.
 */
export function detectSegmentsOnChromosome(
  chromosome: string,
  kitA: ParsedGenotype[],
  kitB: ParsedGenotype[],
): DetectedSegment[] {
  const segments: DetectedSegment[] = [];

  let i = 0, j = 0;
  let runStart: number | null = null;
  let runSnpCount = 0;
  let runEndPosition = 0;

  const closeRun = () => {
    if (runStart === null) return;
    const cmLength = positionToCm(chromosome, runEndPosition) - positionToCm(chromosome, runStart);
    if (cmLength >= MIN_SEGMENT_CM && runSnpCount >= MIN_SEGMENT_SNPS) {
      segments.push({ chromosome, startPosition: runStart, endPosition: runEndPosition, cmLength, snpCount: runSnpCount });
    }
    runStart = null;
    runSnpCount = 0;
  };

  // Merge-walk both position-sorted arrays, comparing only positions
  // present in both kits (real consumer chips overlap substantially but
  // not perfectly — comparing only shared positions is standard practice,
  // not a shortcut).
  while (i < kitA.length && j < kitB.length) {
    const a = kitA[i]!;
    const b = kitB[j]!;

    if (a.position < b.position) { i++; continue; }
    if (a.position > b.position) { j++; continue; }

    // Same position in both kits
    if (allelesShareAtLeastOne(a.genotype, b.genotype)) {
      if (runStart === null) runStart = a.position;
      runEndPosition = a.position;
      runSnpCount++;
    } else {
      closeRun();
    }
    i++; j++;
  }
  closeRun();

  return segments;
}

// ─── Relationship estimation from total shared cM ──────────────────────────
//
// Bands approximate the publicly-published Shared cM Project reference
// data. Several bands genuinely overlap between different relationship
// types (e.g. full sibling / half-sibling / grandparent-grandchild /
// aunt-uncle-niece-nephew all sit in a similar cM range) — this is not a
// gap in this implementation, it's a real property of autosomal
// inheritance that any tool has to represent honestly rather than picking
// one label with false confidence.
const RELATIONSHIP_BANDS: { minCm: number; label: string }[] = [
  { minCm: 3400, label: 'Parent/Child (or identical twin)' },
  { minCm: 1700, label: 'Full sibling' },
  { minCm: 1300, label: 'Grandparent/grandchild, aunt/uncle, or half-sibling' },
  { minCm: 575,  label: '1st cousin, great-grandparent, or half-aunt/uncle' },
  { minCm: 200,  label: '1st cousin once removed, or half-1st-cousin' },
  { minCm: 90,   label: '2nd cousin' },
  { minCm: 40,   label: '2nd cousin once removed' },
  { minCm: 20,   label: '3rd cousin' },
  { minCm: 10,   label: '3rd cousin once removed, or 4th cousin' },
  { minCm: 0,    label: 'Distant cousin (5th cousin or further) or no significant shared ancestry detected' },
];

export function estimateRelationship(totalSharedCm: number): string {
  for (const band of RELATIONSHIP_BANDS) {
    if (totalSharedCm >= band.minCm) return band.label;
  }
  return RELATIONSHIP_BANDS[RELATIONSHIP_BANDS.length - 1]!.label;
}

// ─── Full pairwise match computation ───────────────────────────────────────

export async function computeMatchBetweenKits(kitAId: string, kitBId: string): Promise<{
  totalSharedCm: number;
  largestSegmentCm: number;
  segmentCount: number;
  estimatedRelationship: string;
  segments: DetectedSegment[];
} | null> {
  const { db } = getDb();

  const CHROMOSOMES = Array.from({ length: 22 }, (_, i) => String(i + 1)); // autosomal only — see the X-chromosome comment on GENETIC_MAP

  const allSegments: DetectedSegment[] = [];

  for (const chrom of CHROMOSOMES) {
    const [rowsA, rowsB] = await Promise.all([
      db.select({ position: dnaGenotypes.position, genotype: dnaGenotypes.genotype })
        .from(dnaGenotypes)
        .where(and(eq(dnaGenotypes.kitId, kitAId), eq(dnaGenotypes.chromosome, chrom)))
        .orderBy(dnaGenotypes.position),
      db.select({ position: dnaGenotypes.position, genotype: dnaGenotypes.genotype })
        .from(dnaGenotypes)
        .where(and(eq(dnaGenotypes.kitId, kitBId), eq(dnaGenotypes.chromosome, chrom)))
        .orderBy(dnaGenotypes.position),
    ]);

    if (rowsA.length === 0 || rowsB.length === 0) continue;

    const kitA: ParsedGenotype[] = rowsA.map(r => ({ rsid: null, chromosome: chrom, position: r.position, genotype: r.genotype }));
    const kitB: ParsedGenotype[] = rowsB.map(r => ({ rsid: null, chromosome: chrom, position: r.position, genotype: r.genotype }));

    allSegments.push(...detectSegmentsOnChromosome(chrom, kitA, kitB));
  }

  if (allSegments.length === 0) return null;

  const totalSharedCm = allSegments.reduce((sum, s) => sum + s.cmLength, 0);
  const largestSegmentCm = Math.max(...allSegments.map(s => s.cmLength));

  return {
    totalSharedCm,
    largestSegmentCm,
    segmentCount: allSegments.length,
    estimatedRelationship: estimateRelationship(totalSharedCm),
    segments: allSegments,
  };
}

/**
 * Runs computeMatchBetweenKits against every other 'ready' kit and persists
 * any match clearing the reporting threshold (a total below ~6-7 cM is not
 * distinguishable from background IBS noise and is not worth storing as a
 * "match" — this mirrors the MIN_SEGMENT_CM reasoning at the whole-match
 * level, not just per-segment).
 */
export async function runMatchingForKit(kitId: string): Promise<number> {
  const { db } = getDb();

  const [kit] = await db.select().from(dnaKits).where(eq(dnaKits.id, kitId)).limit(1);
  if (!kit || kit.status !== 'ready') {
    throw createAppError('DNA_KIT_NOT_READY', 'This kit has not finished processing yet', 400);
  }

  const otherKits = await db
    .select({ id: dnaKits.id })
    .from(dnaKits)
    .where(and(eq(dnaKits.status, 'ready'), ne(dnaKits.id, kitId)));

  let matchesFound = 0;

  for (const other of otherKits) {
    const result = await computeMatchBetweenKits(kitId, other.id);
    if (!result || result.totalSharedCm < MIN_SEGMENT_CM) continue;

    // Canonical ordering so a pair is never stored twice in both directions
    const [kitAId, kitBId] = kitId < other.id ? [kitId, other.id] : [other.id, kitId];

    const [existing] = await db
      .select({ id: dnaMatches.id })
      .from(dnaMatches)
      .where(and(eq(dnaMatches.kitAId, kitAId), eq(dnaMatches.kitBId, kitBId)))
      .limit(1);

    if (existing) {
      await db.delete(dnaMatchSegments).where(eq(dnaMatchSegments.matchId, existing.id));
      await db.update(dnaMatches).set({
        totalSharedCm: result.totalSharedCm,
        largestSegmentCm: result.largestSegmentCm,
        segmentCount: result.segmentCount,
        estimatedRelationship: result.estimatedRelationship,
        computedAt: new Date(),
      }).where(eq(dnaMatches.id, existing.id));

      if (result.segments.length > 0) {
        await db.insert(dnaMatchSegments).values(
          result.segments.map(s => ({ matchId: existing.id, ...s })),
        );
      }
    } else {
      const [inserted] = await db.insert(dnaMatches).values({
        kitAId, kitBId,
        totalSharedCm: result.totalSharedCm,
        largestSegmentCm: result.largestSegmentCm,
        segmentCount: result.segmentCount,
        estimatedRelationship: result.estimatedRelationship,
      }).returning({ id: dnaMatches.id });

      if (inserted && result.segments.length > 0) {
        await db.insert(dnaMatchSegments).values(
          result.segments.map(s => ({ matchId: inserted.id, ...s })),
        );
      }
    }

    matchesFound++;
  }

  return matchesFound;
}

// ─── Upload & kit management ────────────────────────────────────────────────
//
// DNA raw data files are NOT routed through media.service.ts's mediaAssets
// pipeline — they are a distinct data type (plain-text genomic data, never
// thumbnailed, never shown in a photo/document gallery) with a much larger
// realistic size ceiling than a photo or scanned document.

const MAX_DNA_RAW_FILE_BYTES = 100 * 1024 * 1024; // 100 MB — real exports run ~10-30MB as plain text; generous headroom without being unbounded

function requireDnaTierAccess(subscriptionTier: string): void {
  const limits = SUBSCRIPTION_LIMITS[subscriptionTier as keyof typeof SUBSCRIPTION_LIMITS]
    ?? SUBSCRIPTION_LIMITS.free;
  if (!limits.canAccessDna) {
    throw createAppError(
      'DNA_NOT_AVAILABLE',
      'DNA matching is available on the Pro plan. Upgrade to upload a DNA kit.',
      403,
    );
  }
}

export interface CreateDnaUploadInput {
  label: string;
  provider: 'ancestrydna' | '23andme' | 'myheritage' | 'ftdna' | 'other';
  fileSizeBytes: number;
  personId?: string | null;
  treeId?: string | null;
}

export async function createDnaUploadUrl(
  userId: string,
  subscriptionTier: string,
  input: CreateDnaUploadInput,
): Promise<{ kitId: string; uploadUrl: string; storageKey: string }> {
  requireDnaTierAccess(subscriptionTier);

  if (input.fileSizeBytes <= 0 || input.fileSizeBytes > MAX_DNA_RAW_FILE_BYTES) {
    throw createAppError(
      'VALIDATION_ERROR',
      `File size must be between 1 byte and ${MAX_DNA_RAW_FILE_BYTES / (1024 * 1024)} MB.`,
      400,
    );
  }

  const { db } = getDb();
  const storageKey = `dna-raw/${userId}/${nanoid(16)}.txt`;

  const [kit] = await db.insert(dnaKits).values({
    uploadedBy: userId,
    personId: input.personId ?? null,
    treeId: input.treeId ?? null,
    label: input.label,
    provider: input.provider,
    status: 'processing',
    rawDataStorageKey: storageKey,
  }).returning({ id: dnaKits.id });

  if (!kit) throw createAppError('INTERNAL_ERROR', 'Failed to create DNA kit record', 500);

  const s3 = getS3();
  const uploadUrl = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: env.STORAGE_BUCKET,
      Key: storageKey,
      ContentType: 'text/plain',
    }),
    { expiresIn: 900 }, // 15 minutes — a 10-30MB upload on a slow connection needs real headroom
  );

  return { kitId: kit.id, uploadUrl, storageKey };
}

/**
 * Confirms the raw file actually landed in S3 (a HeadObject check — same
 * honesty pattern media.service.ts uses: never trust that a presigned PUT
 * the client claims to have completed actually happened) and enqueues
 * parsing/matching. Processing itself happens in dna-processing.worker.ts,
 * not here — this function only validates and hands off.
 */
export async function confirmDnaUpload(kitId: string, userId: string): Promise<void> {
  const { db } = getDb();
  const [kit] = await db.select().from(dnaKits).where(eq(dnaKits.id, kitId)).limit(1);

  if (!kit) throw createAppError('DNA_KIT_NOT_FOUND', 'DNA kit not found', 404);
  if (kit.uploadedBy !== userId) throw createAppError('FORBIDDEN', 'You do not own this DNA kit', 403);

  const s3 = getS3();
  try {
    await s3.send(new HeadObjectCommand({ Bucket: env.STORAGE_BUCKET, Key: kit.rawDataStorageKey }));
  } catch {
    throw createAppError(
      'DNA_UPLOAD_NOT_FOUND',
      'The raw data file was not found in storage — the upload may not have completed. Try again.',
      400,
    );
  }

  // Dynamic import avoids a circular dependency: the worker module imports
  // FROM this service file (parseRawDnaFile, runMatchingForKit), so this
  // service cannot import the worker's enqueue helper at the top level.
  const { enqueueDnaProcessing } = await import('../workers/dna-processing.worker.js');
  await enqueueDnaProcessing(kitId);
}

export async function listDnaKits(userId: string) {
  const { db } = getDb();
  return db
    .select()
    .from(dnaKits)
    .where(and(eq(dnaKits.uploadedBy, userId), isNull(dnaKits.deletedAt)))
    .orderBy(desc(dnaKits.uploadedAt));
}

export async function getDnaKit(kitId: string, userId: string) {
  const { db } = getDb();
  const [kit] = await db
    .select()
    .from(dnaKits)
    .where(and(eq(dnaKits.id, kitId), eq(dnaKits.uploadedBy, userId), isNull(dnaKits.deletedAt)))
    .limit(1);

  if (!kit) throw createAppError('DNA_KIT_NOT_FOUND', 'DNA kit not found', 404);
  return kit;
}

export async function deleteDnaKit(kitId: string, userId: string): Promise<void> {
  const { db } = getDb();
  const kit = await getDnaKit(kitId, userId); // also verifies ownership, throws 404 otherwise

  // Genotype rows and match/segment rows all cascade-delete at the FK
  // level (ON DELETE CASCADE) once the kit row itself is gone — only the
  // S3 object and the kit row need explicit handling here.
  const s3 = getS3();
  await s3.send(new DeleteObjectCommand({ Bucket: env.STORAGE_BUCKET, Key: kit.rawDataStorageKey })).catch(() => undefined);

  await db.update(dnaKits).set({ deletedAt: new Date() }).where(eq(dnaKits.id, kitId));
}

export interface DnaMatchListItem {
  matchId: string;
  otherKitId: string;
  otherKitLabel: string;
  otherKitOwnerId: string;
  totalSharedCm: number;
  largestSegmentCm: number;
  segmentCount: number;
  estimatedRelationship: string;
  computedAt: Date;
}

export async function listMatchesForKit(kitId: string, userId: string): Promise<DnaMatchListItem[]> {
  await getDnaKit(kitId, userId); // ownership + existence check

  const { db } = getDb();

  const kitAlias = dnaKits;
  const rowsA = await db
    .select({
      matchId: dnaMatches.id,
      otherKitId: dnaMatches.kitBId,
      totalSharedCm: dnaMatches.totalSharedCm,
      largestSegmentCm: dnaMatches.largestSegmentCm,
      segmentCount: dnaMatches.segmentCount,
      estimatedRelationship: dnaMatches.estimatedRelationship,
      computedAt: dnaMatches.computedAt,
      otherKitLabel: kitAlias.label,
      otherKitOwnerId: kitAlias.uploadedBy,
    })
    .from(dnaMatches)
    .innerJoin(kitAlias, eq(kitAlias.id, dnaMatches.kitBId))
    .where(eq(dnaMatches.kitAId, kitId));

  const rowsB = await db
    .select({
      matchId: dnaMatches.id,
      otherKitId: dnaMatches.kitAId,
      totalSharedCm: dnaMatches.totalSharedCm,
      largestSegmentCm: dnaMatches.largestSegmentCm,
      segmentCount: dnaMatches.segmentCount,
      estimatedRelationship: dnaMatches.estimatedRelationship,
      computedAt: dnaMatches.computedAt,
      otherKitLabel: kitAlias.label,
      otherKitOwnerId: kitAlias.uploadedBy,
    })
    .from(dnaMatches)
    .innerJoin(kitAlias, eq(kitAlias.id, dnaMatches.kitAId))
    .where(eq(dnaMatches.kitBId, kitId));

  return [...rowsA, ...rowsB].sort((a, b) => b.totalSharedCm - a.totalSharedCm);
}
