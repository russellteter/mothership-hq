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

    const { url, businessId, options = {} } = await req.json();
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting advanced website analysis for:', url);

    // Create analyzer instance
    const analyzer = await createWebsiteAnalyzer({
      headless: true,
      timeout: options.timeout || 30000,
      viewport: options.viewport || { width: 1920, height: 1080 }
    });

    try {
      // Perform analysis
      const analysisResult = await analyzer.analyze(url);
      
      // Store analysis results in database
      if (businessId) {
        // Store signals
        for (const signal of analysisResult.signals) {
          await supabase
            .from('signals')
            .upsert({
              business_id: businessId,
              type: signal.type,
              value_json: { detected: signal.detected, metadata: signal.metadata },
              confidence: signal.confidence,
              evidence_url: url,
              evidence_snippet: signal.evidence,
              source_key: 'website_analyzer_v2'
            });
        }

        // Store website analysis metadata
        await supabase
          .from('website_analyses')
          .insert({
            business_id: businessId,
            url,
            status: analysisResult.status,
            technologies: analysisResult.technologies,
            performance_json: analysisResult.performance,
            seo_json: analysisResult.seo,
            security_json: analysisResult.security,
            accessibility_score: analysisResult.accessibility.score,
            content_summary: {
              title: analysisResult.content.title,
              description: analysisResult.content.description,
              word_count: analysisResult.content.wordCount,
              forms_count: analysisResult.content.forms.length,
              images_count: analysisResult.content.images.length
            },
            analyzed_at: analysisResult.timestamp,
            analyzer_version: '2.0'
          });

        // Update business with latest website info
        await supabase
          .from('businesses')
          .update({
            website: url,
            website_status: analysisResult.status,
            last_analyzed: analysisResult.timestamp
          })
          .eq('id', businessId);
      }

      // Process insights for scoring
      const insights = processAnalysisForScoring(analysisResult);

      return new Response(JSON.stringify({
        success: true,
        url,
        status: analysisResult.status,
        signals: analysisResult.signals,
        technologies: analysisResult.technologies,
        performance: analysisResult.performance,
        seo: analysisResult.seo,
        security: analysisResult.security,
        accessibility: analysisResult.accessibility,
        content: {
          title: analysisResult.content.title,
          description: analysisResult.content.description,
          forms: analysisResult.content.forms.map(f => ({
            purpose: f.purpose,
            fields_count: f.fields.length,
            has_submit: f.hasSubmitButton
          }))
        },
        insights,
        timestamp: analysisResult.timestamp
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } finally {
      await analyzer.close();
    }

  } catch (error) {
    console.error('Error in analyze-website function:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function processAnalysisForScoring(analysis: any) {
  const insights = {
    digitalMaturity: 0,
    opportunities: [],
    strengths: [],
    weaknesses: [],
    recommendations: []
  };

  // Calculate digital maturity score
  let maturityPoints = 0;
  const maxPoints = 100;

  // Performance scoring (25 points)
  if (analysis.performance.loadTime < 3000) maturityPoints += 10;
  else if (analysis.performance.loadTime < 5000) maturityPoints += 5;
  
  if (analysis.performance.largestContentfulPaint < 2500) maturityPoints += 10;
  else if (analysis.performance.largestContentfulPaint < 4000) maturityPoints += 5;
  
  if (analysis.performance.cumulativeLayoutShift < 0.1) maturityPoints += 5;

  // Security scoring (20 points)
  if (analysis.security.https) maturityPoints += 10;
  if (analysis.security.hsts) maturityPoints += 5;
  if (analysis.security.contentSecurityPolicy) maturityPoints += 5;

  // SEO scoring (20 points)
  if (analysis.seo.metaTags.description) maturityPoints += 5;
  if (analysis.seo.canonicalUrl) maturityPoints += 5;
  if (analysis.seo.headingStructure) maturityPoints += 5;
  if (analysis.seo.imageOptimization) maturityPoints += 5;

  // Accessibility scoring (15 points)
  if (analysis.accessibility.score >= 90) maturityPoints += 15;
  else if (analysis.accessibility.score >= 70) maturityPoints += 10;
  else if (analysis.accessibility.score >= 50) maturityPoints += 5;

  // Technology & Features scoring (20 points)
  const hasChat = analysis.signals.find((s: any) => s.type === 'has_chatbot' && s.detected);
  const hasBooking = analysis.signals.find((s: any) => s.type === 'has_online_booking' && s.detected);
  const hasAnalytics = analysis.signals.find((s: any) => s.type === 'has_analytics' && s.detected);
  const hasPayment = analysis.signals.find((s: any) => s.type === 'has_payment_processor' && s.detected);
  const hasCRM = analysis.signals.find((s: any) => s.type === 'has_crm' && s.detected);

  if (hasChat) maturityPoints += 5;
  if (hasBooking) maturityPoints += 5;
  if (hasAnalytics) maturityPoints += 4;
  if (hasPayment) maturityPoints += 3;
  if (hasCRM) maturityPoints += 3;

  insights.digitalMaturity = Math.round((maturityPoints / maxPoints) * 100);

  // Identify opportunities
  if (!hasChat) {
    insights.opportunities.push({
      type: 'chatbot',
      impact: 'high',
      description: 'No chat widget detected. Adding live chat could increase engagement by 20-40%.'
    });
  }

  if (!hasBooking && analysis.content.forms.some((f: any) => f.purpose === 'contact')) {
    insights.opportunities.push({
      type: 'online_booking',
      impact: 'high',
      description: 'Contact form present but no online booking. Automated scheduling could save 5-10 hours/week.'
    });
  }

  if (!hasAnalytics) {
    insights.opportunities.push({
      type: 'analytics',
      impact: 'medium',
      description: 'No analytics tracking detected. Cannot measure website performance or visitor behavior.'
    });
  }

  if (analysis.performance.loadTime > 5000) {
    insights.opportunities.push({
      type: 'performance',
      impact: 'high',
      description: `Page load time is ${Math.round(analysis.performance.loadTime / 1000)}s. Optimizing could improve conversion by 7% per second saved.`
    });
  }

  if (!analysis.seo.metaTags.description) {
    insights.opportunities.push({
      type: 'seo',
      impact: 'medium',
      description: 'Missing meta description. Adding one could improve click-through rates from search by 5-10%.'
    });
  }

  // Identify strengths
  if (analysis.security.https) {
    insights.strengths.push('Secure HTTPS connection');
  }

  if (hasAnalytics) {
    insights.strengths.push('Analytics tracking implemented');
  }

  if (analysis.signals.find((s: any) => s.type === 'mobile_responsive' && s.detected)) {
    insights.strengths.push('Mobile responsive design');
  }

  if (analysis.signals.find((s: any) => s.type === 'social_media_active' && s.detected)) {
    insights.strengths.push('Active social media presence');
  }

  // Identify weaknesses
  if (!analysis.security.https) {
    insights.weaknesses.push('No HTTPS - security risk and SEO penalty');
  }

  if (analysis.accessibility.score < 70) {
    insights.weaknesses.push(`Poor accessibility score (${analysis.accessibility.score}/100)`);
  }

  if (!analysis.signals.find((s: any) => s.type === 'mobile_responsive' && s.detected)) {
    insights.weaknesses.push('Not mobile responsive - losing 60%+ of potential traffic');
  }

  // Generate recommendations
  insights.recommendations = insights.opportunities
    .sort((a, b) => {
      const impactWeight = { high: 3, medium: 2, low: 1 };
      return impactWeight[b.impact as keyof typeof impactWeight] - impactWeight[a.impact as keyof typeof impactWeight];
    })
    .slice(0, 3)
    .map(opp => opp.description);

  return insights;
}