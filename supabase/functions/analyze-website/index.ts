import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createWebsiteAnalyzer } from "../lib/website-analyzer.ts";

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
    const { website, businessName, businessLocation } = await req.json();

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Fetch website content
    let websiteContent = '';
    try {
      const websiteResponse = await fetch(website, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; BusinessAnalyzer/1.0)'
        }
      });
      
      if (websiteResponse.ok) {
        const html = await websiteResponse.text();
        // Extract text content (basic HTML stripping)
        websiteContent = html
          .replace(/<script[^>]*>.*?<\/script>/gi, '')
          .replace(/<style[^>]*>.*?<\/style>/gi, '')
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 3000); // Limit content length
      }
    } catch (fetchError) {
      console.log('Could not fetch website content, proceeding with URL analysis only');
    }

    const prompt = `Analyze this business website and provide detailed insights:

Business: ${businessName}
Location: ${businessLocation}
Website URL: ${website}

Website Content:
${websiteContent || 'Content not available - analyze based on URL and business info'}

Please analyze and provide:
1. Business summary
2. List of services offered
3. Pricing indicators found
4. Pain points or challenges this business might face
5. Business opportunities
6. Business type classification
7. Target market
8. Competitive advantages
9. Contact methods available
10. Social media presence indicators

Format your response as JSON with these keys:
- summary
- services (array)
- pricingIndicators (array)
- painPoints (array)  
- opportunities (array)
- businessType
- targetMarket
- competitiveAdvantages (array)
- contactMethods (array)
- socialPresence (array)`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert business analyst. Analyze websites and provide detailed business insights. Always respond with valid JSON.' 
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1200,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    try {
      const analysis = JSON.parse(content);
      
      return new Response(JSON.stringify({ analysis }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', content);
      
      // Fallback: create structured response
      const analysis = {
        summary: `Website analysis for ${businessName}`,
        services: ['General business services'],
        pricingIndicators: ['Contact for pricing'],
        painPoints: ['Limited online presence'],
        opportunities: ['Digital marketing improvement'],
        businessType: 'Small business',
        targetMarket: 'Local customers',
        competitiveAdvantages: ['Local presence'],
        contactMethods: ['Website contact form'],
        socialPresence: ['Website only']
      };
      
      return new Response(JSON.stringify({ analysis }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error in analyze-website function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});