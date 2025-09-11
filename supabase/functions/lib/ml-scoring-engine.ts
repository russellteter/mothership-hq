// ML-Based Scoring Engine
// Advanced lead scoring using machine learning-inspired algorithms

import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Signal importance weights learned from "training data"
const SIGNAL_WEIGHTS = {
  // Critical signals (0.8-1.0 weight)
  no_website: -0.95,
  website_error: -0.90,
  owner_identified: 0.85,
  has_online_booking: 0.80,
  
  // High importance signals (0.6-0.8 weight)
  has_chatbot: 0.75,
  mobile_responsive: 0.70,
  has_analytics: 0.65,
  has_payment_processor: 0.65,
  ssl_certificate: 0.60,
  
  // Medium importance signals (0.4-0.6 weight)
  has_crm: 0.55,
  has_marketing_automation: 0.50,
  social_media_active: 0.45,
  business_hours: 0.40,
  structured_data: 0.40,
  
  // Low importance signals (0.2-0.4 weight)
  franchise: -0.30,
  high_competition: -0.25,
  recent_update: 0.20
};

// Feature extraction schemas
const SignalSchema = z.object({
  type: z.string(),
  value: z.any(),
  confidence: z.number().min(0).max(1),
  source: z.string().optional(),
  timestamp: z.string().optional()
});

const BusinessFeaturesSchema = z.object({
  vertical: z.string(),
  location: z.object({
    city: z.string(),
    state: z.string(),
    population_density: z.number().optional(),
    median_income: z.number().optional()
  }),
  online_presence: z.object({
    has_website: z.boolean(),
    website_quality: z.number().min(0).max(100).optional(),
    social_media_count: z.number(),
    review_count: z.number(),
    average_rating: z.number().optional()
  }),
  business_maturity: z.object({
    years_in_business: z.number().optional(),
    employee_count: z.number().optional(),
    revenue_estimate: z.number().optional()
  }),
  technology_adoption: z.object({
    tech_stack_count: z.number(),
    modern_tools: z.boolean(),
    api_integrations: z.number().optional()
  })
});

const ScoringProfileSchema = z.object({
  name: z.string(),
  description: z.string(),
  weights: z.object({
    icp_fit: z.number().min(0).max(1),
    pain_score: z.number().min(0).max(1),
    opportunity_size: z.number().min(0).max(1),
    reachability: z.number().min(0).max(1),
    timing: z.number().min(0).max(1)
  }),
  thresholds: z.object({
    qualified: z.number().min(0).max(100),
    promising: z.number().min(0).max(100),
    low_priority: z.number().min(0).max(100)
  }),
  industry_modifiers: z.record(z.number()).optional()
});

export class MLScoringEngine {
  private profiles: Map<string, ScoringProfile>;
  private featureCache: Map<string, FeatureVector>;
  private modelVersion: string = "1.0.0";

  constructor() {
    this.profiles = new Map();
    this.featureCache = new Map();
    this.initializeProfiles();
  }

  private initializeProfiles() {
    // Sales-ready profile - optimized for immediate outreach
    this.profiles.set('sales_ready', {
      name: 'sales_ready',
      description: 'Optimized for businesses ready for immediate sales outreach',
      weights: {
        icp_fit: 0.20,
        pain_score: 0.25,
        opportunity_size: 0.20,
        reachability: 0.30,
        timing: 0.05
      },
      thresholds: {
        qualified: 75,
        promising: 60,
        low_priority: 40
      },
      industry_modifiers: {
        'technology': 1.1,
        'healthcare': 1.05,
        'retail': 0.95,
        'restaurant': 0.90
      }
    });

    // Marketing qualified profile - optimized for nurture campaigns
    this.profiles.set('marketing_qualified', {
      name: 'marketing_qualified',
      description: 'Optimized for businesses that need education and nurturing',
      weights: {
        icp_fit: 0.30,
        pain_score: 0.35,
        opportunity_size: 0.25,
        reachability: 0.05,
        timing: 0.05
      },
      thresholds: {
        qualified: 70,
        promising: 55,
        low_priority: 35
      }
    });

    // Enterprise profile - optimized for large deal sizes
    this.profiles.set('enterprise', {
      name: 'enterprise',
      description: 'Optimized for enterprise businesses with complex needs',
      weights: {
        icp_fit: 0.35,
        pain_score: 0.20,
        opportunity_size: 0.35,
        reachability: 0.05,
        timing: 0.05
      },
      thresholds: {
        qualified: 80,
        promising: 65,
        low_priority: 45
      },
      industry_modifiers: {
        'financial': 1.2,
        'healthcare': 1.15,
        'government': 1.1
      }
    });

    // Tech-savvy profile - optimized for digitally mature businesses
    this.profiles.set('tech_savvy', {
      name: 'tech_savvy',
      description: 'Optimized for businesses already using modern technology',
      weights: {
        icp_fit: 0.25,
        pain_score: 0.40,
        opportunity_size: 0.20,
        reachability: 0.10,
        timing: 0.05
      },
      thresholds: {
        qualified: 72,
        promising: 58,
        low_priority: 38
      }
    });

    // Local SMB profile - optimized for local small businesses
    this.profiles.set('local_smb', {
      name: 'local_smb',
      description: 'Optimized for local small and medium businesses',
      weights: {
        icp_fit: 0.25,
        pain_score: 0.30,
        opportunity_size: 0.15,
        reachability: 0.25,
        timing: 0.05
      },
      thresholds: {
        qualified: 65,
        promising: 50,
        low_priority: 30
      },
      industry_modifiers: {
        'restaurant': 1.1,
        'retail': 1.1,
        'services': 1.05
      }
    });
  }

  async scoreLead(
    businessData: any,
    signals: Signal[],
    profileName: string = 'sales_ready'
  ): Promise<ScoringResult> {
    const profile = this.profiles.get(profileName) || this.profiles.get('sales_ready')!;
    
    // Extract features
    const features = await this.extractFeatures(businessData, signals);
    
    // Calculate component scores
    const icpScore = this.calculateICPScore(features, businessData.vertical);
    const painScore = this.calculatePainScore(features, signals);
    const opportunityScore = this.calculateOpportunityScore(features, businessData);
    const reachabilityScore = this.calculateReachabilityScore(features, signals);
    const timingScore = this.calculateTimingScore(features, signals);
    
    // Apply weights
    const weightedScore = 
      (icpScore * profile.weights.icp_fit) +
      (painScore * profile.weights.pain_score) +
      (opportunityScore * profile.weights.opportunity_size) +
      (reachabilityScore * profile.weights.reachability) +
      (timingScore * profile.weights.timing);
    
    // Apply industry modifier if available
    const industryModifier = profile.industry_modifiers?.[businessData.vertical] || 1.0;
    const finalScore = Math.min(100, Math.max(0, weightedScore * industryModifier));
    
    // Determine qualification level
    let qualification: 'qualified' | 'promising' | 'low_priority' | 'unqualified';
    if (finalScore >= profile.thresholds.qualified) {
      qualification = 'qualified';
    } else if (finalScore >= profile.thresholds.promising) {
      qualification = 'promising';
    } else if (finalScore >= profile.thresholds.low_priority) {
      qualification = 'low_priority';
    } else {
      qualification = 'unqualified';
    }
    
    // Generate insights
    const insights = this.generateInsights(features, signals, finalScore);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(
      features,
      signals,
      qualification,
      painScore
    );
    
    return {
      score: Math.round(finalScore),
      qualification,
      components: {
        icp: Math.round(icpScore),
        pain: Math.round(painScore),
        opportunity: Math.round(opportunityScore),
        reachability: Math.round(reachabilityScore),
        timing: Math.round(timingScore)
      },
      confidence: this.calculateConfidence(signals),
      insights,
      recommendations,
      profile: profileName,
      model_version: this.modelVersion,
      scored_at: new Date().toISOString()
    };
  }

  private async extractFeatures(businessData: any, signals: Signal[]): Promise<FeatureVector> {
    const cacheKey = `${businessData.id}_${signals.length}`;
    
    if (this.featureCache.has(cacheKey)) {
      return this.featureCache.get(cacheKey)!;
    }
    
    const features: FeatureVector = {
      // Basic features
      has_website: signals.some(s => s.type === 'has_website' && s.value),
      website_quality: 0,
      
      // Technology features
      tech_stack_size: 0,
      has_modern_tech: false,
      has_analytics: false,
      has_chat: false,
      has_booking: false,
      has_payment: false,
      has_crm: false,
      has_marketing_auto: false,
      
      // Business features
      years_in_business: 0,
      employee_count: 0,
      review_count: businessData.review_count || 0,
      average_rating: businessData.rating || 0,
      
      // Digital maturity
      digital_maturity_score: 0,
      mobile_responsive: false,
      ssl_enabled: false,
      page_speed_score: 0,
      
      // Contact & Reachability
      owner_identified: false,
      has_email: false,
      has_phone: false,
      social_media_count: 0,
      
      // Market features
      competition_level: 0,
      market_size_estimate: 0,
      growth_potential: 0
    };
    
    // Process signals to extract features
    for (const signal of signals) {
      switch (signal.type) {
        case 'has_website':
          features.has_website = signal.value;
          break;
        case 'has_analytics':
          features.has_analytics = signal.value;
          features.tech_stack_size++;
          break;
        case 'has_chatbot':
          features.has_chat = signal.value;
          features.tech_stack_size++;
          break;
        case 'has_online_booking':
          features.has_booking = signal.value;
          features.tech_stack_size++;
          break;
        case 'has_payment_processor':
          features.has_payment = signal.value;
          features.tech_stack_size++;
          break;
        case 'has_crm':
          features.has_crm = signal.value;
          features.tech_stack_size++;
          break;
        case 'has_marketing_automation':
          features.has_marketing_auto = signal.value;
          features.tech_stack_size++;
          break;
        case 'mobile_responsive':
          features.mobile_responsive = signal.value;
          break;
        case 'ssl_certificate':
          features.ssl_enabled = signal.value;
          break;
        case 'owner_identified':
          features.owner_identified = signal.value;
          break;
        case 'social_media_active':
          if (signal.value && signal.value.links) {
            features.social_media_count = Object.keys(signal.value.links).length;
          }
          break;
        case 'website_performance':
          if (signal.value && signal.value.load_time_ms) {
            // Convert load time to score (0-100)
            const loadTime = signal.value.load_time_ms;
            features.page_speed_score = Math.max(0, 100 - (loadTime / 100));
          }
          break;
      }
    }
    
    // Calculate derived features
    features.has_modern_tech = features.tech_stack_size >= 3;
    features.digital_maturity_score = this.calculateDigitalMaturity(features);
    
    // Estimate market features based on vertical and location
    features.market_size_estimate = this.estimateMarketSize(businessData);
    features.growth_potential = this.estimateGrowthPotential(businessData, features);
    
    this.featureCache.set(cacheKey, features);
    return features;
  }

  private calculateICPScore(features: FeatureVector, vertical: string): number {
    let score = 50; // Base score
    
    // Industry fit
    const highValueVerticals = ['healthcare', 'law_firm', 'financial', 'real_estate'];
    const mediumValueVerticals = ['contractor', 'hvac', 'roofing', 'automotive'];
    
    if (highValueVerticals.includes(vertical)) {
      score += 15;
    } else if (mediumValueVerticals.includes(vertical)) {
      score += 10;
    }
    
    // Business size indicators
    if (features.employee_count > 10) score += 10;
    else if (features.employee_count > 5) score += 5;
    
    if (features.review_count > 100) score += 10;
    else if (features.review_count > 50) score += 5;
    
    // Digital presence
    if (features.has_website) score += 10;
    if (features.social_media_count >= 2) score += 5;
    
    // Business maturity
    if (features.years_in_business > 5) score += 5;
    if (features.average_rating >= 4.0) score += 5;
    
    return Math.min(100, score);
  }

  private calculatePainScore(features: FeatureVector, signals: Signal[]): number {
    let painPoints = 0;
    let maxPainPoints = 10;
    
    // Major pain points (2 points each)
    if (!features.has_website) painPoints += 2;
    if (!features.mobile_responsive && features.has_website) painPoints += 2;
    if (!features.has_booking && this.shouldHaveBooking(signals)) painPoints += 2;
    if (!features.has_analytics) painPoints += 2;
    if (features.page_speed_score < 50) painPoints += 2;
    
    // Moderate pain points (1 point each)
    if (!features.has_chat) painPoints += 1;
    if (!features.ssl_enabled && features.has_website) painPoints += 1;
    if (!features.has_crm) painPoints += 1;
    if (!features.has_marketing_auto) painPoints += 1;
    if (features.social_media_count === 0) painPoints += 1;
    
    // Convert to 0-100 scale
    return Math.min(100, (painPoints / maxPainPoints) * 100);
  }

  private calculateOpportunityScore(features: FeatureVector, businessData: any): number {
    let score = 0;
    
    // Market size component (0-40 points)
    score += Math.min(40, features.market_size_estimate * 0.4);
    
    // Growth potential component (0-30 points)
    score += Math.min(30, features.growth_potential * 0.3);
    
    // Technology gap component (0-30 points)
    const techGap = 10 - features.tech_stack_size;
    score += Math.min(30, Math.max(0, techGap * 3));
    
    return Math.min(100, score);
  }

  private calculateReachabilityScore(features: FeatureVector, signals: Signal[]): number {
    let score = 0;
    
    // Contact information availability
    if (features.owner_identified) score += 40;
    if (features.has_email) score += 20;
    if (features.has_phone) score += 20;
    
    // Digital channels
    if (features.has_website) score += 10;
    if (features.social_media_count > 0) {
      score += Math.min(10, features.social_media_count * 3);
    }
    
    return Math.min(100, score);
  }

  private calculateTimingScore(features: FeatureVector, signals: Signal[]): number {
    let score = 50; // Neutral baseline
    
    // Positive timing indicators
    const recentActivitySignal = signals.find(s => s.type === 'recent_website_update');
    if (recentActivitySignal && recentActivitySignal.value) {
      score += 20;
    }
    
    // Growth indicators
    if (features.review_count > 0) {
      // Check for recent reviews (would need timestamp data)
      score += 10;
    }
    
    // Negative timing indicators
    if (features.years_in_business < 1) {
      score -= 20; // Too new, might not be ready
    }
    
    return Math.min(100, Math.max(0, score));
  }

  private calculateDigitalMaturity(features: FeatureVector): number {
    let maturity = 0;
    const factors = [
      { condition: features.has_website, weight: 20 },
      { condition: features.mobile_responsive, weight: 15 },
      { condition: features.ssl_enabled, weight: 10 },
      { condition: features.has_analytics, weight: 10 },
      { condition: features.has_chat, weight: 8 },
      { condition: features.has_booking, weight: 8 },
      { condition: features.has_payment, weight: 7 },
      { condition: features.has_crm, weight: 7 },
      { condition: features.has_marketing_auto, weight: 5 },
      { condition: features.social_media_count > 2, weight: 5 },
      { condition: features.page_speed_score > 70, weight: 5 }
    ];
    
    for (const factor of factors) {
      if (factor.condition) {
        maturity += factor.weight;
      }
    }
    
    return maturity;
  }

  private estimateMarketSize(businessData: any): number {
    // Simplified market size estimation based on vertical and location
    const marketSizes: Record<string, number> = {
      'healthcare': 85,
      'law_firm': 80,
      'financial': 90,
      'real_estate': 75,
      'contractor': 70,
      'hvac': 65,
      'roofing': 60,
      'restaurant': 55,
      'retail': 60,
      'fitness': 50,
      'beauty': 45,
      'automotive': 70
    };
    
    return marketSizes[businessData.vertical] || 50;
  }

  private estimateGrowthPotential(businessData: any, features: FeatureVector): number {
    let potential = 50; // Base potential
    
    // Low digital maturity = high growth potential
    if (features.digital_maturity_score < 30) {
      potential += 20;
    } else if (features.digital_maturity_score < 50) {
      potential += 10;
    }
    
    // Market factors
    if (features.market_size_estimate > 70) {
      potential += 10;
    }
    
    // Competition factors (simplified)
    if (features.review_count < 50) {
      potential += 10; // Room to grow
    }
    
    return Math.min(100, potential);
  }

  private shouldHaveBooking(signals: Signal[]): boolean {
    // Determine if business type typically needs booking
    const bookingVerticals = [
      'dentist', 'healthcare', 'beauty', 'fitness',
      'automotive', 'contractor', 'hvac', 'roofing'
    ];
    
    const verticalSignal = signals.find(s => s.type === 'business_vertical');
    if (verticalSignal && bookingVerticals.includes(verticalSignal.value)) {
      return true;
    }
    
    return false;
  }

  private calculateConfidence(signals: Signal[]): number {
    if (signals.length === 0) return 0;
    
    const totalConfidence = signals.reduce((sum, signal) => sum + signal.confidence, 0);
    const averageConfidence = totalConfidence / signals.length;
    
    // Boost confidence based on signal count
    const countBoost = Math.min(0.2, signals.length * 0.01);
    
    return Math.min(1, averageConfidence + countBoost);
  }

  private generateInsights(features: FeatureVector, signals: Signal[], score: number): string[] {
    const insights: string[] = [];
    
    if (score >= 80) {
      insights.push('High-value lead with strong buying signals');
    } else if (score >= 60) {
      insights.push('Promising lead with moderate opportunity');
    } else if (score >= 40) {
      insights.push('Potential lead requiring nurturing');
    } else {
      insights.push('Low priority lead with limited immediate opportunity');
    }
    
    // Technology insights
    if (!features.has_website) {
      insights.push('No website detected - major digital presence gap');
    } else if (features.digital_maturity_score < 30) {
      insights.push('Low digital maturity - significant improvement opportunity');
    } else if (features.digital_maturity_score > 70) {
      insights.push('Digitally mature - may need advanced solutions');
    }
    
    // Reachability insights
    if (features.owner_identified) {
      insights.push('Decision maker identified - direct outreach possible');
    } else {
      insights.push('No owner information - research needed before outreach');
    }
    
    // Pain point insights
    if (!features.has_booking && this.shouldHaveBooking(signals)) {
      insights.push('Missing online booking - operational efficiency opportunity');
    }
    
    if (!features.mobile_responsive && features.has_website) {
      insights.push('Website not mobile optimized - losing mobile traffic');
    }
    
    return insights;
  }

  private generateRecommendations(
    features: FeatureVector,
    signals: Signal[],
    qualification: string,
    painScore: number
  ): string[] {
    const recommendations: string[] = [];
    
    switch (qualification) {
      case 'qualified':
        recommendations.push('Priority outreach - schedule call within 24-48 hours');
        if (features.owner_identified) {
          recommendations.push('Direct contact to decision maker available');
        }
        if (painScore > 70) {
          recommendations.push('Lead with pain point solutions in messaging');
        }
        break;
        
      case 'promising':
        recommendations.push('Add to nurture campaign with educational content');
        if (!features.owner_identified) {
          recommendations.push('Research to identify decision makers');
        }
        recommendations.push('Monitor for engagement signals');
        break;
        
      case 'low_priority':
        recommendations.push('Add to long-term nurture sequence');
        recommendations.push('Revisit in 3-6 months');
        break;
        
      case 'unqualified':
        recommendations.push('Do not pursue at this time');
        recommendations.push('Re-evaluate if business profile changes');
        break;
    }
    
    // Specific action recommendations based on pain points
    if (!features.has_website) {
      recommendations.push('Offer website development as entry point');
    } else if (!features.mobile_responsive) {
      recommendations.push('Highlight mobile optimization benefits');
    }
    
    if (!features.has_analytics && features.has_website) {
      recommendations.push('Emphasize importance of data-driven decisions');
    }
    
    return recommendations;
  }

  // Batch scoring for efficiency
  async batchScore(
    leads: Array<{ businessData: any; signals: Signal[] }>,
    profileName: string = 'sales_ready'
  ): Promise<ScoringResult[]> {
    const results: ScoringResult[] = [];
    
    // Process in parallel batches for efficiency
    const batchSize = 10;
    for (let i = 0; i < leads.length; i += batchSize) {
      const batch = leads.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(lead => this.scoreLead(lead.businessData, lead.signals, profileName))
      );
      results.push(...batchResults);
    }
    
    return results;
  }

  // Get available profiles
  getProfiles(): ScoringProfile[] {
    return Array.from(this.profiles.values());
  }

  // Add custom profile
  addCustomProfile(profile: ScoringProfile): void {
    const validated = ScoringProfileSchema.parse(profile);
    this.profiles.set(validated.name, validated);
  }
}

// Type definitions
interface Signal {
  type: string;
  value: any;
  confidence: number;
  source?: string;
  timestamp?: string;
}

interface FeatureVector {
  // Basic features
  has_website: boolean;
  website_quality: number;
  
  // Technology features
  tech_stack_size: number;
  has_modern_tech: boolean;
  has_analytics: boolean;
  has_chat: boolean;
  has_booking: boolean;
  has_payment: boolean;
  has_crm: boolean;
  has_marketing_auto: boolean;
  
  // Business features
  years_in_business: number;
  employee_count: number;
  review_count: number;
  average_rating: number;
  
  // Digital maturity
  digital_maturity_score: number;
  mobile_responsive: boolean;
  ssl_enabled: boolean;
  page_speed_score: number;
  
  // Contact & Reachability
  owner_identified: boolean;
  has_email: boolean;
  has_phone: boolean;
  social_media_count: number;
  
  // Market features
  competition_level: number;
  market_size_estimate: number;
  growth_potential: number;
}

interface ScoringProfile {
  name: string;
  description: string;
  weights: {
    icp_fit: number;
    pain_score: number;
    opportunity_size: number;
    reachability: number;
    timing: number;
  };
  thresholds: {
    qualified: number;
    promising: number;
    low_priority: number;
  };
  industry_modifiers?: Record<string, number>;
}

interface ScoringResult {
  score: number;
  qualification: 'qualified' | 'promising' | 'low_priority' | 'unqualified';
  components: {
    icp: number;
    pain: number;
    opportunity: number;
    reachability: number;
    timing: number;
  };
  confidence: number;
  insights: string[];
  recommendations: string[];
  profile: string;
  model_version: string;
  scored_at: string;
}

// Export factory function
export function createScoringEngine(): MLScoringEngine {
  return new MLScoringEngine();
}