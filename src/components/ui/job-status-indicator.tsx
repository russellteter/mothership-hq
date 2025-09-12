import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Clock,
  Search,
  Sparkles
} from 'lucide-react';

interface JobStatusIndicatorProps {
  state: 'idle' | 'parsing' | 'queued' | 'running' | 'completed' | 'failed';
  progress: number;
  message?: string;
  elapsedTime?: number;
  className?: string;
}

export function JobStatusIndicator({ 
  state, 
  progress, 
  message, 
  elapsedTime,
  className 
}: JobStatusIndicatorProps) {
  const getIcon = () => {
    switch (state) {
      case 'idle':
        return <Search className="h-4 w-4" />;
      case 'parsing':
        return <Sparkles className="h-4 w-4 animate-pulse" />;
      case 'queued':
        return <Clock className="h-4 w-4" />;
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getVariant = () => {
    switch (state) {
      case 'completed':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'running':
      case 'parsing':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusText = () => {
    switch (state) {
      case 'idle':
        return 'Ready to search';
      case 'parsing':
        return 'Understanding your request...';
      case 'queued':
        return 'Search queued';
      case 'running':
        return 'Finding leads...';
      case 'completed':
        return 'Search complete';
      case 'failed':
        return 'Search failed';
      default:
        return 'Unknown status';
    }
  };

  if (state === 'idle') {
    return null;
  }

  return (
    <Alert className={className}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getIcon()}
          <div className="space-y-1">
            <AlertDescription className="font-medium">
              {message || getStatusText()}
            </AlertDescription>
            {elapsedTime && elapsedTime > 0 && (
              <p className="text-xs text-muted-foreground">
                {Math.round(elapsedTime / 1000)}s elapsed
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {progress > 0 && progress < 100 && (
            <div className="w-32">
              <Progress value={progress} className="h-2" />
            </div>
          )}
          <Badge variant={getVariant()}>
            {state.charAt(0).toUpperCase() + state.slice(1)}
          </Badge>
        </div>
      </div>
    </Alert>
  );
}

interface CompactJobStatusProps {
  state: 'idle' | 'parsing' | 'queued' | 'running' | 'completed' | 'failed';
  progress: number;
}

export function CompactJobStatus({ state, progress }: CompactJobStatusProps) {
  if (state === 'idle' || state === 'completed') {
    return null;
  }

  const getIcon = () => {
    switch (state) {
      case 'parsing':
        return <Sparkles className="h-3 w-3 animate-pulse" />;
      case 'queued':
        return <Clock className="h-3 w-3" />;
      case 'running':
        return <Loader2 className="h-3 w-3 animate-spin" />;
      case 'failed':
        return <XCircle className="h-3 w-3" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center gap-2">
      {getIcon()}
      <Progress value={progress} className="w-20 h-1.5" />
      <span className="text-xs text-muted-foreground">{progress}%</span>
    </div>
  );
}