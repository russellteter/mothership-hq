-- Add lead_type column to search_jobs table
ALTER TABLE search_jobs 
ADD COLUMN IF NOT EXISTS lead_type text;

-- Add comment for documentation
COMMENT ON COLUMN search_jobs.lead_type IS 'Type/category of leads being searched (e.g., hot, warm, cold)';