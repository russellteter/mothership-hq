import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createSimpleAnalyzer } from "../lib/simple-website-analyzer.ts";

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

    const { url, businessId } = await req.json();
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting website analysis for:', url);

    // Use simple analyzer
    const analyzer = createSimpleAnalyzer(10000); // 10 second timeout
    const analysisResult = await analyzer.analyze(url);
    
    // Store analysis results in database if businessId provided
    if (businessId && analysisResult.status === 'success') {
      // Store signals
      for (const signal of analysisResult.signals) {
        await supabase
          .from('signals')
          .upsert({
            business_id: businessId,
            type: signal.type,
            value_json: signal.detected,
            confidence: signal.confidence,
            evidence_url: url,
            evidence_snippet: signal.evidence,
            source_key: 'simple_analyzer'
          });
      }

      // Update business with website status
      await supabase
        .from('businesses')
        .update({
          website: url,
          website_status: analysisResult.status,
          last_analyzed: analysisResult.timestamp
        })
        .eq('id', businessId);
    }

    // Calculate insights
    const insights = generateInsights(analysisResult);

    return new Response(JSON.stringify({
      success: true,
      url,
      status: analysisResult.status,
      signals: analysisResult.signals,
      technologies: analysisResult.technologies,
      performance: analysisResult.performance,
      content: analysisResult.content,
      seo: analysisResult.seo,
      insights,
      timestamp: analysisResult.timestamp
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-website function:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateInsights(analysis: any) {
  const insights = {
    opportunities: [],
    strengths: [],
    digitalMaturity: 0
  };

  // Calculate digital maturity (0-100)
  let maturityScore = 0;
  if (analysis.seo.hasSSL) maturityScore += 20;
  if (analysis.seo.hasMobileViewport) maturityScore += 15;
  if (analysis.seo.hasMetaDescription) maturityScore += 10;
  if (analysis.signals.find((s: any) => s.type === 'has_analytics' && s.detected)) maturityScore += 15;
  if (analysis.signals.find((s: any) => s.type === 'has_chatbot' && s.detected)) maturityScore += 10;
  if (analysis.signals.find((s: any) => s.type === 'has_online_booking' && s.detected)) maturityScore += 10;
  if (analysis.signals.find((s: any) => s.type === 'mobile_responsive' && s.detected)) maturityScore += 10;
  if (analysis.content.socialLinks.length > 0) maturityScore += 10;
  
  insights.digitalMaturity = maturityScore;

  // Identify opportunities
  const hasChat = analysis.signals.find((s: any) => s.type === 'has_chatbot' && s.detected);
  const hasBooking = analysis.signals.find((s: any) => s.type === 'has_online_booking' && s.detected);
  const hasAnalytics = analysis.signals.find((s: any) => s.type === 'has_analytics' && s.detected);
  const isMobileResponsive = analysis.signals.find((s: any) => s.type === 'mobile_responsive' && s.detected);

  if (!hasChat) {
    insights.opportunities.push('Add live chat for 20-40% engagement increase');
  }

  if (!hasBooking && analysis.content.hasContactForm) {
    insights.opportunities.push('Implement online booking to save 5-10 hours/week');
  }

  if (!hasAnalytics) {
    insights.opportunities.push('Add analytics to track visitor behavior');
  }

  if (!isMobileResponsive) {
    insights.opportunities.push('Optimize for mobile (60%+ of traffic)');
  }

  if (!analysis.seo.hasSSL) {
    insights.opportunities.push('Implement SSL for security and SEO');
  }

  // Identify strengths
  if (analysis.seo.hasSSL) {
    insights.strengths.push('Secure HTTPS connection');
  }

  if (hasAnalytics) {
    insights.strengths.push('Analytics tracking active');
  }

  if (isMobileResponsive) {
    insights.strengths.push('Mobile optimized');
  }

  if (analysis.content.socialLinks.length > 2) {
    insights.strengths.push('Strong social media presence');
  }

  if (analysis.performance.responseTime < 2000) {
    insights.strengths.push('Fast loading website');
  }

  return insights;
}