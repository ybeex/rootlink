import { Worker } from 'bullmq';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getRedis } from '../lib/redis.js';
import { getS3 } from '../lib/s3.js';
import { getDb, dnaKits, dnaGenotypes } from '@rootlink/db';
import { eq } from 'drizzle-orm';
import { QUEUE_NAMES } from '@rootlink/shared';
import { env } from '../config/env.js';
import { parseRawDnaFile, runMatchingForKit } from '../services/dna.service.js';
import { dnaProcessingQueue } from './queues.js';
import type { DnaProcessingJob } from './queues.js';
import pino from 'pino';

const logger = pino({ name: 'dna-processing-worker' });

// Batched to stay well under Postgres's ~65,535-parameter-per-query limit
// (5 columns per row => 5000 rows/batch = 25,000 params, comfortable
// headroom) and to avoid holding an entire 600K-950K-row insert in memory
// as one query.
const INSERT_BATCH_SIZE = 5000;

// A sanity floor: a real raw-data export has hundreds of thousands of rows.
// If parsing produces far fewer, the file is probably not what it claims
// to be (wrong file, corrupted download, or a provider format this parser
// doesn't recognize) — better to fail clearly than silently store a
// near-empty, useless kit.
const MIN_VALID_ROWS_TO_PROCEED = 1000;

async function streamToString(stream: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    stream.on('error', reject);
  });
}

export function startDnaProcessingWorker() {
  return new Worker<DnaProcessingJob>(
    QUEUE_NAMES.dnaProcessing,
    async (job) => {
      const { kitId } = job.data;
      const { db } = getDb();
      const s3 = getS3();

      const [kit] = await db.select().from(dnaKits).where(eq(dnaKits.id, kitId)).limit(1);
      if (!kit) {
        logger.warn({ kitId }, 'DNA kit not found — job dropped');
        return;
      }

      try {
        job.log(`Fetching raw data file for kit ${kitId}`);
        const s3Obj = await s3.send(new GetObjectCommand({
          Bucket: env.STORAGE_BUCKET,
          Key: kit.rawDataStorageKey,
        }));
        if (!s3Obj.Body) throw new Error('Empty S3 object body for DNA raw data file');

        const fileContent = await streamToString(s3Obj.Body as NodeJS.ReadableStream);

        job.log('Parsing raw data file');
        const parsed = parseRawDnaFile(fileContent);

        if (parsed.length < MIN_VALID_ROWS_TO_PROCEED) {
          throw new Error(
            `Only ${parsed.length} valid genotype rows were parsed from this file — that's too few to ` +
            `be a real raw-data export. Confirm this is an unmodified download from your testing provider.`,
          );
        }

        job.log(`Parsed ${parsed.length} genotype calls — inserting in batches of ${INSERT_BATCH_SIZE}`);

        // Clear any partial data from a previous failed attempt at this kit
        // before inserting fresh, so a retry doesn't duplicate rows.
        await db.delete(dnaGenotypes).where(eq(dnaGenotypes.kitId, kitId));

        for (let i = 0; i < parsed.length; i += INSERT_BATCH_SIZE) {
          const batch = parsed.slice(i, i + INSERT_BATCH_SIZE).map(g => ({
            kitId,
            chromosome: g.chromosome,
            position: g.position,
            rsid: g.rsid,
            genotype: g.genotype,
          }));
          await db.insert(dnaGenotypes).values(batch);
          if (i % (INSERT_BATCH_SIZE * 10) === 0) {
            job.log(`Inserted ${Math.min(i + INSERT_BATCH_SIZE, parsed.length)} / ${parsed.length} rows`);
          }
        }

        await db.update(dnaKits).set({
          status: 'ready',
          snpCount: parsed.length,
          processedAt: new Date(),
          processingError: null,
        }).where(eq(dnaKits.id, kitId));

        job.log(`Kit ${kitId} ready — ${parsed.length} SNPs. Running matching against other kits.`);

        const matchCount = await runMatchingForKit(kitId);
        job.log(`Matching complete: ${matchCount} match(es) found or updated`);

        logger.info({ kitId, snpCount: parsed.length, matchCount }, 'DNA kit processed successfully');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown processing error';
        logger.error({ kitId, err }, 'DNA kit processing failed');
        await db.update(dnaKits).set({
          status: 'failed',
          processingError: message,
        }).where(eq(dnaKits.id, kitId));
        throw err; // let BullMQ's retry/backoff still apply for transient failures (e.g. a momentary S3 blip)
      }
    },
    {
      connection: getRedis(),
      // Deliberately low concurrency: a single job can hold hundreds of
      // thousands of parsed rows in memory and run 22 chromosome-by-
      // chromosome comparisons against every other ready kit — this is
      // the heaviest job type in the whole worker fleet by a wide margin,
      // unlike per-file media thumbnailing.
      concurrency: 1,
    },
  ).on('failed', (job, err) => {
    logger.error({ jobId: job?.id, kitId: job?.data.kitId, err }, 'DNA processing job permanently failed after all retries');
  });
}

/**
 * Call after a new kit is uploaded and confirmed — enqueues the parse/
 * insert/match job. Exported separately from startDnaProcessingWorker so
 * the upload route can enqueue without needing to import worker internals.
 */
export async function enqueueDnaProcessing(kitId: string): Promise<void> {
  await dnaProcessingQueue.add('process-dna-kit', { kitId });
}
