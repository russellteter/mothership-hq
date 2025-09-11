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
  dentist: ['dentist'],
  law_firm: ['lawyer'],
  contractor: ['general_contractor', 'roofing_contractor', 'electrician', 'plumber'],
  hvac: ['electrician'], // Using electrician as fallback for HVAC
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

async function searchGooglePlaces(query: string, location: string, includedTypes: string[] = ['establishment']): Promise<any[]> {
  if (!googlePlacesApiKey) {
    console.error('GOOGLE_PLACES_API_KEY not found in environment variables');
    return [];
  }
  
  const searchUrl = 'https://places.googleapis.com/v1/places:searchNearby';
  
  const coords = await geocodeLocation(location);
  if (!coords) {
    console.error('Failed to geocode location:', location);
    return [];
  }
  
  const requestBody = {
    includedTypes: includedTypes,
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
  
  console.log(`Searching Places API for types: ${includedTypes.join(', ')} near ${location}`);
  
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
    console.error('Places API HTTP error:', {
      status: response.status,
      statusText: response.statusText,
      error: data.error || data
    });
    return [];
  }
  
  console.log(`Places API returned ${data.places?.length || 0} results`);
  return data.places || [];
}

async function geocodeLocation(location: string): Promise<{lat: number, lng: number} | null> {
  if (!googlePlacesApiKey) {
    console.error('GOOGLE_PLACES_API_KEY not found in environment variables');
    return null;
  }
  
  try {
    console.log(`Geocoding location: ${location}`);
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${googlePlacesApiKey}`;
    const response = await fetch(geocodeUrl);
    const data = await response.json();
    
    if (data.status === 'OK' && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      console.log(`Geocoded to lat: ${location.lat}, lng: ${location.lng}`);
      return { lat: location.lat, lng: location.lng };
    } else {
      console.error('Geocoding failed:', data.status);
      return null;
    }
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

async function analyzeWebsite(url: string): Promise<{ signals: Signal[], people: any[] }> {
  const signals: Signal[] = [];
  const people: any[] = [];
  
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
      return { signals, people };
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
    
    // Simple owner identification
    const ownerMatch = ownerPatterns.some(pattern => lowerHtml.includes(pattern));
    signals.push({
      business_id: '',
      type: 'owner_identified',
      value_json: ownerMatch,
      confidence: 0.7,
      evidence_url: url,
      evidence_snippet: ownerMatch ? 
        `Found owner pattern: ${ownerPatterns.find(p => lowerHtml.includes(p))}` : 
        'No owner patterns found',
      source_key: 'http_fetch'
    });
    
  } catch (error) {
    console.error('Website analysis error:', error);
    // Return basic signals even on error
    signals.push({
      business_id: '',
      type: 'no_website',
      value_json: true,
      confidence: 0.8,
      evidence_url: url,
      evidence_snippet: `Website analysis failed: ${error.message}`,
      source_key: 'http_fetch'
    });
    
    signals.push({
      business_id: '',
      type: 'has_chatbot',
      value_json: false,
      confidence: 0.5,
      evidence_url: url,
      evidence_snippet: 'Could not analyze for chatbot due to error',
      source_key: 'http_fetch'
    });
    
    signals.push({
      business_id: '',
      type: 'has_online_booking',
      value_json: false,
      confidence: 0.5,
      evidence_url: url,
      evidence_snippet: 'Could not analyze for booking due to error',
      source_key: 'http_fetch'
    });
    
    signals.push({
      business_id: '',
      type: 'owner_identified',
      value_json: false,
      confidence: 0.5,
      evidence_url: url,
      evidence_snippet: 'Could not analyze for owner due to error',
      source_key: 'http_fetch'
    });
  }
  
  return { signals, people };
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
  console.log('=== Search Function Started ===');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Processing search request...');

    // Step 1: Parse request body
    let requestBody;
    try {
      const rawBody = await req.text();
      console.log('Raw request body length:', rawBody.length);
      requestBody = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('Request body parsing error:', parseError);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON in request body',
          details: parseError.message 
        }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Authentication
    console.log('=== Authentication Step ===');
    const authHeader = req.headers.get('authorization');
    
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('Token extracted, length:', token.length);

    let user;
    try {
      const { data: userData, error: authError } = await supabase.auth.getUser(token);
      user = userData?.user;
      
      if (authError || !user) {
        console.error('Authentication failed:', authError?.message || 'No user found');
        return new Response(
          JSON.stringify({ 
            error: 'Authentication failed',
            details: authError?.message || 'Invalid token'
          }), 
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('User authenticated successfully:', user.id);
    } catch (authException) {
      console.error('Authentication exception:', authException);
      return new Response(
        JSON.stringify({ 
          error: 'Authentication system error',
          details: authException.message 
        }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Extract and validate parameters
    console.log('=== Parameter Extraction ===');
    const dsl = requestBody?.dsl;
    const original_prompt = requestBody?.original_prompt || '';
    const custom_name = requestBody?.custom_name || '';
    const search_tags = requestBody?.search_tags || [];
    
    if (!dsl) {
      console.error('Missing DSL in request body');
      return new Response(
        JSON.stringify({ error: 'Missing DSL parameter' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Starting search with DSL:', JSON.stringify(dsl, null, 2));
    
    // Step 4: Create search job
    console.log('=== Creating Search Job ===');
    let searchJob;
    try {
      const { data: jobData, error: jobError } = await supabase
        .from('search_jobs')
        .insert({
          dsl_json: dsl,
          status: 'running',
          user_id: user.id,
          original_prompt: original_prompt || null,
          custom_name: custom_name || null,
          search_tags: search_tags.length > 0 ? search_tags : null
        })
        .select()
        .single();
      
      if (jobError) {
        console.error('Search job creation error:', jobError);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to create search job',
            details: jobError.message 
          }), 
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      searchJob = jobData;
      console.log('Created search job:', searchJob.id);
    } catch (dbException) {
      console.error('Database exception:', dbException);
      return new Response(
        JSON.stringify({ 
          error: 'Database error during job creation',
          details: dbException.message 
        }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Step 5: Google Places Search
    console.log('=== Google Places Search ===');
    const location = `${dsl.geo.city}, ${dsl.geo.state}`;
    const businessTypes = verticalToPlaceTypes[dsl.vertical] || ['establishment'];
    const searchQuery = `${businessTypes[0]} in ${location}`;
    
    console.log('Search parameters:', {
      location,
      businessTypes,
      searchQuery,
      vertical: dsl.vertical
    });
    
    // Check Google Places API key
    if (!googlePlacesApiKey) {
      console.error('Google Places API key not configured');
      await supabase
        .from('search_jobs')
        .update({ status: 'failed', error_text: 'Google Places API key not configured' })
        .eq('id', searchJob.id);
      
      return new Response(
        JSON.stringify({ 
          error: 'Google Places API not configured',
          jobId: searchJob.id 
        }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    let places = [];
    try {
      places = await searchGooglePlaces(searchQuery, location, businessTypes);
      console.log(`Found ${places.length} places from Google Places API`);
      
      if (places.length === 0) {
        console.log('No places found, but continuing with empty results');
      }
    } catch (placesError) {
      console.error('Google Places API error:', placesError);
      await supabase
        .from('search_jobs')
        .update({ 
          status: 'failed', 
          error_text: `Google Places API error: ${placesError.message}` 
        })
        .eq('id', searchJob.id);
      
      return new Response(
        JSON.stringify({ 
          error: 'Google Places API failed',
          details: placesError.message,
          jobId: searchJob.id 
        }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Step 6: Process businesses
    console.log('=== Processing Businesses ===');
    const processedBusinesses: Business[] = [];
    let processedCount = 0;
    const maxBusinesses = Math.min(50, dsl.result_size?.target || 50);
    
    for (const place of places.slice(0, maxBusinesses)) {
      try {
        processedCount++;
        console.log(`Processing business ${processedCount}/${maxBusinesses}:`, place.displayName?.text || place.displayName);
        
        if (!place || !place.displayName) {
          console.log('Skipping invalid place data');
          continue;
        }
        
        // Parse address from new API format with safety checks
        const formattedAddress = place.formattedAddress || '';
        const addressParts = formattedAddress.split(', ');
        const state = addressParts.length >= 2 ? addressParts[addressParts.length - 2]?.split(' ')[0] || '' : '';
        const city = addressParts.length >= 3 ? addressParts[addressParts.length - 3] || '' : '';
        const street = addressParts[0] || '';
        const zip = addressParts.length >= 2 ? addressParts[addressParts.length - 2]?.split(' ')[1] || '' : '';
        
        const business: Business = {
          id: crypto.randomUUID(),
          name: place.displayName?.text || place.displayName || 'Unknown Business',
          vertical: dsl.vertical,
          website: place.websiteUri || null,
          phone: place.internationalPhoneNumber || null,
          address_json: {
            street,
            city,
            state,
            zip,
            country: 'US'
          },
          lat: place.location?.latitude || null,
          lng: place.location?.longitude || null,
          franchise_bool: false,
          google_place_id: place.id || null
        };
        
        // Insert business with error handling
        let insertedBusiness;
        try {
          const { data: businessData, error: businessError } = await supabase
            .from('businesses')
            .insert(business)
            .select()
            .single();
          
          if (businessError) {
            console.error('Failed to insert business:', {
              business_name: business.name,
              error: businessError.message
            });
            continue;
          }
          
          insertedBusiness = businessData;
          console.log('Successfully inserted business:', insertedBusiness.name);
        } catch (businessException) {
          console.error('Business insertion exception:', {
            business_name: business.name,
            exception: businessException.message
          });
          continue;
        }
        
        // Step 7: Analyze website and determine signals
        const signals: Signal[] = [];
        
        if (business.website) {
          try {
            console.log('Analyzing website:', business.website);
            const { signals: websiteSignals } = await analyzeWebsite(business.website);
            signals.push(...websiteSignals.map(s => ({ ...s, business_id: insertedBusiness.id })));
            console.log(`Generated ${websiteSignals.length} signals from website analysis`);
          } catch (websiteError) {
            console.error('Website analysis failed:', {
              business: business.name,
              website: business.website,
              error: websiteError.message
            });
            // Add basic signals indicating analysis failure
            signals.push({
              business_id: insertedBusiness.id,
              type: 'no_website',
              value_json: true,
              confidence: 0.5,
              evidence_url: business.website,
              evidence_snippet: `Analysis failed: ${websiteError.message}`,
              source_key: 'http_fetch'
            });
          }
        } else {
          // No website found
          console.log('No website found for business:', business.name);
          signals.push({
            business_id: insertedBusiness.id,
            type: 'no_website',
            value_json: true,
            confidence: 0.95,
            evidence_url: `https://maps.google.com/place?place_id=${place.id}`,
            evidence_snippet: 'No website listed in Google Places',
            source_key: 'google_places'
          });
        }
        
        // Add review count signal from Google Places
        if (place.userRatingCount) {
          signals.push({
            business_id: insertedBusiness.id,
            type: 'review_count',
            value_json: place.userRatingCount,
            confidence: 0.95,
            evidence_url: `https://maps.google.com/place?place_id=${place.id}`,
            evidence_snippet: `${place.userRatingCount} reviews on Google`,
            source_key: 'google_places'
          });
        }
        
        // Step 8: Insert all signals
        if (signals.length > 0) {
          try {
            const { error: signalError } = await supabase
              .from('signals')
              .insert(signals);
            
            if (signalError) {
              console.error('Failed to insert signals:', {
                business: business.name,
                signals_count: signals.length,
                error: signalError.message
              });
            } else {
              console.log(`Successfully inserted ${signals.length} signals for ${insertedBusiness.name}`);
            }
          } catch (signalException) {
            console.error('Signal insertion exception:', {
              business: business.name,
              exception: signalException.message
            });
          }
        }
        
        // Step 9: Calculate score and create lead view
        try {
          const { score, subscores } = calculateScore(signals, dsl.constraints);
          console.log(`Calculated score ${score} for ${business.name}`);
          
          const { error: leadViewError } = await supabase
            .from('lead_views')
            .insert({
              search_job_id: searchJob.id,
              business_id: insertedBusiness.id,
              score: score,
              subscores_json: subscores,
              rank: processedCount
            });
          
          if (leadViewError) {
            console.error('Failed to insert lead view:', {
              business: business.name,
              error: leadViewError.message
            });
          } else {
            console.log(`Created lead view for ${business.name} with score ${score}`);
          }
        } catch (scoringError) {
          console.error('Scoring error:', {
            business: business.name,
            error: scoringError.message
          });
        }
        
        processedBusinesses.push(insertedBusiness);
        
        // Add a small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error('Error processing place:', {
          place_name: place.displayName?.text || place.displayName,
          error: error.message
        });
        continue;
      }
    }
    
    // Step 10: Update search job status
    console.log('=== Finalizing Search Job ===');
    try {
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
      
      console.log(`Search completed successfully. Processed ${processedBusinesses.length} businesses`);
    } catch (updateError) {
      console.error('Failed to update search job status:', updateError);
    }
    
    return new Response(JSON.stringify({
      job_id: searchJob.id,
      status: 'completed',
      total_results: processedBusinesses.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('=== CRITICAL ERROR in search-leads function ===');
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});