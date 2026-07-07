import { z } from 'zod';
import { PRIVACY_LEVELS, RELATIONSHIP_TYPES } from './types.js';

// ─── Primitives ───────────────────────────────────────────────────────────────

export const uuidSchema = z.string().uuid();

export const partialDateSchema = z.object({
  year: z.number().int().min(1).max(9999).nullable(),
  month: z.number().int().min(1).max(12).nullable(),
  day: z.number().int().min(1).max(31).nullable(),
  circa: z.boolean().default(false),
  beforeYear: z.number().int().min(1).max(9999).nullable(),
  afterYear: z.number().int().min(1).max(9999).nullable(),
});

export const placeSchema = z.object({
  displayName: z.string().min(1).max(500),
  city: z.string().max(200).nullable(),
  county: z.string().max(200).nullable(),
  state: z.string().max(200).nullable(),
  country: z.string().min(1).max(200),
  countryCode: z.string().length(2),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
});

// ─── Auth Schemas ─────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  email: z.string().email().max(255).toLowerCase(),
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .max(128)
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[0-9]/, 'Must contain number')
    .regex(/[^A-Za-z0-9]/, 'Must contain special character'),
  firstName: z.string().min(1).max(100).trim(),
  lastName: z.string().min(1).max(100).trim(),
  timezone: z.string().max(50).default('UTC'),
  locale: z.string().max(10).default('en'),
});

export const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1).max(128),
  totpCode: z.string().length(6).optional(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(12)
    .max(128)
    .regex(/[A-Z]/)
    .regex(/[0-9]/)
    .regex(/[^A-Za-z0-9]/),
});

export const enableTotpSchema = z.object({
  totpCode: z.string().length(6),
});

// ─── Tree Schemas ─────────────────────────────────────────────────────────────

export const createTreeSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  description: z.string().max(2000).trim().nullable().default(null),
  privacyLevel: z.enum(PRIVACY_LEVELS).default('family'),
});

export const updateTreeSchema = createTreeSchema.partial();

export const inviteMemberSchema = z.object({
  email: z.string().email().toLowerCase(),
  role: z.enum(['viewer', 'contributor', 'editor', 'admin']),
  message: z.string().max(500).optional(),
});

// ─── Person Schemas ───────────────────────────────────────────────────────────

export const vitalEventSchema = z.object({
  type: z.enum([
    'birth', 'death', 'marriage', 'divorce', 'baptism', 'burial',
    'immigration', 'emigration', 'military_service', 'education',
    'occupation', 'residence', 'custom',
  ]),
  date: partialDateSchema.nullable().default(null),
  endDate: partialDateSchema.nullable().default(null),
  place: placeSchema.nullable().default(null),
  description: z.string().max(2000).nullable().default(null),
  certainty: z.enum(['confirmed', 'probable', 'possible', 'disputed']).default('probable'),
  sourceIds: z.array(uuidSchema).default([]),
});

export const createPersonSchema = z.object({
  firstName: z.string().max(200).trim().nullable().default(null),
  middleName: z.string().max(200).trim().nullable().default(null),
  lastName: z.string().max(200).trim().nullable().default(null),
  maidenName: z.string().max(200).trim().nullable().default(null),
  suffix: z.string().max(50).trim().nullable().default(null),
  preferredName: z.string().max(200).trim().nullable().default(null),
  sex: z.enum(['male', 'female', 'other', 'unknown']).default('unknown'),
  isLiving: z.boolean().default(true),
  privacyLevel: z.enum(PRIVACY_LEVELS).default('family'),
  biography: z.string().max(50000).nullable().default(null),
  notes: z.string().max(10000).nullable().default(null),
  events: z.array(vitalEventSchema).default([]),
  externalIds: z.record(z.string(), z.string()).default({}),
});

export const updatePersonSchema = createPersonSchema.partial();

// ─── Relationship Schemas ─────────────────────────────────────────────────────

export const createRelationshipSchema = z.object({
  fromPersonId: uuidSchema,
  toPersonId: uuidSchema,
  type: z.enum(RELATIONSHIP_TYPES),
  startDate: partialDateSchema.nullable().default(null),
  endDate: partialDateSchema.nullable().default(null),
  certainty: z.enum(['confirmed', 'probable', 'possible', 'disputed']).default('confirmed'),
  sourceIds: z.array(uuidSchema).default([]),
  notes: z.string().max(2000).nullable().default(null),
}).refine((d) => d.fromPersonId !== d.toPersonId, {
  message: 'fromPersonId and toPersonId cannot be the same',
});

// ─── Source Schemas ───────────────────────────────────────────────────────────

export const createSourceSchema = z.object({
  type: z.enum([
    'census', 'birth_certificate', 'death_certificate', 'marriage_certificate',
    'military_record', 'immigration_record', 'newspaper', 'photograph', 'diary',
    'will', 'gravestone', 'dna', 'website', 'book', 'interview', 'other',
  ]),
  title: z.string().min(1).max(500).trim(),
  repository: z.string().max(500).nullable().default(null),
  repositoryUrl: z.string().url().max(2000).nullable().default(null),
  transcription: z.string().max(100000).nullable().default(null),
  notes: z.string().max(5000).nullable().default(null),
  confidence: z.enum(['confirmed', 'probable', 'possible', 'disputed']).default('probable'),
  publishedDate: partialDateSchema.nullable().default(null),
});

// ─── Query Schemas ────────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const cursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  direction: z.enum(['forward', 'backward']).default('forward'),
});

export const searchPersonSchema = paginationSchema.extend({
  q: z.string().max(200).optional(),
  sex: z.enum(['male', 'female', 'other', 'unknown']).optional(),
  isLiving: z.coerce.boolean().optional(),
  birthYearMin: z.coerce.number().int().optional(),
  birthYearMax: z.coerce.number().int().optional(),
  sortBy: z.enum(['name', 'birth_year', 'updated_at', 'quality_score']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

// ─── Hint Review ──────────────────────────────────────────────────────────────

export const reviewHintSchema = z.object({
  status: z.enum(['accepted', 'rejected', 'snoozed']),
  note: z.string().max(500).optional(),
});

// ─── File Upload ──────────────────────────────────────────────────────────────

export const uploadMediaSchema = z.object({
  type: z.enum(['photo', 'document', 'audio', 'video']),
  caption: z.string().max(2000).nullable().default(null),
  taggedPersonIds: z.array(uuidSchema).default([]),
  dateTaken: partialDateSchema.nullable().default(null),
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateTreeInput = z.infer<typeof createTreeSchema>;
export type UpdateTreeInput = z.infer<typeof updateTreeSchema>;
export type CreatePersonInput = z.infer<typeof createPersonSchema>;
export type UpdatePersonInput = z.infer<typeof updatePersonSchema>;
export type CreateRelationshipInput = z.infer<typeof createRelationshipSchema>;
export type CreateSourceInput = z.infer<typeof createSourceSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type SearchPersonInput = z.infer<typeof searchPersonSchema>;
export type ReviewHintInput = z.infer<typeof reviewHintSchema>;
export type UploadMediaInput = z.infer<typeof uploadMediaSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput  = z.infer<typeof resetPasswordSchema>;
