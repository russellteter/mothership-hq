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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user from auth header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle both GET and POST requests
    let searchJobId: string;
    
    if (req.method === 'GET') {
      const url = new URL(req.url);
      searchJobId = url.searchParams.get('search_job_id') || '';
    } else {
      const body = await req.json();
      searchJobId = body.search_job_id;
    }
    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    if (!searchJobId) {
      return new Response(
        JSON.stringify({ error: 'search_job_id is required' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Getting search results for job:', searchJobId);

    // Get search job details
    const { data: searchJob, error: jobError } = await supabase
      .from('search_jobs')
      .select('*')
      .eq('id', searchJobId)
      .single();

    if (jobError) {
      return new Response(
        JSON.stringify({ error: 'Search job not found' }), 
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build query for lead views with business data
    let query = supabase
      .from('lead_views')
      .select(`
        id,
        score,
        subscores_json,
        rank,
        businesses!inner (
          id,
          name,
          vertical,
          website,
          phone,
          address_json,
          lat,
          lng,
          franchise_bool,
          created_at
        ),
        search_jobs!inner (
          id,
          status
        )
      `)
      .eq('search_job_id', searchJobId)
      .order('rank', { ascending: true })
      .range(offset, offset + limit - 1);

    const { data: leadViews, error: leadError } = await query;

    if (leadError) {
      throw new Error(`Failed to fetch leads: ${leadError.message}`);
    }

    // Get signals for each business
    const businessIds = leadViews?.map(lv => lv.businesses.id) || [];
    const { data: signals } = await supabase
      .from('signals')
      .select('*')
      .in('business_id', businessIds);

    // Get people for each business
    const { data: people } = await supabase
      .from('people')
      .select('*')
      .in('business_id', businessIds);

    // Get notes for each business
    const { data: notes } = await supabase
      .from('notes')
      .select('*')
      .in('business_id', businessIds);

    // Get tags for each business
    const { data: businessTags } = await supabase
      .from('business_tags')
      .select(`
        business_id,
        tags (
          id,
          label
        )
      `)
      .in('business_id', businessIds);

    // Get current status for each business
    const { data: statusLogs } = await supabase
      .from('status_logs')
      .select('*')
      .in('business_id', businessIds)
      .order('changed_at', { ascending: false });

    // Group related data by business_id
    const signalsByBusiness = signals?.reduce((acc, signal) => {
      if (!acc[signal.business_id]) acc[signal.business_id] = [];
      acc[signal.business_id].push(signal);
      return acc;
    }, {} as Record<string, any[]>) || {};

    const peopleByBusiness = people?.reduce((acc, person) => {
      if (!acc[person.business_id]) acc[person.business_id] = [];
      acc[person.business_id].push(person);
      return acc;
    }, {} as Record<string, any[]>) || {};

    const notesByBusiness = notes?.reduce((acc, note) => {
      if (!acc[note.business_id]) acc[note.business_id] = [];
      acc[note.business_id].push(note);
      return acc;
    }, {} as Record<string, any[]>) || {};

    const tagsByBusiness = businessTags?.reduce((acc, bt) => {
      if (!acc[bt.business_id]) acc[bt.business_id] = [];
      acc[bt.business_id].push(bt.tags);
      return acc;
    }, {} as Record<string, any[]>) || {};

    const statusByBusiness = statusLogs?.reduce((acc, log) => {
      if (!acc[log.business_id]) {
        acc[log.business_id] = log.status;
      }
      return acc;
    }, {} as Record<string, string>) || {};

    // Transform data into Lead format
    const leads = leadViews?.map(leadView => {
      const business = leadView.businesses;
      const businessSignals = signalsByBusiness[business.id] || [];
      const businessPeople = peopleByBusiness[business.id] || [];
      const businessNotes = notesByBusiness[business.id] || [];
      const businessTagsList = tagsByBusiness[business.id] || [];
      const currentStatus = statusByBusiness[business.id] || 'new';

      // Transform signals into the expected format
      const signalsObj: any = {};
      businessSignals.forEach(signal => {
        signalsObj[signal.type] = signal.value_json;
      });

      // Find owner from people
      const owner = businessPeople.find(person => 
        person.role?.toLowerCase().includes('owner') ||
        person.role?.toLowerCase().includes('principal') ||
        person.role?.toLowerCase().includes('dr')
      );

      return {
        rank: leadView.rank,
        score: leadView.score,
        name: business.name,
        city: business.address_json?.city || '',
        state: business.address_json?.state || '',
        website: business.website,
        phone: business.phone,
        signals: signalsObj,
        owner: owner?.name,
        owner_email: owner?.email,
        review_count: businessSignals.find(s => s.type === 'review_count')?.value_json,
        status: currentStatus,
        tags: businessTagsList.map(tag => tag.label),
        business: business,
        people: businessPeople,
        signal_details: businessSignals,
        notes: businessNotes
      };
    }) || [];

    // Filter by status if provided
    const filteredLeads = status ? leads.filter(lead => lead.status === status) : leads;

    return new Response(JSON.stringify({
      search_job: searchJob,
      leads: filteredLeads,
      total: leadViews?.length || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-search-results function:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});