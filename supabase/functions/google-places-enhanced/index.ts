import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const googleMapsApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Google Places Text Search (New) with FieldMask
interface PlacesTextSearchRequest {
  textQuery: string;
  maxResultCount?: number;
  locationBias?: {
    circle?: {
      center: { latitude: number; longitude: number };
      radius: number;
    };
  };
}

interface PlacesFieldMask {
  fields: string[];
}

// Enhanced field selection for Places API
const DEFAULT_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.types',
  'places.websiteUri',
  'places.rating',
  'places.userRatingCount',
  'places.googleMapsUri',
  'places.location',
  'places.nationalPhoneNumber',
  'places.internationalPhoneNumber',
  'places.businessStatus',
  'places.primaryTypeDisplayName'
];

// Google Places Text Search (New) implementation
async function searchPlacesTextNew(request: PlacesTextSearchRequest, fieldMask?: string[]): Promise<any> {
  if (!googleMapsApiKey) {
    throw new Error('Google Maps API key not configured');
  }

  const fields = fieldMask || DEFAULT_FIELD_MASK;
  const fieldMaskHeader = fields.join(',');

  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': googleMapsApiKey,
        'X-Goog-FieldMask': fieldMaskHeader
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Google Places API error:', response.status, errorData);
      throw new Error(`Google Places API error: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Places search error:', error);
    throw error;
  }
}

// Place Details (New) for enrichment
async function getPlaceDetailsNew(placeId: string, fieldMask?: string[]): Promise<any> {
  if (!googleMapsApiKey) {
    throw new Error('Google Maps API key not configured');
  }

  const fields = fieldMask || [
    'id',
    'displayName',
    'formattedAddress',
    'websiteUri',
    'rating',
    'userRatingCount',
    'nationalPhoneNumber',
    'internationalPhoneNumber',
    'editorialSummary',
    'reviews',
    'photos'
  ];
  
  const fieldMaskHeader = fields.join(',');

  try {
    const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': googleMapsApiKey,
        'X-Goog-FieldMask': fieldMaskHeader
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Google Place Details API error:', response.status, errorData);
      throw new Error(`Google Place Details API error: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Place details error:', error);
    throw error;
  }
}

// Deduplicate places by normalized name + address + phone
function deduplicatePlaces(places: any[]): any[] {
  const seen = new Set<string>();
  const deduplicated: any[] = [];

  for (const place of places) {
    const normalizedName = place.displayName?.text?.toLowerCase().trim() || '';
    const normalizedAddress = place.formattedAddress?.toLowerCase().trim() || '';
    const normalizedPhone = place.nationalPhoneNumber?.replace(/\D/g, '') || '';
    
    const key = `${normalizedName}|${normalizedAddress}|${normalizedPhone}`;
    
    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(place);
    }
  }

  return deduplicated;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { operation, ...params } = await req.json();

    if (operation === 'searchText') {
      const { textQuery, maxResultCount = 20, locationBias, fieldMask } = params;
      
      const searchRequest: PlacesTextSearchRequest = {
        textQuery,
        maxResultCount,
        locationBias
      };

      const result = await searchPlacesTextNew(searchRequest, fieldMask);
      const deduplicatedPlaces = deduplicatePlaces(result.places || []);
      
      return new Response(
        JSON.stringify({ 
          places: deduplicatedPlaces,
          total_found: deduplicatedPlaces.length,
          api_credits_used: 1
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (operation === 'getDetails') {
      const { placeId, fieldMask } = params;
      const details = await getPlaceDetailsNew(placeId, fieldMask);
      
      return new Response(
        JSON.stringify({ place: details }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid operation. Use "searchText" or "getDetails"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Google Places Enhanced error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});