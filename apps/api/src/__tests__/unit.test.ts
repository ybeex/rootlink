import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RelationshipService } from '../services/relationship.service.js';

// Mock the DB and Redis modules
vi.mock('@rootlink/db', () => ({
  getDb: vi.fn(() => ({
    db: {
      select: vi.fn().mockReturnThis(),
      from:   vi.fn().mockReturnThis(),
      where:  vi.fn().mockReturnThis(),
      limit:  vi.fn().mockResolvedValue([{ id: 'person-1' }]),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{
        id: 'rel-1', treeId: 'tree-1',
        fromPersonId: 'person-1', toPersonId: 'person-2',
        type: 'spouse', certainty: 'confirmed',
      }]),
      delete: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      set:    vi.fn().mockReturnThis(),
    },
  })),
  relationships: { id: 'relationships', treeId: 'treeId', fromPersonId: 'fromPersonId', toPersonId: 'toPersonId', type: 'type' },
  persons:       { id: 'id', treeId: 'treeId' },
  editHistory:   { id: 'id' },
}));

vi.mock('../lib/redis.js', () => ({
  cacheDelPattern: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../lib/errors.js', async () => {
  const actual = await vi.importActual<typeof import('../lib/errors.js')>('../lib/errors.js');
  return actual;
});

describe('RelationshipService', () => {
  let svc: RelationshipService;

  beforeEach(() => {
    svc = new RelationshipService();
    vi.clearAllMocks();
  });

  it('rejects self-relationships', async () => {
    await expect(
      svc.create('tree-1', 'user-1', {
        fromPersonId: 'same-id',
        toPersonId:   'same-id',
        type:         'spouse',
        startDate:    null,
        endDate:      null,
        certainty:    'confirmed',
        sourceIds:    [],
        notes:        null,
      }),
    ).rejects.toThrow();
  });
});

describe('Data Quality Score', () => {
  it('computes correct score for a well-documented person', async () => {
    const { computeDataQualityScore } = await import('@rootlink/shared');

    const score = computeDataQualityScore({
      firstName: 'Jane',
      lastName:  'Smith',
      middleName: 'Elizabeth',
      isLiving:  false,
      profileMediaId: 'media-1',
      mediaIds:  ['m1', 'm2', 'm3'],
      sourceIds: ['s1', 's2', 's3', 's4'],
      biography: 'Jane Smith was born in Dublin in 1890 and emigrated to New York in 1912.',
      events: [
        {
          id: '1', type: 'birth', certainty: 'confirmed', sourceIds: [],
          date: { year: 1890, month: 5, day: 12, circa: false, beforeYear: null, afterYear: null },
          endDate: null,
          place: { id: 'p1', displayName: 'Dublin, Ireland', city: 'Dublin', county: null, state: null, country: 'Ireland', countryCode: 'IE', latitude: 53.3498, longitude: -6.2603 },
          description: null, createdAt: '', updatedAt: '',
        },
        {
          id: '2', type: 'death', certainty: 'confirmed', sourceIds: [],
          date: { year: 1965, month: null, day: null, circa: false, beforeYear: null, afterYear: null },
          endDate: null, place: null, description: null, createdAt: '', updatedAt: '',
        },
        {
          id: '3', type: 'immigration', certainty: 'probable', sourceIds: [],
          date: { year: 1912, month: null, day: null, circa: false, beforeYear: null, afterYear: null },
          endDate: null, place: null, description: null, createdAt: '', updatedAt: '',
        },
      ],
    });

    expect(score).toBeGreaterThanOrEqual(80);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('gives low score for minimal data', async () => {
    const { computeDataQualityScore } = await import('@rootlink/shared');
    const score = computeDataQualityScore({ firstName: 'Unknown', isLiving: true });
    expect(score).toBeLessThan(20);
  });
});

describe('Validation Schemas', () => {
  it('rejects passwords shorter than 12 characters', async () => {
    const { registerSchema } = await import('@rootlink/shared');
    const result = registerSchema.safeParse({
      email: 'a@b.com', password: 'Short1!', firstName: 'A', lastName: 'B',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('12 characters');
    }
  });

  it('accepts a valid person schema', async () => {
    const { createPersonSchema } = await import('@rootlink/shared');
    const result = createPersonSchema.safeParse({
      firstName: 'Ada', lastName: 'Lovelace',
      sex: 'female', isLiving: false, privacyLevel: 'family',
      events: [], externalIds: {},
    });
    expect(result.success).toBe(true);
  });

  it('rejects self-relationship at schema level', async () => {
    const { createRelationshipSchema } = await import('@rootlink/shared');
    const id = '11111111-1111-1111-1111-111111111111';
    const result = createRelationshipSchema.safeParse({
      fromPersonId: id, toPersonId: id,
      type: 'spouse', certainty: 'confirmed', sourceIds: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects fromPersonId === toPersonId', async () => {
    const { createRelationshipSchema } = await import('@rootlink/shared');
    const id = '22222222-2222-2222-2222-222222222222';
    const result = createRelationshipSchema.safeParse({
      fromPersonId: id, toPersonId: id,
      type: 'biological_parent', certainty: 'confirmed', sourceIds: [],
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid partial date', async () => {
    const { partialDateSchema } = await import('@rootlink/shared');
    const result = partialDateSchema.safeParse({
      year: 1920, month: null, day: null, circa: true,
      beforeYear: null, afterYear: null,
    });
    expect(result.success).toBe(true);
  });
});
