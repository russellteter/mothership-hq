import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  boolean,
  doublePrecision,
  integer,
  numeric,
  check,
  unique,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";

// Search jobs table - tracks individual search operations
export const searchJobs = pgTable("search_jobs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  dslJson: jsonb("dsl_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  status: text("status").notNull().default("queued"),
  summaryStats: jsonb("summary_stats"),
  errorText: text("error_text"),
  userId: uuid("user_id"), // Will be connected after auth setup
  customName: text("custom_name"),
  originalPrompt: text("original_prompt"),
  searchTags: jsonb("search_tags").default(sql`'[]'::jsonb`),
  leadType: text("lead_type"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => ({
  statusCheck: check("status_check", sql`${table.status} IN ('queued', 'running', 'completed', 'failed')`),
  deletedAtIdx: index("idx_search_jobs_deleted_at").on(table.deletedAt).where(sql`${table.deletedAt} IS NULL`),
}));

// Businesses table - canonical business entities
export const businesses = pgTable("businesses", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  vertical: text("vertical"), // 'dentist', 'law_firm', 'contractor', etc.
  website: text("website"),
  phone: text("phone"),
  addressJson: jsonb("address_json"), // {street, city, state, zip, country}
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  franchiseBool: boolean("franchise_bool"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  // Enrichment columns
  enrichmentData: jsonb("enrichment_data"),
  evidenceLog: jsonb("evidence_log").array(),
  confidenceScore: numeric("confidence_score", { precision: 3, scale: 2 }),
  detectedFeatures: jsonb("detected_features"),
  verifiedContacts: jsonb("verified_contacts"),
}, (table) => ({
  nameIdx: index("idx_businesses_name").using("gin", sql`to_tsvector('simple', ${table.name})`),
  geoIdx: index("idx_businesses_geo").on(table.lat, table.lng),
  verticalIdx: index("idx_businesses_vertical").on(table.vertical),
  confidenceScoreIdx: index("idx_businesses_confidence_score").on(table.confidenceScore),
}));

// People associated with businesses
export const people = pgTable("people", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: uuid("business_id").notNull(),
  name: text("name").notNull(),
  role: text("role"), // 'Owner', 'Principal', 'Dr.', 'Attorney', etc.
  email: text("email"),
  phone: text("phone"),
  sourceUrl: text("source_url"),
  confidence: numeric("confidence"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
}, (table) => ({
  confidenceCheck: check("confidence_check", sql`${table.confidence} >= 0 AND ${table.confidence} <= 1`),
  businessIdx: index("idx_people_business").on(table.businessId),
}));

// Signals - detected facts about businesses with evidence
export const signals = pgTable("signals", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: uuid("business_id").notNull(),
  type: text("type").notNull(), // 'no_website', 'has_chatbot', 'has_online_booking', etc.
  valueJson: jsonb("value_json").notNull(),
  confidence: numeric("confidence"),
  evidenceUrl: text("evidence_url"),
  evidenceSnippet: text("evidence_snippet"),
  sourceKey: text("source_key").notNull(), // connector that detected this signal
  detectedAt: timestamp("detected_at", { withTimezone: true }).notNull().default(sql`now()`),
  overriddenByUser: boolean("overridden_by_user").default(false),
}, (table) => ({
  confidenceCheck: check("confidence_check", sql`${table.confidence} >= 0 AND ${table.confidence} <= 1`),
  businessTypeIdx: index("idx_signals_business_type").on(table.businessId, table.type),
}));

// Lead views - scored results for specific searches
export const leadViews = pgTable("lead_views", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  searchJobId: uuid("search_job_id").notNull(),
  businessId: uuid("business_id").notNull(),
  score: integer("score"),
  subscoresJson: jsonb("subscores_json"), // {ICP: number, Pain: number, Reachability: number, ComplianceRisk: number}
  rank: integer("rank"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
}, (table) => ({
  scoreCheck: check("score_check", sql`${table.score} >= 0 AND ${table.score} <= 100`),
  uniqueSearchBusiness: unique("unique_search_business").on(table.searchJobId, table.businessId),
  rankIdx: index("idx_lead_views_rank").on(table.searchJobId, table.rank),
  scoreIdx: index("idx_lead_views_score").on(table.searchJobId, table.score).desc(),
}));

// Notes on businesses
export const notes = pgTable("notes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: uuid("business_id").notNull(),
  text: text("text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
}, (table) => ({
  businessIdx: index("idx_notes_business").on(table.businessId),
}));

// Tags for organizing leads
export const tags = pgTable("tags", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  label: text("label").unique().notNull(),
});

// Business-tag relationships
export const businessTags = pgTable("business_tags", {
  businessId: uuid("business_id").notNull(),
  tagId: uuid("tag_id").notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.businessId, table.tagId] }),
}));

// Status changes log
export const statusLogs = pgTable("status_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: uuid("business_id"),
  status: text("status"),
  changedAt: timestamp("changed_at", { withTimezone: true }).notNull().default(sql`now()`),
  searchJobId: uuid("search_job_id"),
  task: text("task"),
  message: text("message"),
  severity: text("severity"),
  ts: text("ts"),
}, (table) => ({
  statusCheck: check("status_check", sql`${table.status} IN ('new', 'qualified', 'ignored')`),
}));

// Event log for future modules
export const events = pgTable("events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // 'SearchStarted', 'LeadStarred', 'SearchCompleted', etc.
  entityType: text("entity_type").notNull(), // 'business', 'search_job'
  entityId: uuid("entity_id").notNull(),
  payloadJson: jsonb("payload_json"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  processedFlags: jsonb("processed_flags"),
}, (table) => ({
  entityIdx: index("idx_events_entity").on(table.entityType, table.entityId),
  typeIdx: index("idx_events_type").on(table.type),
}));

// Artifact registry for future modules
export const artifacts = pgTable("artifacts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: uuid("business_id").notNull(),
  type: text("type").notNull(), // 'draft_outreach', 'demo_zip', etc.
  uri: text("uri").notNull(),
  metadataJson: jsonb("metadata_json"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
});

// User profiles table for authentication (if needed)
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().unique(), // Will reference auth.users when auth is set up
  email: text("email"),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});

// Signal overrides table for tracking user corrections
export const signalOverrides = pgTable("signal_overrides", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: uuid("business_id").notNull(),
  signalId: uuid("signal_id").notNull(),
  userId: uuid("user_id").notNull(),
  isCorrect: boolean("is_correct").notNull(),
  reasoning: text("reasoning"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
}, (table) => ({
  businessIdIdx: index("idx_signal_overrides_business_id").on(table.businessId),
  userIdIdx: index("idx_signal_overrides_user_id").on(table.userId),
}));

// Saved searches table
export const savedSearches = pgTable("saved_searches", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  dslJson: jsonb("dsl_json").notNull(),
  searchJobId: uuid("search_job_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
}, (table) => ({
  userIdIdx: index("idx_saved_searches_user_id").on(table.userId),
}));

// Relations
export const businessesRelations = relations(businesses, ({ many }) => ({
  people: many(people),
  signals: many(signals),
  notes: many(notes),
  businessTags: many(businessTags),
  statusLogs: many(statusLogs),
  artifacts: many(artifacts),
  leadViews: many(leadViews),
}));

export const peopleRelations = relations(people, ({ one }) => ({
  business: one(businesses, {
    fields: [people.businessId],
    references: [businesses.id],
  }),
}));

export const signalsRelations = relations(signals, ({ one }) => ({
  business: one(businesses, {
    fields: [signals.businessId],
    references: [businesses.id],
  }),
}));

export const leadViewsRelations = relations(leadViews, ({ one }) => ({
  business: one(businesses, {
    fields: [leadViews.businessId],
    references: [businesses.id],
  }),
  searchJob: one(searchJobs, {
    fields: [leadViews.searchJobId],
    references: [searchJobs.id],
  }),
}));

export const searchJobsRelations = relations(searchJobs, ({ many }) => ({
  leadViews: many(leadViews),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  businessTags: many(businessTags),
}));

export const businessTagsRelations = relations(businessTags, ({ one }) => ({
  business: one(businesses, {
    fields: [businessTags.businessId],
    references: [businesses.id],
  }),
  tag: one(tags, {
    fields: [businessTags.tagId],
    references: [tags.id],
  }),
}));

export const notesRelations = relations(notes, ({ one }) => ({
  business: one(businesses, {
    fields: [notes.businessId],
    references: [businesses.id],
  }),
}));

export const statusLogsRelations = relations(statusLogs, ({ one }) => ({
  business: one(businesses, {
    fields: [statusLogs.businessId],
    references: [businesses.id],
  }),
}));

export const artifactsRelations = relations(artifacts, ({ one }) => ({
  business: one(businesses, {
    fields: [artifacts.businessId],
    references: [businesses.id],
  }),
}));