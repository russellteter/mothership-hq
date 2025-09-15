// In-memory storage implementation per guidelines
import { SearchJob, SavedSearch, DashboardStats, LeadQuery } from '../src/types/lead.js';

export interface IStorage {
  // Search jobs
  getSearchJobs(userId: string): Promise<SearchJob[]>;
  createSearchJob(data: CreateSearchJobData): Promise<SearchJob>;
  updateSearchJob(id: string, data: Partial<SearchJob>): Promise<SearchJob>;
  
  // Saved searches
  getSavedSearches(userId: string): Promise<SavedSearch[]>;
  createSavedSearch(data: CreateSavedSearchData): Promise<SavedSearch>;
  updateSavedSearch(id: string, data: Partial<SavedSearch>): Promise<SavedSearch>;
  deleteSavedSearch(id: string): Promise<void>;
  
  // Dashboard stats
  getDashboardStats(userId: string): Promise<DashboardStats>;
  
  // Status logs
  updateLeadStatus(businessId: string, status: 'new' | 'qualified' | 'ignored'): Promise<void>;
  
  // Notes and tags
  addNote(businessId: string, text: string): Promise<void>;
  addTag(businessId: string, tag: string): Promise<void>;
}

export interface CreateSearchJobData {
  dslJson: LeadQuery;
  status?: 'queued' | 'running' | 'completed' | 'failed';
  userId: string;
  customName?: string;
  originalPrompt?: string;
  searchTags?: string[];
  leadType?: string;
}

export interface CreateSavedSearchData {
  userId: string;
  name: string;
  dslJson: LeadQuery;
  searchJobId?: string;
}

export class MemStorage implements IStorage {
  private searchJobs: Map<string, SearchJob> = new Map();
  private savedSearches: Map<string, SavedSearch> = new Map();
  private statusLogs: Array<{ businessId: string; status: string; changedAt: Date }> = [];
  private notes: Array<{ businessId: string; text: string; createdAt: Date }> = [];
  private tags: Array<{ businessId: string; tag: string }> = [];

  private generateId(): string {
    return `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async getSearchJobs(userId: string): Promise<SearchJob[]> {
    const jobs = Array.from(this.searchJobs.values())
      .filter(job => job.id?.includes(userId) || true) // Simple filtering for demo
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return jobs;
  }

  async createSearchJob(data: CreateSearchJobData): Promise<SearchJob> {
    const id = this.generateId();
    const job: SearchJob = {
      id,
      dsl_json: data.dslJson,
      created_at: new Date().toISOString(),
      status: data.status || 'queued',
      summary_stats: undefined,
      error_text: undefined,
      custom_name: data.customName,
      original_prompt: data.originalPrompt,
      search_tags: data.searchTags || [],
    };
    
    this.searchJobs.set(id, job);
    return job;
  }

  async updateSearchJob(id: string, data: Partial<SearchJob>): Promise<SearchJob> {
    const existing = this.searchJobs.get(id);
    if (!existing) {
      throw new Error('Search job not found');
    }
    
    const updated = { ...existing, ...data };
    this.searchJobs.set(id, updated);
    return updated;
  }

  async getSavedSearches(userId: string): Promise<SavedSearch[]> {
    const searches = Array.from(this.savedSearches.values())
      .filter(search => search.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return searches;
  }

  async createSavedSearch(data: CreateSavedSearchData): Promise<SavedSearch> {
    const id = this.generateId();
    const search: SavedSearch = {
      id,
      user_id: data.userId,
      name: data.name,
      dsl_json: data.dslJson,
      search_job_id: data.searchJobId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    this.savedSearches.set(id, search);
    return search;
  }

  async updateSavedSearch(id: string, data: Partial<SavedSearch>): Promise<SavedSearch> {
    const existing = this.savedSearches.get(id);
    if (!existing) {
      throw new Error('Saved search not found');
    }
    
    const updated = { 
      ...existing, 
      ...data, 
      updated_at: new Date().toISOString() 
    };
    this.savedSearches.set(id, updated);
    return updated;
  }

  async deleteSavedSearch(id: string): Promise<void> {
    this.savedSearches.delete(id);
  }

  async getDashboardStats(userId: string): Promise<DashboardStats> {
    const searchJobs = await this.getSearchJobs(userId);
    
    // For demo purposes, return mock stats
    return {
      totalLeads: 150,
      qualifiedLeads: 45,
      ignoredLeads: 25,
      newLeads: 80,
      totalSearches: searchJobs.length,
      recentSearches: searchJobs.slice(0, 5),
    };
  }

  async updateLeadStatus(businessId: string, status: 'new' | 'qualified' | 'ignored'): Promise<void> {
    this.statusLogs.push({
      businessId,
      status,
      changedAt: new Date(),
    });
  }

  async addNote(businessId: string, text: string): Promise<void> {
    this.notes.push({
      businessId,
      text,
      createdAt: new Date(),
    });
  }

  async addTag(businessId: string, tag: string): Promise<void> {
    this.tags.push({
      businessId,
      tag,
    });
  }

  // Initialize with some sample data
  init() {
    // Add sample search job
    this.createSearchJob({
      dslJson: {
        version: 1,
        vertical: 'dentist',
        geo: { city: 'New York', state: 'NY' },
        constraints: { must: [] },
        result_size: { target: 100 },
        sort_by: 'score_desc',
        lead_profile: 'generic',
        output: { contract: 'json' },
        notify: { on_complete: true },
        compliance_flags: [],
      },
      status: 'completed',
      userId: 'migration-user',
      customName: 'NYC Dentists',
      originalPrompt: 'Find dentists in New York City',
    });

    // Add sample saved search
    this.createSavedSearch({
      userId: 'migration-user',
      name: 'Dentists in NYC',
      dslJson: {
        version: 1,
        vertical: 'dentist',
        geo: { city: 'New York', state: 'NY' },
        constraints: { must: [] },
        result_size: { target: 100 },
        sort_by: 'score_desc',
        lead_profile: 'generic',
        output: { contract: 'json' },
        notify: { on_complete: true },
        compliance_flags: [],
      },
    });
  }
}

// Export storage instance
export const storage = new MemStorage();
storage.init();