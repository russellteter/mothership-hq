import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { dsl_json, options, limit: rawLimit, original_prompt, custom_name, search_tags, lead_type } = await req.json();
    const limit = Math.min(Math.max(Number(rawLimit) || 10, 1), 20);

    // Create a search job record (reuse search_jobs table if present)
    const { data: jobInsert, error: jobError } = await supabase
      .from('search_jobs')
      .insert({
        user_id: user.id,
        dsl_json,
        status: 'running',
        original_prompt,
        custom_name,
        search_tags,
        lead_type
      })
      .select('id')
      .single();

    if (jobError) throw jobError;
    const jobId = jobInsert.id as string;

    // Minimal pipeline stub: delegate candidate search to existing function, then limit and mark as completed
    // Later, plug in deterministic verification and GPT-5 synthesis here.
    const { data: candidates, error: searchError } = await supabase.functions.invoke('search-leads', {
      body: { dsl: dsl_json, original_prompt, custom_name, search_tags, lead_type },
      headers: { Authorization: `Bearer ${token}` }
    });

    if (searchError) throw searchError;

    const candidateJobId = candidates.job_id as string;

    // Fetch final results from get-search-results for the candidate job, then take top N as a placeholder
    const { data: finalData, error: resultError } = await supabase.functions.invoke('get-search-results', {
      body: { search_job_id: candidateJobId },
      headers: { Authorization: `Bearer ${token}` }
    });

    if (resultError) throw resultError;

    const top = (finalData?.leads || []).slice(0, limit);

    // Update the enriched job as completed and attach enriched results (placeholder pass-through)
    await supabase
      .from('search_jobs')
      .update({ status: 'completed' })
      .eq('id', jobId);

    // Persist views for the enriched job if your schema expects it
    // Skipped here for brevity; frontend will read via get-search-results with jobId when wired.

    return new Response(JSON.stringify({ job_id: jobId, status: 'running', note: 'Enrichment pipeline stubbed; implement verification and synthesis.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('search-enriched-leads error:', error);
    return new Response(JSON.stringify({ error: error.message || String(error) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

