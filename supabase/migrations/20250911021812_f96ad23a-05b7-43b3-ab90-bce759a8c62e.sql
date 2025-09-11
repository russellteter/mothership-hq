-- Add search metadata fields to search_jobs table
ALTER TABLE search_jobs 
ADD COLUMN custom_name TEXT,
ADD COLUMN original_prompt TEXT,
ADD COLUMN search_tags JSONB DEFAULT '[]'::jsonb;