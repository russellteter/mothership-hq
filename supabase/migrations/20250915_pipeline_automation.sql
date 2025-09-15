-- supabase/migrations/20250915_pipeline_automation.sql
-- Adds Opportunities, Automation Runs, Consent Records, and a view joining leads->opportunities.

-- Opportunities: 1:1 with a qualified lead
CREATE TABLE IF NOT EXISTS public.opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  stage TEXT NOT NULL DEFAULT 'Qualified' CHECK (stage IN ('Qualified','Discovery','Proposal','Won','Lost')),
  packages JSONB NOT NULL DEFAULT '[]'::jsonb,
  owner_user_id UUID,
  value_hint INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lead_id)
);

-- Automation runs: compiled workflow executions
CREATE TABLE IF NOT EXISTS public.automation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  package_code TEXT NOT NULL CHECK (package_code IN ('P1','P2','P3')),
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in_progress','completed','failed','awaiting_approval')),
  recipe JSONB NOT NULL,
  logs JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Consent records (per lead, per channel)
CREATE TABLE IF NOT EXISTS public.consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('voice','sms','email')),
  source TEXT NOT NULL,
  text TEXT NOT NULL,
  evidence_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS (permissive for now; tighten later if you add multi-user)
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'opportunities' AND policyname = 'Allow all'
  ) THEN
    CREATE POLICY "Allow all" ON public.opportunities FOR ALL USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'automation_runs' AND policyname = 'Allow all'
  ) THEN
    CREATE POLICY "Allow all" ON public.automation_runs FOR ALL USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'consent_records' AND policyname = 'Allow all'
  ) THEN
    CREATE POLICY "Allow all" ON public.consent_records FOR ALL USING (true);
  END IF;
END$$;

-- UI-friendly view combining opportunity + basic business context
CREATE OR REPLACE VIEW public.opportunity_views AS
SELECT
  o.*,
  b.business_name,
  b.city,
  b.state,
  b.website_url,
  b.detected_features,
  COALESCE(b.review_count, b.user_rating_count) AS review_count,
  b.rating
FROM public.opportunities o
JOIN public.businesses b ON b.id = o.lead_id;


