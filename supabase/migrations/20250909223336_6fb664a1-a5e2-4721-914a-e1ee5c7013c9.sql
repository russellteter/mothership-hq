-- Create user profiles table for authentication
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies - users can only see and update their own profile
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Update RLS policies for all tables to require authentication
-- Remove existing overly permissive policies
DROP POLICY IF EXISTS "Allow all operations" ON public.businesses;
DROP POLICY IF EXISTS "Allow all operations" ON public.search_jobs;
DROP POLICY IF EXISTS "Allow all operations" ON public.lead_views;
DROP POLICY IF EXISTS "Allow all operations" ON public.signals;
DROP POLICY IF EXISTS "Allow all operations" ON public.people;
DROP POLICY IF EXISTS "Allow all operations" ON public.notes;
DROP POLICY IF EXISTS "Allow all operations" ON public.tags;
DROP POLICY IF EXISTS "Allow all operations" ON public.business_tags;
DROP POLICY IF EXISTS "Allow all operations" ON public.status_logs;
DROP POLICY IF EXISTS "Allow all operations" ON public.events;
DROP POLICY IF EXISTS "Allow all operations" ON public.artifacts;

-- Add user_id column to search_jobs for user ownership
ALTER TABLE public.search_jobs ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create secure RLS policies for authenticated users
-- Search jobs - users can only see their own search jobs
CREATE POLICY "Users can view their own search jobs" 
ON public.search_jobs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own search jobs" 
ON public.search_jobs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own search jobs" 
ON public.search_jobs 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Businesses - users can only see businesses from their search jobs
CREATE POLICY "Users can view businesses from their searches" 
ON public.businesses 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.lead_views lv 
    JOIN public.search_jobs sj ON lv.search_job_id = sj.id 
    WHERE lv.business_id = businesses.id AND sj.user_id = auth.uid()
  )
);

CREATE POLICY "Service can insert businesses" 
ON public.businesses 
FOR INSERT 
WITH CHECK (true);

-- Lead views - users can only see lead views from their search jobs
CREATE POLICY "Users can view their own lead views" 
ON public.lead_views 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.search_jobs sj 
    WHERE sj.id = lead_views.search_job_id AND sj.user_id = auth.uid()
  )
);

CREATE POLICY "Service can insert lead views" 
ON public.lead_views 
FOR INSERT 
WITH CHECK (true);

-- Signals - users can only see signals for businesses they have access to
CREATE POLICY "Users can view signals for their businesses" 
ON public.signals 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.lead_views lv 
    JOIN public.search_jobs sj ON lv.search_job_id = sj.id 
    WHERE lv.business_id = signals.business_id AND sj.user_id = auth.uid()
  )
);

CREATE POLICY "Service can insert signals" 
ON public.signals 
FOR INSERT 
WITH CHECK (true);

-- People - users can only see people for businesses they have access to
CREATE POLICY "Users can view people for their businesses" 
ON public.people 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.lead_views lv 
    JOIN public.search_jobs sj ON lv.search_job_id = sj.id 
    WHERE lv.business_id = people.business_id AND sj.user_id = auth.uid()
  )
);

CREATE POLICY "Service can insert people" 
ON public.people 
FOR INSERT 
WITH CHECK (true);

-- Notes - users can only see/manage notes for businesses they have access to
CREATE POLICY "Users can view notes for their businesses" 
ON public.notes 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.lead_views lv 
    JOIN public.search_jobs sj ON lv.search_job_id = sj.id 
    WHERE lv.business_id = notes.business_id AND sj.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert notes for their businesses" 
ON public.notes 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.lead_views lv 
    JOIN public.search_jobs sj ON lv.search_job_id = sj.id 
    WHERE lv.business_id = notes.business_id AND sj.user_id = auth.uid()
  )
);

-- Tags - users can see all tags but only create their own
CREATE POLICY "Users can view all tags" 
ON public.tags 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create tags" 
ON public.tags 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Business tags - users can only manage tags for their businesses
CREATE POLICY "Users can view business tags for their businesses" 
ON public.business_tags 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.lead_views lv 
    JOIN public.search_jobs sj ON lv.search_job_id = sj.id 
    WHERE lv.business_id = business_tags.business_id AND sj.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert business tags for their businesses" 
ON public.business_tags 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.lead_views lv 
    JOIN public.search_jobs sj ON lv.search_job_id = sj.id 
    WHERE lv.business_id = business_tags.business_id AND sj.user_id = auth.uid()
  )
);

-- Status logs - users can only see status logs for their businesses
CREATE POLICY "Users can view status logs for their businesses" 
ON public.status_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.lead_views lv 
    JOIN public.search_jobs sj ON lv.search_job_id = sj.id 
    WHERE lv.business_id = status_logs.business_id AND sj.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert status logs for their businesses" 
ON public.status_logs 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.lead_views lv 
    JOIN public.search_jobs sj ON lv.search_job_id = sj.id 
    WHERE lv.business_id = status_logs.business_id AND sj.user_id = auth.uid()
  )
);

-- Events and artifacts - service level access only for now
CREATE POLICY "Service can manage events" 
ON public.events 
FOR ALL 
USING (true);

CREATE POLICY "Service can manage artifacts" 
ON public.artifacts 
FOR ALL 
USING (true);

-- Create trigger for updating profiles updated_at
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();