import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced lead scoring system with transparency
interface ScoringWeights {
  no_booking: number;
  has_website_no_booking: number;
  higher_review_count: number;
  good_rating: number;
  owner_found: number;
  verified_email: number;
  verified_phone: number;
  chain_penalty: number;
  ssl_certificate: number;
  mobile_responsive: number;
}

// Default scoring weights as specified in requirements
const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  no_booking: 30,
  has_website_no_booking: 15,
  higher_review_count: 25, // up to 25 based on count
  good_rating: 10, // 3.8-4.9 range gives 5-10 points
  owner_found: 5,
  verified_email: 10,
  verified_phone: 5,
  chain_penalty: -10, // negative score for chains
  ssl_certificate: 3,
  mobile_responsive: 2
};

interface LeadScoringInput {
  business_name: string;
  website_url?: string;
  has_website: boolean;
  detected_features: {
    online_booking?: {
      found: boolean;
      vendor_detected?: string;
      evidence: any[];
    };
    chatbot?: {
      found: boolean;
      vendor_detected?: string;
      evidence: any[];
    };
    ssl_certificate?: {
      found: boolean;
      evidence: any[];
    };
    mobile_responsive?: {
      found: boolean;
      evidence: any[];
    };
  };
  rating?: number;
  user_rating_count?: number;
  people?: Array<{
    name: string;
    role: string;
    email?: string;
    phone?: string;
    verified?: boolean;
  }>;
  franchise_bool?: boolean;
  evidence_log: any[];
}

interface ScoringResult {
  lead_score: number; // 0-100
  scoring_breakdown: {
    base_score: number;
    booking_points: number;
    website_points: number;
    review_points: number;
    rating_points: number;
    contact_points: number;
    franchise_penalty: number;
    technical_points: number;
    total_adjustments: number;
  };
  confidence_reasons: string[];
  evidence_citations: string[];
}

// Enhanced lead scoring with transparency
function scoreLead(input: LeadScoringInput, customWeights?: Partial<ScoringWeights>): ScoringResult {
  const weights = { ...DEFAULT_SCORING_WEIGHTS, ...customWeights };
  const confidenceReasons: string[] = [];
  const evidenceCitations: string[] = [];
  
  let baseScore = 20; // Everyone starts with 20 points
  let bookingPoints = 0;
  let websitePoints = 0;
  let reviewPoints = 0;
  let ratingPoints = 0;
  let contactPoints = 0;
  let franchisePenalty = 0;
  let technicalPoints = 0;

  // 1. Booking scoring (primary value driver)
  const hasBooking = input.detected_features?.online_booking?.found || false;
  if (!hasBooking && input.has_website) {
    // "has website but no booking" - high value lead
    bookingPoints += weights.has_website_no_booking;
    confidenceReasons.push(`Has website but no online booking (+${weights.has_website_no_booking} points)`);
    
    // Additional points for confirmed no booking
    if (input.detected_features?.online_booking?.evidence?.length >= 2) {
      bookingPoints += weights.no_booking;
      confidenceReasons.push(`Confirmed no booking system with multiple checks (+${weights.no_booking} points)`);
      
      // Cite evidence
      const negativeEvidence = input.detected_features.online_booking.evidence
        .filter(e => e.status === 'not_found')
        .slice(0, 2);
      negativeEvidence.forEach(evidence => {
        evidenceCitations.push(`No booking found: ${evidence.url || evidence.snippet}`);
      });
    }
  } else if (!hasBooking && !input.has_website) {
    // No website at all - less valuable but still target market
    bookingPoints += Math.floor(weights.no_booking * 0.5);
    confidenceReasons.push(`No website detected (+${Math.floor(weights.no_booking * 0.5)} points)`);
  }

  // 2. Website quality scoring
  if (input.has_website) {
    websitePoints += 5; // Base points for having a website
    
    // SSL certificate
    if (input.detected_features?.ssl_certificate?.found) {
      technicalPoints += weights.ssl_certificate;
      confidenceReasons.push(`SSL certificate detected (+${weights.ssl_certificate} points)`);
    }
    
    // Mobile responsive
    if (input.detected_features?.mobile_responsive?.found) {
      technicalPoints += weights.mobile_responsive;
      confidenceReasons.push(`Mobile responsive design (+${weights.mobile_responsive} points)`);
    }
  }

  // 3. Review count scoring (up to 25 points)
  if (input.user_rating_count && input.user_rating_count > 0) {
    // Scale: 0-10 reviews = 0-5 points, 11-50 = 6-15 points, 51+ = 16-25 points
    if (input.user_rating_count <= 10) {
      reviewPoints = Math.min(input.user_rating_count * 0.5, 5);
    } else if (input.user_rating_count <= 50) {
      reviewPoints = 5 + Math.min((input.user_rating_count - 10) * 0.25, 10);
    } else {
      reviewPoints = 15 + Math.min((input.user_rating_count - 50) * 0.2, 10);
    }
    reviewPoints = Math.round(reviewPoints);
    confidenceReasons.push(`${input.user_rating_count} reviews (+${reviewPoints} points)`);
  }

  // 4. Rating quality scoring (3.8-4.9 range)
  if (input.rating && input.rating >= 3.8) {
    if (input.rating >= 4.5) {
      ratingPoints = weights.good_rating; // Full 10 points for excellent rating
    } else if (input.rating >= 4.0) {
      ratingPoints = Math.floor(weights.good_rating * 0.7); // 7 points for good rating
    } else {
      ratingPoints = Math.floor(weights.good_rating * 0.5); // 5 points for decent rating
    }
    confidenceReasons.push(`${input.rating} star rating (+${ratingPoints} points)`);
  }

  // 5. Contact/Owner information scoring
  if (input.people && input.people.length > 0) {
    const owners = input.people.filter(p => 
      p.role?.toLowerCase().includes('owner') ||
      p.role?.toLowerCase().includes('principal') ||
      p.role?.toLowerCase().includes('dr')
    );
    
    if (owners.length > 0) {
      contactPoints += weights.owner_found;
      confidenceReasons.push(`Owner/decision maker identified (+${weights.owner_found} points)`);
      
      // Verified email bonus
      const verifiedEmails = owners.filter(o => o.email && o.verified);
      if (verifiedEmails.length > 0) {
        contactPoints += weights.verified_email;
        confidenceReasons.push(`Verified email address (+${weights.verified_email} points)`);
        evidenceCitations.push(`Verified email: ${verifiedEmails[0].email}`);
      }
      
      // Verified phone bonus
      const verifiedPhones = owners.filter(o => o.phone && o.verified);
      if (verifiedPhones.length > 0) {
        contactPoints += weights.verified_phone;
        confidenceReasons.push(`Verified phone number (+${weights.verified_phone} points)`);
        evidenceCitations.push(`Verified phone: ${verifiedPhones[0].phone}`);
      }
    }
  }

  // 6. Franchise penalty
  if (input.franchise_bool === true) {
    franchisePenalty = weights.chain_penalty;
    confidenceReasons.push(`Franchise/chain business (${weights.chain_penalty} points)`);
  }

  // Calculate final score
  const totalAdjustments = bookingPoints + websitePoints + reviewPoints + ratingPoints + contactPoints + franchisePenalty + technicalPoints;
  const finalScore = Math.max(0, Math.min(100, baseScore + totalAdjustments));

  return {
    lead_score: Math.round(finalScore),
    scoring_breakdown: {
      base_score: baseScore,
      booking_points: bookingPoints,
      website_points: websitePoints,
      review_points: reviewPoints,
      rating_points: ratingPoints,
      contact_points: contactPoints,
      franchise_penalty: franchisePenalty,
      technical_points: technicalPoints,
      total_adjustments: totalAdjustments
    },
    confidence_reasons: confidenceReasons,
    evidence_citations: evidenceCitations
  };
}

// Batch scoring for multiple leads
function scoreLeadsBatch(leads: LeadScoringInput[], customWeights?: Partial<ScoringWeights>): ScoringResult[] {
  return leads.map(lead => scoreLead(lead, customWeights));
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leads, custom_weights, operation = 'score' } = await req.json();

    if (operation === 'score') {
      if (Array.isArray(leads)) {
        // Batch scoring
        const results = scoreLeadsBatch(leads, custom_weights);
        return new Response(
          JSON.stringify({ scoring_results: results }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else if (leads) {
        // Single lead scoring
        const result = scoreLead(leads, custom_weights);
        return new Response(
          JSON.stringify({ scoring_result: result }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        return new Response(
          JSON.stringify({ error: 'leads data is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (operation === 'get_default_weights') {
      return new Response(
        JSON.stringify({ default_weights: DEFAULT_SCORING_WEIGHTS }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid operation. Use "score" or "get_default_weights"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Lead scorer error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});