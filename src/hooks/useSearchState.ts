import { useState, useCallback, useRef } from 'react';
import { SearchJob } from '@/types/lead';

export type SearchState = 'idle' | 'parsing' | 'queued' | 'running' | 'completed' | 'failed';

interface SearchStateData {
  state: SearchState;
  progress: number;
  message: string;
  startTime?: Date;
  endTime?: Date;
  elapsedTime?: number;
  estimatedTimeRemaining?: number;
}

export function useSearchState() {
  const [searchState, setSearchState] = useState<SearchStateData>({
    state: 'idle',
    progress: 0,
    message: 'Ready to search'
  });
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date | null>(null);

  const updateState = useCallback((newState: SearchState, message?: string, progress?: number) => {
    const now = new Date();
    
    setSearchState(prev => {
      const elapsedTime = startTimeRef.current ? now.getTime() - startTimeRef.current.getTime() : 0;
      const estimatedTimeRemaining = progress && progress > 0 ? 
        (elapsedTime / progress) * (100 - progress) : undefined;

      return {
        ...prev,
        state: newState,
        message: message || prev.message,
        progress: progress !== undefined ? progress : prev.progress,
        elapsedTime: Math.round(elapsedTime / 1000),
        estimatedTimeRemaining: estimatedTimeRemaining ? Math.round(estimatedTimeRemaining / 1000) : undefined,
        endTime: newState === 'completed' || newState === 'failed' ? now : prev.endTime
      };
    });

    // Start timer for running state
    if (newState === 'running' && !intervalRef.current) {
      startTimeRef.current = now;
      intervalRef.current = setInterval(() => {
        setSearchState(prev => {
          const elapsed = now.getTime() - (startTimeRef.current?.getTime() || 0);
          return {
            ...prev,
            elapsedTime: Math.round(elapsed / 1000)
          };
        });
      }, 1000);
    }

    // Clear timer for completion states
    if ((newState === 'completed' || newState === 'failed') && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      startTimeRef.current = null;
    }
  }, []);

  const resetState = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    startTimeRef.current = null;
    setSearchState({
      state: 'idle',
      progress: 0,
      message: 'Ready to search'
    });
  }, []);

  const getProgressMessage = useCallback((state: SearchState, elapsedTime?: number) => {
    switch (state) {
      case 'idle':
        return 'Ready to search';
      case 'parsing':
        return 'Understanding your request...';
      case 'queued':
        return 'Search queued, starting soon...';
      case 'running':
        return elapsedTime ? `Searching leads... (${elapsedTime}s)` : 'Searching leads...';
      case 'completed':
        return 'Search completed successfully';
      case 'failed':
        return 'Search failed';
      default:
        return 'Processing...';
    }
  }, []);

  return {
    searchState,
    updateState,
    resetState,
    getProgressMessage,
    isActive: searchState.state !== 'idle' && searchState.state !== 'completed' && searchState.state !== 'failed'
  };
}