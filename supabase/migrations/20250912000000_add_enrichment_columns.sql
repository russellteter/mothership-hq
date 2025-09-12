-- Enrichment columns for leads/businesses (depending on schema naming)
-- Using businesses table to store per-business enrichment, adjust if using leads table

alter table if exists businesses
  add column if not exists enrichment_data jsonb,
  add column if not exists evidence_log jsonb[],
  add column if not exists confidence_score numeric(3,2),
  add column if not exists detected_features jsonb,
  add column if not exists verified_contacts jsonb;

-- Optional indexes
create index if not exists idx_businesses_confidence_score on businesses (confidence_score);

