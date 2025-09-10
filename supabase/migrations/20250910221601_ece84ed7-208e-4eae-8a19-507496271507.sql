-- Create signal_overrides table for tracking user corrections
CREATE TABLE public.signal_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  signal_id UUID NOT NULL,
  user_id UUID NOT NULL,
  is_correct BOOLEAN NOT NULL,
  reasoning TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.signal_overrides ENABLE ROW LEVEL SECURITY;

-- Create policies for signal overrides
CREATE POLICY "Users can view their own signal overrides" 
ON public.signal_overrides 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own signal overrides" 
ON public.signal_overrides 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own signal overrides" 
ON public.signal_overrides 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add soft delete capability to search_jobs
ALTER TABLE public.search_jobs ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create proper saved_searches table
CREATE TABLE public.saved_searches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  dsl_json JSONB NOT NULL,
  search_job_id UUID REFERENCES public.search_jobs(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for saved_searches
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

-- Create policies for saved_searches
CREATE POLICY "Users can view their own saved searches" 
ON public.saved_searches 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved searches" 
ON public.saved_searches 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved searches" 
ON public.saved_searches 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved searches" 
ON public.saved_searches 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_saved_searches_updated_at
BEFORE UPDATE ON public.saved_searches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_signal_overrides_business_id ON public.signal_overrides(business_id);
CREATE INDEX idx_signal_overrides_user_id ON public.signal_overrides(user_id);
CREATE INDEX idx_saved_searches_user_id ON public.saved_searches(user_id);
CREATE INDEX idx_search_jobs_deleted_at ON public.search_jobs(deleted_at) WHERE deleted_at IS NULL;