import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Download, Settings, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SearchState } from '@/hooks/useSearchState';

interface StickyHeaderProps {
  resultsCount: number;
  elapsedTime?: number;
  searchState: SearchState;
  progress: number;
  onExport: () => void;
  onOpenScoring: () => void;
  onOpenSearch: () => void;
  className?: string;
}

export function StickyHeader({
  resultsCount,
  elapsedTime,
  searchState,
  progress,
  onExport,
  onOpenScoring,
  onOpenSearch,
  className
}: StickyHeaderProps) {
  const isSearchActive = searchState !== 'idle' && searchState !== 'completed' && searchState !== 'failed';

  return (
    <div className={cn(
      "sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border",
      className
    )}>
      {/* Progress bar for active searches */}
      {isSearchActive && (
        <div className="w-full h-1">
          <Progress value={progress} className="h-full rounded-none" />
        </div>
      )}
      
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-sm">
            {resultsCount} leads
            {elapsedTime && (
              <span className="ml-1 text-muted-foreground">
                • {elapsedTime}s
              </span>
            )}
          </Badge>
          
          {searchState === 'running' && (
            <Badge variant="secondary" className="text-xs animate-pulse">
              Searching...
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenSearch}
            className="text-sm"
          >
            <Search className="w-4 h-4 mr-2" />
            Search
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenScoring}
            className="text-sm"
          >
            <Settings className="w-4 h-4 mr-2" />
            Scoring
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onExport}
            disabled={resultsCount === 0}
            className="text-sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>
    </div>
  );
}