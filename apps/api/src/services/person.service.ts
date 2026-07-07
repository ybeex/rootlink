import { getDb, persons, vitalEvents, editHistory, trees, users } from '@rootlink/db';
import { eq, and, isNull, sql, desc, asc, gte, lte, count } from 'drizzle-orm';
import type {
  CreatePersonInput,
  UpdatePersonInput,
  SearchPersonInput,
  PaginatedResponse,
  PersonSummary,
} from '@rootlink/shared';
import { computeDataQualityScore, getDisplayName, redactLivingPerson, CACHE_TTL, WS_EVENTS, SUBSCRIPTION_LIMITS } from '@rootlink/shared';
import { cacheGet, cacheSet, cacheDelPattern } from '../lib/redis.js';
import { aiHintQueue, dataQualityQueue } from '../workers/queues.js';
import { publishTreeEvent } from '../plugins/websocket.js';
import { createAppError } from '../lib/errors.js';
import type { DbPerson, DbVitalEvent } from '@rootlink/db';

export class PersonService {
  // ─── List & Search ─────────────────────────────────────────────────────────

  async listPersons(
    treeId: string,
    query: SearchPersonInput,
    options: { redactLiving?: boolean } = {},
  ): Promise<PaginatedResponse<PersonSummary>> {
    const { redactLiving = false } = options;
    // Redacted (share-token / public) results are cached under a distinct key
    // so a redacted response is never served to an authenticated tree member
    // and vice versa.
    const cacheKey = `persons:${treeId}:${redactLiving ? 'redacted' : 'full'}:${JSON.stringify(query)}`;
    const cached = await cacheGet<PaginatedResponse<PersonSummary>>(cacheKey);
    if (cached) return cached;

    const { db } = getDb();
    const { page, pageSize, q, sex, isLiving, birthYearMin, birthYearMax, sortBy, sortOrder } = query;
    const offset = (page - 1) * pageSize;

    // Build dynamic where conditions
    const conditions = [eq(persons.treeId, treeId), isNull(persons.deletedAt)];
    if (sex) conditions.push(eq(persons.sex, sex));
    if (typeof isLiving === 'boolean') conditions.push(eq(persons.isLiving, isLiving));
    if (birthYearMin) conditions.push(gte(persons.birthYear, birthYearMin));
    if (birthYearMax) conditions.push(lte(persons.birthYear, birthYearMax));
    if (q) {
      const searchTerm = `%${q.toLowerCase()}%`;
      conditions.push(
        sql`(LOWER(${persons.firstName}) LIKE ${searchTerm} OR LOWER(${persons.lastName}) LIKE ${searchTerm} OR LOWER(${persons.preferredName}) LIKE ${searchTerm})`,
      );
    }

    const whereClause = and(...conditions);

    // Sorting
    const sortColumn =
      sortBy === 'birth_year' ? persons.birthYear
      : sortBy === 'updated_at' ? persons.updatedAt
      : sortBy === 'quality_score' ? persons.dataQualityScore
      : persons.lastName;

    const orderFn = sortOrder === 'desc' ? desc : asc;

    const [rows, totalRows] = await Promise.all([
      db
        .select({
          id: persons.id,
          treeId: persons.treeId,
          firstName: persons.firstName,
          middleName: persons.middleName,
          lastName: persons.lastName,
          preferredName: persons.preferredName,
          sex: persons.sex,
          isLiving: persons.isLiving,
          birthYear: persons.birthYear,
          deathYear: persons.deathYear,
          profileMediaId: persons.profileMediaId,
          dataQualityScore: persons.dataQualityScore,
        })
        .from(persons)
        .where(whereClause)
        .orderBy(orderFn(sortColumn))
        .limit(pageSize)
        .offset(offset),
      db.select({ count: count() }).from(persons).where(whereClause),
    ]);

    const total = Number(totalRows[0]?.count ?? 0);
    const totalPages = Math.ceil(total / pageSize);

    const result: PaginatedResponse<PersonSummary> = {
      data: rows.map((r) => {
        const summary: PersonSummary = {
          id: r.id,
          treeId: r.treeId,
          displayName: getDisplayName({
            firstName: r.firstName,
            middleName: r.middleName,
            lastName: r.lastName,
            preferredName: r.preferredName,
          }),
          sex: r.sex,
          isLiving: r.isLiving,
          birthYear: r.birthYear,
          deathYear: r.deathYear,
          profileMediaUrl: null, // Resolved by media service in full response
          dataQualityScore: r.dataQualityScore,
        };
        return redactLiving ? redactLivingPerson(summary) : summary;
      }),
      pagination: {
        total,
        page,
        pageSize,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };

    await cacheSet(cacheKey, result, CACHE_TTL.personList);
    return result;
  }

  // ─── Get One ───────────────────────────────────────────────────────────────

  async getPerson(treeId: string, personId: string, options: { redactLiving?: boolean } = {}) {
    const { redactLiving = false } = options;
    const cacheKey = `person:${treeId}:${personId}`;
    const cached = await cacheGet<DbPerson & { events: DbVitalEvent[] }>(cacheKey);

    const person = cached ?? (await (async () => {
      const { db } = getDb();

      const [row] = await db
        .select()
        .from(persons)
        .where(and(eq(persons.id, personId), eq(persons.treeId, treeId), isNull(persons.deletedAt)))
        .limit(1);

      if (!row) {
        throw createAppError('PERSON_NOT_FOUND', 'Person not found', 404);
      }

      const events = await db
        .select()
        .from(vitalEvents)
        .where(eq(vitalEvents.personId, personId))
        .orderBy(asc(vitalEvents.sortOrder));

      const result = { ...row, events };
      await cacheSet(cacheKey, result, CACHE_TTL.personDetail);
      return result;
    })());

    // Share-token visitors never receive a living person's full detail record
    // (biography, notes, exact dates, etc.) — the pedigree view already shows
    // them as "Living" via redactLivingPerson on the list endpoint. Returning
    // a 403 here (rather than a partially-nulled record) avoids accidentally
    // leaking a field we forgot to redact as the schema evolves.
    if (redactLiving && person.isLiving) {
      throw createAppError(
        'PERSON_PRIVATE',
        'This person is living and their details are private on shared views',
        403,
      );
    }

    return person;
  }

  // ─── Create ────────────────────────────────────────────────────────────────

  async createPerson(
    treeId: string,
    userId: string,
    input: CreatePersonInput,
    idempotencyKey?: string,
  ) {
    const { db } = getDb();

    // Check tree person limit
    const [treeRow] = await db
      .select({ personCount: trees.personCount, ownerId: trees.ownerId })
      .from(trees)
      .where(eq(trees.id, treeId))
      .limit(1);

    if (!treeRow) throw createAppError('TREE_NOT_FOUND', 'Tree not found', 404);

    // This check was previously incomplete: personCount and ownerId were
    // fetched but never actually compared against a limit, so a free-tier
    // tree's advertised 500-person cap was never enforced. The relevant
    // tier is the TREE OWNER's — not the acting user's — because a
    // contributor without ownership can create people on someone else's
    // tree, and it's the owner's plan whose limit applies.
    const [ownerRow] = await db
      .select({ subscriptionTier: users.subscriptionTier })
      .from(users)
      .where(eq(users.id, treeRow.ownerId))
      .limit(1);

    const ownerTier = ownerRow?.subscriptionTier ?? 'free';
    const limits = SUBSCRIPTION_LIMITS[ownerTier as keyof typeof SUBSCRIPTION_LIMITS]
      ?? SUBSCRIPTION_LIMITS.free;

    if (treeRow.personCount >= limits.maxPersonsPerTree) {
      throw createAppError(
        'PERSON_LIMIT_REACHED',
        `This tree has reached its plan's limit of ${limits.maxPersonsPerTree} people. The tree owner will need to upgrade to add more.`,
        403,
      );
    }

    // Extract birth/death years for denormalized columns
    const birthEvent = input.events.find((e) => e.type === 'birth');
    const deathEvent = input.events.find((e) => e.type === 'death');

    const [person] = await db
      .insert(persons)
      .values({
        treeId,
        firstName: input.firstName,
        middleName: input.middleName,
        lastName: input.lastName,
        maidenName: input.maidenName,
        suffix: input.suffix,
        preferredName: input.preferredName,
        sex: input.sex,
        isLiving: input.isLiving,
        privacyLevel: input.privacyLevel,
        biography: input.biography,
        notes: input.notes,
        externalIds: input.externalIds,
        birthYear: birthEvent?.date?.year ?? null,
        deathYear: deathEvent?.date?.year ?? null,
        dataQualityScore: 0,
        createdBy: userId,
        lastEditedBy: userId,
      })
      .returning();

    if (!person) throw createAppError('INTERNAL_ERROR', 'Failed to create person', 500);

    // Insert events
    if (input.events.length > 0) {
      await db.insert(vitalEvents).values(
        input.events.map((e, i) => ({
          personId: person.id,
          treeId,
          type: e.type,
          dateYear: e.date?.year ?? null,
          dateMonth: e.date?.month ?? null,
          dateDay: e.date?.day ?? null,
          dateCirca: e.date?.circa ?? false,
          endDateYear: e.endDate?.year ?? null,
          placeDisplayName: e.place?.displayName ?? null,
          placeCity: e.place?.city ?? null,
          placeState: e.place?.state ?? null,
          placeCountry: e.place?.country ?? null,
          placeCountryCode: e.place?.countryCode ?? null,
          placeLatitude: e.place?.latitude ?? null,
          placeLongitude: e.place?.longitude ?? null,
          description: e.description,
          certainty: e.certainty,
          sourceIds: e.sourceIds,
          sortOrder: i,
        })),
      );
    }

    // Update quality score
    const qualityScore = computeDataQualityScore({
      ...person,
      events: input.events,
      sourceIds: [],
      mediaIds: [],
    });

    await db
      .update(persons)
      .set({ dataQualityScore: qualityScore })
      .where(eq(persons.id, person.id));

    // Increment tree person count
    await db
      .update(trees)
      .set({ personCount: sql`${trees.personCount} + 1`, updatedAt: new Date() })
      .where(eq(trees.id, treeId));

    // Record edit history
    await db.insert(editHistory).values({
      treeId,
      entityType: 'person',
      entityId: person.id,
      action: 'create',
      changedFields: { _all: { before: null, after: input } },
      performedBy: userId,
      idempotencyKey,
    });

    // Invalidate list cache
    await cacheDelPattern(`persons:${treeId}:*`);

    // Enqueue background jobs (non-blocking)
    void aiHintQueue.add('generate-hints', { personId: person.id, treeId, userId }).catch(() => undefined);
    void dataQualityQueue.add('compute-quality', { personId: person.id, treeId }).catch(() => undefined);

    // Notify other connected collaborators (audit finding B1 — this call
    // was previously missing from every mutation in this file, so the
    // WebSocket layer only ever synced presence, never actual tree data).
    void publishTreeEvent(treeId, WS_EVENTS.PERSON_CREATED, { personId: person.id }, userId).catch(() => undefined);

    return { ...person, events: input.events };
  }

  // ─── Update ────────────────────────────────────────────────────────────────

  async updatePerson(
    treeId: string,
    personId: string,
    userId: string,
    input: UpdatePersonInput,
  ) {
    const { db } = getDb();

    const [existing] = await db
      .select()
      .from(persons)
      .where(and(eq(persons.id, personId), eq(persons.treeId, treeId), isNull(persons.deletedAt)))
      .limit(1);

    if (!existing) throw createAppError('PERSON_NOT_FOUND', 'Person not found', 404);

    // Track changed fields for edit history
    const changedFields: Record<string, { before: unknown; after: unknown }> = {};
    const updateData: Partial<typeof persons.$inferInsert> = { updatedAt: new Date(), lastEditedBy: userId };

    for (const [key, value] of Object.entries(input) as [keyof UpdatePersonInput, unknown][]) {
      if (key === 'events') continue;
      if (value !== undefined && existing[key as keyof typeof existing] !== value) {
        changedFields[key] = { before: existing[key as keyof typeof existing], after: value };
        (updateData as Record<string, unknown>)[key] = value;
      }
    }

    if (Object.keys(updateData).length > 1) {
      await db.update(persons).set(updateData).where(eq(persons.id, personId));
    }

    // Replace events if provided
    if (input.events !== undefined) {
      await db.delete(vitalEvents).where(eq(vitalEvents.personId, personId));
      if (input.events.length > 0) {
        await db.insert(vitalEvents).values(
          input.events.map((e, i) => ({
            personId,
            treeId,
            type: e.type,
            dateYear: e.date?.year ?? null,
            dateMonth: e.date?.month ?? null,
            dateDay: e.date?.day ?? null,
            dateCirca: e.date?.circa ?? false,
            endDateYear: e.endDate?.year ?? null,
            placeDisplayName: e.place?.displayName ?? null,
            placeCity: e.place?.city ?? null,
            placeState: e.place?.state ?? null,
            placeCountry: e.place?.country ?? null,
            placeCountryCode: e.place?.countryCode ?? null,
            placeLatitude: e.place?.latitude ?? null,
            placeLongitude: e.place?.longitude ?? null,
            description: e.description,
            certainty: e.certainty,
            sourceIds: e.sourceIds,
            sortOrder: i,
          })),
        );
      }
    }

    // Record edit history
    if (Object.keys(changedFields).length > 0) {
      await db.insert(editHistory).values({
        treeId,
        entityType: 'person',
        entityId: personId,
        action: 'update',
        changedFields,
        performedBy: userId,
      });
    }

    // Invalidate caches
    await Promise.all([
      cacheDelPattern(`person:${treeId}:${personId}`),
      cacheDelPattern(`persons:${treeId}:*`),
    ]);

    void publishTreeEvent(treeId, WS_EVENTS.PERSON_UPDATED, { personId }, userId).catch(() => undefined);

    return this.getPerson(treeId, personId);
  }

  // ─── Soft Delete ───────────────────────────────────────────────────────────

  async deletePerson(treeId: string, personId: string, userId: string) {
    const { db } = getDb();

    const [existing] = await db
      .select({ id: persons.id })
      .from(persons)
      .where(and(eq(persons.id, personId), eq(persons.treeId, treeId), isNull(persons.deletedAt)))
      .limit(1);

    if (!existing) throw createAppError('PERSON_NOT_FOUND', 'Person not found', 404);

    await db
      .update(persons)
      .set({ deletedAt: new Date(), lastEditedBy: userId })
      .where(eq(persons.id, personId));

    await db
      .update(trees)
      .set({ personCount: sql`GREATEST(${trees.personCount} - 1, 0)`, updatedAt: new Date() })
      .where(eq(trees.id, treeId));

    await db.insert(editHistory).values({
      treeId,
      entityType: 'person',
      entityId: personId,
      action: 'delete',
      changedFields: {},
      performedBy: userId,
    });

    await Promise.all([
      cacheDelPattern(`person:${treeId}:${personId}`),
      cacheDelPattern(`persons:${treeId}:*`),
    ]);

    void publishTreeEvent(treeId, WS_EVENTS.PERSON_DELETED, { personId }, userId).catch(() => undefined);
  }
}
