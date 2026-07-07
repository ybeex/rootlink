import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  bigint,
  real,
  timestamp,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const privacyLevelEnum = pgEnum('privacy_level', ['public', 'family', 'private']);
export const sexEnum = pgEnum('sex', ['male', 'female', 'other', 'unknown']);
export const subscriptionTierEnum = pgEnum('subscription_tier', ['free', 'plus', 'pro']);
export const certaintyEnum = pgEnum('certainty', ['confirmed', 'probable', 'possible', 'disputed']);
export const mediaTypeEnum = pgEnum('media_type', ['photo', 'document', 'audio', 'video']);
export const treeRoleEnum = pgEnum('tree_role', ['viewer', 'contributor', 'editor', 'admin', 'owner']);
export const hintStatusEnum = pgEnum('hint_status', ['pending', 'accepted', 'rejected', 'snoozed']);
export const editActionEnum = pgEnum('edit_action', ['create', 'update', 'delete', 'merge', 'restore']);
export const notificationTypeEnum = pgEnum('notification_type', [
  'tree_invite', 'edit_made', 'hint_found', 'birthday_reminder',
  'anniversary_reminder', 'conflict_detected', 'bio_ready',
]);

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull(),
    emailVerified: boolean('email_verified').notNull().default(false),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    avatarUrl: varchar('avatar_url', { length: 2000 }),
    subscriptionTier: subscriptionTierEnum('subscription_tier').notNull().default('free'),
    subscriptionExpiresAt: timestamp('subscription_expires_at', { withTimezone: true }),
    stripeCustomerId: varchar('stripe_customer_id', { length: 100 }),
    timezone: varchar('timezone', { length: 50 }).notNull().default('UTC'),
    locale: varchar('locale', { length: 10 }).notNull().default('en'),
    twoFactorEnabled: boolean('two_factor_enabled').notNull().default(false),
    totpSecret: varchar('totp_secret', { length: 100 }),
    isAdmin: boolean('is_admin').notNull().default(false),
    failedLoginAttempts: integer('failed_login_attempts').notNull().default(0),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
    emailVerifyToken: varchar('email_verify_token', { length: 255 }),
    emailVerifyExpiresAt: timestamp('email_verify_expires_at', { withTimezone: true }),
    passwordResetToken: varchar('password_reset_token', { length: 255 }),
    passwordResetExpiresAt: timestamp('password_reset_expires_at', { withTimezone: true }),
    totalStorageUsedBytes: bigint('total_storage_used_bytes', { mode: 'number' }).notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('users_email_unique').on(t.email),
    index('users_subscription_tier_idx').on(t.subscriptionTier),
    index('users_stripe_customer_idx').on(t.stripeCustomerId),
    index('users_deleted_at_idx').on(t.deletedAt),
  ],
);

// ─── Refresh Tokens ───────────────────────────────────────────────────────────

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    // 16-character high-entropy public selector, stored in plaintext and
    // indexed. The client's refresh token is `${tokenSelector}.${verifier}`.
    // Looking up by selector is O(1); the verifier portion is then checked
    // against `tokenHash` via argon2.verify. This avoids the alternative of
    // either (a) storing the raw token (a secret) in a queryable column, or
    // (b) hash-comparing against every active token row (O(n)).
    tokenSelector: varchar('token_selector', { length: 32 }),
    tokenHash: varchar('token_hash', { length: 255 }).notNull(),
    family: varchar('family', { length: 64 }).notNull(),
    isRevoked: boolean('is_revoked').notNull().default(false),
    userAgent: text('user_agent'),
    ipAddress: varchar('ip_address', { length: 45 }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('refresh_tokens_hash_unique').on(t.tokenHash),
    uniqueIndex('refresh_tokens_selector_unique').on(t.tokenSelector),
    index('refresh_tokens_user_idx').on(t.userId),
    index('refresh_tokens_family_idx').on(t.family),
    index('refresh_tokens_expires_at_idx').on(t.expiresAt),
  ],
);

// ─── Trees ────────────────────────────────────────────────────────────────────

export const trees = pgTable(
  'trees',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 200 }).notNull(),
    description: text('description'),
    privacyLevel: privacyLevelEnum('privacy_level').notNull().default('family'),
    ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
    coverMediaId: uuid('cover_media_id'),
    personCount: integer('person_count').notNull().default(0),
    mediaCount: integer('media_count').notNull().default(0),
    gedcomExportedAt: timestamp('gedcom_exported_at', { withTimezone: true }),
    shareToken: varchar('share_token', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('trees_owner_idx').on(t.ownerId),
    index('trees_privacy_idx').on(t.privacyLevel),
    uniqueIndex('trees_share_token_idx').on(t.shareToken),
    index('trees_deleted_at_idx').on(t.deletedAt),
  ],
);

// ─── Tree Members ─────────────────────────────────────────────────────────────

export const treeMembers = pgTable(
  'tree_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    treeId: uuid('tree_id').notNull().references(() => trees.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    role: treeRoleEnum('role').notNull(),
    invitedByUserId: uuid('invited_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    inviteToken: varchar('invite_token', { length: 64 }),
    inviteEmail: varchar('invite_email', { length: 255 }),
    invitedAt: timestamp('invited_at', { withTimezone: true }).notNull().defaultNow(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('tree_members_unique').on(t.treeId, t.userId),
    index('tree_members_tree_idx').on(t.treeId),
    index('tree_members_user_idx').on(t.userId),
    uniqueIndex('tree_members_invite_token_idx').on(t.inviteToken),
  ],
);

// ─── Persons ──────────────────────────────────────────────────────────────────

export const persons = pgTable(
  'persons',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    treeId: uuid('tree_id').notNull().references(() => trees.id, { onDelete: 'cascade' }),
    firstName: varchar('first_name', { length: 200 }),
    middleName: varchar('middle_name', { length: 200 }),
    lastName: varchar('last_name', { length: 200 }),
    maidenName: varchar('maiden_name', { length: 200 }),
    suffix: varchar('suffix', { length: 50 }),
    preferredName: varchar('preferred_name', { length: 200 }),
    sex: sexEnum('sex').notNull().default('unknown'),
    isLiving: boolean('is_living').notNull().default(true),
    privacyLevel: privacyLevelEnum('privacy_level').notNull().default('family'),
    profileMediaId: uuid('profile_media_id'),
    biography: text('biography'),
    biographyGeneratedAt: timestamp('biography_generated_at', { withTimezone: true }),
    notes: text('notes'),
    gedcomId: varchar('gedcom_id', { length: 100 }),
    externalIds: jsonb('external_ids').notNull().default({}),
    dataQualityScore: integer('data_quality_score').notNull().default(0),
    // Denormalized birth/death years for efficient sorting/filtering
    birthYear: integer('birth_year'),
    deathYear: integer('death_year'),
    // Full-text search vector (updated by trigger)
    searchVector: text('search_vector'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
    lastEditedBy: uuid('last_edited_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('persons_tree_idx').on(t.treeId),
    index('persons_last_name_idx').on(t.lastName),
    index('persons_birth_year_idx').on(t.birthYear),
    index('persons_death_year_idx').on(t.deathYear),
    index('persons_quality_idx').on(t.dataQualityScore),
    index('persons_gedcom_idx').on(t.treeId, t.gedcomId),
    // GIN index for full-text search (applied in migration SQL)
    index('persons_deleted_at_idx').on(t.deletedAt),
    // Compound index for common list query
    index('persons_tree_living_idx').on(t.treeId, t.isLiving),
  ],
);

// ─── Vital Events ─────────────────────────────────────────────────────────────

export const vitalEvents = pgTable(
  'vital_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    personId: uuid('person_id').notNull().references(() => persons.id, { onDelete: 'cascade' }),
    treeId: uuid('tree_id').notNull().references(() => trees.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 50 }).notNull(),
    dateYear: integer('date_year'),
    dateMonth: integer('date_month'),
    dateDay: integer('date_day'),
    dateCirca: boolean('date_circa').notNull().default(false),
    dateBeforeYear: integer('date_before_year'),
    dateAfterYear: integer('date_after_year'),
    endDateYear: integer('end_date_year'),
    placeDisplayName: varchar('place_display_name', { length: 500 }),
    placeCity: varchar('place_city', { length: 200 }),
    placeState: varchar('place_state', { length: 200 }),
    placeCountry: varchar('place_country', { length: 200 }),
    placeCountryCode: varchar('place_country_code', { length: 2 }),
    placeLatitude: real('place_latitude'),
    placeLongitude: real('place_longitude'),
    description: text('description'),
    certainty: certaintyEnum('certainty').notNull().default('probable'),
    sourceIds: jsonb('source_ids').notNull().default([]),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('vital_events_person_idx').on(t.personId),
    index('vital_events_tree_idx').on(t.treeId),
    index('vital_events_type_idx').on(t.type),
    index('vital_events_year_idx').on(t.dateYear),
    index('vital_events_place_country_idx').on(t.placeCountryCode),
  ],
);

// ─── Relationships ────────────────────────────────────────────────────────────

export const relationships = pgTable(
  'relationships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    treeId: uuid('tree_id').notNull().references(() => trees.id, { onDelete: 'cascade' }),
    fromPersonId: uuid('from_person_id').notNull().references(() => persons.id, { onDelete: 'cascade' }),
    toPersonId: uuid('to_person_id').notNull().references(() => persons.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 50 }).notNull(),
    startDateYear: integer('start_date_year'),
    endDateYear: integer('end_date_year'),
    certainty: certaintyEnum('certainty').notNull().default('confirmed'),
    sourceIds: jsonb('source_ids').notNull().default([]),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('relationships_tree_idx').on(t.treeId),
    index('relationships_from_idx').on(t.fromPersonId),
    index('relationships_to_idx').on(t.toPersonId),
    index('relationships_type_idx').on(t.type),
    // Unique bidirectional constraint for spouse/partner (handled in app layer)
    index('relationships_pair_idx').on(t.fromPersonId, t.toPersonId),
  ],
);

// ─── Sources ──────────────────────────────────────────────────────────────────

export const sources = pgTable(
  'sources',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    treeId: uuid('tree_id').notNull().references(() => trees.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 50 }).notNull(),
    title: varchar('title', { length: 500 }).notNull(),
    repository: varchar('repository', { length: 500 }),
    repositoryUrl: varchar('repository_url', { length: 2000 }),
    mediaId: uuid('media_id'),
    transcription: text('transcription'),
    notes: text('notes'),
    confidence: certaintyEnum('confidence').notNull().default('probable'),
    publishedYear: integer('published_year'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  },
  (t) => [
    index('sources_tree_idx').on(t.treeId),
    index('sources_type_idx').on(t.type),
    index('sources_created_by_idx').on(t.createdBy),
  ],
);

// ─── Media Assets ─────────────────────────────────────────────────────────────

export const mediaAssets = pgTable(
  'media_assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    treeId: uuid('tree_id').notNull().references(() => trees.id, { onDelete: 'cascade' }),
    uploadedBy: uuid('uploaded_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
    type: mediaTypeEnum('type').notNull(),
    filename: varchar('filename', { length: 500 }).notNull(),
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
    storageKey: varchar('storage_key', { length: 1000 }).notNull(),
    thumbnailKey: varchar('thumbnail_key', { length: 1000 }),
    width: integer('width'),
    height: integer('height'),
    durationSeconds: integer('duration_seconds'),
    caption: text('caption'),
    dateTakenYear: integer('date_taken_year'),
    dateTakenMonth: integer('date_taken_month'),
    dateTakenDay: integer('date_taken_day'),
    taggedPersonIds: jsonb('tagged_person_ids').notNull().default([]),
    isEnhanced: boolean('is_enhanced').notNull().default(false),
    processingStatus: varchar('processing_status', { length: 50 }).notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('media_tree_idx').on(t.treeId),
    index('media_uploaded_by_idx').on(t.uploadedBy),
    index('media_type_idx').on(t.type),
    index('media_processing_idx').on(t.processingStatus),
    uniqueIndex('media_storage_key_idx').on(t.storageKey),
    index('media_deleted_at_idx').on(t.deletedAt),
  ],
);

// ─── Research Hints ───────────────────────────────────────────────────────────

export const researchHints = pgTable(
  'research_hints',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    personId: uuid('person_id').notNull().references(() => persons.id, { onDelete: 'cascade' }),
    treeId: uuid('tree_id').notNull().references(() => trees.id, { onDelete: 'cascade' }),
    provider: varchar('provider', { length: 100 }).notNull(),
    externalRecordId: varchar('external_record_id', { length: 500 }).notNull(),
    title: varchar('title', { length: 500 }).notNull(),
    description: text('description').notNull(),
    recordUrl: varchar('record_url', { length: 2000 }),
    confidence: real('confidence').notNull(),
    status: hintStatusEnum('status').notNull().default('pending'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewedBy: uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('hints_person_idx').on(t.personId),
    index('hints_tree_idx').on(t.treeId),
    index('hints_status_idx').on(t.status),
    uniqueIndex('hints_provider_record_idx').on(t.personId, t.provider, t.externalRecordId),
  ],
);

// ─── Edit History ─────────────────────────────────────────────────────────────

export const editHistory = pgTable(
  'edit_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    treeId: uuid('tree_id').notNull().references(() => trees.id, { onDelete: 'cascade' }),
    entityType: varchar('entity_type', { length: 50 }).notNull(),
    entityId: uuid('entity_id').notNull(),
    action: editActionEnum('action').notNull(),
    changedFields: jsonb('changed_fields').notNull().default({}),
    performedBy: uuid('performed_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
    performedAt: timestamp('performed_at', { withTimezone: true }).notNull().defaultNow(),
    note: text('note'),
    idempotencyKey: varchar('idempotency_key', { length: 64 }),
  },
  (t) => [
    index('edit_history_tree_idx').on(t.treeId),
    index('edit_history_entity_idx').on(t.entityType, t.entityId),
    index('edit_history_performed_by_idx').on(t.performedBy),
    index('edit_history_performed_at_idx').on(t.performedAt),
    uniqueIndex('edit_history_idempotency_idx').on(t.idempotencyKey),
  ],
);

// ─── Notifications ────────────────────────────────────────────────────────────

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    type: notificationTypeEnum('type').notNull(),
    title: varchar('title', { length: 200 }).notNull(),
    body: text('body').notNull(),
    data: jsonb('data').notNull().default({}),
    read: boolean('read').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('notifications_user_idx').on(t.userId),
    index('notifications_user_read_idx').on(t.userId, t.read),
    index('notifications_created_at_idx').on(t.createdAt),
  ],
);

// ─── Audit Logs (append-only, partitioned by month) ──────────────────────────

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 100 }).notNull(),
    resourceType: varchar('resource_type', { length: 50 }).notNull(),
    resourceId: varchar('resource_id', { length: 64 }),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    requestId: varchar('request_id', { length: 64 }),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('audit_logs_user_idx').on(t.userId),
    index('audit_logs_resource_idx').on(t.resourceType, t.resourceId),
    index('audit_logs_created_at_idx').on(t.createdAt),
    index('audit_logs_action_idx').on(t.action),
  ],
);

// ─── Idempotency Keys ─────────────────────────────────────────────────────────

export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    key: varchar('key', { length: 64 }).notNull(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    responseStatus: integer('response_status').notNull(),
    responseBody: jsonb('response_body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.key] }),
    index('idempotency_keys_expires_idx').on(t.expiresAt),
  ],
);

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  trees: many(trees),
  treeMembers: many(treeMembers),
  notifications: many(notifications),
  refreshTokens: many(refreshTokens),
}));

export const treesRelations = relations(trees, ({ one, many }) => ({
  owner: one(users, { fields: [trees.ownerId], references: [users.id] }),
  members: many(treeMembers),
  persons: many(persons),
  mediaAssets: many(mediaAssets),
  sources: many(sources),
  editHistory: many(editHistory),
}));

export const personsRelations = relations(persons, ({ one, many }) => ({
  tree: one(trees, { fields: [persons.treeId], references: [trees.id] }),
  events: many(vitalEvents),
  hints: many(researchHints),
  outgoingRelationships: many(relationships, { relationName: 'fromPerson' }),
  incomingRelationships: many(relationships, { relationName: 'toPerson' }),
}));

export const relationshipsRelations = relations(relationships, ({ one }) => ({
  fromPerson: one(persons, {
    fields: [relationships.fromPersonId],
    references: [persons.id],
    relationName: 'fromPerson',
  }),
  toPerson: one(persons, {
    fields: [relationships.toPersonId],
    references: [persons.id],
    relationName: 'toPerson',
  }),
}));

// ─── Type Exports ─────────────────────────────────────────────────────────────

export type DbUser = typeof users.$inferSelect;
export type NewDbUser = typeof users.$inferInsert;
export type DbTree = typeof trees.$inferSelect;
export type NewDbTree = typeof trees.$inferInsert;
export type DbPerson = typeof persons.$inferSelect;
export type NewDbPerson = typeof persons.$inferInsert;
export type DbRelationship = typeof relationships.$inferSelect;
export type DbVitalEvent = typeof vitalEvents.$inferSelect;
export type DbMediaAsset = typeof mediaAssets.$inferSelect;
export type DbSource = typeof sources.$inferSelect;
export type DbEditHistory = typeof editHistory.$inferSelect;
export type DbNotification = typeof notifications.$inferSelect;
export type DbResearchHint = typeof researchHints.$inferSelect;
export type DbAuditLog = typeof auditLogs.$inferSelect;
