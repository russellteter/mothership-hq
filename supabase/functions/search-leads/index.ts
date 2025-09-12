import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const googlePlacesApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced business vertical mappings
const VERTICAL_TO_PLACE_TYPES: Record<string, string[]> = {
  dentist: ['dentist', 'dental_clinic'],
  law_firm: ['lawyer', 'legal_services'],
  contractor: ['general_contractor', 'roofing_contractor', 'electrician', 'plumber'],
  hvac: ['electrician', 'plumber'], 
  roofing: ['roofing_contractor'],
  restaurant: ['restaurant', 'cafe', 'meal_delivery', 'meal_takeaway'],
  retail: ['store', 'shopping_mall', 'clothing_store', 'electronics_store'],
  healthcare: ['doctor', 'hospital', 'medical_center', 'clinic'],
  fitness: ['gym', 'health_club', 'fitness_center'],
  beauty: ['beauty_salon', 'hair_care', 'spa', 'nail_salon'],
  automotive: ['car_dealer', 'car_repair', 'auto_parts_store'],
  real_estate: ['real_estate_agency', 'real_estate_developer'],
  insurance: ['insurance_agency'],
  financial: ['accounting', 'bank', 'finance'],
  generic: ['establishment']
};

// Expanded signal detection patterns
const SIGNAL_PATTERNS = {
  // Website & Digital Presence
  chatbot: [
    'intercom.', 'drift.', 'tidio.', 'crisp.', 'livechat.',
    'zopim', 'zendesk', 'hubspot/js/hs-chat', 'botpress.',
    'manychat.', 'smartsupp.', 'tawk.to', 'freshchat', 'olark'
  ],
  booking: [
    'calendly.com', 'localmed.com', 'nexhealth.com', 'doctible.com',
    'zocdoc.com', 'setmore.com', 'acuityscheduling.com', 
    'squareup.com/appointments', 'mindbodyonline.com', 'jane.app',
    'tebra.com', 'housecallpro.com', 'getjobber.com', 'servicetitan.com',
    'bookedin.com', 'appointy.com', 'simplybook.me'
  ],
  payment_processors: [
    'stripe', 'paypal', 'square', 'authorize.net', 'braintree',
    'venmo', 'cashapp', 'zelle', 'quickbooks/payments'
  ],
  crm: [
    'salesforce', 'hubspot', 'pipedrive', 'zoho', 'monday.com',
    'freshworks', 'insightly', 'copper', 'keap', 'activecampaign'
  ],
  marketing_automation: [
    'mailchimp', 'constantcontact', 'sendinblue', 'klaviyo',
    'getresponse', 'aweber', 'convertkit', 'drip', 'marketo'
  ],
  analytics: [
    'google-analytics', 'gtag', 'ga.js', 'analytics.js',
    'mixpanel', 'segment', 'amplitude', 'heap', 'hotjar',
    'clarity.ms', 'fullstory', 'mouseflow'
  ],
  security: [
    'cloudflare', 'sucuri', 'wordfence', 'sitelock',
    'ssl-certificate', 'https://', 'secure.', 'lock icon'
  ],
  social_media: [
    'facebook.com/', 'instagram.com/', 'twitter.com/', 'x.com/',
    'linkedin.com/', 'youtube.com/', 'tiktok.com/', 'pinterest.com/'
  ],
  review_platforms: [
    'yelp', 'tripadvisor', 'glassdoor', 'trustpilot', 'g2.com',
    'capterra', 'bbb.org', 'angieslist'
  ],
  ecommerce: [
    'shopify', 'woocommerce', 'bigcommerce', 'magento', 
    'squarespace/commerce', 'wix/stores', 'cart', 'checkout'
  ]
};

// Enhanced signal types
interface EnhancedSignal {
  business_id: string;
  type: string;
  value_json: any;
  confidence: number;
  evidence_url?: string;
  evidence_snippet?: string;
  source_key: string;
  metadata?: Record<string, any>;
}

// Job queue for async processing
interface SearchJobTask {
  id: string;
  type: 'fetch' | 'enrich' | 'score' | 'validate';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  data: any;
  retries: number;
  created_at: string;
  processed_at?: string;
  error?: string;
}

// Enhanced website analysis
async function analyzeWebsiteEnhanced(url: string): Promise<{
  signals: EnhancedSignal[];
  people: any[];
  technologies: string[];
  performance: any;
}> {
  const signals: EnhancedSignal[] = [];
  const people: any[] = [];
  const technologies: string[] = [];
  const performance = {
    load_time_ms: 0,
    mobile_responsive: false,
    ssl_enabled: false,
    page_size_kb: 0
  };
  
  try {
    console.log('Enhanced website analysis for:', url);
    
    // Check if URL is HTTPS
    performance.ssl_enabled = url.startsWith('https://');
    
    const startTime = Date.now();
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });
    
    performance.load_time_ms = Date.now() - startTime;
    
    if (!response.ok) {
      signals.push({
        business_id: '',
        type: 'website_status',
        value_json: { status_code: response.status, accessible: false },
        confidence: 0.95,
        evidence_url: url,
        evidence_snippet: `Website returned ${response.status}`,
        source_key: 'http_fetch'
      });
      return { signals, people, technologies, performance };
    }
    
    const html = await response.text();
    const lowerHtml = html.toLowerCase();
    performance.page_size_kb = Math.round(html.length / 1024);
    
    // Check mobile responsiveness
    performance.mobile_responsive = 
      lowerHtml.includes('viewport') && 
      (lowerHtml.includes('responsive') || lowerHtml.includes('mobile'));
    
    // Detect technologies
    for (const [category, patterns] of Object.entries(SIGNAL_PATTERNS)) {
      for (const pattern of patterns) {
        if (lowerHtml.includes(pattern.toLowerCase())) {
          technologies.push(`${category}:${pattern}`);
          
          signals.push({
            business_id: '',
            type: `has_${category}`,
            value_json: true,
            confidence: 0.85,
            evidence_url: url,
            evidence_snippet: `Detected ${pattern}`,
            source_key: 'pattern_match',
            metadata: { technology: pattern, category }
          });
        }
      }
    }
    
    // Enhanced contact extraction
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    const phoneRegex = /(\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g;
    const linkedinRegex = /(https?:\/\/(?:www\.)?linkedin\.com\/(?:in|company)\/[a-zA-Z0-9-]+)/g;
    
    const emails = [...new Set(html.match(emailRegex) || [])];
    const phones = [...new Set(html.match(phoneRegex) || [])];
    const linkedinUrls = [...new Set(html.match(linkedinRegex) || [])];
    
    // Extract structured data (JSON-LD)
    const jsonLdRegex = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = jsonLdRegex.exec(html)) !== null) {
      try {
        const jsonData = JSON.parse(match[1]);
        
        // Extract business information
        if (jsonData['@type'] === 'LocalBusiness' || jsonData['@type'] === 'Organization') {
          signals.push({
            business_id: '',
            type: 'structured_data',
            value_json: jsonData,
            confidence: 0.95,
            evidence_url: url,
            evidence_snippet: 'JSON-LD structured data found',
            source_key: 'json_ld'
          });
          
          // Extract contact person if available
          if (jsonData.employee || jsonData.founder) {
            const person = jsonData.employee || jsonData.founder;
            people.push({
              name: person.name,
              role: person.jobTitle || 'Owner',
              email: person.email,
              phone: person.telephone,
              source_url: url,
              confidence: 0.9
            });
          }
        }
      } catch (e) {
        console.log('Failed to parse JSON-LD:', e);
      }
    }
    
    // Business hours detection
    const hoursRegex = /(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)[\s\S]{0,50}(?:\d{1,2}:\d{2})/gi;
    const hoursMatch = html.match(hoursRegex);
    if (hoursMatch) {
      signals.push({
        business_id: '',
        type: 'business_hours',
        value_json: { detected: true, snippet: hoursMatch[0].substring(0, 100) },
        confidence: 0.7,
        evidence_url: url,
        evidence_snippet: 'Business hours found',
        source_key: 'pattern_match'
      });
    }
    
    // Social media links
    const socialLinks = {
      facebook: html.match(/facebook\.com\/[a-zA-Z0-9.]+/gi),
      instagram: html.match(/instagram\.com\/[a-zA-Z0-9._]+/gi),
      twitter: html.match(/(?:twitter|x)\.com\/[a-zA-Z0-9_]+/gi),
      linkedin: html.match(/linkedin\.com\/company\/[a-zA-Z0-9-]+/gi),
      youtube: html.match(/youtube\.com\/(?:c|channel|user)\/[a-zA-Z0-9_-]+/gi)
    };
    
    for (const [platform, matches] of Object.entries(socialLinks)) {
      if (matches && matches.length > 0) {
        signals.push({
          business_id: '',
          type: `social_${platform}`,
          value_json: { url: matches[0], active: true },
          confidence: 0.9,
          evidence_url: url,
          evidence_snippet: matches[0],
          source_key: 'social_link'
        });
      }
    }
    
    // Page performance signals
    signals.push({
      business_id: '',
      type: 'website_performance',
      value_json: performance,
      confidence: 1.0,
      evidence_url: url,
      evidence_snippet: `Load time: ${performance.load_time_ms}ms, Size: ${performance.page_size_kb}KB`,
      source_key: 'performance_check'
    });
    
    // Create owner contact if we have enough information
    if (emails.length > 0 || phones.length > 0) {
      const ownerEmail = emails.find(e => 
        !e.includes('info@') && 
        !e.includes('contact@') && 
        !e.includes('support@') &&
        !e.includes('noreply@')
      ) || emails[0];
      
      people.push({
        name: 'Business Owner',
        role: 'Owner',
        email: ownerEmail,
        phone: phones[0],
        source_url: linkedinUrls[0] || url,
        confidence: 0.6
      });
      
      if (ownerEmail || phones[0]) {
        signals.push({
          business_id: '',
          type: 'owner_identified',
          value_json: true,
          confidence: 0.7,
          evidence_url: url,
          evidence_snippet: `Contact found: ${ownerEmail || phones[0]}`,
          source_key: 'contact_extraction'
        });
      }
    }
    
  } catch (error) {
    console.error('Website analysis error:', error);
    signals.push({
      business_id: '',
      type: 'website_error',
      value_json: { error: error.message, accessible: false },
      confidence: 0.8,
      evidence_url: url,
      evidence_snippet: `Analysis failed: ${error.message}`,
      source_key: 'error_handler'
    });
  }
  
  return { signals, people, technologies, performance };
}

// Enhanced scoring with ML-inspired algorithm
function calculateEnhancedScore(
  signals: EnhancedSignal[], 
  constraints: any,
  scoringProfile: string = 'generic'
): { score: number; subscores: any; explanation: string } {
  
  // Define scoring profiles
  const profiles: Record<string, any> = {
    generic: { icp: 0.35, pain: 0.35, reach: 0.20, risk: 0.10 },
    sales_ready: { icp: 0.25, pain: 0.25, reach: 0.40, risk: 0.10 },
    marketing_qualified: { icp: 0.40, pain: 0.30, reach: 0.20, risk: 0.10 },
    tech_savvy: { icp: 0.30, pain: 0.40, reach: 0.20, risk: 0.10 },
    traditional: { icp: 0.35, pain: 0.25, reach: 0.30, risk: 0.10 }
  };
  
  const weights = profiles[scoringProfile] || profiles.generic;
  
  let icpScore = 0;
  let painScore = 0;
  let reachabilityScore = 0;
  let complianceRisk = 0;
  
  // ICP scoring (Industry/Customer Profile match)
  icpScore = 25; // Base score for matching vertical/geo
  
  // Check business maturity signals
  const hasStructuredData = signals.some(s => s.type === 'structured_data');
  const hasBusinessHours = signals.some(s => s.type === 'business_hours');
  const hasSocialMedia = signals.some(s => s.type.startsWith('social_'));
  
  if (hasStructuredData) icpScore += 5;
  if (hasBusinessHours) icpScore += 3;
  if (hasSocialMedia) icpScore += 2;
  
  // Pain scoring (higher pain = higher opportunity)
  signals.forEach(signal => {
    switch (signal.type) {
      case 'website_status':
        if (signal.value_json.accessible === false) painScore += 20;
        break;
      case 'has_chatbot':
        if (!signal.value_json) painScore += 8;
        break;
      case 'has_booking':
        if (!signal.value_json) painScore += 8;
        break;
      case 'has_crm':
        if (!signal.value_json) painScore += 7;
        break;
      case 'has_marketing_automation':
        if (!signal.value_json) painScore += 6;
        break;
      case 'website_performance':
        const perf = signal.value_json;
        if (perf.load_time_ms > 3000) painScore += 5;
        if (!perf.mobile_responsive) painScore += 5;
        if (!perf.ssl_enabled) painScore += 3;
        break;
      case 'has_analytics':
        if (!signal.value_json) painScore += 4;
        break;
    }
  });
  
  // Reachability scoring
  signals.forEach(signal => {
    if (signal.type === 'owner_identified' && signal.value_json === true) {
      reachabilityScore += 10;
    }
    if (signal.type.startsWith('social_')) {
      reachabilityScore += 2;
    }
  });
  
  // Add points for contact information
  const hasEmail = signals.some(s => s.evidence_snippet?.includes('@'));
  const hasPhone = signals.some(s => s.evidence_snippet?.match(/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/));
  
  if (hasEmail) reachabilityScore += 5;
  if (hasPhone) reachabilityScore += 3;
  
  // Compliance risk scoring (deductions)
  complianceRisk = 5; // Base risk
  
  // Check for security and compliance signals
  const hasSSL = signals.some(s => s.value_json?.ssl_enabled === true);
  const hasPrivacyPolicy = signals.some(s => 
    s.evidence_snippet?.toLowerCase().includes('privacy')
  );
  
  if (!hasSSL) complianceRisk += 3;
  if (!hasPrivacyPolicy) complianceRisk += 2;
  
  // Calculate weighted total score
  const totalScore = Math.round(
    (icpScore * weights.icp) + 
    (painScore * weights.pain) + 
    (reachabilityScore * weights.reach) - 
    (complianceRisk * weights.risk)
  );
  
  const finalScore = Math.min(100, Math.max(0, totalScore));
  
  // Generate explanation
  const explanation = `Score ${finalScore}/100: ` +
    `ICP match (${Math.round(icpScore * weights.icp)}), ` +
    `Pain signals (${Math.round(painScore * weights.pain)}), ` +
    `Reachability (${Math.round(reachabilityScore * weights.reach)}), ` +
    `Risk (-${Math.round(complianceRisk * weights.risk)})`;
  
  return {
    score: finalScore,
    subscores: {
      ICP: Math.round(icpScore * weights.icp),
      Pain: Math.round(painScore * weights.pain),
      Reachability: Math.round(reachabilityScore * weights.reach),
      ComplianceRisk: Math.round(complianceRisk * weights.risk)
    },
    explanation
  };
}

// Process search job with retry logic
async function processSearchJob(jobId: string, task: SearchJobTask, maxRetries: number = 3) {
  try {
    // Update task status
    await supabase
      .from('status_logs')
      .insert({
        search_job_id: jobId,
        task: task.type,
        message: `Processing ${task.type} task`,
        severity: 'info',
        ts: new Date().toISOString()
      });
    
    switch (task.type) {
      case 'enrich':
        // Process enrichment task
        return await processEnrichmentTask(task.data);
      case 'score':
        // Process scoring task
        return await processScoringTask(task.data);
      case 'validate':
        // Process validation task
        return await processValidationTask(task.data);
      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }
  } catch (error) {
    console.error(`Task ${task.id} failed:`, error);
    
    if (task.retries < maxRetries) {
      // Retry with exponential backoff
      const delay = Math.pow(2, task.retries) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      task.retries++;
      return processSearchJob(jobId, task, maxRetries);
    }
    
    throw error;
  }
}

async function processEnrichmentTask(data: any) {
  // Enrichment logic here
  return data;
}

async function processScoringTask(data: any) {
  // Scoring logic here
  return data;
}

async function processValidationTask(data: any) {
  // Validation logic here
  return data;
}

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

    const { 
      dsl, 
      original_prompt, 
      custom_name, 
      search_tags, 
      options = {}
    } = await req.json();
    
    console.log('Enhanced search starting with DSL:', dsl);
    
    // Create search job
    const { data: searchJob, error: jobError } = await supabase
      .from('search_jobs')
      .insert({
        dsl_json: dsl,
        status: 'running',
        user_id: user.id,
        original_prompt,
        custom_name,
        search_tags: search_tags || [],
        metadata: {
          version: '2.0',
          options,
          started_at: new Date().toISOString()
        }
      })
      .select()
      .single();
    
    if (jobError) {
      throw new Error(`Failed to create search job: ${jobError.message}`);
    }
    
    console.log('Created enhanced search job:', searchJob.id);
    
    // Log search start
    await supabase
      .from('status_logs')
      .insert({
        search_job_id: searchJob.id,
        task: 'search_start',
        message: `Starting search for ${dsl.vertical} in ${dsl.geo.city}, ${dsl.geo.state}`,
        severity: 'info',
        ts: new Date().toISOString()
      });
    
    // Build search query
    const location = `${dsl.geo.city}, ${dsl.geo.state}`;
    const businessTypes = VERTICAL_TO_PLACE_TYPES[dsl.vertical] || ['establishment'];
    
    // Search Google Places (with pagination support)
    let allPlaces: any[] = [];
    let nextPageToken = null;
    let pageCount = 0;
    const maxPages = Math.ceil(dsl.result_size.target / 20); // 20 results per page
    
    do {
      const places = await searchGooglePlacesWithPagination(
        businessTypes[0], 
        location, 
        businessTypes,
        nextPageToken
      );
      
      allPlaces = allPlaces.concat(places.results || []);
      nextPageToken = places.next_page_token;
      pageCount++;
      
      // Rate limiting between pages
      if (nextPageToken && pageCount < maxPages) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } while (nextPageToken && pageCount < maxPages);
    
    console.log(`Found ${allPlaces.length} total places across ${pageCount} pages`);
    
    // Log fetching complete
    await supabase
      .from('status_logs')
      .insert({
        search_job_id: searchJob.id,
        task: 'fetch_complete',
        message: `Fetched ${allPlaces.length} businesses from Google Places`,
        severity: 'info',
        ts: new Date().toISOString()
      });
    
    const processedBusinesses: any[] = [];
    const enrichmentTasks: SearchJobTask[] = [];
    
    // Process places in batches for better performance
    const batchSize = 10;
    const placesToProcess = allPlaces.slice(0, Math.min(allPlaces.length, dsl.result_size.target));
    
    for (let i = 0; i < placesToProcess.length; i += batchSize) {
      const batch = placesToProcess.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (place) => {
        try {
          // Parse and store business
          const business = await processPlace(place, dsl, searchJob.id);
          if (business) {
            processedBusinesses.push(business);
          }
        } catch (error) {
          console.error('Error processing place:', error);
        }
      }));
      
      // Update progress
      const progress = Math.round((i + batch.length) / placesToProcess.length * 100);
      await supabase
        .from('search_jobs')
        .update({
          metadata: {
            ...searchJob.metadata,
            progress,
            processed_count: processedBusinesses.length
          }
        })
        .eq('id', searchJob.id);
    }
    
    // Final status update
    await supabase
      .from('search_jobs')
      .update({
        status: 'completed',
        summary_stats: {
          total_found: allPlaces.length,
          total_enriched: processedBusinesses.length,
          total_scored: processedBusinesses.length,
          processing_time_ms: Date.now() - new Date(searchJob.created_at).getTime(),
          enrichment_rate: processedBusinesses.length / allPlaces.length,
          average_score: processedBusinesses.reduce((sum, b) => sum + (b.score || 0), 0) / processedBusinesses.length
        }
      })
      .eq('id', searchJob.id);
    
    console.log(`Enhanced search completed. Processed ${processedBusinesses.length} businesses`);
    
    return new Response(JSON.stringify({
      job_id: searchJob.id,
      status: 'completed',
      total_results: processedBusinesses.length,
      summary: {
        total_found: allPlaces.length,
        processed: processedBusinesses.length,
        average_score: Math.round(processedBusinesses.reduce((sum, b) => sum + (b.score || 0), 0) / processedBusinesses.length)
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error in enhanced search-leads function:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function for Google Places search with pagination
async function searchGooglePlacesWithPagination(
  query: string, 
  location: string, 
  types: string[], 
  pageToken?: string
): Promise<any> {
  // Implementation would go here
  // This is a placeholder that would integrate with Google Places API
  return { results: [], next_page_token: null };
}

// Helper function to process individual place
async function processPlace(place: any, dsl: any, jobId: string): Promise<any> {
  // Implementation would process and enrich each place
  // This is a placeholder for the actual implementation
  return null;
}