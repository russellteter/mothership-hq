import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// GPT-5 Responses API configuration
interface GPT5ResponsesRequest {
  model: string;
  reasoning?: { effort: 'low' | 'medium' | 'high' };
  input: Array<{ role: string; content: string }>;
  max_output_tokens?: number;
}

interface GPT5ResponsesResponse {
  output_text: string;
  reasoning_summary?: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    reasoning_tokens: number;
  };
}

// GPT-5 Planning with Responses API
async function planSearchWithGPT5(userQuery: string): Promise<any> {
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured for GPT-5 planning');
  }

  const planningRequest: GPT5ResponsesRequest = {
    model: 'gpt-5-mini',
    reasoning: { effort: 'low' },
    input: [{
      role: 'system',
      content: 'You plan verification; the code collects evidence. Emit a compact JSON plan with: Places queries (1 primary + up to 4 alternates), website paths to check, booking vendor patterns, enrichment order, and cross-validation rules. Keep it machine-readable and ≤25 steps.'
    }, {
      role: 'user', 
      content: `Plan a verification workflow for: "${userQuery}". Output strict JSON with:
- places_queries: [primary, alternates...]
- website_paths_to_check: ["/","/book","/schedule","/appointments","/contact"]
- booking_vendor_patterns: ["calendly","acuityscheduling","squareup.com/appointments","housecallpro","servicetitan","scheduleengine","setmore","thryv","workiz"]
- cross_validation_rules: short bullets
- enrichment_order: sources to try for contacts`
    }],
    max_output_tokens: 2048
  };

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(planningRequest)
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('GPT-5 API error:', response.status, errorData);
      throw new Error(`GPT-5 API error: ${response.status}`);
    }

    const result: GPT5ResponsesResponse = await response.json();
    return JSON.parse(result.output_text);
  } catch (error) {
    console.error('GPT-5 planning error:', error);
    throw error;
  }
}

// GPT-5 Synthesis with Responses API
async function synthesizeWithGPT5(leads: any[], evidenceLog: any[]): Promise<any> {
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured for GPT-5 synthesis');
  }

  const synthesisRequest: GPT5ResponsesRequest = {
    model: 'gpt-5',
    reasoning: { effort: 'medium' },
    input: [{
      role: 'system',
      content: 'Given deterministic fields and an evidence_log, produce confidence_reasons (bullets citing evidence items by URL), a one-line recommendation, and (if requested) ranked lead labels. Do not override boolean flags—explain uncertainty if evidence is weak.'
    }, {
      role: 'user',
      content: JSON.stringify({ leads, evidence_log: evidenceLog })
    }],
    max_output_tokens: 4096
  };

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(synthesisRequest)
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('GPT-5 synthesis API error:', response.status, errorData);
      throw new Error(`GPT-5 synthesis API error: ${response.status}`);
    }

    const result: GPT5ResponsesResponse = await response.json();
    return JSON.parse(result.output_text);
  } catch (error) {
    console.error('GPT-5 synthesis error:', error);
    return {
      confidence_reasons: ['Evidence synthesis unavailable due to API error'],
      recommendation: 'Manual review recommended',
      ranked_summary: 'GPT-5 synthesis failed'
    };
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body once and reuse it
    const body = await req.json();
    const { operation } = body;

    if (operation === 'plan') {
      const { userQuery } = body;
      if (!userQuery) {
        return new Response(
          JSON.stringify({ error: 'userQuery is required for plan operation' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const plan = await planSearchWithGPT5(userQuery);
      return new Response(
        JSON.stringify({ plan }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (operation === 'synthesize') {
      const { leads, evidenceLog } = body;
      if (!leads || !evidenceLog) {
        return new Response(
          JSON.stringify({ error: 'leads and evidenceLog are required for synthesize operation' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const synthesis = await synthesizeWithGPT5(leads, evidenceLog);
      return new Response(
        JSON.stringify({ synthesis }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid operation. Use "plan" or "synthesize"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('GPT-5 planner error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});