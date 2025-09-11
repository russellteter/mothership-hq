// Multi-Source Data Aggregation Architecture
// This module provides a unified interface for fetching and aggregating business data from multiple sources

export interface DataSource {
  name: string;
  type: 'primary' | 'enrichment' | 'validation';
  priority: number;
  rateLimit: { requests: number; window: number };
  fetch(query: DataQuery): Promise<DataResult>;
  isAvailable(): Promise<boolean>;
}

export interface DataQuery {
  businessName?: string;
  address?: string;
  city: string;
  state: string;
  phone?: string;
  website?: string;
  vertical?: string;
  radius?: number;
}

export interface DataResult {
  source: string;
  confidence: number;
  data: BusinessData[];
  metadata?: Record<string, any>;
}

export interface BusinessData {
  name: string;
  address: string;
  city: string;
  state: string;
  zip?: string;
  phone?: string;
  website?: string;
  email?: string;
  hours?: Record<string, string>;
  categories?: string[];
  rating?: number;
  reviewCount?: number;
  socialMedia?: Record<string, string>;
  verified?: boolean;
  lastUpdated?: string;
}

// Google Places Data Source
export class GooglePlacesSource implements DataSource {
  name = 'google_places';
  type: 'primary' as const;
  priority = 1;
  rateLimit = { requests: 100, window: 60000 }; // 100 req/min
  
  private apiKey: string;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async fetch(query: DataQuery): Promise<DataResult> {
    const url = 'https://places.googleapis.com/v1/places:searchNearby';
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.internationalPhoneNumber,places.websiteUri,places.location,places.rating,places.userRatingCount'
      },
      body: JSON.stringify({
        locationRestriction: {
          circle: {
            center: { latitude: 0, longitude: 0 }, // Would be geocoded
            radius: query.radius || 50000
          }
        },
        maxResultCount: 20
      })
    });
    
    const data = await response.json();
    
    return {
      source: this.name,
      confidence: 0.95,
      data: this.transformResults(data.places || [])
    };
  }
  
  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }
  
  private transformResults(places: any[]): BusinessData[] {
    return places.map(place => ({
      name: place.displayName?.text || '',
      address: place.formattedAddress || '',
      city: '', // Extract from address
      state: '', // Extract from address
      phone: place.internationalPhoneNumber,
      website: place.websiteUri,
      rating: place.rating,
      reviewCount: place.userRatingCount,
      verified: true,
      lastUpdated: new Date().toISOString()
    }));
  }
}

// Bing Places Data Source
export class BingPlacesSource implements DataSource {
  name = 'bing_places';
  type: 'primary' as const;
  priority = 2;
  rateLimit = { requests: 50, window: 60000 };
  
  private apiKey: string;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async fetch(query: DataQuery): Promise<DataResult> {
    const url = `https://dev.virtualearth.net/REST/v1/LocalSearch/?query=${encodeURIComponent(query.businessName || '')}&userLocation=${query.city},${query.state}&key=${this.apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    return {
      source: this.name,
      confidence: 0.85,
      data: this.transformResults(data.resourceSets?.[0]?.resources || [])
    };
  }
  
  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }
  
  private transformResults(resources: any[]): BusinessData[] {
    return resources.map(resource => ({
      name: resource.name,
      address: resource.Address?.formattedAddress || '',
      city: resource.Address?.locality || '',
      state: resource.Address?.adminDistrict || '',
      zip: resource.Address?.postalCode,
      phone: resource.PhoneNumber,
      website: resource.Website,
      verified: false,
      lastUpdated: new Date().toISOString()
    }));
  }
}

// Yelp Data Source
export class YelpSource implements DataSource {
  name = 'yelp';
  type: 'enrichment' as const;
  priority = 3;
  rateLimit = { requests: 30, window: 60000 };
  
  private apiKey: string;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async fetch(query: DataQuery): Promise<DataResult> {
    const url = 'https://api.yelp.com/v3/businesses/search';
    
    const params = new URLSearchParams({
      location: `${query.city}, ${query.state}`,
      term: query.businessName || query.vertical || '',
      limit: '20',
      radius: String(query.radius || 40000)
    });
    
    const response = await fetch(`${url}?${params}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });
    
    const data = await response.json();
    
    return {
      source: this.name,
      confidence: 0.9,
      data: this.transformResults(data.businesses || [])
    };
  }
  
  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }
  
  private transformResults(businesses: any[]): BusinessData[] {
    return businesses.map(biz => ({
      name: biz.name,
      address: biz.location?.address1 || '',
      city: biz.location?.city || '',
      state: biz.location?.state || '',
      zip: biz.location?.zip_code,
      phone: biz.phone,
      website: biz.url,
      rating: biz.rating,
      reviewCount: biz.review_count,
      categories: biz.categories?.map((c: any) => c.title) || [],
      hours: this.parseHours(biz.hours),
      verified: biz.is_claimed || false,
      lastUpdated: new Date().toISOString()
    }));
  }
  
  private parseHours(hours: any): Record<string, string> {
    // Parse Yelp hours format
    return {};
  }
}

// Apollo.io Data Source for B2B enrichment
export class ApolloSource implements DataSource {
  name = 'apollo';
  type: 'enrichment' as const;
  priority = 4;
  rateLimit = { requests: 20, window: 60000 };
  
  private apiKey: string;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async fetch(query: DataQuery): Promise<DataResult> {
    const url = 'https://api.apollo.io/v1/mixed_companies/search';
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Api-Key': this.apiKey
      },
      body: JSON.stringify({
        company_locations: [`${query.city}, ${query.state}`],
        company_domain: query.website,
        per_page: 20,
        page: 1
      })
    });
    
    const data = await response.json();
    
    return {
      source: this.name,
      confidence: 0.85,
      data: this.transformResults(data.companies || []),
      metadata: {
        employees: data.people || []
      }
    };
  }
  
  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }
  
  private transformResults(companies: any[]): BusinessData[] {
    return companies.map(company => ({
      name: company.name,
      address: company.street_address || '',
      city: company.city || '',
      state: company.state || '',
      zip: company.postal_code,
      phone: company.phone,
      website: company.domain,
      email: company.email,
      socialMedia: {
        linkedin: company.linkedin_url,
        facebook: company.facebook_url,
        twitter: company.twitter_url
      },
      verified: true,
      lastUpdated: new Date().toISOString()
    }));
  }
}

// Clearbit Data Source
export class ClearbitSource implements DataSource {
  name = 'clearbit';
  type: 'enrichment' as const;
  priority = 5;
  rateLimit = { requests: 15, window: 60000 };
  
  private apiKey: string;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async fetch(query: DataQuery): Promise<DataResult> {
    if (!query.website) {
      return { source: this.name, confidence: 0, data: [] };
    }
    
    const domain = new URL(query.website).hostname;
    const url = `https://company.clearbit.com/v2/companies/find?domain=${domain}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });
    
    const data = await response.json();
    
    return {
      source: this.name,
      confidence: 0.9,
      data: data ? [this.transformResult(data)] : []
    };
  }
  
  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }
  
  private transformResult(company: any): BusinessData {
    return {
      name: company.name,
      address: `${company.location?.streetNumber} ${company.location?.streetName}`,
      city: company.location?.city || '',
      state: company.location?.state || '',
      zip: company.location?.postalCode,
      phone: company.phone,
      website: company.domain,
      email: company.email,
      categories: company.tags || [],
      socialMedia: {
        linkedin: company.linkedin?.handle,
        facebook: company.facebook?.handle,
        twitter: company.twitter?.handle
      },
      verified: true,
      lastUpdated: new Date().toISOString()
    };
  }
}

// Data Aggregator - Orchestrates multiple sources
export class DataAggregator {
  private sources: DataSource[] = [];
  private cache: Map<string, { data: DataResult; timestamp: number }> = new Map();
  private cacheTimeout = 15 * 60 * 1000; // 15 minutes
  
  addSource(source: DataSource) {
    this.sources.push(source);
    this.sources.sort((a, b) => a.priority - b.priority);
  }
  
  async fetchFromAllSources(query: DataQuery): Promise<AggregatedResult> {
    const cacheKey = JSON.stringify(query);
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return { results: [cached.data], fromCache: true };
    }
    
    const results: DataResult[] = [];
    const errors: Error[] = [];
    
    // Fetch from primary sources first
    const primarySources = this.sources.filter(s => s.type === 'primary');
    for (const source of primarySources) {
      try {
        if (await source.isAvailable()) {
          const result = await this.rateLimitedFetch(source, query);
          results.push(result);
          
          // If we get good results from primary, we can skip others
          if (result.data.length >= 20) {
            break;
          }
        }
      } catch (error) {
        errors.push(new Error(`${source.name}: ${error.message}`));
      }
    }
    
    // Enrich with secondary sources
    const enrichmentSources = this.sources.filter(s => s.type === 'enrichment');
    await Promise.all(
      enrichmentSources.map(async (source) => {
        try {
          if (await source.isAvailable()) {
            const result = await this.rateLimitedFetch(source, query);
            results.push(result);
          }
        } catch (error) {
          errors.push(new Error(`${source.name}: ${error.message}`));
        }
      })
    );
    
    // Merge and deduplicate results
    const merged = this.mergeResults(results);
    
    // Cache the result
    this.cache.set(cacheKey, { data: merged, timestamp: Date.now() });
    
    return {
      results: [merged],
      errors,
      fromCache: false
    };
  }
  
  private async rateLimitedFetch(source: DataSource, query: DataQuery): Promise<DataResult> {
    // Simple rate limiting implementation
    // In production, use a proper rate limiter like bottleneck
    await new Promise(resolve => setTimeout(resolve, 100));
    return source.fetch(query);
  }
  
  private mergeResults(results: DataResult[]): DataResult {
    const mergedData = new Map<string, BusinessData>();
    
    for (const result of results) {
      for (const business of result.data) {
        const key = `${business.name}-${business.city}-${business.state}`.toLowerCase();
        const existing = mergedData.get(key);
        
        if (!existing || result.confidence > 0.8) {
          mergedData.set(key, {
            ...existing,
            ...business,
            // Keep non-null values from multiple sources
            phone: business.phone || existing?.phone,
            website: business.website || existing?.website,
            email: business.email || existing?.email,
            rating: business.rating || existing?.rating,
            reviewCount: business.reviewCount || existing?.reviewCount
          });
        }
      }
    }
    
    return {
      source: 'aggregated',
      confidence: Math.max(...results.map(r => r.confidence)),
      data: Array.from(mergedData.values()),
      metadata: {
        sources: results.map(r => r.source),
        totalResults: mergedData.size
      }
    };
  }
}

interface AggregatedResult {
  results: DataResult[];
  errors?: Error[];
  fromCache: boolean;
}

// Factory function to create configured aggregator
export function createDataAggregator(): DataAggregator {
  const aggregator = new DataAggregator();
  
  // Add sources based on available API keys
  const googleKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
  const bingKey = Deno.env.get('BING_MAPS_API_KEY');
  const yelpKey = Deno.env.get('YELP_API_KEY');
  const apolloKey = Deno.env.get('APOLLO_API_KEY');
  const clearbitKey = Deno.env.get('CLEARBIT_API_KEY');
  
  if (googleKey) aggregator.addSource(new GooglePlacesSource(googleKey));
  if (bingKey) aggregator.addSource(new BingPlacesSource(bingKey));
  if (yelpKey) aggregator.addSource(new YelpSource(yelpKey));
  if (apolloKey) aggregator.addSource(new ApolloSource(apolloKey));
  if (clearbitKey) aggregator.addSource(new ClearbitSource(clearbitKey));
  
  return aggregator;
}