// API client for server endpoints
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

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