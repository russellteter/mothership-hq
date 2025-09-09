import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Lead, LeadQuery, ParseResult, SearchJob } from '@/types/lead';
import { toast } from '@/hooks/use-toast';

export function useLeadSearch() {
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Lead[]>([]);
  const [currentSearchJob, setCurrentSearchJob] = useState<SearchJob | null>(null);

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

  const searchLeads = async (dsl: LeadQuery): Promise<void> => {
    setIsSearching(true);
    setSearchResults([]);
    
    try {
      // Start the search job
      const { data, error } = await supabase.functions.invoke('search-leads', {
        body: { dsl }
      });

      if (error) throw error;

      const jobId = data.job_id;
      setCurrentSearchJob({ 
        id: jobId, 
        dsl_json: dsl, 
        created_at: new Date().toISOString(),
        status: 'running' 
      });

      // Poll for results
      await pollForResults(jobId);
      
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search Failed",
        description: error instanceof Error ? error.message : "An error occurred during search",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const pollForResults = async (jobId: string): Promise<void> => {
    const maxAttempts = 60; // 5 minutes
    let attempts = 0;

    const poll = async (): Promise<void> => {
      if (attempts >= maxAttempts) {
        throw new Error('Search timeout');
      }

      try {
        // Use the direct URL approach to get results
        const response = await fetch(
          `https://kwmoaikxwfnsisgaejyq.supabase.co/functions/v1/get-search-results?search_job_id=${jobId}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3bW9haWt4d2Zuc2lzZ2FlanlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NTQ5ODcsImV4cCI6MjA3MzAzMDk4N30.VXtjgno3GFEEMlDx_CInUVEOeD20DgxZNRMMJehrq7U`,
              'Content-Type': 'application/json',
            }
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch results');
        }

        const resultData = await response.json();
        
        if (resultData.search_job.status === 'completed') {
          setSearchResults(resultData.leads);
          setCurrentSearchJob(resultData.search_job);
          
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

  const updateLeadStatus = async (leadId: string, status: 'new' | 'qualified' | 'ignored'): Promise<void> => {
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
  };

  const addNote = async (leadId: string, text: string): Promise<void> => {
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
  };

  const addTag = async (leadId: string, tagLabel: string): Promise<void> => {
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
  };

  return {
    isSearching,
    searchResults,
    currentSearchJob,
    parsePrompt,
    searchLeads,
    updateLeadStatus,
    addNote,
    addTag
  };
}