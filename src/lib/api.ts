// API client for server endpoints
const USE_MOCK_SEARCH = import.meta.env.VITE_USE_MOCK_SEARCH !== 'false'; // Default to true
const API_BASE_URL = USE_MOCK_SEARCH ? '' : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001');

export interface SearchResult {
  search_job: any;
  leads: any[];
  total: number;
}

export interface ParsePromptResponse {
  dsl: any;
  warnings: string[];
  confidence: number;
}

export const api = {
  // Health check
  async healthCheck() {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    return response.json();
  },

  // Parse prompt
  async parsePrompt(prompt: string): Promise<ParsePromptResponse> {
    if (USE_MOCK_SEARCH) {
      // Mock response for development
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
      return {
        dsl: {
          vertical: "generic",
          version: 1,
          geo: {
            city: "New York",
            state: "NY",
            radius_km: 50
          },
          constraints: {
            must: [
              { field: "industry", value: prompt.toLowerCase().includes('restaurant') ? 'restaurants' : 'business' }
            ]
          },
          result_size: { target: 100 },
          sort_by: "relevance",
          lead_profile: "standard",
          output: { format: "json" },
          notify: { webhook_url: null },
          compliance_flags: ["gdpr"]
        },
        warnings: [],
        confidence: 0.95
      };
    }

    const response = await fetch(`${API_BASE_URL}/api/parse-prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });
    
    if (!response.ok) {
      throw new Error(`Parse prompt failed: ${response.statusText}`);
    }
    
    return response.json();
  },

  // Create search job
  async searchLeads(data: {
    dsl: any;
    original_prompt?: string;
    custom_name?: string;
    search_tags?: string[];
    lead_type?: string;
  }) {
    if (USE_MOCK_SEARCH) {
      // Mock response for development
      await new Promise(resolve => setTimeout(resolve, 300));
      return {
        job_id: `mock-job-${Date.now()}`,
        status: 'queued',
        message: 'Search job created successfully'
      };
    }

    const response = await fetch(`${API_BASE_URL}/api/search-leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`Search leads failed: ${response.statusText}`);
    }
    
    return response.json();
  },

  // Get search results
  async getSearchResults(searchJobId: string, options?: {
    limit?: number;
    offset?: number;
    status?: string;
  }): Promise<SearchResult> {
    if (USE_MOCK_SEARCH) {
      // Mock response for development
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const limit = options?.limit || 20;
      const offset = options?.offset || 0;
      
      // Generate mock leads
      const mockLeads = Array.from({ length: limit }, (_, i) => ({
        id: `lead-${offset + i + 1}`,
        business_id: `biz-${offset + i + 1}`,
        business_name: `Business ${offset + i + 1}`,
        website: `https://business${offset + i + 1}.com`,
        phone: `+1-555-${String(Math.floor(Math.random() * 9000) + 1000)}`,
        email: `contact@business${offset + i + 1}.com`,
        address: {
          street: `${100 + i} Main St`,
          city: 'New York',
          state: 'NY',
          zipcode: `100${String(i + 1).padStart(2, '0')}`
        },
        status: ['new', 'qualified', 'ignored'][Math.floor(Math.random() * 3)],
        confidence_score: Math.random() * 0.5 + 0.5, // 0.5 to 1.0
        created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
      }));

      return {
        search_job: {
          id: searchJobId,
          status: 'completed',
          created_at: new Date().toISOString(),
          summary_stats: {
            total_found: 150,
            qualified: 45,
            new: 80,
            ignored: 25
          }
        },
        leads: mockLeads,
        total: 150
      };
    }

    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    if (options?.status) params.append('status', options.status);
    
    const url = `${API_BASE_URL}/api/search-results/${searchJobId}${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Get search results failed: ${response.statusText}`);
    }
    
    return response.json();
  },
};