-- Add missing columns to search_jobs table
ALTER TABLE search_jobs ADD COLUMN IF NOT EXISTS lead_type TEXT;

-- Update search_jobs table to handle status_logs properly by adding search_job_id and related fields to status_logs
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'status_logs' AND column_name = 'search_job_id') THEN
    ALTER TABLE status_logs ADD COLUMN search_job_id UUID;
    ALTER TABLE status_logs ADD COLUMN task TEXT;
    ALTER TABLE status_logs ADD COLUMN message TEXT;
    ALTER TABLE status_logs ADD COLUMN severity TEXT;
    ALTER TABLE status_logs ADD COLUMN ts TEXT;
  END IF;
END $$;