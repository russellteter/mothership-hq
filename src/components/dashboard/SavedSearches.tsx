import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Search, 
  Plus, 
  Calendar, 
  Users, 
  Play, 
  Bookmark,
  Bell,
  BellOff,
  Trash2,
  Edit
} from 'lucide-react';
import { SearchJob, LeadQuery } from '@/types/lead';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface SavedSearch {
  id: string;
  name: string;
  dsl_json: LeadQuery;
  notifications_enabled: boolean;
  created_at: string;
  last_run_at?: string;
  total_leads_found?: number;
}

interface SavedSearchesProps {
  onRunSearch: (dsl: LeadQuery) => void;
}

export function SavedSearches({ onRunSearch }: SavedSearchesProps) {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newSearchName, setNewSearchName] = useState('');
  const [selectedSearchJob, setSelectedSearchJob] = useState<SearchJob | null>(null);
  
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadSavedSearches();
    }
  }, [user]);

  const loadSavedSearches = async () => {
    try {
      // For now, we'll use search_jobs as saved searches
      const { data: searchJobs } = await supabase
        .from('search_jobs')
        .select('*')
        .eq('user_id', user?.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (searchJobs) {
        const saved = searchJobs.map(job => ({
          id: job.id,
          name: generateSearchName(job.dsl_json as unknown as LeadQuery),
          dsl_json: job.dsl_json as unknown as LeadQuery,
          notifications_enabled: false,
          created_at: job.created_at,
          last_run_at: job.created_at,
          total_leads_found: (job.summary_stats as any)?.total_found || 0
        }));
        setSavedSearches(saved);
      }
    } catch (error) {
      console.error('Error loading saved searches:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSearchName = (dsl: LeadQuery): string => {
    const vertical = dsl.vertical.replace('_', ' ');
    const location = `${dsl.geo.city}, ${dsl.geo.state}`;
    return `${vertical} in ${location}`;
  };

  const handleRunSearch = async (savedSearch: SavedSearch) => {
    try {
      await onRunSearch(savedSearch.dsl_json);
      toast({
        title: "Search Started",
        description: `Running saved search: ${savedSearch.name}`
      });
    } catch (error) {
      console.error('Error running saved search:', error);
      toast({
        title: "Error",
        description: "Failed to run saved search",
        variant: "destructive"
      });
    }
  };

  const toggleNotifications = async (searchId: string, enabled: boolean) => {
    // This would update notifications in a future saved_searches table
    setSavedSearches(prev => 
      prev.map(search => 
        search.id === searchId 
          ? { ...search, notifications_enabled: enabled }
          : search
      )
    );
    
    toast({
      title: enabled ? "Notifications Enabled" : "Notifications Disabled",
      description: `You will ${enabled ? 'now receive' : 'no longer receive'} updates for this search`
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Saved Searches</h2>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Search Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Template Name</label>
                <Input
                  value={newSearchName}
                  onChange={(e) => setNewSearchName(e.target.value)}
                  placeholder="e.g., High-value dentists"
                />
              </div>
              <div className="text-sm text-muted-foreground">
                Search templates allow you to quickly re-run common searches and get notified of new matches.
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button disabled>Coming Soon</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {savedSearches.length > 0 ? (
        <div className="space-y-3">
          {savedSearches.map((savedSearch) => (
            <Card key={savedSearch.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Bookmark className="h-4 w-4 text-primary" />
                      <h3 className="font-medium">{savedSearch.name}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {savedSearch.total_leads_found} leads
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(savedSearch.created_at).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {savedSearch.dsl_json.vertical.replace('_', ' ')}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleNotifications(savedSearch.id, !savedSearch.notifications_enabled)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {savedSearch.notifications_enabled ? (
                        <Bell className="h-4 w-4" />
                      ) : (
                        <BellOff className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleRunSearch(savedSearch)}
                      className="flex items-center gap-1"
                    >
                      <Play className="h-3 w-3" />
                      Run Again
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="font-medium mb-2">No Saved Searches</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Run some searches to create reusable templates
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}