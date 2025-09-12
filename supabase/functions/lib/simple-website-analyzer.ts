// Simplified Website Analyzer - Lightweight fetch-based analysis
// No heavy dependencies, suitable for Edge Functions

export interface SimpleAnalysisResult {
  url: string;
  status: 'success' | 'partial' | 'failed';
  signals: WebsiteSignal[];
  technologies: string[];
  performance: {
    responseTime: number;
    contentLength: number;
  };
  content: {
    title: string;
    description: string;
    hasContactForm: boolean;
    hasPhoneNumber: boolean;
    hasEmail: boolean;
    socialLinks: string[];
  };
  seo: {
    hasSSL: boolean;
    hasMobileViewport: boolean;
    hasMetaDescription: boolean;
    hasOpenGraph: boolean;
  };
  timestamp: string;
}

export interface WebsiteSignal {
  type: string;
  detected: boolean;
  confidence: number;
  evidence: string;
}

export class SimpleWebsiteAnalyzer {
  private timeout: number;

  constructor(timeout: number = 10000) {
    this.timeout = timeout;
  }

  async analyze(url: string): Promise<SimpleAnalysisResult> {
    const startTime = Date.now();
    const result: SimpleAnalysisResult = {
      url,
      status: 'failed',
      signals: [],
      technologies: [],
      performance: { responseTime: 0, contentLength: 0 },
      content: {
        title: '',
        description: '',
        hasContactForm: false,
        hasPhoneNumber: false,
        hasEmail: false,
        socialLinks: []
      },
      seo: {
        hasSSL: false,
        hasMobileViewport: false,
        hasMetaDescription: false,
        hasOpenGraph: false
      },
      timestamp: new Date().toISOString()
    };

    try {
      // Check SSL
      result.seo.hasSSL = url.startsWith('https://');

      // Fetch the website
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; LeadAnalyzer/1.0)'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      result.performance.responseTime = Date.now() - startTime;

      if (!response.ok) {
        result.status = 'failed';
        return result;
      }

      const html = await response.text();
      result.performance.contentLength = html.length;
      result.status = 'success';

      // Analyze content
      this.analyzeHTML(html, result);
      
      // Detect signals
      this.detectSignals(html, result);
      
      // Detect technologies
      this.detectTechnologies(html, result);

    } catch (error) {
      console.error('Website analysis error:', error);
      result.status = 'failed';
    }

    return result;
  }

  private analyzeHTML(html: string, result: SimpleAnalysisResult): void {
    const lowerHTML = html.toLowerCase();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    result.content.title = titleMatch ? titleMatch[1].trim() : '';

    // Extract meta description
    const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
    result.content.description = descMatch ? descMatch[1].trim() : '';
    result.seo.hasMetaDescription = !!descMatch;

    // Check viewport
    result.seo.hasMobileViewport = /<meta\s+name=["']viewport["']/.test(html);

    // Check OpenGraph
    result.seo.hasOpenGraph = /<meta\s+property=["']og:/.test(html);

    // Detect contact form
    result.content.hasContactForm = 
      /<form/i.test(html) && 
      (lowerHTML.includes('contact') || lowerHTML.includes('submit') || lowerHTML.includes('send'));

    // Detect phone numbers
    const phoneRegex = /(\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g;
    result.content.hasPhoneNumber = phoneRegex.test(html);

    // Detect emails
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    result.content.hasEmail = emailRegex.test(html);

    // Extract social links
    const socialPatterns = [
      /facebook\.com\/[^"'\s]*/gi,
      /twitter\.com\/[^"'\s]*/gi,
      /instagram\.com\/[^"'\s]*/gi,
      /linkedin\.com\/[^"'\s]*/gi,
      /youtube\.com\/[^"'\s]*/gi
    ];

    for (const pattern of socialPatterns) {
      const matches = html.match(pattern);
      if (matches) {
        result.content.socialLinks.push(...matches.slice(0, 1)); // Just first match per platform
      }
    }
  }

  private detectSignals(html: string, result: SimpleAnalysisResult): void {
    const lowerHTML = html.toLowerCase();

    // Chat widget detection
    const chatPatterns = [
      'intercom', 'drift', 'tidio', 'crisp', 'tawk.to',
      'zendesk', 'livechat', 'hubspot-messages'
    ];
    
    const hasChat = chatPatterns.some(pattern => lowerHTML.includes(pattern));
    result.signals.push({
      type: 'has_chatbot',
      detected: hasChat,
      confidence: hasChat ? 0.9 : 0.1,
      evidence: hasChat ? 'Chat widget detected' : 'No chat widget found'
    });

    // Online booking detection
    const bookingPatterns = [
      'calendly', 'acuity', 'setmore', 'book now', 'schedule appointment',
      'book appointment', 'make appointment'
    ];
    
    const hasBooking = bookingPatterns.some(pattern => lowerHTML.includes(pattern));
    result.signals.push({
      type: 'has_online_booking',
      detected: hasBooking,
      confidence: hasBooking ? 0.85 : 0.15,
      evidence: hasBooking ? 'Booking system detected' : 'No booking system found'
    });

    // Analytics detection
    const hasAnalytics = 
      lowerHTML.includes('google-analytics') ||
      lowerHTML.includes('gtag') ||
      lowerHTML.includes('analytics.js') ||
      lowerHTML.includes('ga.js');
    
    result.signals.push({
      type: 'has_analytics',
      detected: hasAnalytics,
      confidence: hasAnalytics ? 0.95 : 0.05,
      evidence: hasAnalytics ? 'Analytics tracking detected' : 'No analytics found'
    });

    // Payment processor detection
    const paymentPatterns = ['stripe', 'paypal', 'square', 'checkout', 'payment'];
    const hasPayment = paymentPatterns.some(pattern => lowerHTML.includes(pattern));
    
    result.signals.push({
      type: 'has_payment_processor',
      detected: hasPayment,
      confidence: hasPayment ? 0.7 : 0.3,
      evidence: hasPayment ? 'Payment processor detected' : 'No payment processor found'
    });

    // Mobile responsive (simplified check)
    const isMobileResponsive = 
      result.seo.hasMobileViewport || 
      lowerHTML.includes('responsive') ||
      lowerHTML.includes('@media');
    
    result.signals.push({
      type: 'mobile_responsive',
      detected: isMobileResponsive,
      confidence: isMobileResponsive ? 0.8 : 0.2,
      evidence: isMobileResponsive ? 'Mobile responsive design detected' : 'Not mobile optimized'
    });

    // Social media presence
    const hasSocialMedia = result.content.socialLinks.length > 0;
    result.signals.push({
      type: 'social_media_active',
      detected: hasSocialMedia,
      confidence: hasSocialMedia ? 1.0 : 0.0,
      evidence: hasSocialMedia ? `${result.content.socialLinks.length} social profiles found` : 'No social media links'
    });
  }

  private detectTechnologies(html: string, result: SimpleAnalysisResult): void {
    const lowerHTML = html.toLowerCase();

    // CMS detection
    if (lowerHTML.includes('wordpress')) result.technologies.push('WordPress');
    if (lowerHTML.includes('shopify')) result.technologies.push('Shopify');
    if (lowerHTML.includes('wix')) result.technologies.push('Wix');
    if (lowerHTML.includes('squarespace')) result.technologies.push('Squarespace');
    if (lowerHTML.includes('webflow')) result.technologies.push('Webflow');

    // Framework detection
    if (lowerHTML.includes('react')) result.technologies.push('React');
    if (lowerHTML.includes('vue')) result.technologies.push('Vue.js');
    if (lowerHTML.includes('angular')) result.technologies.push('Angular');
    if (lowerHTML.includes('jquery')) result.technologies.push('jQuery');

    // E-commerce
    if (lowerHTML.includes('woocommerce')) result.technologies.push('WooCommerce');
    if (lowerHTML.includes('magento')) result.technologies.push('Magento');

    // Analytics & Marketing
    if (lowerHTML.includes('google-analytics')) result.technologies.push('Google Analytics');
    if (lowerHTML.includes('facebook pixel')) result.technologies.push('Facebook Pixel');
    if (lowerHTML.includes('mailchimp')) result.technologies.push('Mailchimp');

    // CDN & Infrastructure
    if (lowerHTML.includes('cloudflare')) result.technologies.push('Cloudflare');
    if (lowerHTML.includes('cdn.')) result.technologies.push('CDN');
  }
}

// Export factory function
export function createSimpleAnalyzer(timeout?: number): SimpleWebsiteAnalyzer {
  return new SimpleWebsiteAnalyzer(timeout);
}