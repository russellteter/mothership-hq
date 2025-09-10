import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  Search, 
  Trash2, 
  Play,
  Calendar,
  MoreHorizontal,
  ChevronDown,
  Filter
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { SearchJob, LeadQuery } from '@/types/lead';

interface SearchHistoryManagerProps {
  onRunSearch: (dsl: LeadQuery) => void;
}

export function SearchHistoryManager({ onRunSearch }: SearchHistoryManagerProps) {
  const [searchHistory, setSearchHistory] = useState<SearchJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'status' | 'leads'>('date');
  
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadSearchHistory();
    }
  }, [user]);

  const loadSearchHistory = async () => {
    setIsLoading(true);
    try {
      const { data: jobs, error } = await supabase
        .from('search_jobs')
        .select('*')
        .eq('user_id', user?.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading search history:', error);
        return;
      }

      const processedJobs: SearchJob[] = jobs?.map(job => ({
        id: job.id,
        dsl_json: job.dsl_json as unknown as LeadQuery,
        status: job.status as 'queued' | 'running' | 'completed' | 'failed',
        created_at: job.created_at,
        summary_stats: job.summary_stats as any,
        error_text: job.error_text,
        user_id: job.user_id
      })) || [];

      setSearchHistory(processedJobs);
    } catch (error) {
      console.error('Error loading search history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSoftDelete = async (jobId: string) => {
    try {
      const { error } = await supabase
        .from('search_jobs')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', jobId);

      if (error) {
        console.error('Error deleting search:', error);
        toast({
          title: "Error",
          description: "Failed to delete search",
          variant: "destructive"
        });
        return;
      }

      await loadSearchHistory();
      toast({
        title: "Search Deleted",
        description: "Search has been removed from your history"
      });
    } catch (error) {
      console.error('Error deleting search:', error);
    }
  };

  const handleBulkDelete = async () => {
    try {
      const { error } = await supabase
        .from('search_jobs')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', selectedItems);

      if (error) {
        console.error('Error bulk deleting searches:', error);
        toast({
          title: "Error",
          description: "Failed to delete searches",
          variant: "destructive"
        });
        return;
      }

      await loadSearchHistory();
      setSelectedItems([]);
      toast({
        title: "Searches Deleted",
        description: `${selectedItems.length} searches have been removed from your history`
      });
    } catch (error) {
      console.error('Error bulk deleting searches:', error);
    }
  };

  const handleRunSearch = async (job: SearchJob) => {
    try {
      await onRunSearch(job.dsl_json);
      toast({
        title: "Search Started",
        description: "Re-running search with previous settings"
      });
    } catch (error) {
      console.error('Error running search:', error);
    }
  };

  const generateSearchName = (dsl: LeadQuery): string => {
    const vertical = dsl.vertical.replace('_', ' ');
    const location = `${dsl.geo.city}, ${dsl.geo.state}`;
    return `${vertical} in ${location}`;
  };

  const toggleSelection = (jobId: string) => {
    setSelectedItems(prev => 
      prev.includes(jobId) 
        ? prev.filter(id => id !== jobId)
        : [...prev, jobId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === filteredHistory.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredHistory.map(job => job.id));
    }
  };

  const filteredHistory = searchHistory
    .filter(job => {
      if (!searchFilter) return true;
      const searchName = generateSearchName(job.dsl_json);
      return searchName.toLowerCase().includes(searchFilter.toLowerCase());
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'status':
          return a.status.localeCompare(b.status);
        case 'leads':
          const aLeads = (a.summary_stats as any)?.total_found || 0;
          const bLeads = (b.summary_stats as any)?.total_found || 0;
          return bLeads - aLeads;
        default:
          return 0;
      }
    });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Search History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Search History</CardTitle>
          {selectedItems.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete ({selectedItems.length})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Searches</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete {selectedItems.length} search(es)? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleBulkDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search history..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setSortBy(sortBy === 'date' ? 'status' : 'date')}>
            <Filter className="h-4 w-4 mr-2" />
            Sort by {sortBy}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {filteredHistory.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedItems.length === filteredHistory.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Search</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Leads Found</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHistory.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedItems.includes(job.id)}
                      onCheckedChange={() => toggleSelection(job.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{generateSearchName(job.dsl_json)}</div>
                    <div className="text-sm text-muted-foreground">
                      {job.dsl_json.vertical.replace('_', ' ')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      job.status === 'completed' ? 'default' : 
                      job.status === 'failed' ? 'destructive' : 
                      'secondary'
                    }>
                      {job.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {(job.summary_stats as any)?.total_found || 0}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(job.created_at).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {job.status === 'completed' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleRunSearch(job)}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Run Again
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Search</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this search? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleSoftDelete(job.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="font-medium mb-2">No Search History</h3>
            <p className="text-sm">Your search history will appear here</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}