import { getDb, relationships, editHistory, persons } from '@rootlink/db';
import { eq, and, or, isNull } from 'drizzle-orm';
import type { CreateRelationshipInput } from '@rootlink/shared';
import { WS_EVENTS, getDisplayName } from '@rootlink/shared';
import { cacheDelPattern } from '../lib/redis.js';
import { publishTreeEvent } from '../plugins/websocket.js';
import { createAppError } from '../lib/errors.js';

const PARENT_TYPES = new Set(['biological_parent', 'adoptive_parent', 'step_parent', 'foster_parent']);
const PARTNER_TYPES = new Set(['spouse', 'partner', 'ex_spouse', 'twin']);

export interface RelationshipPathStep {
  personId: string;
  displayName: string;
}

export interface RelationshipPathResult {
  steps: RelationshipPathStep[];
  /** Plain-language description of each hop, one shorter than steps.length. */
  hopDescriptions: string[];
  /** A single relationship label when the path resolves to a standard
   *  genealogical relationship (parent, sibling, 1st cousin, etc). Null
   *  when the path crosses a marriage/partner edge or otherwise doesn't
   *  reduce to a single blood-relationship term — the hop-by-hop
   *  description above is always accurate even then. */
  relationshipLabel: string | null;
}

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

  // ── Relationship path finder ────────────────────────────────────────────────
  //
  // BFS over the full relationship graph for the tree. Loads every
  // relationship in the tree once per call rather than per-edge queries —
  // simple and correct, but O(relationships in tree) per lookup. Fine for
  // realistic tree sizes; a tree pushing the Pro-tier ceiling (100,000
  // persons, likely a few hundred thousand relationship edges) would
  // benefit from a proper graph-database traversal or a cached adjacency
  // structure instead of reloading and rebuilding it on every request —
  // flagged here rather than silently left as a hidden scaling cliff.
  async findPath(treeId: string, fromPersonId: string, toPersonId: string): Promise<RelationshipPathResult | null> {
    if (fromPersonId === toPersonId) {
      throw createAppError('VALIDATION_ERROR', 'Both people are the same person', 400);
    }

    const { db } = getDb();
    const allRels = await db
      .select({ fromPersonId: relationships.fromPersonId, toPersonId: relationships.toPersonId, type: relationships.type })
      .from(relationships)
      .where(eq(relationships.treeId, treeId));

    // Adjacency: each entry is { to, edge } where edge is 'parent' (moving
    // toward this node's parent), 'child' (moving toward this node's
    // child), or 'partner' (spouse/partner/ex_spouse/twin — symmetric).
    type Edge = { to: string; edge: 'parent' | 'child' | 'partner' };
    const adjacency = new Map<string, Edge[]>();
    const addEdge = (from: string, to: string, edge: Edge['edge']) => {
      if (!adjacency.has(from)) adjacency.set(from, []);
      adjacency.get(from)!.push({ to, edge });
    };

    for (const rel of allRels) {
      if (PARENT_TYPES.has(rel.type)) {
        // fromPersonId is the parent, toPersonId is the child (see
        // checkCircularAncestry above for the same convention).
        addEdge(rel.fromPersonId, rel.toPersonId, 'child');   // parent -> child: moving down
        addEdge(rel.toPersonId, rel.fromPersonId, 'parent');  // child -> parent: moving up
      } else if (PARTNER_TYPES.has(rel.type)) {
        addEdge(rel.fromPersonId, rel.toPersonId, 'partner');
        addEdge(rel.toPersonId, rel.fromPersonId, 'partner');
      }
    }

    // BFS for shortest path (fewest hops).
    const cameFrom = new Map<string, { from: string; edge: Edge['edge'] }>();
    const visited = new Set<string>([fromPersonId]);
    const queue = [fromPersonId];
    let found = false;

    while (queue.length > 0 && !found) {
      const current = queue.shift()!;
      for (const { to, edge } of adjacency.get(current) ?? []) {
        if (visited.has(to)) continue;
        visited.add(to);
        cameFrom.set(to, { from: current, edge });
        if (to === toPersonId) { found = true; break; }
        queue.push(to);
      }
    }

    if (!visited.has(toPersonId)) return null; // not connected in this tree

    // Reconstruct the path from toPersonId back to fromPersonId.
    const pathPersonIds: string[] = [toPersonId];
    const edgeSequence: Edge['edge'][] = []; // edgeSequence[i] connects pathPersonIds[i] -> pathPersonIds[i+1], in reverse order
    let cursor = toPersonId;
    while (cursor !== fromPersonId) {
      const step = cameFrom.get(cursor)!;
      pathPersonIds.push(step.from);
      edgeSequence.push(step.edge);
      cursor = step.from;
    }
    pathPersonIds.reverse();
    edgeSequence.reverse();

    const personRows = await db
      .select({ id: persons.id, firstName: persons.firstName, middleName: persons.middleName, lastName: persons.lastName, preferredName: persons.preferredName })
      .from(persons)
      .where(and(eq(persons.treeId, treeId), isNull(persons.deletedAt)));
    const nameById = new Map(personRows.map((p) => [p.id, getDisplayName(p)]));

    const steps: RelationshipPathStep[] = pathPersonIds.map((id) => ({
      personId: id,
      displayName: nameById.get(id) ?? 'Unknown',
    }));

    const hopDescriptions = edgeSequence.map((edge) => {
      if (edge === 'parent') return 'is the parent of';
      if (edge === 'child') return 'is the child of';
      return 'is the spouse/partner of';
    });

    const relationshipLabel = describeRelationship(edgeSequence);

    return { steps, hopDescriptions, relationshipLabel };
  }
}

// ─── Relationship-label classifier ──────────────────────────────────────────
//
// Only classifies a path into a standard single term when it's a pure
// blood-relationship shape: zero or more 'parent' hops (ascending toward a
// common ancestor) followed by zero or more 'child' hops (descending back
// down) — no 'partner' hops anywhere in it. Anything else (an in-law
// relationship, a step-relationship reached via a partner edge, or a path
// that doesn't reduce to a single common ancestor) returns null; the caller
// always still has the accurate hop-by-hop description to fall back on.
function describeRelationship(edgeSequence: Array<'parent' | 'child' | 'partner'>): string | null {
  if (edgeSequence.some((e) => e === 'partner')) return null;

  const up = edgeSequence.findIndex((e) => e !== 'parent');
  const ascendCount = up === -1 ? edgeSequence.length : up;
  const rest = edgeSequence.slice(ascendCount);
  // Everything after the ascent must be 'child' hops only, else this isn't
  // a single-peak lineage shape (e.g. parent, child, parent again).
  if (rest.some((e) => e !== 'child')) return null;
  const descendCount = rest.length;

  if (ascendCount === 0) return descendCount === 0 ? null : ordinalDescendant(descendCount);
  if (descendCount === 0) return ordinalAncestor(ascendCount);

  const gens = Math.min(ascendCount, descendCount) - 1; // 0 = sibling/aunt-uncle line, 1 = 1st cousin, etc
  const removal = Math.abs(ascendCount - descendCount);

  if (gens === 0) {
    // ascendCount or descendCount is 1 here (the other is >= 1 too, by
    // construction) — sibling if both are 1. Otherwise: the target is an
    // elder-generation relative (aunt/uncle) when fromPerson climbed
    // FARTHER than the path descends back down (the target sits closer to
    // the shared ancestor); a younger-generation relative (niece/nephew)
    // when it's the other way around.
    if (ascendCount === 1 && descendCount === 1) return 'sibling';
    const targetIsElder = ascendCount > descendCount;
    const greats = removal - 1;
    const prefix = greats > 0 ? `${'great-'.repeat(greats)}` : '';
    return targetIsElder ? `${prefix}aunt/uncle` : `${prefix}niece/nephew`;
  }

  const cousinLabel = `${ordinal(gens)} cousin`;
  if (removal === 0) return cousinLabel;
  const removedPhrase = removal === 1 ? 'once removed' : removal === 2 ? 'twice removed' : `removed ${removal} times`;
  return `${cousinLabel}, ${removedPhrase}`;
}

function ordinalAncestor(n: number): string {
  if (n === 1) return 'parent';
  if (n === 2) return 'grandparent';
  return `${'great-'.repeat(n - 2)}grandparent`;
}

function ordinalDescendant(n: number): string {
  if (n === 1) return 'child';
  if (n === 2) return 'grandchild';
  return `${'great-'.repeat(n - 2)}grandchild`;
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}
