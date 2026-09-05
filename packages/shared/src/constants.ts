// ─── Error Codes ──────────────────────────────────────────────────────────────

export const ERROR_CODES = {
  // Auth
  INVALID_CREDENTIALS: 'AUTH_001',
  EMAIL_NOT_VERIFIED: 'AUTH_002',
  TOKEN_EXPIRED: 'AUTH_003',
  TOKEN_INVALID: 'AUTH_004',
  TOTP_REQUIRED: 'AUTH_005',
  TOTP_INVALID: 'AUTH_006',
  ACCOUNT_LOCKED: 'AUTH_007',
  EMAIL_ALREADY_EXISTS: 'AUTH_008',

  // Authorization
  FORBIDDEN: 'AUTHZ_001',
  INSUFFICIENT_ROLE: 'AUTHZ_002',
  TREE_ACCESS_DENIED: 'AUTHZ_003',

  // Validation
  VALIDATION_ERROR: 'VAL_001',
  INVALID_UUID: 'VAL_002',
  INVALID_DATE: 'VAL_003',

  // Resources
  NOT_FOUND: 'RES_001',
  PERSON_NOT_FOUND: 'RES_002',
  TREE_NOT_FOUND: 'RES_003',
  MEDIA_NOT_FOUND: 'RES_004',
  DNA_KIT_NOT_FOUND: 'RES_005',
  DNA_UPLOAD_NOT_FOUND: 'RES_006',
  API_KEY_NOT_FOUND: 'RES_007',

  // Business logic
  SELF_RELATIONSHIP: 'BIZ_001',
  RELATIONSHIP_EXISTS: 'BIZ_002',
  CIRCULAR_ANCESTRY: 'BIZ_003',
  TREE_LIMIT_REACHED: 'BIZ_004',
  MEDIA_LIMIT_REACHED: 'BIZ_005',
  PERSON_LIMIT_REACHED: 'BIZ_006',
  SUBSCRIPTION_REQUIRED: 'BIZ_007',
  PERSON_PRIVATE: 'BIZ_008',
  DNA_KIT_NOT_READY: 'BIZ_009',
  API_KEY_LIMIT_REACHED: 'BIZ_010',

  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_001',
  UPLOAD_RATE_LIMIT: 'RATE_002',
  API_KEY_RATE_LIMIT: 'RATE_003',

  // Server
  INTERNAL_ERROR: 'SRV_001',
  SERVICE_UNAVAILABLE: 'SRV_002',
  DATABASE_ERROR: 'SRV_003',
  STORAGE_ERROR: 'SRV_004',
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

// ─── Subscription Limits ──────────────────────────────────────────────────────

export const SUBSCRIPTION_LIMITS = {
  free: {
    maxTrees: 3,
    maxPersonsPerTree: 500,
    maxMediaAssets: 500,
    maxMediaSizeBytes: 10 * 1024 * 1024, // 10 MB per file
    totalStorageBytes: 1 * 1024 * 1024 * 1024, // 1 GB
    aiHintsPerMonth: 10,
    aiBioGenerationsPerMonth: 2,
    canExportGedcom: true,
    canOfflineAccess: false,
    canAccessDna: false,
    canAccessApiAccess: false,
  },
  plus: {
    maxTrees: 20,
    maxPersonsPerTree: 10000,
    maxMediaAssets: 10000,
    maxMediaSizeBytes: 50 * 1024 * 1024, // 50 MB per file
    totalStorageBytes: 50 * 1024 * 1024 * 1024, // 50 GB
    aiHintsPerMonth: 200,
    aiBioGenerationsPerMonth: 50,
    canExportGedcom: true,
    canOfflineAccess: true,
    canAccessDna: false,
    canAccessApiAccess: false,
  },
  pro: {
    maxTrees: 100,
    maxPersonsPerTree: 100000,
    maxMediaAssets: 100000,
    maxMediaSizeBytes: 200 * 1024 * 1024, // 200 MB per file
    totalStorageBytes: 500 * 1024 * 1024 * 1024, // 500 GB
    aiHintsPerMonth: 2000,
    aiBioGenerationsPerMonth: 500,
    canExportGedcom: true,
    canOfflineAccess: true,
    canAccessDna: true,
    canAccessApiAccess: true,
  },
} as const satisfies Record<
  string,
  {
    maxTrees: number;
    maxPersonsPerTree: number;
    maxMediaAssets: number;
    maxMediaSizeBytes: number;
    totalStorageBytes: number;
    aiHintsPerMonth: number;
    aiBioGenerationsPerMonth: number;
    canExportGedcom: boolean;
    canOfflineAccess: boolean;
    canAccessDna: boolean;
    canAccessApiAccess: boolean;
  }
>;

// ─── Rate Limits ──────────────────────────────────────────────────────────────

export const RATE_LIMITS = {
  auth: {
    login: { max: 5, windowMs: 15 * 60 * 1000 },         // 5 per 15 min
    register: { max: 3, windowMs: 60 * 60 * 1000 },       // 3 per hour
    forgotPassword: { max: 3, windowMs: 60 * 60 * 1000 }, // 3 per hour
  },
  api: {
    default: { max: 100, windowMs: 60 * 1000 },           // 100 per minute
    search: { max: 30, windowMs: 60 * 1000 },             // 30 per minute
    upload: { max: 20, windowMs: 60 * 60 * 1000 },        // 20 per hour
    aiGenerate: { max: 5, windowMs: 60 * 60 * 1000 },     // 5 per hour
    gedcomExport: { max: 3, windowMs: 60 * 60 * 1000 },   // 3 per hour
  },
} as const;

// ─── Pagination Defaults ──────────────────────────────────────────────────────

export const PAGINATION = {
  defaultPageSize: 20,
  maxPageSize: 100,
  treeNodesBatchSize: 500,
} as const;

// ─── Media ────────────────────────────────────────────────────────────────────

export const ALLOWED_MIME_TYPES = {
  photo: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/tiff'],
  document: ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/aac'],
  video: ['video/mp4', 'video/quicktime', 'video/webm'],
} as const;

export const THUMBNAIL_SIZES = {
  small: { width: 150, height: 150 },
  medium: { width: 400, height: 400 },
  large: { width: 1200, height: 1200 },
} as const;

// ─── Cache TTLs (seconds) ─────────────────────────────────────────────────────

export const CACHE_TTL = {
  treeSummary: 60,
  personList: 30,
  personDetail: 120,
  mediaAsset: 3600,
  userProfile: 300,
  hints: 600,
  treeStats: 300,
  searchResults: 15,
} as const;

// ─── Queue Names ──────────────────────────────────────────────────────────────

export const QUEUE_NAMES = {
  emailNotifications: 'email-notifications',
  pushNotifications: 'push-notifications',
  mediaProcessing: 'media-processing',
  gedcomImport: 'gedcom-import',
  gedcomExport: 'gedcom-export',
  aiHintGeneration: 'ai-hint-generation',
  aiBioGeneration: 'ai-bio-generation',
  dataQualityScore: 'data-quality-score',
  mediaDeletion: 'media-deletion',
  dnaProcessing: 'dna-processing',
  auditLog: 'audit-log',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// ─── WebSocket Events ─────────────────────────────────────────────────────────

export const WS_EVENTS = {
  // Server -> Client
  TREE_UPDATED: 'tree:updated',
  PERSON_CREATED: 'person:created',
  PERSON_UPDATED: 'person:updated',
  PERSON_DELETED: 'person:deleted',
  RELATIONSHIP_CREATED: 'relationship:created',
  RELATIONSHIP_DELETED: 'relationship:deleted',
  COLLABORATOR_JOINED: 'collaborator:joined',
  COLLABORATOR_LEFT: 'collaborator:left',
  HINT_FOUND: 'hint:found',
  BIO_READY: 'bio:ready',
  EDIT_CONFLICT: 'edit:conflict',

  // Client -> Server
  JOIN_TREE: 'join:tree',
  LEAVE_TREE: 'leave:tree',
  PRESENCE_UPDATE: 'presence:update',
} as const;
