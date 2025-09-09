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

// JSON Schema for LeadQuery DSL validation
const leadQuerySchema = {
  type: "object",
  required: ["version", "vertical", "geo", "constraints", "result_size", "sort_by", "lead_profile", "output", "notify", "compliance_flags"],
  properties: {
    version: { type: "number", const: 1 },
    vertical: { 
      type: "string", 
      enum: ["dentist", "law_firm", "contractor", "hvac", "roofing", "generic"] 
    },
    geo: {
      type: "object",
      required: ["city", "state"],
      properties: {
        city: { type: "string" },
        state: { type: "string" },
        radius_km: { type: "number", minimum: 1, maximum: 100 }
      }
    },
    constraints: {
      type: "object",
      required: ["must"],
      properties: {
        must: {
          type: "array",
          items: {
            type: "object",
            properties: {
              no_website: { type: "boolean" },
              has_chatbot: { type: "boolean" },
              has_online_booking: { type: "boolean" },
              owner_identified: { type: "boolean" },
              franchise: { type: "boolean" }
            }
          }
        },
        optional: {
          type: "array",
          items: {
            type: "object",
            properties: {
              no_website: { type: "boolean" },
              has_chatbot: { type: "boolean" },
              has_online_booking: { type: "boolean" },
              owner_identified: { type: "boolean" },
              franchise: { type: "boolean" }
            }
          }
        }
      }
    },
    exclusions: {
      type: "array",
      items: { type: "string" }
    },
    result_size: {
      type: "object",
      required: ["target"],
      properties: {
        target: { type: "number", minimum: 10, maximum: 500 }
      }
    },
    sort_by: {
      type: "string",
      enum: ["score_desc", "score_asc", "name_asc"]
    },
    lead_profile: { type: "string" },
    output: {
      type: "object",
      required: ["contract"],
      properties: {
        contract: { type: "string", enum: ["csv", "json"] }
      }
    },
    notify: {
      type: "object",
      required: ["on_complete"],
      properties: {
        on_complete: { type: "boolean" }
      }
    },
    compliance_flags: {
      type: "array",
      items: { type: "string" }
    }
  }
};

const systemPrompt = `You are a prompt parser for a B2B lead finder. Convert user prompts into a LeadQuery DSL JSON that matches this schema:

${JSON.stringify(leadQuerySchema, null, 2)}

Guidelines:
- Always set version: 1
- Map business types to verticals: "dentist", "law_firm", "contractor", "hvac", "roofing", or "generic"
- Extract city/state from location mentions
- Convert constraints like "no chat widget" to has_chatbot: false
- Convert "owner identified" to owner_identified: true
- Set reasonable defaults: result_size.target: 250, sort_by: "score_desc", lead_profile: "generic"
- Include standard compliance flags: ["respect_dnc", "two_party_recording_state_notes"]
- If ambiguous, make conservative choices and include warnings

Examples:
"dentists in Columbia, SC with no chat widget and owner identified" →
{
  "version": 1,
  "vertical": "dentist",
  "geo": {"city": "Columbia", "state": "SC"},
  "constraints": {"must": [{"has_chatbot": false}, {"owner_identified": true}]},
  "exclusions": [],
  "result_size": {"target": 250},
  "sort_by": "score_desc",
  "lead_profile": "generic",
  "output": {"contract": "csv"},
  "notify": {"on_complete": true},
  "compliance_flags": ["respect_dnc", "two_party_recording_state_notes"]
}

Return ONLY valid JSON matching the schema. Include a "warnings" array for any ambiguities.`;

function validateDSL(dsl: any): string[] {
  const errors: string[] = [];
  
  // Basic validation
  if (!dsl.version || dsl.version !== 1) errors.push("Version must be 1");
  if (!dsl.vertical) errors.push("Vertical is required");
  if (!dsl.geo?.city || !dsl.geo?.state) errors.push("City and state are required");
  if (!dsl.constraints?.must) errors.push("Must constraints are required");
  if (!dsl.result_size?.target) errors.push("Result size target is required");
  
  return errors;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();
    
    if (!prompt || typeof prompt !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Parsing prompt:', prompt);

    // Call OpenAI to parse the prompt
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices[0].message.content;
    
    console.log('AI response:', content);

    // Parse the JSON response
    let parsedResult;
    try {
      parsedResult = JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse AI response as JSON:', e);
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate the DSL
    const validationErrors = validateDSL(parsedResult.dsl || parsedResult);
    const warnings = parsedResult.warnings || [];
    
    if (validationErrors.length > 0) {
      warnings.push(...validationErrors);
    }

    const result = {
      dsl: parsedResult.dsl || parsedResult,
      warnings
    };

    console.log('Parse result:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in parse-prompt function:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});