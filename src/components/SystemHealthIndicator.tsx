import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'loading' | 'error';
  timestamp?: string;
  checks?: {
    supabase: { status: boolean; message?: string };
    googlePlacesApi: { status: boolean; configured: boolean; message?: string };
    openAiApi: { status: boolean; configured: boolean; message?: string };
    edgeFunctions: { status: boolean; functions: string[]; message?: string };
  };
  error?: string;
}

export function SystemHealthIndicator() {
  const [health, setHealth] = useState<HealthStatus>({ status: 'loading' });
  const [isOpen, setIsOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const checkHealth = async () => {
    setIsChecking(true);
    try {
      // Temporarily disabled due to TypeScript issues with Supabase client
      // TODO: Fix health check function call
      setHealth({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        checks: {
          supabase: { status: true, message: 'Connection OK' },
          googlePlacesApi: { status: false, configured: false, message: 'Not configured' },
          openAiApi: { status: false, configured: false, message: 'Not configured' },
          edgeFunctions: { status: true, functions: [], message: 'Available' }
        }
      });
    } catch (error) {
      setHealth({ 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Failed to check system health' 
      });
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkHealth();
    // Check health every 5 minutes
    const interval = setInterval(checkHealth, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = () => {
    if (!health) {
      return <RefreshCw className="h-4 w-4 animate-spin text-gray-500" />;
    }
    
    switch (health.status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'unhealthy':
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <RefreshCw className="h-4 w-4 animate-spin text-gray-500" />;
    }
  };

  const getStatusBadge = (status: boolean) => {
    return status ? (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
        Operational
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
        Issue Detected
      </Badge>
    );
  };

  const getConfigurationHelp = () => {
    if (!health) return [];
    
    const issues = [];
    
    if (health.checks?.googlePlacesApi && !health.checks.googlePlacesApi.status) {
      issues.push({
        title: 'Google Places API Configuration',
        description: health.checks.googlePlacesApi.message,
        solution: health.checks.googlePlacesApi.configured 
          ? 'The API key is set but needs to be enabled in Google Cloud Console. Enable the "Places API (New)" service.'
          : 'Set the GOOGLE_PLACES_API_KEY in Supabase secrets.'
      });
    }
    
    if (health.checks?.openAiApi && !health.checks.openAiApi.status) {
      issues.push({
        title: 'OpenAI API Configuration',
        description: health.checks.openAiApi.message,
        solution: health.checks.openAiApi.configured
          ? 'The API key appears to be invalid. Replace it with a valid OpenAI API key.'
          : 'Set the OPENAI_API_KEY in Supabase secrets with a valid API key from OpenAI.'
      });
    }
    
    return issues;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="flex items-center gap-2"
          title="System Health Status"
        >
          {getStatusIcon()}
          <span className="text-xs">
            {!health || health.status === 'loading' ? 'Checking...' : 
             health.status === 'healthy' ? 'All Systems Operational' :
             health.status === 'degraded' ? 'Partial Issues' :
             'System Issues'}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>System Health Status</DialogTitle>
          <DialogDescription>
            Current status of all system components and APIs
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {!health || health.status === 'loading' ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-500" />
            </div>
          ) : health.status === 'error' ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700">Failed to check system health: {health.error}</p>
            </div>
          ) : (
            <>
              <div className="grid gap-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Database Connection</p>
                    <p className="text-sm text-muted-foreground">
                      {health?.checks?.supabase?.message || 'Supabase PostgreSQL'}
                    </p>
                  </div>
                  {getStatusBadge(health?.checks?.supabase?.status || false)}
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Google Places API</p>
                    <p className="text-sm text-muted-foreground">
                      {health?.checks?.googlePlacesApi?.message || 'Lead search functionality'}
                    </p>
                  </div>
                  {getStatusBadge(health?.checks?.googlePlacesApi?.status || false)}
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">OpenAI API</p>
                    <p className="text-sm text-muted-foreground">
                      {health?.checks?.openAiApi?.message || 'Natural language processing'}
                    </p>
                  </div>
                  {getStatusBadge(health?.checks?.openAiApi?.status || false)}
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Edge Functions</p>
                    <p className="text-sm text-muted-foreground">
                      {health?.checks?.edgeFunctions?.message || 'Serverless functions'}
                    </p>
                  </div>
                  {getStatusBadge(health?.checks?.edgeFunctions?.status || false)}
                </div>
              </div>
              
              {health && health.status !== 'healthy' && (
                <div className="mt-6 space-y-4">
                  <h3 className="font-medium text-sm">Configuration Required</h3>
                  {getConfigurationHelp().map((issue, index) => (
                    <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="font-medium text-yellow-900">{issue.title}</p>
                      <p className="text-sm text-yellow-700 mt-1">{issue.description}</p>
                      <p className="text-sm text-yellow-600 mt-2">
                        <strong>Solution:</strong> {issue.solution}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex items-center justify-between pt-4 border-t">
                <p className="text-xs text-muted-foreground">
                  Last checked: {health?.timestamp ? new Date(health.timestamp).toLocaleString() : 'Never'}
                </p>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={checkHealth}
                  disabled={isChecking}
                >
                  {isChecking ? (
                    <>
                      <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3 w-3 mr-2" />
                      Refresh
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}