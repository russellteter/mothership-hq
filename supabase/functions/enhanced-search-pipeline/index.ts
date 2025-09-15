import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const googleMapsApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');

const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced search pipeline orchestrator
// This function coordinates the GPT-5 reasoning + Google Places verification pipeline
async function orchestrateEnhancedSearch(userQuery: string, enrichmentFlags: any): Promise<any> {
  const results = {
    plan: null,
    places_data: [],
    leads: [],
    evidence_log: [],
    synthesis: null,
    pipeline_success: false,
    errors: []
  };

  try {
    console.log('Starting enhanced search pipeline for:', userQuery);
    
    // Step 1: GPT-5 Planning (reasoning effort: low)
    console.log('Step 1: GPT-5 Planning');
    try {
      const plannerResponse = await fetch(`${supabaseUrl}/functions/v1/gpt5-planner`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'apikey': supabaseKey
        },
        body: JSON.stringify({
          userQuery,
          operation: 'plan'
        })
      });

      if (plannerResponse.ok) {
        const planData = await plannerResponse.json();
        results.plan = planData.plan;
        console.log('GPT-5 plan generated successfully');
      } else {
        throw new Error(`Planning failed: ${plannerResponse.status}`);
      }
    } catch (error) {
      console.error('Planning step failed:', error);
      results.errors.push(`Planning: ${error.message}`);
    }

    // Step 2: Google Places Text Search (New)
    console.log('Step 2: Google Places Text Search');
    if (results.plan && googleMapsApiKey) {
      try {
        const placesQuery = results.plan.places_queries?.[0] || userQuery;
        const placesResponse = await fetch(`${supabaseUrl}/functions/v1/google-places-enhanced`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'apikey': supabaseKey
          },
          body: JSON.stringify({
            operation: 'searchText',
            textQuery: placesQuery,
            maxResultCount: 20,
            fieldMask: [
              'places.id',
              'places.displayName',
              'places.formattedAddress',
              'places.types',
              'places.websiteUri',
              'places.rating',
              'places.userRatingCount',
              'places.googleMapsUri',
              'places.nationalPhoneNumber'
            ]
          })
        });

        if (placesResponse.ok) {
          const placesData = await placesResponse.json();
          results.places_data = placesData.places || [];
          console.log(`Found ${results.places_data.length} places`);
        } else {
          throw new Error(`Places search failed: ${placesResponse.status}`);
        }
      } catch (error) {
        console.error('Places search failed:', error);
        results.errors.push(`Places: ${error.message}`);
      }
    }

    // Step 3: Website Auditing & Lead Processing
    console.log('Step 3: Website Auditing');
    const processedLeads = [];
    const allEvidence = [];

    for (const place of results.places_data.slice(0, 10)) { // Limit for cost control
      try {
        const websiteUrl = place.websiteUri;
        const pathsToCheck = results.plan?.website_paths_to_check || ['/', '/book', '/contact'];

        // Audit website if available
        let auditResult = null;
        if (websiteUrl) {
          const auditResponse = await fetch(`${supabaseUrl}/functions/v1/website-auditor`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
              'apikey': supabaseKey
            },
            body: JSON.stringify({
              website_url: websiteUrl,
              paths_to_check: pathsToCheck
            })
          });

          if (auditResponse.ok) {
            const auditData = await auditResponse.json();
            auditResult = auditData.audit_result;
            allEvidence.push(...(auditResult.evidence_log || []));
          }
        }

        // Create lead object with enhanced data
        const leadData = {
          business_name: place.displayName?.text || place.displayName || '',
          website_url: websiteUrl || '',
          has_website: Boolean(websiteUrl),
          detected_features: auditResult?.detected_features || {},
          rating: place.rating,
          user_rating_count: place.userRatingCount,
          address: place.formattedAddress || '',
          phone: place.nationalPhoneNumber || '',
          google_maps_uri: place.googleMapsUri || '',
          evidence_log: auditResult?.evidence_log || [],
          places_api_data: place,
          website_audit_data: auditResult
        };

        // Score the lead
        const scoringResponse = await fetch(`${supabaseUrl}/functions/v1/lead-scorer`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'apikey': supabaseKey
          },
          body: JSON.stringify({
            leads: leadData,
            operation: 'score'
          })
        });

        if (scoringResponse.ok) {
          const scoringData = await scoringResponse.json();
          leadData.lead_score = scoringData.scoring_result.lead_score;
          leadData.scoring_breakdown = scoringData.scoring_result.scoring_breakdown;
          leadData.confidence_reasons = scoringData.scoring_result.confidence_reasons;
        }

        processedLeads.push(leadData);
      } catch (error) {
        console.error(`Error processing place ${place.displayName}:`, error);
        results.errors.push(`Processing ${place.displayName}: ${error.message}`);
      }
    }

    results.leads = processedLeads;
    results.evidence_log = allEvidence;

    // Step 4: GPT-5 Synthesis (reasoning effort: medium)
    console.log('Step 4: GPT-5 Synthesis');
    if (enrichmentFlags.gpt5 && results.leads.length > 0) {
      try {
        const synthesisResponse = await fetch(`${supabaseUrl}/functions/v1/gpt5-planner`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'apikey': supabaseKey
          },
          body: JSON.stringify({
            operation: 'synthesize',
            leads: results.leads,
            evidenceLog: results.evidence_log
          })
        });

        if (synthesisResponse.ok) {
          const synthesisData = await synthesisResponse.json();
          results.synthesis = synthesisData.synthesis;
          console.log('GPT-5 synthesis completed');
        }
      } catch (error) {
        console.error('Synthesis failed:', error);
        results.errors.push(`Synthesis: ${error.message}`);
      }
    }

    // Sort leads by score
    results.leads.sort((a, b) => (b.lead_score || 0) - (a.lead_score || 0));

    results.pipeline_success = results.leads.length > 0;
    console.log(`Enhanced pipeline completed. Found ${results.leads.length} leads.`);

    return results;
  } catch (error) {
    console.error('Enhanced search pipeline error:', error);
    results.errors.push(`Pipeline: ${error.message}`);
    return results;
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_query, enrichment_flags = {} } = await req.json();

    if (!user_query) {
      return new Response(
        JSON.stringify({ error: 'user_query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = await orchestrateEnhancedSearch(user_query, enrichment_flags);

    return new Response(
      JSON.stringify({
        success: results.pipeline_success,
        leads: results.leads,
        plan: results.plan,
        synthesis: results.synthesis,
        evidence_log: results.evidence_log,
        metadata: {
          total_leads: results.leads.length,
          pipeline_version: '1.0-gpt5',
          timestamp: new Date().toISOString(),
          enrichment_flags: enrichment_flags,
          errors: results.errors
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Enhanced search pipeline error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});