import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

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
    const { lead } = await req.json();

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Build context about the lead
    const signals = Object.entries(lead.signals)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
    
    const contacts = lead.people.map((p: any) => 
      `${p.name} (${p.role})${p.email ? ` - ${p.email}` : ''}${p.phone ? ` - ${p.phone}` : ''}`
    ).join(', ');

    const prompt = `Analyze this business lead and provide detailed insights:

Business: ${lead.name}
Location: ${lead.city}, ${lead.state}
Website: ${lead.website || 'Not available'}
Phone: ${lead.phone || 'Not available'}
Lead Score: ${lead.score}/100

AI Signals: ${signals}
Contacts: ${contacts || 'No contacts found'}

Please provide:
1. A concise business summary
2. A personalized outreach message suggestion
3. Detailed business analysis including strengths and weaknesses
4. An opportunity score (1-100) and explanation
5. 3-5 key insights about this lead
6. 3-5 specific recommendations for engagement

Format your response as JSON with these keys:
- summary
- outreachSuggestion
- businessAnalysis
- opportunityScore
- keyInsights (array)
- recommendations (array)`;

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
            content: 'You are an expert B2B sales analyst. Analyze business leads and provide actionable insights for sales teams. Always respond with valid JSON.' 
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1000,
        temperature: 0.7,
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
      const insights = JSON.parse(content);
      
      return new Response(JSON.stringify({ insights }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', content);
      
      // Fallback: create structured response from unstructured content
      const insights = {
        summary: `AI analysis for ${lead.name} in ${lead.city}, ${lead.state}`,
        outreachSuggestion: `Hi! I noticed your business ${lead.name} in ${lead.city}. I'd love to discuss how we can help improve your online presence.`,
        businessAnalysis: content.substring(0, 300) + '...',
        opportunityScore: Math.min(lead.score + 10, 100),
        keyInsights: ['Professional business with growth potential', 'Good location for target market', 'Opportunity for digital enhancement'],
        recommendations: ['Schedule a discovery call', 'Research their competition', 'Prepare a customized proposal']
      };
      
      return new Response(JSON.stringify({ insights }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error in generate-lead-insights function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});