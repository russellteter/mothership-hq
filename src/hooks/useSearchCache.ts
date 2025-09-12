import { useState, useEffect } from 'react';
import { Lead, LeadQuery } from '@/types/lead';

interface CachedSearch {
  query: LeadQuery;
  results: Lead[];
  timestamp: number;
  jobId?: string;
}

const CACHE_KEY = 'smb_lead_search_cache';
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
const MAX_CACHE_ENTRIES = 10;

export function useSearchCache() {
  const [cache, setCache] = useState<CachedSearch[]>([]);

  // Load cache from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(CACHE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as CachedSearch[];
        // Filter out expired entries
        const valid = parsed.filter(
          entry => Date.now() - entry.timestamp < CACHE_DURATION
        );
        setCache(valid);
        // Update localStorage if we removed expired entries
        if (valid.length < parsed.length) {
          localStorage.setItem(CACHE_KEY, JSON.stringify(valid));
        }
      } catch (error) {
        console.error('Failed to load search cache:', error);
        localStorage.removeItem(CACHE_KEY);
      }
    }
  }, []);

  // Save cache to localStorage whenever it changes
  useEffect(() => {
    if (cache.length > 0) {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    }
  }, [cache]);

  const getCachedResults = (query: LeadQuery): CachedSearch | null => {
    // Find matching query in cache
    const cached = cache.find(entry => {
      // Simple query comparison - could be more sophisticated
      return (
        entry.query.vertical === query.vertical &&
        entry.query.geo.city === query.geo.city &&
        entry.query.geo.state === query.geo.state &&
        JSON.stringify(entry.query.constraints) === JSON.stringify(query.constraints) &&
        Date.now() - entry.timestamp < CACHE_DURATION
      );
    });
    
    return cached || null;
  };

  const addToCache = (query: LeadQuery, results: Lead[], jobId?: string) => {
    setCache(prev => {
      // Remove any existing entry for the same query
      const filtered = prev.filter(entry => 
        !(entry.query.vertical === query.vertical &&
          entry.query.geo.city === query.geo.city &&
          entry.query.geo.state === query.geo.state)
      );
      
      // Add new entry
      const newEntry: CachedSearch = {
        query,
        results,
        timestamp: Date.now(),
        jobId
      };
      
      const updated = [newEntry, ...filtered];
      
      // Keep only the most recent MAX_CACHE_ENTRIES
      return updated.slice(0, MAX_CACHE_ENTRIES);
    });
  };

  const clearCache = () => {
    setCache([]);
    localStorage.removeItem(CACHE_KEY);
  };

  const getCacheStats = () => {
    return {
      entries: cache.length,
      totalResults: cache.reduce((sum, entry) => sum + entry.results.length, 0),
      oldestEntry: cache.length > 0 
        ? new Date(Math.min(...cache.map(e => e.timestamp)))
        : null,
      newestEntry: cache.length > 0
        ? new Date(Math.max(...cache.map(e => e.timestamp)))
        : null
    };
  };

  return {
    getCachedResults,
    addToCache,
    clearCache,
    getCacheStats,
    cache
  };
}

// Hook to manage recent searches
export function useRecentSearches() {
  const RECENT_KEY = 'smb_recent_searches';
  const MAX_RECENT = 5;

  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(RECENT_KEY);
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch {
        localStorage.removeItem(RECENT_KEY);
      }
    }
  }, []);

  const addRecentSearch = (prompt: string) => {
    setRecentSearches(prev => {
      const filtered = prev.filter(p => p !== prompt);
      const updated = [prompt, ...filtered].slice(0, MAX_RECENT);
      localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem(RECENT_KEY);
  };

  return {
    recentSearches,
    addRecentSearch,
    clearRecentSearches
  };
}