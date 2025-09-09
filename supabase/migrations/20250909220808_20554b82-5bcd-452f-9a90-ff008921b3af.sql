-- Phase 1: SMB Lead Finder Database Schema
-- Core tables for businesses, search jobs, signals, and lead management

-- Search jobs table - tracks individual search operations
CREATE TABLE public.search_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dsl_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT CHECK (status IN ('queued', 'running', 'completed', 'failed')) NOT NULL DEFAULT 'queued',
  summary_stats JSONB,
  error_text TEXT
);

-- Businesses table - canonical business entities
CREATE TABLE public.businesses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  vertical TEXT, -- 'dentist', 'law_firm', 'contractor', 'hvac', 'roofing', 'generic'
  website TEXT,
  phone TEXT,
  address_json JSONB, -- {street, city, state, zip, country}
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  franchise_bool BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- People associated with businesses
CREATE TABLE public.people (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT, -- 'Owner', 'Principal', 'Dr.', 'Attorney', etc.
  email TEXT,
  phone TEXT,
  source_url TEXT,
  confidence NUMERIC CHECK (confidence >= 0 AND confidence <= 1),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Signals - detected facts about businesses with evidence
CREATE TABLE public.signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'no_website', 'has_chatbot', 'has_online_booking', etc.
  value_json JSONB NOT NULL,
  confidence NUMERIC CHECK (confidence >= 0 AND confidence <= 1),
  evidence_url TEXT,
  evidence_snippet TEXT,
  source_key TEXT NOT NULL, -- connector that detected this signal
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  overridden_by_user BOOLEAN DEFAULT FALSE
);

-- Lead views - scored results for specific searches
CREATE TABLE public.lead_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  search_job_id UUID NOT NULL REFERENCES public.search_jobs(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  score INTEGER CHECK (score >= 0 AND score <= 100),
  subscores_json JSONB, -- {ICP: number, Pain: number, Reachability: number, ComplianceRisk: number}
  rank INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(search_job_id, business_id)
);

-- Notes on businesses
CREATE TABLE public.notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tags for organizing leads
CREATE TABLE public.tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT UNIQUE NOT NULL
);

-- Business-tag relationships
CREATE TABLE public.business_tags (
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (business_id, tag_id)
);

-- Status changes log
CREATE TABLE public.status_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('new', 'qualified', 'ignored')) NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Event log for future modules (thin seam)
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL, -- 'SearchStarted', 'LeadStarred', 'SearchCompleted', etc.
  entity_type TEXT NOT NULL, -- 'business', 'search_job'
  entity_id UUID NOT NULL,
  payload_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_flags JSONB
);

-- Artifact registry for future modules (thin seam)
CREATE TABLE public.artifacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'draft_outreach', 'demo_zip', etc.
  uri TEXT NOT NULL,
  metadata_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_businesses_name ON public.businesses USING gin (to_tsvector('simple', name));
CREATE INDEX idx_businesses_geo ON public.businesses(lat, lng);
CREATE INDEX idx_businesses_vertical ON public.businesses(vertical);
CREATE INDEX idx_signals_business_type ON public.signals(business_id, type);
CREATE INDEX idx_lead_views_rank ON public.lead_views(search_job_id, rank);
CREATE INDEX idx_lead_views_score ON public.lead_views(search_job_id, score DESC);
CREATE INDEX idx_people_business ON public.people(business_id);
CREATE INDEX idx_notes_business ON public.notes(business_id);
CREATE INDEX idx_events_entity ON public.events(entity_type, entity_id);
CREATE INDEX idx_events_type ON public.events(type);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic timestamp updates
CREATE TRIGGER update_businesses_updated_at
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security (for single-user app, we'll allow all for now)
ALTER TABLE public.search_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artifacts ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (single-user app)
CREATE POLICY "Allow all operations" ON public.search_jobs FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.businesses FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.people FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.signals FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.lead_views FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.notes FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.tags FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.business_tags FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.status_logs FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.events FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.artifacts FOR ALL USING (true);