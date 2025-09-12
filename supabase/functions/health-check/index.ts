import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    supabase: {
      status: boolean;
      message?: string;
    };
    googlePlacesApi: {
      status: boolean;
      configured: boolean;
      message?: string;
    };
    openAiApi: {
      status: boolean;
      configured: boolean;
      message?: string;
    };
    edgeFunctions: {
      status: boolean;
      functions: string[];
      message?: string;
    };
  };
  environment: {
    hasSupabaseUrl: boolean;
    hasSupabaseKey: boolean;
    hasGooglePlacesKey: boolean;
    hasOpenAiKey: boolean;
  };
}

async function checkGooglePlacesAPI(): Promise<{ status: boolean; configured: boolean; message?: string }> {
  const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
  
  if (!apiKey) {
    return {
      status: false,
      configured: false,
      message: 'GOOGLE_PLACES_API_KEY environment variable not set'
    };
  }

  if (apiKey === 'your-google-places-api-key' || apiKey.includes('PLACEHOLDER')) {
    return {
      status: false,
      configured: false,
      message: 'Google Places API key appears to be a placeholder'
    };
  }

  try {
    // Test the API key with a simple request
    const testUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?` +
      `input=dentist%20in%20New%20York&inputtype=textquery&fields=name&key=${apiKey}`;
    
    const response = await fetch(testUrl);
    const data = await response.json();
    
    if (data.status === 'OK' || data.status === 'ZERO_RESULTS') {
      return {
        status: true,
        configured: true,
        message: 'Google Places API is working correctly'
      };
    } else if (data.status === 'REQUEST_DENIED') {
      return {
        status: false,
        configured: true,
        message: `Google Places API key is invalid or not authorized: ${data.error_message || 'Unknown error'}`
      };
    } else {
      return {
        status: false,
        configured: true,
        message: `Google Places API returned status: ${data.status}`
      };
    }
  } catch (error) {
    return {
      status: false,
      configured: true,
      message: `Failed to test Google Places API: ${error.message}`
    };
  }
}

async function checkOpenAIAPI(): Promise<{ status: boolean; configured: boolean; message?: string }> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!apiKey) {
    return {
      status: false,
      configured: false,
      message: 'OPENAI_API_KEY environment variable not set'
    };
  }

  if (apiKey.includes('PLACEHOLDER') || apiKey === 'your-openai-api-key') {
    return {
      status: false,
      configured: false,
      message: 'OpenAI API key appears to be a placeholder'
    };
  }

  try {
    // Test the API key with a simple request
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    if (response.ok) {
      return {
        status: true,
        configured: true,
        message: 'OpenAI API is working correctly'
      };
    } else if (response.status === 401) {
      return {
        status: false,
        configured: true,
        message: 'OpenAI API key is invalid or expired'
      };
    } else {
      return {
        status: false,
        configured: true,
        message: `OpenAI API returned status: ${response.status}`
      };
    }
  } catch (error) {
    return {
      status: false,
      configured: true,
      message: `Failed to test OpenAI API: ${error.message}`
    };
  }
}

async function checkSupabase(): Promise<{ status: boolean; message?: string }> {
  try {
    // Try a simple query to test database connection
    const { error } = await supabase
      .from('businesses')
      .select('id')
      .limit(1);
    
    if (error) {
      return {
        status: false,
        message: `Database query failed: ${error.message}`
      };
    }
    
    return {
      status: true,
      message: 'Supabase connection is healthy'
    };
  } catch (error) {
    return {
      status: false,
      message: `Supabase check failed: ${error.message}`
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Run all health checks in parallel
    const [supabaseCheck, googlePlacesCheck, openAiCheck] = await Promise.all([
      checkSupabase(),
      checkGooglePlacesAPI(),
      checkOpenAIAPI()
    ]);

    // Get list of edge functions
    const edgeFunctions = [
      'parse-prompt',
      'search-leads',
      'search-enriched-leads',
      'get-search-results',
      'analyze-website',
      'generate-lead-insights',
      'rescore-leads',
      'health-check'
    ];

    // Determine overall status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (!supabaseCheck.status) {
      overallStatus = 'unhealthy';
    } else if (!googlePlacesCheck.status || !openAiCheck.status) {
      overallStatus = googlePlacesCheck.configured || openAiCheck.configured ? 'degraded' : 'unhealthy';
    }

    const result: HealthCheckResult = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: {
        supabase: supabaseCheck,
        googlePlacesApi: googlePlacesCheck,
        openAiApi: openAiCheck,
        edgeFunctions: {
          status: true,
          functions: edgeFunctions,
          message: `${edgeFunctions.length} functions deployed`
        }
      },
      environment: {
        hasSupabaseUrl: !!Deno.env.get('SUPABASE_URL'),
        hasSupabaseKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
        hasGooglePlacesKey: !!Deno.env.get('GOOGLE_PLACES_API_KEY'),
        hasOpenAiKey: !!Deno.env.get('OPENAI_API_KEY')
      }
    };

    return new Response(
      JSON.stringify(result),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 206 : 503
      }
    );
  } catch (error) {
    console.error('Health check error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Health check failed', 
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});