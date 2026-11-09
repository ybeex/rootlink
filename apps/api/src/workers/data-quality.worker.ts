import { Worker } from 'bullmq';
import { getWorkerRedis, cacheDelPattern } from '../lib/redis.js';
import { getDb, persons, vitalEvents } from '@rootlink/db';
import { eq } from 'drizzle-orm';
import { QUEUE_NAMES, computeDataQualityScore, type EventType } from '@rootlink/shared';
import { cacheDelPattern } from '../lib/redis.js';
import pino from 'pino';

const logger = pino({ name: 'quality-worker' });

// Known valid event types for safe narrowing
const VALID_EVENT_TYPES = new Set<EventType>([
  'birth', 'death', 'marriage', 'divorce', 'baptism', 'burial',
  'immigration', 'emigration', 'military_service', 'education',
  'occupation', 'residence', 'custom',
]);

function toEventType(value: string): EventType {
  if (VALID_EVENT_TYPES.has(value as EventType)) return value as EventType;
  return 'custom';
}

interface DataQualityJob {
  personId: string;
  treeId:   string;
}

export function startDataQualityWorker() {
  return new Worker<DataQualityJob>(
    QUEUE_NAMES.dataQualityScore,
    async (job) => {
      const { personId, treeId } = job.data;
      const { db } = getDb();

      const [person] = await db
        .select()
        .from(persons)
        .where(eq(persons.id, personId))
        .limit(1);

      if (!person) {
        job.log(`Person ${personId} not found — skipping quality score`);
        return;
      }

      const events = await db
        .select()
        .from(vitalEvents)
        .where(eq(vitalEvents.personId, personId));

      const score = computeDataQualityScore({
        firstName:     person.firstName,
        middleName:    person.middleName,
        lastName:      person.lastName,
        isLiving:      person.isLiving,
        profileMediaId: person.profileMediaId,
        mediaIds:      [],    // resolved by a full media query only if needed
        sourceIds:     [],    // sourced from the person's sourceIds field
        biography:     person.biography,
        events: events.map((e) => ({
          id:          e.id,
          type:        toEventType(e.type),
          certainty:   e.certainty as 'confirmed' | 'probable' | 'possible' | 'disputed',
          sourceIds:   (e.sourceIds as string[] | null) ?? [],
          date: e.dateYear != null
            ? {
                year:        e.dateYear,
                month:       e.dateMonth,
                day:         e.dateDay,
                circa:       e.dateCirca,
                beforeYear:  e.dateBeforeYear,
                afterYear:   e.dateAfterYear,
              }
            : null,
          endDate:     null,
          place:       e.placeDisplayName != null
            ? {
                id:          e.id,
                displayName: e.placeDisplayName,
                city:        e.placeCity,
                county:      null,
                state:       e.placeState,
                country:     e.placeCountry ?? '',
                countryCode: e.placeCountryCode ?? '',
                latitude:    e.placeLatitude ?? null,
                longitude:   e.placeLongitude ?? null,
              }
            : null,
          description: e.description,
          createdAt:   e.createdAt.toISOString(),
          updatedAt:   e.updatedAt.toISOString(),
        })),
      });

      await db
        .update(persons)
        .set({ dataQualityScore: score })
        .where(eq(persons.id, personId));

      // Invalidate relevant caches
      await Promise.all([
        cacheDelPattern(`person:${treeId}:${personId}`),
        cacheDelPattern(`persons:${treeId}:*`),
      ]);

      job.log(`Quality score for ${personId}: ${score}`);
    },
    {
      connection:  getWorkerRedis(),
      concurrency: 10,
    },
  );
}
