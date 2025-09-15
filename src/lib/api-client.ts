// Client-side storage to replace Supabase client
import { SearchJob, SavedSearch, DashboardStats, LeadQuery } from '@/types/lead';

export class APIClient {
  private searchJobs: Map<string, SearchJob> = new Map();
  private savedSearches: Map<string, SavedSearch> = new Map();
  private statusLogs: Array<{ businessId: string; status: string; changedAt: Date }> = [];

  private generateId(): string {
    return `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Client-side storage methods
  private async getSearchJobs(): Promise<SearchJob[]> {
    await this.delay(100); // Simulate async operation
    return Array.from(this.searchJobs.values())
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  private async createSearchJob(data: any): Promise<SearchJob> {
    await this.delay(100);
    const id = this.generateId();
    const job: SearchJob = {
      id,
      dsl_json: data.dslJson || data.dsl_json,
      created_at: new Date().toISOString(),
      status: data.status || 'queued',
      summary_stats: data.summary_stats,
      error_text: data.error_text,
      custom_name: data.custom_name || data.customName,
      original_prompt: data.original_prompt || data.originalPrompt,
      search_tags: data.search_tags || data.searchTags || [],
    };
    this.searchJobs.set(id, job);
    return job;
  }

  private async getSavedSearches(): Promise<SavedSearch[]> {
    await this.delay(100);
    return Array.from(this.savedSearches.values())
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  private async createSavedSearch(data: any): Promise<SavedSearch> {
    await this.delay(100);
    const id = this.generateId();
    const search: SavedSearch = {
      id,
      user_id: data.userId || data.user_id || 'migration-user',
      name: data.name,
      dsl_json: data.dslJson || data.dsl_json,
      search_job_id: data.searchJobId || data.search_job_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.savedSearches.set(id, search);
    return search;
  }

  private async updateSavedSearch(id: string, data: any): Promise<SavedSearch> {
    await this.delay(100);
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

  private async deleteSavedSearch(id: string): Promise<void> {
    await this.delay(100);
    this.savedSearches.delete(id);
  }

  private async getDashboardStats(): Promise<DashboardStats> {
    await this.delay(100);
    const searchJobs = await this.getSearchJobs();
    return {
      totalLeads: 150,
      qualifiedLeads: 45,
      ignoredLeads: 25,
      newLeads: 80,
      totalSearches: searchJobs.length,
      recentSearches: searchJobs.slice(0, 5),
    };
  }

  // Supabase-like interface for easier migration
  auth = {
    getUser: () => Promise.resolve({ data: { user: { id: 'migration-user', email: 'user@example.com' } }, error: null }),
    getSession: () => Promise.resolve({ data: { session: { user: { id: 'migration-user', email: 'user@example.com' } } }, error: null }),
    signIn: () => Promise.resolve({ data: { user: null }, error: null }),
    signOut: () => Promise.resolve({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  };

  from(table: string) {
    const userId = 'migration-user'; // Mock user ID during migration
    
    return {
      select: (columns?: string) => ({
        eq: (column: string, value: string) => ({
          order: (orderBy: string, options?: any) => this.handleTableQuery(table, 'select', { columns, eq: { column, value }, order: { orderBy, options } }),
          in: (column: string, values: string[]) => this.handleTableQuery(table, 'select', { columns, in: { column, values } }),
        }),
        in: (column: string, values: string[]) => this.handleTableQuery(table, 'select', { columns, in: { column, values } }),
        order: (orderBy: string, options?: any) => this.handleTableQuery(table, 'select', { columns, order: { orderBy, options } }),
      }),
      insert: (data: any) => ({
        select: () => ({
          single: () => this.handleTableQuery(table, 'insert', { data, select: true, single: true }),
          ...this.handleTableQuery(table, 'insert', { data, select: true }),
        }),
      }),
      upsert: (data: any) => ({
        select: () => ({
          single: () => this.handleTableQuery(table, 'upsert', { data, select: true, single: true }),
          ...this.handleTableQuery(table, 'upsert', { data, select: true }),
        }),
      }),
      update: (data: any) => ({
        eq: (column: string, value: string) => ({
          select: () => ({
            single: () => this.handleTableQuery(table, 'update', { data, eq: { column, value }, select: true, single: true }),
            ...this.handleTableQuery(table, 'update', { data, eq: { column, value }, select: true }),
          }),
          error: null,
        }),
      }),
      delete: () => ({
        eq: (column: string, value: string) => this.handleTableQuery(table, 'delete', { eq: { column, value } }),
        in: (column: string, values: string[]) => this.handleTableQuery(table, 'delete', { in: { column, values } }),
      }),
    };
  }

  private async handleTableQuery(table: string, operation: string, params: any) {
    try {
      const userId = 'migration-user'; // Mock user ID during migration
      
      switch (table) {
        case 'search_jobs':
          return this.handleSearchJobs(operation, params, userId);
        case 'saved_searches':
          return this.handleSavedSearches(operation, params, userId);
        case 'lead_views':
          return this.handleLeadViews(operation, params);
        case 'status_logs':
          return this.handleStatusLogs(operation, params);
        case 'signal_overrides':
          return this.handleSignalOverrides(operation, params);
        default:
          return { data: [], error: null };
      }
    } catch (error) {
      console.error(`Error in ${table} ${operation}:`, error);
      return { data: null, error };
    }
  }

  private async handleSearchJobs(operation: string, params: any, userId: string) {
    try {
      switch (operation) {
        case 'select':
          const jobs = await this.getSearchJobs();
          return { data: jobs, error: null };
        case 'insert':
          const job = await this.createSearchJob({ ...params.data, userId });
          return { data: job, error: null };
        case 'update':
          if (params.eq?.column === 'id') {
            // Update logic would go here
            return { data: params.data, error: null };
          }
          return { data: null, error: 'Update requires ID' };
        default:
          return { data: [], error: null };
      }
    } catch (error) {
      return { data: null, error: error.message };
    }
  }

  private async handleSavedSearches(operation: string, params: any, userId: string) {
    try {
      switch (operation) {
        case 'select':
          const searches = await this.getSavedSearches();
          return { data: searches, error: null };
        case 'insert':
          const search = await this.createSavedSearch({ ...params.data, userId });
          return { data: search, error: null };
        case 'update':
          if (params.eq?.column === 'id') {
            const updated = await this.updateSavedSearch(params.eq.value, params.data);
            return { data: updated, error: null };
          }
          return { data: null, error: 'Update requires ID' };
        case 'delete':
          if (params.eq?.column === 'id') {
            await this.deleteSavedSearch(params.eq.value);
            return { data: null, error: null };
          }
          if (params.in?.column === 'id') {
            // Handle bulk delete
            for (const id of params.in.values) {
              await this.deleteSavedSearch(id);
            }
            return { data: null, error: null };
          }
          return { data: null, error: 'Delete requires ID' };
        default:
          return { data: [], error: null };
      }
    } catch (error) {
      return { data: null, error: error.message };
    }
  }

  private async handleLeadViews(operation: string, params: any) {
    try {
      switch (operation) {
        case 'select':
          // Return mock lead views data for dashboard
          const mockLeadViews = [
            { id: '1', business_id: 'bus-1', status: 'qualified', created_at: new Date().toISOString() },
            { id: '2', business_id: 'bus-2', status: 'new', created_at: new Date().toISOString() },
            { id: '3', business_id: 'bus-3', status: 'ignored', created_at: new Date().toISOString() },
          ];
          return { data: mockLeadViews, error: null };
        default:
          return { data: [], error: null };
      }
    } catch (error) {
      return { data: [], error: null };
    }
  }

  private async handleStatusLogs(operation: string, params: any) {
    try {
      switch (operation) {
        case 'select':
          // Return mock status logs data for dashboard
          const mockStatusLogs = [
            { id: '1', business_id: 'bus-1', status: 'qualified', changed_at: new Date().toISOString() },
            { id: '2', business_id: 'bus-2', status: 'new', changed_at: new Date().toISOString() },
            { id: '3', business_id: 'bus-3', status: 'ignored', changed_at: new Date().toISOString() },
          ];
          return { data: mockStatusLogs, error: null };
        case 'insert':
          this.statusLogs.push({
            businessId: params.data.business_id,
            status: params.data.status,
            changedAt: new Date(),
          });
          return { data: { id: this.generateId(), ...params.data }, error: null };
        default:
          return { data: [], error: null };
      }
    } catch (error) {
      return { data: [], error: null };
    }
  }

  private async handleSignalOverrides(operation: string, params: any) {
    try {
      switch (operation) {
        case 'insert':
          return { data: { id: this.generateId(), ...params.data }, error: null };
        default:
          return { data: [], error: null };
      }
    } catch (error) {
      return { data: null, error: error.message };
    }
  }

  // Mock channel functionality for real-time subscriptions
  channel(name: string) {
    const channelObj = {
      on: (event: string, config: any, callback: (payload: any) => void) => {
        // Mock real-time updates - return the channel object to allow chaining
        return channelObj;
      },
      subscribe: () => {
        // Mock subscription
        return Promise.resolve();
      },
    };
    return channelObj;
  }

  removeChannel(channel: any) {
    // Mock channel removal
    return Promise.resolve();
  }

  functions = {
    invoke: (functionName: string, options?: any) => Promise.resolve({ data: { leads: [], search_job: { status: 'completed' } }, error: null }),
  };
}

export const apiClient = new APIClient();