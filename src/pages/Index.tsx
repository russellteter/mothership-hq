import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { 
  Download, 
  LayoutGrid, 
  Table as TableIcon, 
  LogOut, 
  Loader2, 
  Home, 
  Search, 
  Filter, 
  Settings,
  FileJson,
  FileSpreadsheet,
  FileText,
  ChevronDown,
  X
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SearchPanel } from '@/components/dashboard/SearchPanel';
import { VirtualizedLeadsTable } from '@/components/dashboard/VirtualizedLeadsTable';
import { LeadDetailPanel } from '@/components/dashboard/LeadDetailPanel';
import { BoardView } from '@/components/dashboard/BoardView';
import { DashboardHome } from '@/components/dashboard/DashboardHome';
import { SavedSearchesTable } from '@/components/dashboard/SavedSearchesTable';
import { SearchResultsBanner } from '@/components/dashboard/SearchResultsBanner';
import { AdvancedFilters } from '@/components/dashboard/AdvancedFilters';
import { BulkOperations } from '@/components/dashboard/BulkOperations';
import { LeadScoringProfiles } from '@/components/dashboard/LeadScoringProfiles';
import { StickyHeader } from '@/components/ui/sticky-header';
import { EmptyState, ErrorState, LoadingState, TableSkeleton } from '@/components/ui/standard-states';
import { Lead, LeadQuery } from '@/types/lead';
import { useLeadSearch } from '@/hooks/useLeadSearch';
import { useSearchState } from '@/hooks/useSearchState';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isLeadDetailOpen, setIsLeadDetailOpen] = useState(false);
  const [activeView, setActiveView] = useState<'dashboard' | 'table' | 'board'>('dashboard');
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [currentScoringProfile, setCurrentScoringProfile] = useState('generic');
  const [showScoringSettings, setShowScoringSettings] = useState(false);
  
  const { user, loading, signOut, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const {
    isSearching,
    searchResults,
    currentSearchJob,
    parsePrompt,
    searchLeads,
    updateLeadStatus,
    addNote,
    addTag
  } = useLeadSearch();

  const { searchState, updateState, resetState } = useSearchState();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [loading, isAuthenticated, navigate]);

  // Initialize filtered leads when search results change
  useEffect(() => {
    setFilteredLeads(searchResults);
    setSelectedLeadIds([]);
  }, [searchResults]);

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out successfully"
    });
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleSearch = async (prompt: string) => {
    try {
      updateState('parsing', 'Understanding your request...', 10);
      
      // Parse the prompt first
      const parseResult = await parsePrompt(prompt);
      
      if (parseResult.warnings && parseResult.warnings.length > 0) {
        toast({
          title: "Search Warnings",
          description: parseResult.warnings.join(', '),
          variant: "default"
        });
      }

      updateState('queued', 'Search queued, starting soon...', 25);

      // Start the search with original prompt for context
      updateState('running', 'Finding leads...', 50);
      await searchLeads(parseResult.dsl, prompt);
      
      updateState('completed', 'Search completed successfully', 100);
      
      // Switch to table view to see results
      setActiveView('table');
      setShowSearchPanel(false);
      
    } catch (error) {
      console.error('Search failed:', error);
      updateState('failed', 'Search failed');
    }
  };

  const handleViewSearch = async (searchJob: any) => {
    // Load the results for this search
    // This would need implementation in useLeadSearch
    setActiveView('table');
  };

  const handleStartNewSearch = () => {
    setShowSearchPanel(true);
    setActiveView('table');
  };

  const handleLeadSelect = (lead: Lead) => {
    setSelectedLead(lead);
    setIsLeadDetailOpen(true);
  };

  const handleStatusChange = async (leadId: string, status: 'new' | 'qualified' | 'ignored') => {
    await updateLeadStatus(leadId, status);
    if (selectedLead?.business.id === leadId) {
      setSelectedLead({ ...selectedLead, status });
    }
  };

  const handleAddNote = async (note: string) => {
    if (!selectedLead) return;
    await addNote(selectedLead.business.id, note);
  };

  const handleAddTag = async (tag: string) => {
    if (!selectedLead) return;
    await addTag(selectedLead.business.id, tag);
  };

  const handleSignalOverride = async (signalId: string, isCorrect: boolean) => {
    try {
      // Update the signal override in the database
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      
      const { error } = await supabase
        .from('signal_overrides')
        .insert({
          business_id: selectedLead?.business.id,
          signal_id: signalId,
          user_id: userData.user?.id,
          is_correct: isCorrect
        });
      
      if (error) throw error;
      
      toast({
        title: "Signal Feedback Recorded",
        description: `Signal marked as ${isCorrect ? 'correct' : 'incorrect'}. This will help improve future results.`
      });
      
      // Optionally refresh the lead data to show updated signals
      // This could trigger a re-fetch of the lead's signals
    } catch (error) {
      console.error('Error recording signal override:', error);
      toast({
        title: "Error",
        description: "Failed to record signal feedback",
        variant: "destructive"
      });
    }
  };

  const handleRunSavedSearch = async (dsl: LeadQuery) => {
    await searchLeads(dsl);
    setActiveView('table');
  };

  const handleBulkStatusChange = async (leadIds: string[], status: 'new' | 'qualified' | 'ignored') => {
    await Promise.all(leadIds.map(id => updateLeadStatus(id, status)));
    // Update selected lead if it's in the batch
    if (selectedLead && leadIds.includes(selectedLead.business.id)) {
      setSelectedLead({ ...selectedLead, status });
    }
    // Clear selection after bulk operation
    setSelectedLeadIds([]);
  };

  const handleBulkTag = async (leadIds: string[], tag: string) => {
    await Promise.all(leadIds.map(id => addTag(id, tag)));
    setSelectedLeadIds([]);
  };

  const handleBulkExport = (leadIds: string[]) => {
    const leadsToExport = filteredLeads.filter(lead => leadIds.includes(lead.business.id));
    
    const csvContent = [
      ['Rank', 'Name', 'City', 'State', 'Phone', 'Website', 'Owner', 'Score', 'Status'].join(','),
      ...leadsToExport.map(lead => [
        lead.rank,
        `"${lead.name}"`,
        lead.city,
        lead.state,
        lead.phone || '',
        lead.website || '',
        `"${lead.owner || ''}"`,
        lead.score,
        lead.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `selected-leads-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportData = (format: 'csv' | 'json' | 'excel') => {
    const leadsToExport = filteredLeads.length > 0 ? filteredLeads : searchResults;
    
    if (leadsToExport.length === 0) {
      toast({
        title: "No Data to Export",
        description: "Please run a search first",
        variant: "destructive"
      });
      return;
    }

    const timestamp = new Date().toISOString().split('T')[0];
    
    if (format === 'csv') {
      const csvContent = [
        ['Rank', 'Name', 'City', 'State', 'Phone', 'Website', 'Owner', 'Score', 'Status', 'Categories', 'Review Count', 'Rating', 'Address'].join(','),
        ...leadsToExport.map(lead => [
          lead.rank,
          `"${lead.name}"`,
          `"${lead.city}"`,
          lead.state,
          lead.phone || '',
          lead.website || '',
          `"${lead.owner || ''}"`,
          lead.score,
          lead.status,
          `"${lead.business.categories?.join('; ') || ''}"`,
          lead.review_count || 0,
          lead.rating || '',
          `"${lead.business.address_json?.street || ''}, ${lead.city}, ${lead.state}"`
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads-${timestamp}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Export Successful",
        description: `Exported ${leadsToExport.length} leads to CSV`
      });
    } else if (format === 'json') {
      const jsonData = leadsToExport.map(lead => ({
        rank: lead.rank,
        name: lead.name,
        city: lead.city,
        state: lead.state,
        phone: lead.phone,
        website: lead.website,
        owner: lead.owner,
        score: lead.score,
        status: lead.status,
        categories: lead.business.categories,
        reviewCount: lead.review_count,
        rating: lead.rating,
        address: {
          street: lead.business.address_json?.street,
          city: lead.city,
          state: lead.state,
          zip: lead.business.address_json?.zip
        },
        business: {
          id: lead.business.id,
          placeId: lead.business.place_id,
          hours: lead.business.hours_json
        },
        people: lead.people,
        signals: lead.signals,
        tags: lead.tags,
        notes: lead.notes
      }));

      const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads-${timestamp}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Export Successful",
        description: `Exported ${leadsToExport.length} leads to JSON`
      });
    } else if (format === 'excel') {
      // Create a simple HTML table that Excel can understand
      const excelContent = `
        <html xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head>
          <meta charset="UTF-8">
          <style>
            table { border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #4CAF50; color: white; font-weight: bold; }
            .score-high { background-color: #d4edda; }
            .score-medium { background-color: #fff3cd; }
            .score-low { background-color: #f8d7da; }
          </style>
        </head>
        <body>
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Business Name</th>
                <th>City</th>
                <th>State</th>
                <th>Phone</th>
                <th>Website</th>
                <th>Owner</th>
                <th>Score</th>
                <th>Status</th>
                <th>Categories</th>
                <th>Review Count</th>
                <th>Rating</th>
                <th>Full Address</th>
                <th>Tags</th>
                <th>Notes Count</th>
              </tr>
            </thead>
            <tbody>
              ${leadsToExport.map(lead => `
                <tr class="${lead.score >= 80 ? 'score-high' : lead.score >= 60 ? 'score-medium' : 'score-low'}">
                  <td>${lead.rank}</td>
                  <td>${lead.name}</td>
                  <td>${lead.city}</td>
                  <td>${lead.state}</td>
                  <td>${lead.phone || ''}</td>
                  <td>${lead.website || ''}</td>
                  <td>${lead.owner || ''}</td>
                  <td>${lead.score}</td>
                  <td>${lead.status}</td>
                  <td>${lead.business.categories?.join('; ') || ''}</td>
                  <td>${lead.review_count || 0}</td>
                  <td>${lead.rating || ''}</td>
                  <td>${lead.business.address_json?.street || ''}, ${lead.city}, ${lead.state}</td>
                  <td>${lead.tags.join(', ')}</td>
                  <td>${lead.notes?.length || 0}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
        </html>
      `;

      const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads-${timestamp}.xls`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Export Successful",
        description: `Exported ${leadsToExport.length} leads to Excel`
      });
    }
  };

  return (
    <div className="h-screen flex bg-background">
      {showSearchPanel && <SearchPanel onSearch={handleSearch} isSearching={isSearching} />}
      
      <ResizablePanelGroup direction="horizontal" className="h-full">
        <ResizablePanel defaultSize={isLeadDetailOpen ? 70 : 100} minSize={30}>
          <div className="flex-1 flex flex-col h-full">
            {/* Sticky Header */}
            <StickyHeader
              resultsCount={searchResults.length}
              elapsedTime={searchState.elapsedTime}
              searchState={searchState.state}
              progress={searchState.progress}
              onExport={exportToCsv}
              onOpenScoring={() => setShowScoringSettings(!showScoringSettings)}
              onOpenSearch={() => setShowSearchPanel(!showSearchPanel)}
            />
            
            {/* Main Header */}
            <div className="border-b border-border/50 p-6 bg-card/30">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">SMB Lead Finder</h1>
                  <p className="text-sm text-muted-foreground mt-1">Welcome back, {user?.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <ThemeToggle />
                  <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground hover:text-foreground">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Tabs value={activeView} onValueChange={(value) => setActiveView(value as 'dashboard' | 'table' | 'board')}>
                    <TabsList>
                      <TabsTrigger value="dashboard" className="flex items-center gap-2">
                        <Home className="w-4 h-4" />
                        Dashboard
                      </TabsTrigger>
                      <TabsTrigger value="table" className="flex items-center gap-2">
                        <TableIcon className="w-4 h-4" />
                        Table View
                      </TabsTrigger>
                      <TabsTrigger value="board" className="flex items-center gap-2">
                        <LayoutGrid className="w-4 h-4" />
                        Board View
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 font-medium">
                      {filteredLeads.length} of {searchResults.length} leads
                    </Badge>
                    {selectedLeadIds.length > 0 && (
                      <Badge variant="secondary" className="font-medium">
                        {selectedLeadIds.length} selected
                      </Badge>
                    )}
                    {currentSearchJob && (
                      <Badge variant="secondary" className="font-medium">
                        Status: {currentSearchJob.status}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {activeView !== 'dashboard' && (
                    <>
                      <Button 
                        onClick={() => setShowSearchPanel(!showSearchPanel)} 
                        variant="outline" 
                        className="flex items-center gap-2"
                      >
                        <Search className="w-4 h-4" />
                        {showSearchPanel ? 'Hide Search' : 'Search'}
                      </Button>
                      <Button 
                        onClick={() => setShowScoringSettings(!showScoringSettings)} 
                        variant="outline" 
                        className="flex items-center gap-2"
                      >
                        <Settings className="w-4 h-4" />
                        Scoring
                      </Button>
                    </>
                  )}
                  <Button 
                    onClick={exportToCsv} 
                    variant="outline" 
                    className="flex items-center gap-2"
                    disabled={searchResults.length === 0 || activeView === 'dashboard'}
                  >
                    <Download className="w-4 h-4" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              {activeView === 'dashboard' ? (
                <div className="p-6 space-y-6">
                  <DashboardHome 
                    onViewSearch={handleViewSearch}
                    onStartNewSearch={handleStartNewSearch}
                    onRunSearch={handleRunSavedSearch}
                  />
                  <SavedSearchesTable onRunSearch={handleRunSavedSearch} />
                  {showScoringSettings && (
                    <LeadScoringProfiles
                      currentProfile={currentScoringProfile}
                      onProfileChange={setCurrentScoringProfile}
                      onWeightsChange={(weights) => {
                        // This would trigger re-scoring in a real implementation
                        console.log('Scoring weights updated:', weights);
                      }}
                    />
                  )}
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  {/* Search Results Banner */}
                  <SearchResultsBanner
                    searchJob={currentSearchJob}
                    resultsCount={searchResults.length}
                    onSaveSearch={async (customName) => {
                      if (currentSearchJob) {
                        try {
                          const { error } = await supabase
                            .from('saved_searches')
                            .insert({
                              name: customName,
                              dsl_json: currentSearchJob.dsl_json as any,
                              user_id: user?.id
                            });
                          
                          if (error) throw error;
                          
                          toast({
                            title: "Search Saved",
                            description: `Saved as "${customName}"`
                          });
                        } catch (error) {
                          console.error('Error saving search:', error);
                          toast({
                            title: "Save Failed",
                            description: "Could not save the search",
                            variant: "destructive"
                          });
                        }
                      }
                    }}
                    onEditSearch={() => setShowSearchPanel(true)}
                    onRetry={() => currentSearchJob && handleSearch(currentSearchJob.original_prompt || '')}
                  />

                  <AdvancedFilters
                    leads={searchResults}
                    onFilterChange={setFilteredLeads}
                    isVisible={showAdvancedFilters}
                    onToggle={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  />
                  
                  <BulkOperations
                    leads={filteredLeads}
                    selectedLeads={selectedLeadIds}
                    onSelectionChange={setSelectedLeadIds}
                    onStatusChange={handleBulkStatusChange}
                    onBulkTag={handleBulkTag}
                    onBulkExport={handleBulkExport}
                  />
                  
                  {activeView === 'table' ? (
                    isSearching ? (
                      <TableSkeleton rows={10} />
                    ) : filteredLeads.length === 0 ? (
                      <EmptyState
                        title="No leads found"
                        description="Try adjusting your search criteria or expanding your location radius."
                        action={{
                          label: "Start New Search",
                          onClick: () => setShowSearchPanel(true)
                        }}
                      />
                    ) : (
                      <VirtualizedLeadsTable
                        leads={filteredLeads}
                        selectedLead={selectedLead}
                        onLeadSelect={handleLeadSelect}
                        selectedLeads={selectedLeadIds}
                        onSelectionChange={setSelectedLeadIds}
                        height={500}
                      />
                    )
                  ) : (
                    <BoardView
                      leads={filteredLeads}
                      onLeadSelect={handleLeadSelect}
                      onStatusChange={handleStatusChange}
                    />
                  )}
                </div>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="flex items-center gap-2"
                    disabled={searchResults.length === 0 || activeView === 'dashboard'}
                  >
                    <Download className="w-4 h-4" />
                    Export
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => exportData('csv')}>
                    <FileText className="w-4 h-4 mr-2" />
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportData('json')}>
                    <FileJson className="w-4 h-4 mr-2" />
                    Export as JSON
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportData('excel')}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Export as Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </ResizablePanel>

        {isLeadDetailOpen && selectedLead && (
          <>
            <ResizableHandle withHandle className="w-2 bg-border hover:bg-muted transition-colors" />
            <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
              <LeadDetailPanel
                lead={selectedLead}
                onClose={() => setIsLeadDetailOpen(false)}
                onStatusChange={(status) => handleStatusChange(selectedLead.business.id, status)}
                onAddNote={handleAddNote}
                onAddTag={handleAddTag}
                onSignalOverride={handleSignalOverride}
              />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
};

export default Index;
