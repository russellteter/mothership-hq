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

// Evidence entry structure
interface EvidenceEntry {
  timestamp: string;
  check_type: 'website' | 'booking' | 'contact' | 'social' | 'features';
  source: 'dom' | 'headers' | 'links' | 'vendor_detection';
  url: string;
  path?: string;
  selector?: string;
  snippet?: string;
  status: 'found' | 'not_found' | 'error';
  confidence: number; // 0-1
}

// Website audit result structure
interface WebsiteAuditResult {
  website_url: string;
  has_website: boolean;
  detected_features: {
    online_booking: {
      found: boolean;
      evidence: EvidenceEntry[];
      vendor_detected?: string;
    };
    chatbot: {
      found: boolean;
      evidence: EvidenceEntry[];
      vendor_detected?: string;
    };
    payment_processor: {
      found: boolean;
      evidence: EvidenceEntry[];
      vendor_detected?: string;
    };
    ssl_certificate: {
      found: boolean;
      evidence: EvidenceEntry[];
    };
    mobile_responsive: {
      found: boolean;
      evidence: EvidenceEntry[];
    };
  };
  evidence_log: EvidenceEntry[];
  confidence_score: number;
  audit_timestamp: string;
}

// Booking vendor patterns as specified in the requirements
const BOOKING_VENDOR_PATTERNS = [
  'calendly',
  'acuityscheduling',
  'squareup.com/appointments',
  'housecallpro',
  'servicetitan',
  'scheduleengine',
  'setmore',
  'thryv',
  'workiz',
  'nexhealth',
  'zocdoc',
  'mindbodyonline',
  'jane.app',
  'tebra.com',
  'getjobber.com',
  'bookedin.com',
  'appointy.com',
  'simplybook.me'
];

// Chatbot vendor patterns
const CHATBOT_VENDOR_PATTERNS = [
  'intercom',
  'drift',
  'tidio',
  'crisp',
  'livechat',
  'zopim',
  'zendesk',
  'hubspot/js/hs-chat',
  'botpress',
  'manychat',
  'smartsupp',
  'tawk.to',
  'freshchat',
  'olark'
];

// Payment processor patterns
const PAYMENT_PROCESSOR_PATTERNS = [
  'stripe',
  'paypal',
  'square',
  'authorize.net',
  'braintree',
  'venmo',
  'cashapp',
  'zelle',
  'quickbooks/payments'
];

// Website paths to check for booking functionality
const DEFAULT_BOOKING_PATHS = [
  '/',
  '/book',
  '/schedule',
  '/appointments',
  '/contact',
  '/booking',
  '/appointment',
  '/reserve',
  '/online-booking'
];

// Deterministic website auditing with evidence logging
async function auditWebsiteFeatures(websiteUrl: string, pathsToCheck?: string[]): Promise<WebsiteAuditResult> {
  const evidenceLog: EvidenceEntry[] = [];
  const auditTimestamp = new Date().toISOString();
  const pathsToAudit = pathsToCheck || DEFAULT_BOOKING_PATHS;
  
  let hasWebsite = false;
  let sslCertificate = false;
  let mobileResponsive = false;
  let onlineBookingFound = false;
  let chatbotFound = false;
  let paymentProcessorFound = false;
  
  let bookingVendor: string | undefined;
  let chatbotVendor: string | undefined;
  let paymentVendor: string | undefined;
  
  const bookingEvidence: EvidenceEntry[] = [];
  const chatbotEvidence: EvidenceEntry[] = [];
  const paymentEvidence: EvidenceEntry[] = [];
  const sslEvidence: EvidenceEntry[] = [];
  const mobileEvidence: EvidenceEntry[] = [];

  // If no website URL provided, mark as no website
  if (!websiteUrl || websiteUrl.trim() === '') {
    const noWebsiteEvidence: EvidenceEntry = {
      timestamp: auditTimestamp,
      check_type: 'website',
      source: 'dom',
      url: 'N/A',
      status: 'not_found',
      confidence: 1.0,
      snippet: 'No website URL provided'
    };
    
    evidenceLog.push(noWebsiteEvidence);
    
    return {
      website_url: '',
      has_website: false,
      detected_features: {
        online_booking: { found: false, evidence: [noWebsiteEvidence] },
        chatbot: { found: false, evidence: [noWebsiteEvidence] },
        payment_processor: { found: false, evidence: [noWebsiteEvidence] },
        ssl_certificate: { found: false, evidence: [noWebsiteEvidence] },
        mobile_responsive: { found: false, evidence: [noWebsiteEvidence] }
      },
      evidence_log: evidenceLog,
      confidence_score: 1.0,
      audit_timestamp: auditTimestamp
    };
  }

  // Normalize URL
  let normalizedUrl = websiteUrl.trim();
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = 'https://' + normalizedUrl;
  }

  // Check SSL certificate
  sslCertificate = normalizedUrl.startsWith('https://');
  const sslEvidenceEntry: EvidenceEntry = {
    timestamp: auditTimestamp,
    check_type: 'website',
    source: 'headers',
    url: normalizedUrl,
    status: sslCertificate ? 'found' : 'not_found',
    confidence: 1.0,
    snippet: sslCertificate ? 'HTTPS URL detected' : 'HTTP URL detected'
  };
  sslEvidence.push(sslEvidenceEntry);
  evidenceLog.push(sslEvidenceEntry);

  // Audit each path for booking detection and other features
  for (const path of pathsToAudit) {
    const fullUrl = path === '/' ? normalizedUrl : normalizedUrl.replace(/\/$/, '') + path;
    
    try {
      console.log(`Auditing: ${fullUrl}`);
      
      // Fetch page content
      const response = await fetch(fullUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; LeadFinder/1.0; Website Auditor)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        const errorEvidence: EvidenceEntry = {
          timestamp: auditTimestamp,
          check_type: 'website',
          source: 'dom',
          url: fullUrl,
          path: path,
          status: 'error',
          confidence: 1.0,
          snippet: `HTTP ${response.status} error`
        };
        evidenceLog.push(errorEvidence);
        continue;
      }

      hasWebsite = true;
      const html = await response.text();
      const htmlLower = html.toLowerCase();

      // Check for mobile responsive meta tag
      if (!mobileResponsive && htmlLower.includes('viewport')) {
        mobileResponsive = true;
        const mobileEvidenceEntry: EvidenceEntry = {
          timestamp: auditTimestamp,
          check_type: 'features',
          source: 'dom',
          url: fullUrl,
          path: path,
          selector: 'meta[name="viewport"]',
          status: 'found',
          confidence: 0.9,
          snippet: 'Viewport meta tag detected'
        };
        mobileEvidence.push(mobileEvidenceEntry);
        evidenceLog.push(mobileEvidenceEntry);
      }

      // Check for booking vendor patterns
      for (const vendor of BOOKING_VENDOR_PATTERNS) {
        if (htmlLower.includes(vendor.toLowerCase())) {
          onlineBookingFound = true;
          bookingVendor = vendor;
          
          const bookingEvidenceEntry: EvidenceEntry = {
            timestamp: auditTimestamp,
            check_type: 'booking',
            source: 'vendor_detection',
            url: fullUrl,
            path: path,
            status: 'found',
            confidence: 0.95,
            snippet: `${vendor} booking system detected in HTML`
          };
          bookingEvidence.push(bookingEvidenceEntry);
          evidenceLog.push(bookingEvidenceEntry);
          break;
        }
      }

      // Check for booking-related buttons/links (if no vendor detected)
      if (!onlineBookingFound) {
        const bookingPatterns = [
          /\b(book|schedule|appointment|reserve)\s+(now|online|appointment)/i,
          /\b(online\s*booking|online\s*scheduling)/i,
          /\b(request\s*appointment|make\s*appointment)/i,
          /<button[^>]*>(.*?)(book|schedule|appointment)(.*?)<\/button>/i,
          /<a[^>]*href[^>]*>(.*?)(book|schedule|appointment)(.*?)<\/a>/i
        ];

        for (const pattern of bookingPatterns) {
          const match = html.match(pattern);
          if (match) {
            onlineBookingFound = true;
            const bookingEvidenceEntry: EvidenceEntry = {
              timestamp: auditTimestamp,
              check_type: 'booking',
              source: 'dom',
              url: fullUrl,
              path: path,
              status: 'found',
              confidence: 0.8,
              snippet: match[0].substring(0, 100)
            };
            bookingEvidence.push(bookingEvidenceEntry);
            evidenceLog.push(bookingEvidenceEntry);
            break;
          }
        }
      }

      // Check for chatbot vendor patterns
      for (const vendor of CHATBOT_VENDOR_PATTERNS) {
        if (htmlLower.includes(vendor.toLowerCase())) {
          chatbotFound = true;
          chatbotVendor = vendor;
          
          const chatbotEvidenceEntry: EvidenceEntry = {
            timestamp: auditTimestamp,
            check_type: 'features',
            source: 'vendor_detection',
            url: fullUrl,
            path: path,
            status: 'found',
            confidence: 0.95,
            snippet: `${vendor} chatbot system detected in HTML`
          };
          chatbotEvidence.push(chatbotEvidenceEntry);
          evidenceLog.push(chatbotEvidenceEntry);
          break;
        }
      }

      // Check for payment processor patterns
      for (const vendor of PAYMENT_PROCESSOR_PATTERNS) {
        if (htmlLower.includes(vendor.toLowerCase())) {
          paymentProcessorFound = true;
          paymentVendor = vendor;
          
          const paymentEvidenceEntry: EvidenceEntry = {
            timestamp: auditTimestamp,
            check_type: 'features',
            source: 'vendor_detection',
            url: fullUrl,
            path: path,
            status: 'found',
            confidence: 0.9,
            snippet: `${vendor} payment processor detected in HTML`
          };
          paymentEvidence.push(paymentEvidenceEntry);
          evidenceLog.push(paymentEvidenceEntry);
          break;
        }
      }

    } catch (error) {
      console.error(`Error auditing ${fullUrl}:`, error);
      const errorEvidence: EvidenceEntry = {
        timestamp: auditTimestamp,
        check_type: 'website',
        source: 'dom',
        url: fullUrl,
        path: path,
        status: 'error',
        confidence: 0.5,
        snippet: `Fetch error: ${error.message}`
      };
      evidenceLog.push(errorEvidence);
    }
  }

  // Add negative evidence if features not found (requirement: ≥2 negatives for absence claims)
  if (!onlineBookingFound && pathsToAudit.length >= 2) {
    const negativeBookingEvidence: EvidenceEntry = {
      timestamp: auditTimestamp,
      check_type: 'booking',
      source: 'dom',
      url: normalizedUrl,
      status: 'not_found',
      confidence: 0.9,
      snippet: `No booking functionality detected across ${pathsToAudit.length} pages`
    };
    bookingEvidence.push(negativeBookingEvidence);
    evidenceLog.push(negativeBookingEvidence);
  }

  if (!chatbotFound && pathsToAudit.length >= 2) {
    const negativeChatbotEvidence: EvidenceEntry = {
      timestamp: auditTimestamp,
      check_type: 'features',
      source: 'dom',
      url: normalizedUrl,
      status: 'not_found',
      confidence: 0.8,
      snippet: `No chatbot detected across ${pathsToAudit.length} pages`
    };
    chatbotEvidence.push(negativeChatbotEvidence);
    evidenceLog.push(negativeChatbotEvidence);
  }

  // Calculate overall confidence score
  const totalChecks = pathsToAudit.length;
  const successfulChecks = evidenceLog.filter(e => e.status !== 'error').length;
  const confidenceScore = totalChecks > 0 ? successfulChecks / totalChecks : 0;

  return {
    website_url: normalizedUrl,
    has_website: hasWebsite,
    detected_features: {
      online_booking: {
        found: onlineBookingFound,
        evidence: bookingEvidence,
        vendor_detected: bookingVendor
      },
      chatbot: {
        found: chatbotFound,
        evidence: chatbotEvidence,
        vendor_detected: chatbotVendor
      },
      payment_processor: {
        found: paymentProcessorFound,
        evidence: paymentEvidence,
        vendor_detected: paymentVendor
      },
      ssl_certificate: {
        found: sslCertificate,
        evidence: sslEvidence
      },
      mobile_responsive: {
        found: mobileResponsive,
        evidence: mobileEvidence
      }
    },
    evidence_log: evidenceLog,
    confidence_score: confidenceScore,
    audit_timestamp: auditTimestamp
  };
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { website_url, paths_to_check } = await req.json();

    if (!website_url) {
      return new Response(
        JSON.stringify({ error: 'website_url is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const auditResult = await auditWebsiteFeatures(website_url, paths_to_check);

    return new Response(
      JSON.stringify({ audit_result: auditResult }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Website auditor error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});