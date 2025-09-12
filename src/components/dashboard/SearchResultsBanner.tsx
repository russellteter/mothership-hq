import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { DSLPreviewChips } from '@/components/ui/dsl-preview-chips';
import { EditSearchModal } from './EditSearchModal';
import { Clock, Save, Edit3, AlertTriangle, RefreshCw } from 'lucide-react';
import { SearchJob } from '@/types/lead';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface SearchResultsBannerProps {
  searchJob: SearchJob | null;
  resultsCount: number;
  onSaveSearch?: (customName: string) => void;
  onEditSearch?: () => void;
  onRetry?: () => void;
  className?: string;
}

export function SearchResultsBanner({
  searchJob,
  resultsCount,
  onSaveSearch,
  onEditSearch,
  onRetry,
  className
}: SearchResultsBannerProps) {
  const [showEditModal, setShowEditModal] = useState(false);

  if (!searchJob) return null;

  const isCompleted = searchJob.status === 'completed';
  const isFailed = searchJob.status === 'failed';
  const isRunning = searchJob.status === 'running';

  const getBannerVariant = () => {
    if (isFailed) return 'destructive';
    if (isRunning) return 'default';
    return 'secondary';
  };

  const getStatusMessage = () => {
    if (isFailed) return 'Search failed';
    if (isRunning) return 'Search in progress...';
    return `Search completed • ${resultsCount} leads found`;
  };

  const getTimestamp = () => {
    if (!searchJob.created_at) return '';
    try {
      return formatDistanceToNow(new Date(searchJob.created_at), { addSuffix: true });
    } catch {
      return '';
    }
  };

  return (
    <>
      <Card className={cn(
        "p-4 mb-4",
        isFailed && "border-destructive bg-destructive/5",
        isRunning && "border-warning bg-warning/5",
        className
      )}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            {/* Status and Title */}
            <div className="flex items-center gap-3">
              <Badge 
                variant={getBannerVariant()}
                className={cn(
                  "text-xs px-2 py-1",
                  isRunning && "animate-pulse"
                )}
              >
                {getStatusMessage()}
              </Badge>
              
              {searchJob.created_at && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {getTimestamp()}
                </div>
              )}
            </div>

            {/* Search Summary */}
            {searchJob.custom_name && (
              <h3 className="text-sm font-medium">{searchJob.custom_name}</h3>
            )}

            {/* Original Prompt */}
            {searchJob.original_prompt && (
              <p className="text-sm text-muted-foreground italic">
                "{searchJob.original_prompt}"
              </p>
            )}

            {/* DSL Preview Chips */}
            <DSLPreviewChips dsl={searchJob.dsl_json} maxChips={6} />

            {/* Error Message */}
            {isFailed && searchJob.error_text && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                <div className="text-sm text-destructive">
                  <p className="font-medium">Search Error</p>
                  <p className="text-xs opacity-90">{searchJob.error_text}</p>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {isFailed && onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            )}
            
            {isCompleted && onSaveSearch && (
              <Button variant="outline" size="sm" onClick={() => onSaveSearch(searchJob.custom_name || 'Untitled Search')}>
                <Save className="w-4 h-4 mr-2" />
                Save Search
              </Button>
            )}
            
            {onEditSearch && (
              <Button variant="outline" size="sm" onClick={() => setShowEditModal(true)}>
                <Edit3 className="w-4 h-4 mr-2" />
                Edit & Re-run
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Edit Search Modal */}
      {showEditModal && searchJob && (
        <EditSearchModal
          searchJob={searchJob}
          onSave={(updatedJob) => {
            setShowEditModal(false);
            onEditSearch?.();
          }}
          onCancel={() => setShowEditModal(false)}
        />
      )}
    </>
  );
}