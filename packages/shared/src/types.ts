// ─── Domain Types ─────────────────────────────────────────────────────────────
// Central source of truth for all domain entities used across API and web app.

export type UUID = string;
export type ISODateString = string;

// ─── Privacy ──────────────────────────────────────────────────────────────────

export const PRIVACY_LEVELS = ['public', 'family', 'private'] as const;
export type PrivacyLevel = (typeof PRIVACY_LEVELS)[number];

// ─── Vital Events ─────────────────────────────────────────────────────────────

export type EventType =
  | 'birth'
  | 'death'
  | 'marriage'
  | 'divorce'
  | 'baptism'
  | 'burial'
  | 'immigration'
  | 'emigration'
  | 'military_service'
  | 'education'
  | 'occupation'
  | 'residence'
  | 'custom';

export type CertaintyLevel = 'confirmed' | 'probable' | 'possible' | 'disputed';

export interface VitalEvent {
  id: UUID;
  type: EventType;
  date: PartialDate | null;
  endDate: PartialDate | null;
  place: Place | null;
  description: string | null;
  certainty: CertaintyLevel;
  sourceIds: UUID[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface PartialDate {
  year: number | null;
  month: number | null;
  day: number | null;
  circa: boolean;
  beforeYear: number | null;
  afterYear: number | null;
}

export interface Place {
  id: UUID;
  displayName: string;
  city: string | null;
  county: string | null;
  state: string | null;
  country: string;
  countryCode: string;
  latitude: number | null;
  longitude: number | null;
}

// ─── Person ───────────────────────────────────────────────────────────────────

export type Sex = 'male' | 'female' | 'other' | 'unknown';

export interface Person {
  id: UUID;
  treeId: UUID;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  maidenName: string | null;
  suffix: string | null;
  preferredName: string | null;
  sex: Sex;
  isLiving: boolean;
  privacyLevel: PrivacyLevel;
  profileMediaId: UUID | null;
  biography: string | null;
  biographyGeneratedAt: ISODateString | null;
  events: VitalEvent[];
  sourceIds: UUID[];
  mediaIds: UUID[];
  notes: string | null;
  gedcomId: string | null;
  externalIds: Record<string, string>;
  dataQualityScore: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  createdBy: UUID;
  lastEditedBy: UUID;
}

export interface PersonSummary {
  id: UUID;
  treeId: UUID;
  displayName: string;
  sex: Sex;
  isLiving: boolean;
  birthYear: number | null;
  deathYear: number | null;
  profileMediaUrl: string | null;
  dataQualityScore: number;
}

// ─── Relationship ─────────────────────────────────────────────────────────────

export const RELATIONSHIP_TYPES = [
  'biological_parent',
  'adoptive_parent',
  'step_parent',
  'foster_parent',
  'spouse',
  'partner',
  'ex_spouse',
  'twin',
] as const;

export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

export interface Relationship {
  id: UUID;
  treeId: UUID;
  fromPersonId: UUID;
  toPersonId: UUID;
  type: RelationshipType;
  startDate: PartialDate | null;
  endDate: PartialDate | null;
  certainty: CertaintyLevel;
  sourceIds: UUID[];
  notes: string | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

// ─── Tree ─────────────────────────────────────────────────────────────────────

export type TreeRole = 'viewer' | 'contributor' | 'editor' | 'admin' | 'owner';

export interface Tree {
  id: UUID;
  name: string;
  description: string | null;
  privacyLevel: PrivacyLevel;
  ownerId: UUID;
  personCount: number;
  mediaCount: number;
  coverMediaId: UUID | null;
  gedcomExportedAt: ISODateString | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface TreeMember {
  treeId: UUID;
  userId: UUID;
  role: TreeRole;
  invitedAt: ISODateString;
  acceptedAt: ISODateString | null;
  user: UserPublic;
}

// ─── User ─────────────────────────────────────────────────────────────────────

export type SubscriptionTier = 'free' | 'plus' | 'pro';

export interface User {
  id: UUID;
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  subscriptionTier: SubscriptionTier;
  subscriptionExpiresAt: ISODateString | null;
  totalStorageUsedBytes: number;
  timezone: string;
  locale: string;
  twoFactorEnabled: boolean;
  isAdmin: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  lastLoginAt: ISODateString | null;
}

export interface UserPublic {
  id: UUID;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

// ─── Source Citations ─────────────────────────────────────────────────────────

export type SourceType =
  | 'census'
  | 'birth_certificate'
  | 'death_certificate'
  | 'marriage_certificate'
  | 'military_record'
  | 'immigration_record'
  | 'newspaper'
  | 'photograph'
  | 'diary'
  | 'will'
  | 'gravestone'
  | 'dna'
  | 'website'
  | 'book'
  | 'interview'
  | 'other';

export interface Source {
  id: UUID;
  treeId: UUID;
  type: SourceType;
  title: string;
  repository: string | null;
  repositoryUrl: string | null;
  mediaId: UUID | null;
  transcription: string | null;
  notes: string | null;
  confidence: CertaintyLevel;
  publishedDate: PartialDate | null;
  createdAt: ISODateString;
  createdBy: UUID;
}

// ─── Media ────────────────────────────────────────────────────────────────────

export type MediaType = 'photo' | 'document' | 'audio' | 'video';

export interface MediaAsset {
  id: UUID;
  treeId: UUID;
  uploadedBy: UUID;
  type: MediaType;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  caption: string | null;
  dateTaken: PartialDate | null;
  taggedPersonIds: UUID[];
  isEnhanced: boolean;
  storageKey: string;
  createdAt: ISODateString;
}

// ─── Edit History ─────────────────────────────────────────────────────────────

export type EditAction = 'create' | 'update' | 'delete' | 'merge' | 'restore';

export interface EditHistoryEntry {
  id: UUID;
  treeId: UUID;
  entityType: 'person' | 'relationship' | 'source' | 'media' | 'tree';
  entityId: UUID;
  action: EditAction;
  changedFields: Record<string, { before: unknown; after: unknown }>;
  performedBy: UUID;
  performedAt: ISODateString;
  note: string | null;
}

// ─── Hints / Research Suggestions ────────────────────────────────────────────

export type HintStatus = 'pending' | 'accepted' | 'rejected' | 'snoozed';

export interface ResearchHint {
  id: UUID;
  personId: UUID;
  treeId: UUID;
  provider: string;
  externalRecordId: string;
  title: string;
  description: string;
  recordUrl: string | null;
  confidence: number;
  status: HintStatus;
  createdAt: ISODateString;
  reviewedAt: ISODateString | null;
  reviewedBy: UUID | null;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotificationType =
  | 'tree_invite'
  | 'edit_made'
  | 'hint_found'
  | 'birthday_reminder'
  | 'anniversary_reminder'
  | 'conflict_detected'
  | 'bio_ready';

export interface Notification {
  id: UUID;
  userId: UUID;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read: boolean;
  createdAt: ISODateString;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface CursorPaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  prevCursor: string | null;
  hasMore: boolean;
}

// ─── DNA Matching ──────────────────────────────────────────────────────────────

export type DnaKitStatus = 'processing' | 'ready' | 'failed';
export type DnaProvider = 'ancestrydna' | '23andme' | 'myheritage' | 'ftdna' | 'other';

export interface DnaKit {
  id: UUID;
  uploadedBy: UUID;
  personId: UUID | null;
  treeId: UUID | null;
  label: string;
  provider: DnaProvider;
  status: DnaKitStatus;
  rawDataStorageKey: string;
  snpCount: number | null;
  sex: 'male' | 'female' | null;
  processingError: string | null;
  uploadedAt: ISODateString;
  processedAt: ISODateString | null;
  deletedAt: ISODateString | null;
}

export interface DnaMatch {
  matchId: UUID;
  otherKitId: UUID;
  otherKitLabel: string;
  otherKitOwnerId: UUID;
  totalSharedCm: number;
  largestSegmentCm: number;
  segmentCount: number;
  estimatedRelationship: string;
  computedAt: ISODateString;
}

// ─── API Access (Pro tier) ─────────────────────────────────────────────────────

export interface ApiKeySummary {
  id: UUID;
  label: string;
  keyPrefix: string;
  scopes: string[];
  lastUsedAt: ISODateString | null;
  createdAt: ISODateString;
  revokedAt: ISODateString | null;
}

export interface CreatedApiKey {
  id: UUID;
  label: string;
  keyPrefix: string;
  scopes: string[];
  createdAt: ISODateString;
  /** Only ever present in the create response — never returned again. */
  plaintextKey: string;
}

// ─── Duplicate detection & merge ───────────────────────────────────────────────

export interface DuplicateMatch {
  personId: UUID;
  displayName: string;
  birthYear: number | null;
  score: number;
  reasons: string[];
}

export interface MergePreview {
  keep: { id: UUID; displayName: string };
  remove: { id: UUID; displayName: string };
  fieldsFilledFromRemoved: string[];
  relationshipsToMove: number;
  eventsToMove: number;
  mediaTagsToMove: number;
}

// ─── Relationship path finder ───────────────────────────────────────────────

export interface RelationshipPathStep {
  personId: UUID;
  displayName: string;
}

export interface RelationshipPathResult {
  steps: RelationshipPathStep[];
  hopDescriptions: string[];
  relationshipLabel: string | null;
}

// ─── Timeline ───────────────────────────────────────────────────────────────

export interface TimelineEntry {
  eventId: UUID;
  type: string;
  date: { year: number; month: number | null; day: number | null; circa: boolean } | null;
  place: string | null;
  description: string | null;
  personId: UUID;
  personDisplayName: string;
}

// ─── FamilySearch record matching ──────────────────────────────────────────

export interface FamilySearchFact {
  type: string;
  year: number | null;
  place: string | null;
}

export interface FamilySearchRecordDetail {
  displayName: string;
  facts: FamilySearchFact[];
}

// ─── API Response wrappers ────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
  requestId: string;
  timestamp: ISODateString;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  requestId: string;
  timestamp: ISODateString;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
