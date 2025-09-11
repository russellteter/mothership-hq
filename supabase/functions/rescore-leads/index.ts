import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScoringWeights {
  ICP: number;
  Pain: number;
  Reachability: number;
  ComplianceRisk: number;
}

interface Signal {
  type: string;
  value_json: any;
  confidence: number;
}

function calculateScore(signals: Signal[], weights: ScoringWeights): { score: number; subscores: any } {
  let icpScore = 0;
  let painScore = 0;
  let reachabilityScore = 0;
  let complianceRisk = 0;
  
  // ICP scoring (weighted%)
  icpScore = 25; // Base score for matching vertical/geo
  
  // Pain scoring (weighted%) - higher pain = higher score
  signals.forEach(signal => {
    switch (signal.type) {
      case 'no_website':
        if (signal.value_json === true) painScore += 15;
        break;
      case 'has_chatbot':
        if (signal.value_json === false) painScore += 10;
        break;
      case 'has_online_booking':
        if (signal.value_json === false) painScore += 10;
        break;
      case 'franchise_guess':
        if (signal.value_json === false) icpScore += 10;
        break;
      case 'owner_identified':
        if (signal.value_json === true) reachabilityScore += 15;
        break;
      case 'review_count':
        const reviewCount = signal.value_json || 0;
        if (reviewCount > 0 && reviewCount < 100) {
          icpScore += 5; // Good established business but not too big
        }
        break;
    }
  });
  
  // Apply weights and calculate final score
  const weightedIcpScore = (icpScore * weights.ICP) / 100;
  const weightedPainScore = (painScore * weights.Pain) / 100;
  const weightedReachabilityScore = (reachabilityScore * weights.Reachability) / 100;
  const weightedComplianceRisk = (complianceRisk * weights.ComplianceRisk) / 100;
  
  const finalScore = Math.min(100, Math.round(
    weightedIcpScore + weightedPainScore + weightedReachabilityScore - weightedComplianceRisk
  ));
  
  return {
    score: finalScore,
    subscores: {
      ICP: Math.round(weightedIcpScore),
      Pain: Math.round(weightedPainScore),
      Reachability: Math.round(weightedReachabilityScore),
      ComplianceRisk: Math.round(weightedComplianceRisk)
    }
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Authentication failed' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { searchJobId, weights }: { searchJobId: string; weights: ScoringWeights } = await req.json();

    console.log('Re-scoring leads for search job:', searchJobId, 'with weights:', weights);

    // Verify the search job belongs to the user
    const { data: searchJob, error: jobError } = await supabase
      .from('search_jobs')
      .select('id')
      .eq('id', searchJobId)
      .eq('user_id', user.id)
      .single();

    if (jobError || !searchJob) {
      return new Response(JSON.stringify({ error: 'Search job not found or unauthorized' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get all lead views for this search job with their signals
    const { data: leadViews, error: leadsError } = await supabase
      .from('lead_views')
      .select(`
        id,
        business_id,
        businesses!inner(
          id,
          signals(type, value_json, confidence)
        )
      `)
      .eq('search_job_id', searchJobId);

    if (leadsError) {
      console.error('Error fetching leads:', leadsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch leads' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Re-scoring ${leadViews?.length || 0} leads`);

    // Re-calculate scores for all leads
    const updates = leadViews?.map(leadView => {
      const business = leadView.businesses as any;
      const signals = business.signals || [];
      
      const { score, subscores } = calculateScore(signals, weights);
      
      return {
        id: leadView.id,
        score,
        subscores_json: subscores
      };
    }) || [];

    // Sort by score to calculate new ranks
    const sortedUpdates = updates.sort((a, b) => b.score - a.score);
    const rankedUpdates = sortedUpdates.map((update, index) => ({
      ...update,
      rank: index + 1
    }));

    // Update all lead views with new scores and ranks
    const updatePromises = rankedUpdates.map(update => 
      supabase
        .from('lead_views')
        .update({
          score: update.score,
          subscores_json: update.subscores_json,
          rank: update.rank
        })
        .eq('id', update.id)
    );

    await Promise.all(updatePromises);

    console.log('Successfully re-scored all leads');

    return new Response(JSON.stringify({ 
      success: true, 
      updated: rankedUpdates.length,
      message: `Successfully re-scored ${rankedUpdates.length} leads`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in rescore-leads function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});