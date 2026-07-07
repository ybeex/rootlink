import { getDb, relationships, editHistory, persons } from '@rootlink/db';
import { eq, and, or } from 'drizzle-orm';
import type { CreateRelationshipInput } from '@rootlink/shared';
import { WS_EVENTS } from '@rootlink/shared';
import { cacheDelPattern } from '../lib/redis.js';
import { publishTreeEvent } from '../plugins/websocket.js';
import { createAppError } from '../lib/errors.js';

export class RelationshipService {
  // ── List all relationships for a tree ─────────────────────────────────────

  async listByTree(treeId: string) {
    const { db } = getDb();
    return db
      .select()
      .from(relationships)
      .where(eq(relationships.treeId, treeId));
  }

  // ── List relationships for a specific person ───────────────────────────────

  async listByPerson(treeId: string, personId: string) {
    const { db } = getDb();
    return db
      .select()
      .from(relationships)
      .where(
        and(
          eq(relationships.treeId, treeId),
          or(
            eq(relationships.fromPersonId, personId),
            eq(relationships.toPersonId, personId),
          ),
        ),
      );
  }

  // ── Create ─────────────────────────────────────────────────────────────────

  async create(treeId: string, userId: string, input: CreateRelationshipInput) {
    const { db } = getDb();

    // Verify both persons exist in this tree
    const [fromPerson, toPerson] = await Promise.all([
      db
        .select({ id: persons.id })
        .from(persons)
        .where(and(eq(persons.id, input.fromPersonId), eq(persons.treeId, treeId)))
        .limit(1),
      db
        .select({ id: persons.id })
        .from(persons)
        .where(and(eq(persons.id, input.toPersonId), eq(persons.treeId, treeId)))
        .limit(1),
    ]);

    if (!fromPerson[0]) {
      throw createAppError('PERSON_NOT_FOUND', 'fromPersonId does not exist in this tree', 404);
    }
    if (!toPerson[0]) {
      throw createAppError('PERSON_NOT_FOUND', 'toPersonId does not exist in this tree', 404);
    }

    // Prevent duplicate relationships of same type
    const existing = await db
      .select({ id: relationships.id })
      .from(relationships)
      .where(
        and(
          eq(relationships.treeId, treeId),
          eq(relationships.fromPersonId, input.fromPersonId),
          eq(relationships.toPersonId, input.toPersonId),
          eq(relationships.type, input.type),
        ),
      )
      .limit(1);

    if (existing[0]) {
      throw createAppError('RELATIONSHIP_EXISTS', 'This relationship already exists', 409);
    }

    // Circular ancestry guard for parent relationships
    if (
      input.type === 'biological_parent' ||
      input.type === 'adoptive_parent' ||
      input.type === 'step_parent'
    ) {
      const wouldCreateCycle = await this.checkCircularAncestry(
        treeId,
        input.fromPersonId,
        input.toPersonId,
      );
      if (wouldCreateCycle) {
        throw createAppError(
          'CIRCULAR_ANCESTRY',
          'This relationship would create a circular ancestry loop, which is not valid.',
          422,
        );
      }
    }

    const [rel] = await db
      .insert(relationships)
      .values({
        treeId,
        fromPersonId: input.fromPersonId,
        toPersonId:   input.toPersonId,
        type:         input.type,
        startDateYear: input.startDate?.year ?? null,
        endDateYear:   input.endDate?.year   ?? null,
        certainty:     input.certainty,
        sourceIds:     input.sourceIds,
        notes:         input.notes,
      })
      .returning();

    if (!rel) throw createAppError('INTERNAL_ERROR', 'Failed to create relationship', 500);

    // Record in edit history
    await db.insert(editHistory).values({
      treeId,
      entityType:    'relationship',
      entityId:      rel.id,
      action:        'create',
      changedFields: { _all: { before: null, after: input } },
      performedBy:   userId,
    });

    await cacheDelPattern(`persons:${treeId}:*`);
    void publishTreeEvent(treeId, WS_EVENTS.RELATIONSHIP_CREATED, { relationshipId: rel.id }, userId).catch(() => undefined);
    return rel;
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  async delete(treeId: string, relationshipId: string, userId: string) {
    const { db } = getDb();

    const [rel] = await db
      .delete(relationships)
      .where(and(eq(relationships.id, relationshipId), eq(relationships.treeId, treeId)))
      .returning();

    if (!rel) throw createAppError('NOT_FOUND', 'Relationship not found', 404);

    await db.insert(editHistory).values({
      treeId,
      entityType:    'relationship',
      entityId:      relationshipId,
      action:        'delete',
      changedFields: { _all: { before: rel, after: null } },
      performedBy:   userId,
    });

    await cacheDelPattern(`persons:${treeId}:*`);
    void publishTreeEvent(treeId, WS_EVENTS.RELATIONSHIP_DELETED, { relationshipId }, userId).catch(() => undefined);
  }

  // ── Circular ancestry detection (DFS) ─────────────────────────────────────
  // Returns true if making `parentId` a parent of `childId` would create a cycle
  // i.e. if `childId` is already an ancestor of `parentId`.

  private async checkCircularAncestry(
    treeId:   string,
    parentId: string,
    childId:  string,
  ): Promise<boolean> {
    const { db } = getDb();

    const visited = new Set<string>();
    const queue   = [parentId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === childId) return true;
      if (visited.has(current)) continue;
      visited.add(current);

      // Fetch parents of `current`
      const parents = await db
        .select({ fromPersonId: relationships.fromPersonId })
        .from(relationships)
        .where(
          and(
            eq(relationships.treeId, treeId),
            eq(relationships.toPersonId, current),
            or(
              eq(relationships.type, 'biological_parent'),
              eq(relationships.type, 'adoptive_parent'),
              eq(relationships.type, 'step_parent'),
            ),
          ),
        );

      for (const { fromPersonId } of parents) {
        if (!visited.has(fromPersonId)) queue.push(fromPersonId);
      }
    }

    return false;
  }
}
