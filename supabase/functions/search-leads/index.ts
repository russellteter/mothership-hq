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

// Mapping for business verticals to Google Places types
const verticalToPlaceTypes: Record<string, string[]> = {
  dentist: ['dentist', 'dental_clinic'],
  law_firm: ['lawyer', 'legal_services'],
  contractor: ['general_contractor', 'roofing_contractor', 'electrician', 'plumber'],
  hvac: ['heating_contractor', 'air_conditioning_contractor'],
  roofing: ['roofing_contractor'],
  generic: ['establishment']
};

// Chatbot detection patterns
const chatbotPatterns = [
  'intercom.', 'drift.', 'tidio.', 'crisp.', 'livechat.',
  'zopim', 'zendesk', 'hubspot/js/hs-chat', 'botpress.',
  'manychat.', 'smartsupp.', 'tawk.to'
];

// Online booking detection patterns
const bookingPatterns = [
  'calendly.com', 'localmed.com', 'nexhealth.com', 'doctible.com',
  'zocdoc.com', 'setmore.com', 'acuityscheduling.com', 
  'squareup.com/appointments', 'mindbodyonline.com', 'jane.app',
  'tebra.com', 'housecallpro.com', 'getjobber.com', 'servicetitan.com'
];

// Owner role patterns
const ownerPatterns = [
  'owner', 'principal', 'founder', 'managing partner',
  'dr.', 'dds', 'dmd', 'esq.', 'attorney'
];

interface LeadQuery {
  version: number;
  vertical: string;
  geo: {
    city: string;
    state: string;
    radius_km?: number;
  };
  constraints: {
    must: any[];
    optional?: any[];
  };
  exclusions?: string[];
  result_size: {
    target: number;
  };
  sort_by: string;
  lead_profile: string;
  output: {
    contract: string;
  };
  notify: {
    on_complete: boolean;
  };
  compliance_flags: string[];
}

interface Business {
  id: string;
  name: string;
  vertical?: string;
  website?: string;
  phone?: string;
  address_json: any;
  lat?: number;
  lng?: number;
  franchise_bool?: boolean;
  google_place_id?: string;
}

interface Signal {
  business_id: string;
  type: string;
  value_json: any;
  confidence: number;
  evidence_url?: string;
  evidence_snippet?: string;
  source_key: string;
}

async function searchGooglePlaces(query: string, location: string): Promise<any[]> {
  // Use the new Places API (New) with nearbySearch
  const searchUrl = 'https://places.googleapis.com/v1/places:searchNearby';
  
  // Parse location to get coordinates (simplified for now)
  const coords = await geocodeLocation(location);
  if (!coords) {
    console.error('Failed to geocode location:', location);
    return [];
  }
  
  const requestBody = {
    includedTypes: ['dentist', 'dental_clinic'], // Will be dynamic based on vertical
    locationRestriction: {
      circle: {
        center: {
          latitude: coords.lat,
          longitude: coords.lng
        },
        radius: 50000.0
      }
    },
    maxResultCount: 20,
    languageCode: 'en'
  };
  
  console.log('Searching Google Places (New API):', searchUrl);
  
  const response = await fetch(searchUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': googlePlacesApiKey,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.internationalPhoneNumber,places.websiteUri,places.location,places.businessStatus,places.priceLevel,places.rating,places.userRatingCount,places.types'
    },
    body: JSON.stringify(requestBody)
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    console.error('Google Places API error:', data);
    return [];
  }
  
  return data.places || [];
}

async function geocodeLocation(location: string): Promise<{lat: number, lng: number} | null> {
  try {
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${googlePlacesApiKey}`;
    const response = await fetch(geocodeUrl);
    const data = await response.json();
    
    if (data.status === 'OK' && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return { lat: location.lat, lng: location.lng };
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

async function getPlaceDetails(placeId: string): Promise<any> {
  // Use the new Places API (New) for place details
  const detailsUrl = `https://places.googleapis.com/v1/places/${placeId}`;
  
  const response = await fetch(detailsUrl, {
    method: 'GET',
    headers: {
      'X-Goog-Api-Key': googlePlacesApiKey,
      'X-Goog-FieldMask': 'id,displayName,formattedAddress,internationalPhoneNumber,websiteUri,location,businessStatus,priceLevel,rating,userRatingCount,types'
    }
  });
  
  if (!response.ok) {
    console.error('Google Places Details API error:', await response.text());
    return null;
  }
  
  const data = await response.json();
  return data;
}

async function analyzeWebsite(url: string): Promise<Signal[]> {
  const signals: Signal[] = [];
  
  try {
    console.log('Analyzing website:', url);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LeadFinder/1.0)'
      }
    });
    
    if (!response.ok) {
      signals.push({
        business_id: '',
        type: 'no_website',
        value_json: true,
        confidence: 0.9,
        evidence_url: url,
        evidence_snippet: `Website returned ${response.status} error`,
        source_key: 'http_fetch'
      });
      return signals;
    }
    
    const html = await response.text();
    const lowerHtml = html.toLowerCase();
    
    // Check for chatbot
    const hasChatbot = chatbotPatterns.some(pattern => lowerHtml.includes(pattern));
    signals.push({
      business_id: '',
      type: 'has_chatbot',
      value_json: hasChatbot,
      confidence: 0.85,
      evidence_url: url,
      evidence_snippet: hasChatbot ? 
        `Found chat widget: ${chatbotPatterns.find(p => lowerHtml.includes(p))}` : 
        'No chat widget scripts found',
      source_key: 'http_fetch'
    });
    
    // Check for online booking
    const hasBooking = bookingPatterns.some(pattern => lowerHtml.includes(pattern));
    signals.push({
      business_id: '',
      type: 'has_online_booking',
      value_json: hasBooking,
      confidence: 0.85,
      evidence_url: url,
      evidence_snippet: hasBooking ? 
        `Found booking system: ${bookingPatterns.find(p => lowerHtml.includes(p))}` : 
        'No online booking links found',
      source_key: 'http_fetch'
    });
    
    // Check for owner identification (simple pattern matching)
    const ownerMatch = ownerPatterns.some(pattern => lowerHtml.includes(pattern));
    if (ownerMatch) {
      signals.push({
        business_id: '',
        type: 'owner_identified',
        value_json: true,
        confidence: 0.7,
        evidence_url: url,
        evidence_snippet: `Found owner pattern: ${ownerPatterns.find(p => lowerHtml.includes(p))}`,
        source_key: 'http_fetch'
      });
    }
    
  } catch (error) {
    console.error('Website analysis error:', error);
    signals.push({
      business_id: '',
      type: 'no_website',
      value_json: true,
      confidence: 0.8,
      evidence_url: url,
      evidence_snippet: `Website analysis failed: ${error.message}`,
      source_key: 'http_fetch'
    });
  }
  
  return signals;
}

function calculateScore(signals: Signal[], constraints: any): { score: number; subscores: any } {
  let icpScore = 0;
  let painScore = 0;
  let reachabilityScore = 0;
  let complianceRisk = 0;
  
  // ICP scoring (35%)
  icpScore = 25; // Base score for matching vertical/geo
  
  // Pain scoring (35%) - higher pain = higher score
  signals.forEach(signal => {
    switch (signal.type) {
      case 'no_website':
        if (signal.value_json === true) painScore += 15;
        break;
      case 'has_chatbot':
        if (signal.value_json === false) painScore += 10;
        break;
      case 'has_online_booking':
        if (signal.value_json === false) painScore += 10;
        break;
    }
  });
  
  // Reachability scoring (20%)
  signals.forEach(signal => {
    if (signal.type === 'owner_identified' && signal.value_json === true) {
      reachabilityScore += 15;
    }
  });
  
  // Compliance risk (10% deduction)
  complianceRisk = 5; // Base risk
  
  const totalScore = Math.min(100, Math.max(0, icpScore + painScore + reachabilityScore - complianceRisk));
  
  return {
    score: Math.round(totalScore),
    subscores: {
      ICP: icpScore,
      Pain: painScore,
      Reachability: reachabilityScore,
      ComplianceRisk: complianceRisk
    }
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
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

    const { dsl }: { dsl: LeadQuery } = await req.json();
    
    console.log('Starting search with DSL:', dsl);
    
    // Create search job with user_id
    const { data: searchJob, error: jobError } = await supabase
      .from('search_jobs')
      .insert({
        dsl_json: dsl,
        status: 'running',
        user_id: user.id
      })
      .select()
      .single();
    
    if (jobError) {
      throw new Error(`Failed to create search job: ${jobError.message}`);
    }
    
    console.log('Created search job:', searchJob.id);
    
    // Build search query
    const location = `${dsl.geo.city}, ${dsl.geo.state}`;
    const businessTypes = verticalToPlaceTypes[dsl.vertical] || ['establishment'];
    const searchQuery = `${businessTypes[0]} in ${location}`;
    
    // Search Google Places
    const places = await searchGooglePlaces(searchQuery, location);
    console.log(`Found ${places.length} places`);
    
    const processedBusinesses: Business[] = [];
    
    // Process each place
    for (const place of places.slice(0, Math.min(50, dsl.result_size.target))) {
      try {
        // Get detailed place information - place already has details from new API
        const details = place;
        if (!details) continue;
        
        // Parse address from new API format
        const addressParts = details.formattedAddress?.split(', ') || [];
        const state = addressParts[addressParts.length - 2]?.split(' ')[0] || '';
        const city = addressParts[addressParts.length - 3] || '';
        
        const business: Business = {
          id: crypto.randomUUID(),
          name: details.displayName?.text || details.displayName,
          vertical: dsl.vertical,
          website: details.websiteUri,
          phone: details.internationalPhoneNumber,
          address_json: {
            street: addressParts[0] || '',
            city: city,
            state: state,
            zip: addressParts[addressParts.length - 2]?.split(' ')[1] || '',
            country: 'US'
          },
          lat: details.location?.latitude,
          lng: details.location?.longitude,
          franchise_bool: false,
          google_place_id: details.id
        };
        
        // Insert business
        const { data: insertedBusiness, error: businessError } = await supabase
          .from('businesses')
          .insert(business)
          .select()
          .single();
        
        if (businessError) {
          console.error('Failed to insert business:', businessError);
          continue;
        }
        
        console.log('Inserted business:', insertedBusiness.name);
        
        // Analyze website if available
        const signals: Signal[] = [];
        
        if (business.website) {
          const websiteSignals = await analyzeWebsite(business.website);
          signals.push(...websiteSignals.map(s => ({ ...s, business_id: insertedBusiness.id })));
        } else {
          signals.push({
            business_id: insertedBusiness.id,
            type: 'no_website',
            value_json: true,
            confidence: 0.95,
            evidence_url: `https://maps.google.com/place?place_id=${details.id}`,
            evidence_snippet: 'No website listed in Google Places',
            source_key: 'google_places'
          });
        }
        
        // Add review count signal
        if (details.userRatingCount) {
          signals.push({
            business_id: insertedBusiness.id,
            type: 'review_count',
            value_json: details.userRatingCount,
            confidence: 0.95,
            evidence_url: `https://maps.google.com/place?place_id=${details.id}`,
            evidence_snippet: `${details.userRatingCount} reviews on Google`,
            source_key: 'google_places'
          });
        }
        
        // Insert signals
        if (signals.length > 0) {
          const { error: signalsError } = await supabase
            .from('signals')
            .insert(signals);
          
          if (signalsError) {
            console.error('Failed to insert signals:', signalsError);
          }
        }
        
        // Calculate score
        const { score, subscores } = calculateScore(signals, dsl.constraints);
        
        // Create lead view
        const { error: leadViewError } = await supabase
          .from('lead_views')
          .insert({
            search_job_id: searchJob.id,
            business_id: insertedBusiness.id,
            score: score,
            subscores_json: subscores,
            rank: processedBusinesses.length + 1
          });
        
        if (leadViewError) {
          console.error('Failed to insert lead view:', leadViewError);
        }
        
        processedBusinesses.push(insertedBusiness);
        
        // Add a small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error('Error processing place:', error);
        continue;
      }
    }
    
    // Update search job status
    await supabase
      .from('search_jobs')
      .update({
        status: 'completed',
        summary_stats: {
          total_found: places.length,
          total_enriched: processedBusinesses.length,
          total_scored: processedBusinesses.length,
          processing_time_ms: Date.now()
        }
      })
      .eq('id', searchJob.id);
    
    console.log(`Search completed. Processed ${processedBusinesses.length} businesses`);
    
    return new Response(JSON.stringify({
      job_id: searchJob.id,
      status: 'completed',
      total_results: processedBusinesses.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error in search-leads function:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});