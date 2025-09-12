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
    // Log planning
    await supabase.from('status_logs').insert({
      search_job_id: jobId,
      task: 'plan',
      message: 'Planning enrichment pipeline',
      severity: 'info',
      ts: new Date().toISOString()
    });

    // Minimal pipeline stub: delegate candidate search to existing function, then limit and mark as completed
    // Later, plug in deterministic verification and GPT-5 synthesis here.
    await supabase.from('status_logs').insert({
      search_job_id: jobId,
      task: 'candidate_selection',
      message: 'Selecting high-quality candidates',
      severity: 'info',
      ts: new Date().toISOString()
    });
    const { data: candidates, error: searchError } = await supabase.functions.invoke('search-leads', {
      body: { dsl: dsl_json, original_prompt, custom_name, search_tags, lead_type },
      headers: { Authorization: `Bearer ${token}` }
    });

    if (searchError) throw searchError;

    const candidateJobId = candidates.job_id as string;

    // Fetch final results from get-search-results for the candidate job, then take top N as a placeholder
    await supabase.from('status_logs').insert({
      search_job_id: jobId,
      task: 'verifying',
      message: 'Running deterministic verification checks (stub)',
      severity: 'info',
      ts: new Date().toISOString()
    });
    const { data: finalData, error: resultError } = await supabase.functions.invoke('get-search-results', {
      body: { search_job_id: candidateJobId },
      headers: { Authorization: `Bearer ${token}` }
    });

    if (resultError) throw resultError;

    const top = (finalData?.leads || []).slice(0, limit);

    // Persist lead views for this enriched job (placeholder pass-through)
    if (top.length > 0) {
      const rows = top.map((lead: any, idx: number) => ({
        search_job_id: jobId,
        business_id: lead.business.id,
        score: lead.score || 0,
        subscores_json: lead.subscores || null,
        rank: idx + 1
      }));
      await supabase.from('lead_views').insert(rows);
    }

    // Synthesis (stub)
    await supabase.from('status_logs').insert({
      search_job_id: jobId,
      task: 'synthesizing',
      message: 'Synthesizing enriched output (stub)',
      severity: 'info',
      ts: new Date().toISOString()
    });

    // Mark job as completed
    await supabase.from('search_jobs').update({ status: 'completed' }).eq('id', jobId);
    await supabase.from('status_logs').insert({
      search_job_id: jobId,
      task: 'completed',
      message: `Completed enriched search with ${top.length} leads`,
      severity: 'success',
      ts: new Date().toISOString()
    });

    return new Response(JSON.stringify({ job_id: jobId, status: 'completed', enriched_count: top.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('search-enriched-leads error:', error);
    return new Response(JSON.stringify({ error: error.message || String(error) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

