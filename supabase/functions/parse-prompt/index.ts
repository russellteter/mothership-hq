import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced Zod schema for LeadQuery validation
const ConstraintSchema = z.object({
  no_website: z.boolean().optional(),
  has_chatbot: z.boolean().optional(),
  has_online_booking: z.boolean().optional(),
  owner_identified: z.boolean().optional(),
  franchise: z.boolean().optional(),
  // New constraint types
  has_payment_processor: z.boolean().optional(),
  has_crm: z.boolean().optional(),
  has_marketing_automation: z.boolean().optional(),
  mobile_responsive: z.boolean().optional(),
  ssl_certificate: z.boolean().optional(),
  social_media_active: z.boolean().optional(),
  reviews_count_gt: z.number().optional(),
  reviews_count_lt: z.number().optional(),
  rating_gt: z.number().optional(),
  rating_lt: z.number().optional(),
  years_in_business_gt: z.number().optional(),
  years_in_business_lt: z.number().optional(),
  employee_count_range: z.array(z.number()).length(2).optional(),
});

const LeadQuerySchema = z.object({
  version: z.literal(1),
  vertical: z.enum(['dentist', 'law_firm', 'contractor', 'hvac', 'roofing', 
                     'restaurant', 'retail', 'healthcare', 'fitness', 'beauty', 
                     'automotive', 'real_estate', 'insurance', 'financial', 'generic']),
  geo: z.object({
    city: z.string().min(1),
    state: z.string().length(2).toUpperCase(),
    radius_km: z.number().min(1).max(100).default(25),
    zip_codes: z.array(z.string()).optional(),
    neighborhoods: z.array(z.string()).optional(),
  }),
  constraints: z.object({
    must: z.array(ConstraintSchema),
    optional: z.array(ConstraintSchema).optional(),
    exclude: z.array(ConstraintSchema).optional(),
  }),
  exclusions: z.array(z.string()).optional(),
  result_size: z.object({
    target: z.number().min(10).max(1000).default(250),
    minimum: z.number().min(5).optional(),
  }),
  scoring: z.object({
    weights: z.object({
      icp_match: z.number().min(0).max(1).default(0.35),
      pain_signals: z.number().min(0).max(1).default(0.35),
      reachability: z.number().min(0).max(1).default(0.20),
      compliance_risk: z.number().min(0).max(1).default(0.10),
    }).optional(),
    profile: z.enum(['generic', 'sales_ready', 'marketing_qualified', 'tech_savvy', 'traditional']).default('generic'),
  }).optional(),
  sort_by: z.enum(['score_desc', 'score_asc', 'name_asc', 'recent_first', 'reviews_desc']).default('score_desc'),
  lead_profile: z.string().optional(),
  output: z.object({
    contract: z.enum(['csv', 'json', 'excel']).default('json'),
    include_fields: z.array(z.string()).optional(),
  }),
  notify: z.object({
    on_complete: z.boolean().default(true),
    webhook_url: z.string().url().optional(),
    email: z.string().email().optional(),
  }),
  compliance_flags: z.array(z.string()).default(['respect_dnc', 'two_party_recording_state_notes']),
  metadata: z.object({
    campaign_id: z.string().optional(),
    tags: z.array(z.string()).optional(),
    notes: z.string().optional(),
  }).optional(),
});

// Enhanced prompt patterns and synonyms
const VERTICAL_SYNONYMS: Record<string, string[]> = {
  dentist: ['dental', 'dentistry', 'orthodontist', 'oral surgeon', 'dental clinic', 'teeth'],
  law_firm: ['lawyer', 'attorney', 'legal', 'law office', 'solicitor', 'counsel'],
  contractor: ['construction', 'builder', 'general contractor', 'remodeling', 'renovation'],
  hvac: ['heating', 'cooling', 'air conditioning', 'ac', 'furnace', 'heat pump'],
  roofing: ['roofer', 'roof repair', 'roof replacement', 'shingles'],
  restaurant: ['dining', 'eatery', 'cafe', 'bistro', 'diner', 'food service'],
  retail: ['store', 'shop', 'boutique', 'retailer', 'merchant'],
  healthcare: ['medical', 'clinic', 'doctor', 'physician', 'health center'],
  fitness: ['gym', 'fitness center', 'health club', 'workout', 'training'],
  beauty: ['salon', 'spa', 'barbershop', 'hair', 'nails', 'aesthetics'],
};

const CONSTRAINT_PATTERNS = {
  no_website: /\b(no|without|lacking|missing)\s+(website|site|web\s*presence)/i,
  has_chatbot: /\b(with|has|have)\s+(chat|chatbot|live\s*chat|messaging)/i,
  no_chatbot: /\b(no|without|lacking)\s+(chat|chatbot|live\s*chat|messaging)/i,
  has_online_booking: /\b(with|has|have)\s+(online\s*booking|scheduling|appointment)/i,
  no_online_booking: /\b(no|without|lacking)\s+(online\s*booking|scheduling|appointment)/i,
  owner_identified: /\b(owner|principal|founder)\s+(identified|known|available|contact)/i,
  franchise: /\b(franchise|franchised|chain)/i,
  not_franchise: /\b(independent|local|not\s*franchise|non-franchise)/i,
  reviews_high: /\b(many|high|lots?\s*of)\s+reviews?/i,
  reviews_low: /\b(few|low|no|lacking)\s+reviews?/i,
  rating_high: /\b(high|good|excellent)\s+rating/i,
  rating_low: /\b(low|poor|bad)\s+rating/i,
  established: /\b(established|old|mature|years?\s+in\s+business)/i,
  new_business: /\b(new|recent|startup|young)\s+business/i,
};

// Simple OpenAI completion
async function generateCompletion(prompt: string, systemPrompt: string): Promise<string> {
  if (!openAIApiKey) throw new Error('OpenAI API key not configured');
  
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
      max_tokens: 1500,
      response_format: { type: "json_object" }
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Enhanced geocoding with validation
async function validateAndGeocodeLocation(location: string): Promise<{
  city: string;
  state: string;
  lat?: number;
  lng?: number;
  zip_codes?: string[];
}> {
  // Try to extract city and state from the location string
  const patterns = [
    /^(.+?),\s*([A-Z]{2})$/i, // City, ST
    /^(.+?)\s+([A-Z]{2})$/i,  // City ST
    /^(.+?),\s*(.+?)$/,        // City, State
  ];
  
  for (const pattern of patterns) {
    const match = location.match(pattern);
    if (match) {
      const city = match[1].trim();
      let state = match[2].trim();
      
      // Convert full state names to abbreviations
      const stateAbbreviations: Record<string, string> = {
        'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
        'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
        'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
        'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
        'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
        'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
        'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
        'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
        'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
        'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
        'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
        'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
        'wisconsin': 'WI', 'wyoming': 'WY'
      };
      
      if (state.length > 2) {
        state = stateAbbreviations[state.toLowerCase()] || state.substring(0, 2).toUpperCase();
      }
      
      return { city, state: state.toUpperCase() };
    }
  }
  
  // If no pattern matches, try to make an educated guess
  const parts = location.split(/[,\s]+/);
  if (parts.length >= 2) {
    const state = parts[parts.length - 1];
    const city = parts.slice(0, -1).join(' ');
    return { city, state: state.substring(0, 2).toUpperCase() };
  }
  
  throw new Error(`Could not parse location: ${location}`);
}

// Extract constraints from natural language
function extractConstraints(prompt: string): {
  must: any[];
  optional: any[];
  exclude: any[];
} {
  const must: any[] = [];
  const optional: any[] = [];
  const exclude: any[] = [];
  
  // Check for website constraints
  if (CONSTRAINT_PATTERNS.no_website.test(prompt)) {
    must.push({ no_website: true });
  }
  
  // Check for chatbot constraints
  if (CONSTRAINT_PATTERNS.has_chatbot.test(prompt)) {
    must.push({ has_chatbot: true });
  } else if (CONSTRAINT_PATTERNS.no_chatbot.test(prompt)) {
    must.push({ has_chatbot: false });
  }
  
  // Check for booking constraints
  if (CONSTRAINT_PATTERNS.has_online_booking.test(prompt)) {
    must.push({ has_online_booking: true });
  } else if (CONSTRAINT_PATTERNS.no_online_booking.test(prompt)) {
    must.push({ has_online_booking: false });
  }
  
  // Check for owner identification
  if (CONSTRAINT_PATTERNS.owner_identified.test(prompt)) {
    must.push({ owner_identified: true });
  }
  
  // Check for franchise constraints
  if (CONSTRAINT_PATTERNS.franchise.test(prompt)) {
    must.push({ franchise: true });
  } else if (CONSTRAINT_PATTERNS.not_franchise.test(prompt)) {
    must.push({ franchise: false });
  }
  
  // Check for review constraints
  if (CONSTRAINT_PATTERNS.reviews_high.test(prompt)) {
    optional.push({ reviews_count_gt: 50 });
  } else if (CONSTRAINT_PATTERNS.reviews_low.test(prompt)) {
    optional.push({ reviews_count_lt: 10 });
  }
  
  // Check for rating constraints
  if (CONSTRAINT_PATTERNS.rating_high.test(prompt)) {
    optional.push({ rating_gt: 4.0 });
  } else if (CONSTRAINT_PATTERNS.rating_low.test(prompt)) {
    optional.push({ rating_lt: 3.0 });
  }
  
  // Check for business age
  if (CONSTRAINT_PATTERNS.established.test(prompt)) {
    optional.push({ years_in_business_gt: 5 });
  } else if (CONSTRAINT_PATTERNS.new_business.test(prompt)) {
    optional.push({ years_in_business_lt: 2 });
  }
  
  return { must, optional, exclude };
}

// Detect vertical from prompt
function detectVertical(prompt: string): string {
  const promptLower = prompt.toLowerCase();
  
  for (const [vertical, synonyms] of Object.entries(VERTICAL_SYNONYMS)) {
    for (const synonym of synonyms) {
      if (promptLower.includes(synonym)) {
        return vertical;
      }
    }
  }
  
  return 'generic';
}

// Enhanced system prompt for LLM
const ENHANCED_SYSTEM_PROMPT = `You are an expert B2B lead query parser. Convert natural language searches into structured LeadQuery JSON.

IMPORTANT RULES:
1. Always output valid JSON matching the provided schema
2. Be conservative with constraints - only add them if explicitly mentioned
3. Infer reasonable defaults when not specified
4. Include warnings for any ambiguities or assumptions
5. Support complex queries with multiple constraints
6. Recognize industry-specific terminology

When parsing:
- Extract business type/vertical from context
- Parse location carefully (city, state, radius)
- Identify all constraints (must have, nice to have, exclude)
- Detect special requirements (owner info, franchise status, etc.)
- Set appropriate result size based on query intent
- Choose optimal scoring profile for the use case

Return JSON with structure:
{
  "dsl": { ...LeadQuery object },
  "warnings": [...any warnings or assumptions],
  "confidence": 0.0-1.0,
  "alternatives": [...alternative interpretations if ambiguous]
}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, options = {} } = await req.json();
    
    if (!prompt || typeof prompt !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Enhanced parsing for prompt:', prompt);

    // Extract basic patterns using regex
    const constraints = extractConstraints(prompt);
    const vertical = detectVertical(prompt);
    
    // Try to extract location
    let locationMatch = prompt.match(/\b(?:in|near|around)\s+([^,]+(?:,\s*[A-Z]{2})?)/i);
    let location = locationMatch ? locationMatch[1] : null;
    
    // If no location found, use default or error
    if (!location && options.defaultLocation) {
      location = options.defaultLocation;
    }
    
    let geoData = { city: 'Unknown', state: 'UN' };
    if (location) {
      try {
        geoData = await validateAndGeocodeLocation(location);
      } catch (err) {
        console.log('Geocoding failed, using LLM fallback');
      }
    }

    // Build initial DSL from patterns
    const initialDSL = {
      version: 1,
      vertical,
      geo: geoData,
      constraints,
      result_size: { target: 250 },
      sort_by: 'score_desc',
      output: { contract: 'json' },
      notify: { on_complete: true },
      compliance_flags: ['respect_dnc', 'two_party_recording_state_notes']
    };

    // Use OpenAI to refine and complete the DSL
    const llmPrompt = `Parse this search query into a LeadQuery DSL:
Query: "${prompt}"

Initial extraction:
${JSON.stringify(initialDSL, null, 2)}

Refine this DSL, fix any issues, and add any missing constraints or parameters based on the natural language query.
Output valid JSON with 'dsl', 'warnings', 'confidence', and optionally 'alternatives' fields.`;

    const llmResponse = await generateCompletion(llmPrompt, ENHANCED_SYSTEM_PROMPT);
    
    let parsedResult;
    try {
      parsedResult = JSON.parse(llmResponse);
    } catch (e) {
      console.error('Failed to parse LLM response:', llmResponse);
      // Fallback to initial DSL
      parsedResult = {
        dsl: initialDSL,
        warnings: ['LLM parsing failed, using pattern-based extraction'],
        confidence: 0.6
      };
    }

    // Validate with Zod
    try {
      const validatedDSL = LeadQuerySchema.parse(parsedResult.dsl);
      parsedResult.dsl = validatedDSL;
    } catch (zodError: any) {
      console.error('Zod validation errors:', zodError.errors);
      parsedResult.warnings = parsedResult.warnings || [];
      parsedResult.warnings.push(...zodError.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`));
      
      // Try to fix common issues
      if (!parsedResult.dsl.geo?.city || !parsedResult.dsl.geo?.state) {
        parsedResult.warnings.push('Location could not be determined, using default');
        parsedResult.dsl.geo = { city: 'New York', state: 'NY', radius_km: 25 };
      }
    }

    // Add metadata about the parsing
    parsedResult.metadata = {
      parser_version: '2.0',
      timestamp: new Date().toISOString(),
      original_prompt: prompt
    };

    console.log('Enhanced parse result:', parsedResult);

    return new Response(JSON.stringify(parsedResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in enhanced parse-prompt function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        fallback: {
          dsl: {
            version: 1,
            vertical: 'generic',
            geo: { city: 'Unknown', state: 'UN', radius_km: 25 },
            constraints: { must: [] },
            result_size: { target: 250 },
            sort_by: 'score_desc',
            output: { contract: 'json' },
            notify: { on_complete: true },
            compliance_flags: ['respect_dnc']
          },
          warnings: ['Failed to parse prompt, using minimal defaults']
        }
      }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});