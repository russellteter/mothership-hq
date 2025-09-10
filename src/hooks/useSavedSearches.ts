import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LeadQuery, SearchJob } from '@/types/lead';

export interface SavedSearch {
  id: string;
  name: string;
  dsl_json: LeadQuery;
  search_job_id?: string;
  created_at: string;
  updated_at: string;
  total_leads?: number;
  status?: string;
}

export function useSavedSearches() {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSearches, setSelectedSearches] = useState<string[]>([]);

  const fetchSavedSearches = async () => {
    setIsLoading(true);
    try {
      const { data: searches, error } = await supabase
        .from('saved_searches')
        .select(`
          *,
          search_jobs!saved_searches_search_job_id_fkey (
            status,
            summary_stats
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching saved searches:', error);
        return;
      }

      const processedSearches: SavedSearch[] = searches?.map(search => ({
        id: search.id,
        name: search.name,
        dsl_json: search.dsl_json as unknown as LeadQuery,
        search_job_id: search.search_job_id,
        created_at: search.created_at,
        updated_at: search.updated_at,
        total_leads: (search.search_jobs?.summary_stats as any)?.total_found || 0,
        status: search.search_jobs?.status || 'pending'
      })) || [];

      setSavedSearches(processedSearches);
    } catch (error) {
      console.error('Error fetching saved searches:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSearch = async (name: string, dsl: LeadQuery, searchJobId?: string) => {
    try {
      const { data, error } = await supabase
        .from('saved_searches')
        .insert({
          name,
          dsl_json: dsl as any,
          search_job_id: searchJobId,
          user_id: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving search:', error);
        throw error;
      }

      await fetchSavedSearches();
      return data;
    } catch (error) {
      console.error('Error saving search:', error);
      throw error;
    }
  };

  const deleteSearch = async (searchId: string) => {
    try {
      const { error } = await supabase
        .from('saved_searches')
        .delete()
        .eq('id', searchId);

      if (error) {
        console.error('Error deleting search:', error);
        throw error;
      }

      await fetchSavedSearches();
    } catch (error) {
      console.error('Error deleting search:', error);
      throw error;
    }
  };

  const deleteBulkSearches = async (searchIds: string[]) => {
    try {
      const { error } = await supabase
        .from('saved_searches')
        .delete()
        .in('id', searchIds);

      if (error) {
        console.error('Error deleting searches:', error);
        throw error;
      }

      await fetchSavedSearches();
      setSelectedSearches([]);
    } catch (error) {
      console.error('Error deleting searches:', error);
      throw error;
    }
  };

  const softDeleteSearchJob = async (searchJobId: string) => {
    try {
      const { error } = await supabase
        .from('search_jobs')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', searchJobId);

      if (error) {
        console.error('Error soft deleting search job:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error soft deleting search job:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchSavedSearches();
  }, []);

  return {
    savedSearches,
    isLoading,
    selectedSearches,
    setSelectedSearches,
    fetchSavedSearches,
    saveSearch,
    deleteSearch,
    deleteBulkSearches,
    softDeleteSearchJob
  };
}