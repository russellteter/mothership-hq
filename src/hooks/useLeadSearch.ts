import React, { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Lead, LeadQuery, ParseResult, SearchJob } from '@/types/lead';
import { toast } from '@/hooks/use-toast';
import { generateSearchName, generateSearchTags, categorizeLeadType } from './useSearchNaming';
import { useSearchCache, useRecentSearches } from './useSearchCache';

export function useLeadSearch() {
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Lead[]>([]);
  const [currentSearchJob, setCurrentSearchJob] = useState<SearchJob | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Cache management
  const { getCachedResults, addToCache, clearCache } = useSearchCache();
  const { recentSearches, addRecentSearch } = useRecentSearches();

  const parsePrompt = async (prompt: string): Promise<ParseResult> => {
    try {
      const { data, error } = await supabase.functions.invoke('parse-prompt', {
        body: { prompt }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Parse prompt error:', error);
      throw new Error('Failed to parse prompt');
    }
  };

  const searchLeads = useCallback(async (dsl: LeadQuery, originalPrompt?: string): Promise<void> => {
    // Check cache first
    const cached = getCachedResults(dsl);
    if (cached) {
      console.log('Using cached results for query');
      setSearchResults(cached.results);
      setCurrentSearchJob({
        id: cached.jobId || 'cached',
        status: 'completed',
        dsl_json: dsl,
        original_prompt: originalPrompt
      } as SearchJob);
      toast({
        title: "Cached Results",
        description: `Showing ${cached.results.length} cached results`
      });
      return;
    }
    
    // Cancel any existing search
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Clear any pending timeouts
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    setIsSearching(true);
    setSearchResults([]);
    
    // Add to recent searches if original prompt provided
    if (originalPrompt) {
      addRecentSearch(originalPrompt);
    }
    
    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    
    try {
      // Get the current session to include auth token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to search for leads. You'll be redirected to the login page.",
          variant: "destructive"
        });
        // Redirect to auth page after a short delay
        setTimeout(() => {
          window.location.href = '/auth';
        }, 2000);
        return;
      }
      
      // Generate enhanced search metadata
      const searchName = generateSearchName(dsl, originalPrompt);
      const searchTags = generateSearchTags(dsl);
      const leadType = categorizeLeadType(dsl);
      
      // Start the search job with auth token and metadata
      const { data, error } = await supabase.functions.invoke('search-leads', {
        body: { 
          dsl,
          original_prompt: originalPrompt,
          custom_name: searchName,
          search_tags: searchTags,
          lead_type: leadType,
          scoring_weights: (dsl as any).scoring_weights // Pass scoring weights if provided
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      const jobId = data.job_id;
      setCurrentSearchJob({ 
        id: jobId, 
        dsl_json: dsl, 
        created_at: new Date().toISOString(),
        status: 'running',
        custom_name: searchName,
        original_prompt: originalPrompt,
        search_tags: searchTags
      });

      // Poll for results
      await pollForResults(jobId);
      
    } catch (error) {
      console.error('Search error:', error);
      const errorMessage = error instanceof Error ? error.message : "An error occurred during search";
      
      // Check if it's an authentication error
      if (errorMessage.includes('session') || errorMessage.includes('auth') || errorMessage.includes('unauthorized')) {
        toast({
          title: "Authentication Error",
          description: "Your session has expired. Please sign in again.",
          variant: "destructive"
        });
        // Redirect to auth page after a short delay
        setTimeout(() => {
          window.location.href = '/auth';
        }, 2000);
      } else {
        toast({
          title: "Search Failed",
          description: errorMessage,
          variant: "destructive"
        });
      }
    } finally {
      setIsSearching(false);
      abortControllerRef.current = null;
    }
  }, []);

  const pollForResults = async (jobId: string): Promise<void> => {
    const maxAttempts = 60; // 5 minutes
    let attempts = 0;

    const poll = async (): Promise<void> => {
      if (attempts >= maxAttempts) {
        throw new Error('Search timeout');
      }

      try {
        // Get current session for auth
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          throw new Error('Authentication session expired. Please sign in again.');
        }
        
        // Use the Supabase client instead of direct fetch
        const { data: resultData, error } = await supabase.functions.invoke('get-search-results', {
          body: { search_job_id: jobId },
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        });

        if (error) {
          throw new Error('Failed to fetch results');
        }

        
        if (resultData.search_job.status === 'completed') {
          setSearchResults(resultData.leads);
          setCurrentSearchJob(resultData.search_job);
          
          // Add to cache
          addToCache(resultData.search_job.dsl_json, resultData.leads, resultData.search_job.id);
          
          toast({
            title: "Search Completed",
            description: `Found ${resultData.leads.length} leads`
          });
          return;
        }

        if (resultData.search_job.status === 'failed') {
          throw new Error(resultData.search_job.error_text || 'Search failed');
        }

        // Continue polling
        attempts++;
        setTimeout(poll, 5000); // Poll every 5 seconds
        
      } catch (error) {
        console.error('Poll error:', error);
        throw error;
      }
    };

    await poll();
  };

  const updateLeadStatus = useCallback(async (leadId: string, status: 'new' | 'qualified' | 'ignored'): Promise<void> => {
    try {
      const { error } = await supabase
        .from('status_logs')
        .insert({
          business_id: leadId,
          status: status
        });

      if (error) throw error;

      // Update local state
      setSearchResults(prev => 
        prev.map(lead => 
          lead.business.id === leadId 
            ? { ...lead, status }
            : lead
        )
      );

      toast({
        title: "Status Updated",
        description: `Lead marked as ${status}`
      });

    } catch (error) {
      console.error('Update status error:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update lead status",
        variant: "destructive"
      });
    }
  }, []);

  const addNote = useCallback(async (leadId: string, text: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('notes')
        .insert({
          business_id: leadId,
          text: text
        });

      if (error) throw error;

      toast({
        title: "Note Added",
        description: "Note has been saved"
      });

    } catch (error) {
      console.error('Add note error:', error);
      toast({
        title: "Failed to Add Note",
        description: "Could not save the note",
        variant: "destructive"
      });
    }
  }, []);

  const addTag = useCallback(async (leadId: string, tagLabel: string): Promise<void> => {
    try {
      // First, create or get the tag
      const { data: tag, error: tagError } = await supabase
        .from('tags')
        .upsert({ label: tagLabel })
        .select()
        .single();

      if (tagError) throw tagError;

      // Then, create the business-tag relationship
      const { error: relationError } = await supabase
        .from('business_tags')
        .insert({
          business_id: leadId,
          tag_id: tag.id
        });

      if (relationError && !relationError.message.includes('duplicate')) {
        throw relationError;
      }

      toast({
        title: "Tag Added",
        description: `Tagged with "${tagLabel}"`
      });

    } catch (error) {
      console.error('Add tag error:', error);
      toast({
        title: "Failed to Add Tag",
        description: "Could not add the tag",
        variant: "destructive"
      });
    }
  }, []);

  return {
    isSearching,
    searchResults,
    currentSearchJob,
    parsePrompt,
    searchLeads,
    updateLeadStatus,
    addNote,
    addTag,
    clearCache,
    recentSearches
  };
}