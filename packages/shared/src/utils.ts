import type { PartialDate, Person, PersonSummary } from './types.js';

// ─── Display Name ─────────────────────────────────────────────────────────────

export function getDisplayName(
  person: Pick<Person, 'firstName' | 'middleName' | 'lastName' | 'preferredName'>,
): string {
  if (person.preferredName) return person.preferredName;
  const parts = [person.firstName, person.middleName, person.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : 'Unknown';
}

// ─── Date Formatting ──────────────────────────────────────────────────────────

export function formatPartialDate(date: PartialDate | null): string {
  if (!date) return '';

  const prefix = date.circa ? 'circa ' : '';
  const beforePrefix = date.beforeYear ? `before ${date.beforeYear}` : '';
  const afterPrefix = date.afterYear ? `after ${date.afterYear}` : '';

  if (beforePrefix || afterPrefix) return beforePrefix || afterPrefix;

  const parts: string[] = [];
  if (date.day) parts.push(String(date.day));
  if (date.month) parts.push(new Date(2000, date.month - 1).toLocaleString('en', { month: 'long' }));
  if (date.year) parts.push(String(date.year));

  return prefix + (parts.length > 0 ? parts.join(' ') : '');
}

export function extractYear(date: PartialDate | null): number | null {
  return date?.year ?? null;
}

// ─── Data Quality Score ───────────────────────────────────────────────────────

export function computeDataQualityScore(person: Partial<Person>): number {
  let score = 0;
  const max = 100;

  // Name completeness (20 pts)
  if (person.firstName) score += 8;
  if (person.lastName) score += 8;
  if (person.middleName) score += 2;
  if (person.preferredName) score += 2;

  // Events (40 pts)
  const events = person.events ?? [];
  const hasBirth = events.some((e) => e.type === 'birth');
  const hasDeath = !person.isLiving && events.some((e) => e.type === 'death');
  if (hasBirth) score += 15;
  if (hasDeath || person.isLiving) score += 10;
  if (hasBirth && events.find((e) => e.type === 'birth')?.place) score += 5;
  if (events.length >= 3) score += 10;

  // Sources (20 pts)
  const sourceCount = person.sourceIds?.length ?? 0;
  if (sourceCount >= 1) score += 8;
  if (sourceCount >= 3) score += 8;
  if (sourceCount >= 5) score += 4;

  // Media (10 pts)
  if (person.profileMediaId) score += 6;
  if ((person.mediaIds?.length ?? 0) >= 3) score += 4;

  // Biography (10 pts)
  if (person.biography && person.biography.length > 100) score += 10;

  return Math.min(Math.round(score), max);
}

// ─── Privacy ──────────────────────────────────────────────────────────────────

export function redactLivingPerson(person: PersonSummary): PersonSummary {
  if (!person.isLiving) return person;
  return {
    ...person,
    displayName: 'Living',
    birthYear: null,
    profileMediaUrl: null,
  };
}

// ─── Relationship path display ────────────────────────────────────────────────

export function formatRelationshipType(type: string): string {
  const labels: Record<string, string> = {
    biological_parent: 'Parent',
    adoptive_parent: 'Adoptive Parent',
    step_parent: 'Step Parent',
    foster_parent: 'Foster Parent',
    spouse: 'Spouse',
    partner: 'Partner',
    ex_spouse: 'Former Spouse',
    twin: 'Twin',
  };
  return labels[type] ?? type.replace(/_/g, ' ');
}

// ─── ID Helpers ───────────────────────────────────────────────────────────────

export function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

// ─── Cursor Pagination ────────────────────────────────────────────────────────

export function encodeCursor(data: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(data)).toString('base64url');
}

export function decodeCursor(cursor: string): Record<string, unknown> {
  try {
    const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as unknown;
    if (typeof decoded !== 'object' || decoded === null) throw new Error('Invalid cursor');
    return decoded as Record<string, unknown>;
  } catch {
    throw new Error('Invalid pagination cursor');
  }
}

// ─── Idempotency ──────────────────────────────────────────────────────────────

export function generateIdempotencyKey(userId: string, operation: string, resourceId?: string): string {
  const parts = [userId, operation, resourceId ?? Date.now().toString()].join(':');
  return Buffer.from(parts).toString('base64url').slice(0, 64);
}
