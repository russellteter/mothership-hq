// Advanced Website Analysis with Puppeteer
// This module provides deep website analysis using headless browser automation

import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts";

export interface AnalysisResult {
  url: string;
  status: 'success' | 'partial' | 'failed';
  signals: WebsiteSignal[];
  technologies: Technology[];
  performance: PerformanceMetrics;
  content: ContentAnalysis;
  seo: SEOAnalysis;
  security: SecurityAnalysis;
  accessibility: AccessibilityScore;
  screenshots?: Screenshot[];
  errors: string[];
  timestamp: string;
}

export interface WebsiteSignal {
  type: string;
  detected: boolean;
  confidence: number;
  evidence: string;
  metadata?: Record<string, any>;
}

export interface Technology {
  name: string;
  category: string;
  version?: string;
  confidence: number;
}

export interface PerformanceMetrics {
  loadTime: number;
  timeToFirstByte: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  totalBlockingTime: number;
  cumulativeLayoutShift: number;
  resourceCount: number;
  totalSize: number;
  jsHeapSize: number;
}

export interface ContentAnalysis {
  title: string;
  description: string;
  headings: { level: number; text: string }[];
  wordCount: number;
  images: { src: string; alt: string; loading: string }[];
  videos: string[];
  forms: FormAnalysis[];
  links: { href: string; text: string; external: boolean }[];
  structuredData: any[];
}

export interface FormAnalysis {
  id?: string;
  action?: string;
  method?: string;
  fields: { name: string; type: string; required: boolean }[];
  hasSubmitButton: boolean;
  purpose: 'contact' | 'booking' | 'newsletter' | 'search' | 'login' | 'other';
}

export interface SEOAnalysis {
  metaTags: Record<string, string>;
  openGraph: Record<string, string>;
  twitterCard: Record<string, string>;
  canonicalUrl?: string;
  robots?: string;
  sitemap?: string;
  schema?: any[];
  headingStructure: boolean;
  imageOptimization: boolean;
}

export interface SecurityAnalysis {
  https: boolean;
  hsts: boolean;
  contentSecurityPolicy: boolean;
  xFrameOptions: boolean;
  mixedContent: boolean;
  certificates?: {
    issuer: string;
    validFrom: string;
    validTo: string;
  };
}

export interface AccessibilityScore {
  score: number;
  issues: {
    severity: 'critical' | 'serious' | 'moderate' | 'minor';
    description: string;
    element?: string;
  }[];
}

export interface Screenshot {
  type: 'fullpage' | 'viewport' | 'element';
  data: string; // base64
  timestamp: string;
}

export class WebsiteAnalyzer {
  private browser: any;
  private options: AnalyzerOptions;

  constructor(options: AnalyzerOptions = {}) {
    this.options = {
      headless: true,
      timeout: 30000,
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      ...options
    };
  }

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: this.options.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });
  }

  async analyze(url: string): Promise<AnalysisResult> {
    const errors: string[] = [];
    const page = await this.browser.newPage();
    
    try {
      // Configure page
      await page.setViewport(this.options.viewport!);
      await page.setUserAgent(this.options.userAgent!);
      
      // Enable request interception for analysis
      await page.setRequestInterception(true);
      const resources: any[] = [];
      
      page.on('request', (request: any) => {
        resources.push({
          url: request.url(),
          type: request.resourceType(),
          method: request.method()
        });
        request.continue();
      });

      // Capture console messages
      const consoleLogs: any[] = [];
      page.on('console', (msg: any) => {
        consoleLogs.push({
          type: msg.type(),
          text: msg.text()
        });
      });

      // Navigate to page with performance tracking
      const startTime = Date.now();
      const response = await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: this.options.timeout
      });
      const loadTime = Date.now() - startTime;

      // Get performance metrics
      const performanceMetrics = await page.evaluate(() => {
        const perfData = performance.getEntriesByType('navigation')[0] as any;
        return {
          timeToFirstByte: perfData?.responseStart - perfData?.fetchStart || 0,
          firstContentfulPaint: perfData?.loadEventEnd - perfData?.fetchStart || 0,
          domContentLoaded: perfData?.domContentLoadedEventEnd - perfData?.fetchStart || 0
        };
      });

      // Analyze page content
      const content = await this.analyzeContent(page);
      const signals = await this.detectSignals(page, consoleLogs);
      const technologies = await this.detectTechnologies(page, resources);
      const seo = await this.analyzeSEO(page);
      const security = this.analyzeSecurityHeaders(response);
      const accessibility = await this.checkAccessibility(page);

      // Capture screenshots
      const screenshots = await this.captureScreenshots(page);

      // Get Core Web Vitals
      const coreWebVitals = await page.evaluate(() => {
        return new Promise((resolve) => {
          let LCP = 0;
          let FID = 0;
          let CLS = 0;

          new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            for (const entry of entries) {
              if (entry.entryType === 'largest-contentful-paint') {
                LCP = entry.startTime;
              }
            }
          }).observe({ entryTypes: ['largest-contentful-paint'] });

          new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            for (const entry of entries) {
              if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
                CLS += (entry as any).value;
              }
            }
          }).observe({ entryTypes: ['layout-shift'] });

          setTimeout(() => {
            resolve({ LCP, FID, CLS });
          }, 5000);
        });
      }) as any;

      const performance: PerformanceMetrics = {
        loadTime,
        timeToFirstByte: performanceMetrics.timeToFirstByte,
        firstContentfulPaint: performanceMetrics.firstContentfulPaint,
        largestContentfulPaint: coreWebVitals.LCP,
        totalBlockingTime: 0,
        cumulativeLayoutShift: coreWebVitals.CLS,
        resourceCount: resources.length,
        totalSize: resources.reduce((sum, r) => sum + (r.size || 0), 0),
        jsHeapSize: await page.evaluate(() => (performance as any).memory?.usedJSHeapSize || 0)
      };

      return {
        url,
        status: 'success',
        signals,
        technologies,
        performance,
        content,
        seo,
        security,
        accessibility,
        screenshots,
        errors,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      errors.push(`Analysis failed: ${error.message}`);
      return {
        url,
        status: 'failed',
        signals: [],
        technologies: [],
        performance: this.getEmptyPerformanceMetrics(),
        content: this.getEmptyContentAnalysis(),
        seo: this.getEmptySEOAnalysis(),
        security: this.getEmptySecurityAnalysis(),
        accessibility: { score: 0, issues: [] },
        errors,
        timestamp: new Date().toISOString()
      };
    } finally {
      await page.close();
    }
  }

  private async analyzeContent(page: any): Promise<ContentAnalysis> {
    return await page.evaluate(() => {
      // Get title and description
      const title = document.title || '';
      const description = (document.querySelector('meta[name="description"]') as HTMLMetaElement)?.content || '';
      
      // Get headings
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => ({
        level: parseInt(h.tagName[1]),
        text: h.textContent?.trim() || ''
      }));

      // Count words
      const textContent = document.body.textContent || '';
      const wordCount = textContent.trim().split(/\s+/).length;

      // Get images
      const images = Array.from(document.querySelectorAll('img')).map(img => ({
        src: img.src,
        alt: img.alt || '',
        loading: img.loading || 'auto'
      }));

      // Get videos
      const videos = Array.from(document.querySelectorAll('video, iframe[src*="youtube"], iframe[src*="vimeo"]'))
        .map(v => (v as HTMLVideoElement).src || (v as HTMLIFrameElement).src);

      // Analyze forms
      const forms = Array.from(document.querySelectorAll('form')).map(form => {
        const fields = Array.from(form.querySelectorAll('input, textarea, select')).map(field => ({
          name: (field as HTMLInputElement).name || '',
          type: (field as HTMLInputElement).type || 'text',
          required: (field as HTMLInputElement).required || false
        }));

        // Determine form purpose
        const formText = form.textContent?.toLowerCase() || '';
        let purpose: 'contact' | 'booking' | 'newsletter' | 'search' | 'login' | 'other' = 'other';
        
        if (formText.includes('contact') || formText.includes('get in touch')) purpose = 'contact';
        else if (formText.includes('book') || formText.includes('appointment') || formText.includes('schedule')) purpose = 'booking';
        else if (formText.includes('newsletter') || formText.includes('subscribe')) purpose = 'newsletter';
        else if (formText.includes('search')) purpose = 'search';
        else if (formText.includes('login') || formText.includes('sign in')) purpose = 'login';

        return {
          id: form.id || undefined,
          action: form.action || undefined,
          method: form.method || 'get',
          fields,
          hasSubmitButton: !!form.querySelector('button[type="submit"], input[type="submit"]'),
          purpose
        };
      });

      // Get links
      const links = Array.from(document.querySelectorAll('a[href]')).slice(0, 100).map(link => {
        const href = (link as HTMLAnchorElement).href;
        const external = !href.startsWith(window.location.origin);
        return {
          href,
          text: link.textContent?.trim() || '',
          external
        };
      });

      // Get structured data
      const structuredData = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
        .map(script => {
          try {
            return JSON.parse(script.textContent || '{}');
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      return {
        title,
        description,
        headings,
        wordCount,
        images: images.slice(0, 50), // Limit to 50 images
        videos: videos.slice(0, 20), // Limit to 20 videos
        forms,
        links,
        structuredData
      };
    });
  }

  private async detectSignals(page: any, consoleLogs: any[]): Promise<WebsiteSignal[]> {
    const signals: WebsiteSignal[] = [];

    // Check for chat widgets
    const chatSignals = await page.evaluate(() => {
      const chatSelectors = [
        'iframe[src*="intercom"]',
        'iframe[src*="drift"]',
        'iframe[src*="tidio"]',
        'iframe[src*="crisp"]',
        'iframe[src*="tawk.to"]',
        '#hubspot-messages-iframe-container',
        '.fb-customerchat',
        'iframe[src*="zendesk"]',
        'iframe[title*="chat"]',
        'div[class*="chat-widget"]'
      ];

      for (const selector of chatSelectors) {
        if (document.querySelector(selector)) {
          return { found: true, selector };
        }
      }

      // Check for chat-related scripts
      const scripts = Array.from(document.querySelectorAll('script')).map(s => s.src);
      const chatScripts = scripts.filter(src => 
        /intercom|drift|tidio|crisp|tawk|hubspot|zendesk|livechat/i.test(src)
      );

      return { found: chatScripts.length > 0, evidence: chatScripts[0] };
    });

    if (chatSignals.found) {
      signals.push({
        type: 'has_chatbot',
        detected: true,
        confidence: 0.95,
        evidence: chatSignals.evidence || chatSignals.selector || 'Chat widget detected',
        metadata: { provider: this.identifyChatProvider(chatSignals.evidence || '') }
      });
    }

    // Check for booking/scheduling systems
    const bookingSignals = await page.evaluate(() => {
      const bookingSelectors = [
        'iframe[src*="calendly"]',
        'iframe[src*="acuity"]',
        'iframe[src*="setmore"]',
        'iframe[src*="squareup.com/appointments"]',
        'iframe[src*="booksy"]',
        'iframe[src*="mindbody"]',
        'button[class*="book"]',
        'a[href*="book"]',
        'a[href*="schedule"]',
        'a[href*="appointment"]'
      ];

      const bookingKeywords = ['book now', 'schedule appointment', 'book appointment', 'reserve', 'make appointment'];
      const pageText = document.body.textContent?.toLowerCase() || '';
      
      for (const keyword of bookingKeywords) {
        if (pageText.includes(keyword)) {
          return { found: true, evidence: keyword };
        }
      }

      for (const selector of bookingSelectors) {
        if (document.querySelector(selector)) {
          return { found: true, selector };
        }
      }

      return { found: false };
    });

    if (bookingSignals.found) {
      signals.push({
        type: 'has_online_booking',
        detected: true,
        confidence: 0.9,
        evidence: bookingSignals.evidence || bookingSignals.selector || 'Booking system detected'
      });
    }

    // Check for payment processors
    const paymentSignals = await page.evaluate(() => {
      const paymentIndicators = [
        'stripe', 'paypal', 'square', 'shopify', 'woocommerce',
        'visa', 'mastercard', 'amex', 'discover',
        'payment', 'checkout', 'cart', 'shop'
      ];

      const pageHTML = document.documentElement.innerHTML.toLowerCase();
      const found: string[] = [];

      for (const indicator of paymentIndicators) {
        if (pageHTML.includes(indicator)) {
          found.push(indicator);
        }
      }

      return found.length > 0 ? { found: true, providers: found } : { found: false };
    });

    if (paymentSignals.found) {
      signals.push({
        type: 'has_payment_processor',
        detected: true,
        confidence: 0.85,
        evidence: `Payment processors: ${paymentSignals.providers?.join(', ')}`,
        metadata: { providers: paymentSignals.providers }
      });
    }

    // Check for analytics
    const analyticsSignals = await page.evaluate(() => {
      const ga = !!(window as any).ga || !!(window as any).gtag || !!(window as any).dataLayer;
      const fbPixel = !!(window as any).fbq;
      const gtm = document.querySelector('script[src*="googletagmanager"]');
      
      return {
        googleAnalytics: ga,
        facebookPixel: fbPixel,
        googleTagManager: !!gtm
      };
    });

    if (analyticsSignals.googleAnalytics || analyticsSignals.facebookPixel || analyticsSignals.googleTagManager) {
      signals.push({
        type: 'has_analytics',
        detected: true,
        confidence: 1.0,
        evidence: 'Analytics tracking detected',
        metadata: analyticsSignals
      });
    }

    // Check for CRM integration
    const crmSignals = consoleLogs.filter(log => 
      /salesforce|hubspot|pipedrive|zoho|monday\.com/i.test(log.text)
    );

    if (crmSignals.length > 0) {
      signals.push({
        type: 'has_crm',
        detected: true,
        confidence: 0.7,
        evidence: 'CRM integration detected in console',
        metadata: { logs: crmSignals.slice(0, 3) }
      });
    }

    // Check for social media presence
    const socialSignals = await page.evaluate(() => {
      const socialLinks: Record<string, string> = {};
      const socialPatterns = {
        facebook: /facebook\.com\/[\w\-\.]+/i,
        twitter: /twitter\.com\/[\w\-\.]+/i,
        instagram: /instagram\.com\/[\w\-\.]+/i,
        linkedin: /linkedin\.com\/(company|in)\/[\w\-\.]+/i,
        youtube: /youtube\.com\/(c|channel|user)\/[\w\-\.]+/i
      };

      const links = Array.from(document.querySelectorAll('a[href]'));
      
      for (const [platform, pattern] of Object.entries(socialPatterns)) {
        const link = links.find(a => pattern.test((a as HTMLAnchorElement).href));
        if (link) {
          socialLinks[platform] = (link as HTMLAnchorElement).href;
        }
      }

      return Object.keys(socialLinks).length > 0 ? { found: true, links: socialLinks } : { found: false };
    });

    if (socialSignals.found) {
      signals.push({
        type: 'social_media_active',
        detected: true,
        confidence: 1.0,
        evidence: `Social media links found: ${Object.keys(socialSignals.links || {}).join(', ')}`,
        metadata: { links: socialSignals.links }
      });
    }

    // Check for mobile responsiveness
    const mobileSignals = await page.evaluate(() => {
      const viewport = document.querySelector('meta[name="viewport"]');
      const hasViewport = !!viewport;
      const hasMediaQueries = Array.from(document.styleSheets).some(sheet => {
        try {
          const rules = sheet.cssRules || sheet.rules;
          return Array.from(rules || []).some(rule => 
            rule.constructor.name === 'CSSMediaRule'
          );
        } catch {
          return false;
        }
      });

      return {
        hasViewport,
        hasMediaQueries,
        responsive: hasViewport && hasMediaQueries
      };
    });

    signals.push({
      type: 'mobile_responsive',
      detected: mobileSignals.responsive,
      confidence: 0.9,
      evidence: `Viewport: ${mobileSignals.hasViewport}, Media queries: ${mobileSignals.hasMediaQueries}`,
      metadata: mobileSignals
    });

    return signals;
  }

  private async detectTechnologies(page: any, resources: any[]): Promise<Technology[]> {
    const technologies: Technology[] = [];

    // Detect from page context
    const pageTech = await page.evaluate(() => {
      const tech: any[] = [];

      // Framework detection
      if ((window as any).React || (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        tech.push({ name: 'React', category: 'framework' });
      }
      if ((window as any).Vue) {
        tech.push({ name: 'Vue.js', category: 'framework' });
      }
      if ((window as any).angular) {
        tech.push({ name: 'Angular', category: 'framework' });
      }
      if ((window as any).jQuery || (window as any).$) {
        tech.push({ name: 'jQuery', category: 'library', version: (window as any).jQuery?.fn?.jquery });
      }

      // CMS detection
      const generator = document.querySelector('meta[name="generator"]') as HTMLMetaElement;
      if (generator?.content) {
        tech.push({ name: generator.content.split(' ')[0], category: 'cms' });
      }

      // E-commerce platforms
      if ((window as any).Shopify) {
        tech.push({ name: 'Shopify', category: 'ecommerce' });
      }
      if (document.querySelector('meta[name="woo-version"]')) {
        tech.push({ name: 'WooCommerce', category: 'ecommerce' });
      }

      return tech;
    });

    technologies.push(...pageTech.map((t: any) => ({
      ...t,
      confidence: 0.95
    })));

    // Detect from resources
    const resourcePatterns = [
      { pattern: /wordpress/i, name: 'WordPress', category: 'cms' },
      { pattern: /shopify/i, name: 'Shopify', category: 'ecommerce' },
      { pattern: /wix/i, name: 'Wix', category: 'cms' },
      { pattern: /squarespace/i, name: 'Squarespace', category: 'cms' },
      { pattern: /cloudflare/i, name: 'Cloudflare', category: 'cdn' },
      { pattern: /google-analytics/i, name: 'Google Analytics', category: 'analytics' },
      { pattern: /facebook.*pixel/i, name: 'Facebook Pixel', category: 'analytics' },
      { pattern: /bootstrap/i, name: 'Bootstrap', category: 'framework' },
      { pattern: /tailwind/i, name: 'Tailwind CSS', category: 'framework' }
    ];

    for (const resource of resources) {
      for (const { pattern, name, category } of resourcePatterns) {
        if (pattern.test(resource.url) && !technologies.find(t => t.name === name)) {
          technologies.push({ name, category, confidence: 0.8 });
        }
      }
    }

    return technologies;
  }

  private async analyzeSEO(page: any): Promise<SEOAnalysis> {
    return await page.evaluate(() => {
      const metaTags: Record<string, string> = {};
      const openGraph: Record<string, string> = {};
      const twitterCard: Record<string, string> = {};

      // Get all meta tags
      document.querySelectorAll('meta').forEach(meta => {
        const name = meta.getAttribute('name') || meta.getAttribute('property');
        const content = meta.getAttribute('content');
        
        if (name && content) {
          if (name.startsWith('og:')) {
            openGraph[name] = content;
          } else if (name.startsWith('twitter:')) {
            twitterCard[name] = content;
          } else {
            metaTags[name] = content;
          }
        }
      });

      // Get canonical URL
      const canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      
      // Check robots
      const robotsMeta = document.querySelector('meta[name="robots"]') as HTMLMetaElement;
      
      // Check for sitemap
      const sitemapLink = document.querySelector('link[rel="sitemap"]') as HTMLLinkElement;

      // Check heading structure
      const h1Count = document.querySelectorAll('h1').length;
      const headingStructure = h1Count === 1;

      // Check image optimization
      const images = Array.from(document.querySelectorAll('img'));
      const optimizedImages = images.filter(img => 
        img.alt && (img.loading === 'lazy' || img.srcset)
      );
      const imageOptimization = images.length > 0 ? 
        (optimizedImages.length / images.length) > 0.5 : true;

      // Get schema markup
      const schema = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
        .map(script => {
          try {
            return JSON.parse(script.textContent || '{}');
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      return {
        metaTags,
        openGraph,
        twitterCard,
        canonicalUrl: canonical?.href,
        robots: robotsMeta?.content,
        sitemap: sitemapLink?.href,
        schema,
        headingStructure,
        imageOptimization
      };
    });
  }

  private analyzeSecurityHeaders(response: any): SecurityAnalysis {
    const headers = response.headers();
    
    return {
      https: response.url().startsWith('https'),
      hsts: !!headers['strict-transport-security'],
      contentSecurityPolicy: !!headers['content-security-policy'],
      xFrameOptions: !!headers['x-frame-options'],
      mixedContent: false // Would need deeper analysis
    };
  }

  private async checkAccessibility(page: any): Promise<AccessibilityScore> {
    const issues = await page.evaluate(() => {
      const issues: any[] = [];

      // Check for alt text on images
      document.querySelectorAll('img:not([alt])').forEach(img => {
        issues.push({
          severity: 'serious',
          description: 'Image missing alt text',
          element: img.outerHTML.substring(0, 100)
        });
      });

      // Check for form labels
      document.querySelectorAll('input:not([type="hidden"]):not([type="submit"])').forEach(input => {
        const id = input.id;
        if (id && !document.querySelector(`label[for="${id}"]`)) {
          issues.push({
            severity: 'serious',
            description: 'Form input missing label',
            element: input.outerHTML.substring(0, 100)
          });
        }
      });

      // Check for heading hierarchy
      let lastHeadingLevel = 0;
      document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(heading => {
        const level = parseInt(heading.tagName[1]);
        if (level - lastHeadingLevel > 1) {
          issues.push({
            severity: 'moderate',
            description: `Heading hierarchy skipped from H${lastHeadingLevel} to H${level}`,
            element: heading.outerHTML.substring(0, 100)
          });
        }
        lastHeadingLevel = level;
      });

      // Check for keyboard navigation
      const interactiveElements = document.querySelectorAll('a, button, input, select, textarea');
      const focusableCount = Array.from(interactiveElements).filter(el => 
        (el as HTMLElement).tabIndex >= 0
      ).length;
      
      if (focusableCount < interactiveElements.length * 0.9) {
        issues.push({
          severity: 'serious',
          description: 'Some interactive elements may not be keyboard accessible'
        });
      }

      return issues;
    });

    // Calculate score (100 - (issues * penalty))
    let score = 100;
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'critical': score -= 10; break;
        case 'serious': score -= 5; break;
        case 'moderate': score -= 3; break;
        case 'minor': score -= 1; break;
      }
    });

    return {
      score: Math.max(0, score),
      issues: issues.slice(0, 20) // Limit to 20 issues
    };
  }

  private async captureScreenshots(page: any): Promise<Screenshot[]> {
    const screenshots: Screenshot[] = [];

    try {
      // Capture viewport screenshot
      const viewportScreenshot = await page.screenshot({ encoding: 'base64' });
      screenshots.push({
        type: 'viewport',
        data: viewportScreenshot,
        timestamp: new Date().toISOString()
      });

      // Capture full page screenshot (limited)
      const fullPageScreenshot = await page.screenshot({ 
        fullPage: true, 
        encoding: 'base64',
        quality: 70 // Reduce quality for size
      });
      screenshots.push({
        type: 'fullpage',
        data: fullPageScreenshot,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Screenshot capture failed:', error);
    }

    return screenshots;
  }

  private identifyChatProvider(evidence: string): string {
    const providers = [
      { name: 'Intercom', pattern: /intercom/i },
      { name: 'Drift', pattern: /drift/i },
      { name: 'Tidio', pattern: /tidio/i },
      { name: 'Crisp', pattern: /crisp/i },
      { name: 'Tawk.to', pattern: /tawk/i },
      { name: 'HubSpot', pattern: /hubspot/i },
      { name: 'Zendesk', pattern: /zendesk/i },
      { name: 'LiveChat', pattern: /livechat/i }
    ];

    for (const { name, pattern } of providers) {
      if (pattern.test(evidence)) {
        return name;
      }
    }

    return 'Unknown';
  }

  private getEmptyPerformanceMetrics(): PerformanceMetrics {
    return {
      loadTime: 0,
      timeToFirstByte: 0,
      firstContentfulPaint: 0,
      largestContentfulPaint: 0,
      totalBlockingTime: 0,
      cumulativeLayoutShift: 0,
      resourceCount: 0,
      totalSize: 0,
      jsHeapSize: 0
    };
  }

  private getEmptyContentAnalysis(): ContentAnalysis {
    return {
      title: '',
      description: '',
      headings: [],
      wordCount: 0,
      images: [],
      videos: [],
      forms: [],
      links: [],
      structuredData: []
    };
  }

  private getEmptySEOAnalysis(): SEOAnalysis {
    return {
      metaTags: {},
      openGraph: {},
      twitterCard: {},
      headingStructure: false,
      imageOptimization: false
    };
  }

  private getEmptySecurityAnalysis(): SecurityAnalysis {
    return {
      https: false,
      hsts: false,
      contentSecurityPolicy: false,
      xFrameOptions: false,
      mixedContent: false
    };
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

interface AnalyzerOptions {
  headless?: boolean;
  timeout?: number;
  viewport?: { width: number; height: number };
  userAgent?: string;
}

// Export factory function
export async function createWebsiteAnalyzer(options?: AnalyzerOptions): Promise<WebsiteAnalyzer> {
  const analyzer = new WebsiteAnalyzer(options);
  await analyzer.initialize();
  return analyzer;
}