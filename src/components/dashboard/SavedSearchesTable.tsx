import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  Search, 
  Plus, 
  Play, 
  Bookmark,
  Bell,
  BellOff,
  Trash2,
  MoreHorizontal,
  SortAsc,
  SortDesc
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

interface SavedSearchesTableProps {
  onRunSearch: (dsl: LeadQuery) => void;
}

export function SavedSearchesTable({ onRunSearch }: SavedSearchesTableProps) {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [searchFilter, setSearchFilter] = useState('');
  const [sortField, setSortField] = useState<'created_at' | 'name' | 'total_leads_found'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadSavedSearches();
    }
  }, [user]);

  const loadSavedSearches = async () => {
    try {
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

  const handleDeleteSearch = async (searchId: string) => {
    try {
      const { error } = await supabase
        .from('saved_searches')
        .delete()
        .eq('id', searchId)
        .eq('user_id', user?.id);

      if (error) throw error;

      setSavedSearches(prev => prev.filter(search => search.id !== searchId));
      setSelectedItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(searchId);
        return newSet;
      });

      toast({
        title: "Search Deleted",
        description: "Saved search has been removed"
      });
    } catch (error) {
      console.error('Error deleting search:', error);
      toast({
        title: "Error",
        description: "Failed to delete search",
        variant: "destructive"
      });
    }
  };

  const handleBulkDelete = async () => {
    try {
      const { error } = await supabase
        .from('saved_searches')
        .delete()
        .in('id', Array.from(selectedItems))
        .eq('user_id', user?.id);

      if (error) throw error;

      setSavedSearches(prev => prev.filter(search => !selectedItems.has(search.id)));
      setSelectedItems(new Set());

      toast({
        title: "Searches Deleted",
        description: `${selectedItems.size} searches have been removed`
      });
    } catch (error) {
      console.error('Error deleting searches:', error);
      toast({
        title: "Error",
        description: "Failed to delete searches",
        variant: "destructive"
      });
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === filteredSearches.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredSearches.map(s => s.id)));
    }
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const filteredSearches = savedSearches
    .filter(search => 
      search.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      search.dsl_json.vertical.toLowerCase().includes(searchFilter.toLowerCase())
    )
    .sort((a, b) => {
      let aVal, bVal;
      switch (sortField) {
        case 'name':
          aVal = a.name;
          bVal = b.name;
          break;
        case 'total_leads_found':
          aVal = a.total_leads_found || 0;
          bVal = b.total_leads_found || 0;
          break;
        default:
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
      }
      
      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Saved Searches</CardTitle>
          <div className="flex items-center gap-2">
            {selectedItems.size > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete ({selectedItems.size})
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Searches</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete {selectedItems.size} saved search(es)? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleBulkDelete}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-1" />
              Create Template
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search saved searches..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="max-w-sm"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {filteredSearches.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedItems.size === filteredSearches.length && filteredSearches.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1">
                    Name
                    {sortField === 'name' && (
                      sortDirection === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
                    )}
                  </div>
                </TableHead>
                <TableHead>Vertical</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('total_leads_found')}>
                  <div className="flex items-center gap-1">
                    Leads
                    {sortField === 'total_leads_found' && (
                      sortDirection === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
                    )}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('created_at')}>
                  <div className="flex items-center gap-1">
                    Created
                    {sortField === 'created_at' && (
                      sortDirection === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
                    )}
                  </div>
                </TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSearches.map((savedSearch) => (
                <TableRow key={savedSearch.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedItems.has(savedSearch.id)}
                      onCheckedChange={() => toggleSelection(savedSearch.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{savedSearch.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {savedSearch.dsl_json.vertical.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {savedSearch.dsl_json.geo.city}, {savedSearch.dsl_json.geo.state}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{savedSearch.total_leads_found}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(savedSearch.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRunSearch(savedSearch)}
                        className="h-8 w-8 p-0"
                      >
                        <Play className="h-3 w-3" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Search</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{savedSearch.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteSearch(savedSearch.id)}>
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
          <div className="text-center py-12">
            <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="font-medium mb-2">No Saved Searches</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchFilter ? 'No searches match your filter' : 'Run some searches to create reusable templates'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}