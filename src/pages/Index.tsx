import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Download, LayoutGrid, Table as TableIcon, LogOut, Loader2, Home, Search, Filter, Settings } from 'lucide-react';
import { SearchPanel } from '@/components/dashboard/SearchPanel';
import { LeadsTable } from '@/components/dashboard/LeadsTable';
import { LeadDetailDrawer } from '@/components/dashboard/LeadDetailDrawer';
import { BoardView } from '@/components/dashboard/BoardView';
import { DashboardHome } from '@/components/dashboard/DashboardHome';
import { SavedSearches } from '@/components/dashboard/SavedSearches';
import { AdvancedFilters } from '@/components/dashboard/AdvancedFilters';
import { BulkOperations } from '@/components/dashboard/BulkOperations';
import { LeadScoringProfiles } from '@/components/dashboard/LeadScoringProfiles';
import { Lead, LeadQuery } from '@/types/lead';
import { useLeadSearch } from '@/hooks/useLeadSearch';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

const Index = () => {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
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
      // Parse the prompt first
      const parseResult = await parsePrompt(prompt);
      
      if (parseResult.warnings && parseResult.warnings.length > 0) {
        toast({
          title: "Search Warnings",
          description: parseResult.warnings.join(', '),
          variant: "default"
        });
      }

      // Start the search
      await searchLeads(parseResult.dsl);
      
      // Switch to table view to see results
      setActiveView('table');
      setShowSearchPanel(false);
      
    } catch (error) {
      console.error('Search failed:', error);
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
    setIsDrawerOpen(true);
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

  const exportToCsv = () => {
    const leadsToExport = filteredLeads.length > 0 ? filteredLeads : searchResults;
    
    if (leadsToExport.length === 0) {
      toast({
        title: "No Data to Export",
        description: "Please run a search first",
        variant: "destructive"
      });
      return;
    }

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
    a.download = `leads-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Export Successful",
      description: `Exported ${leadsToExport.length} leads to CSV`
    });
  };

  return (
    <div className="h-screen flex bg-background">
      {showSearchPanel && <SearchPanel onSearch={handleSearch} isSearching={isSearching} />}
      
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-border/50 p-6 bg-card/30">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">SMB Lead Finder</h1>
              <p className="text-sm text-muted-foreground mt-1">Welcome back, {user?.email}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
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
              />
              <SavedSearches onRunSearch={handleRunSavedSearch} />
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
            <div className="p-4">
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
                <LeadsTable
                  leads={filteredLeads}
                  selectedLead={selectedLead}
                  onLeadSelect={handleLeadSelect}
                  isLoading={isSearching}
                />
              ) : (
                <BoardView
                  leads={filteredLeads}
                  onLeadSelect={handleLeadSelect}
                  onStatusChange={handleStatusChange}
                />
              )}
            </div>
          )}
        </div>
      </div>

      <LeadDetailDrawer
        lead={selectedLead}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onStatusChange={(status) => selectedLead && handleStatusChange(selectedLead.business.id, status)}
        onAddNote={handleAddNote}
        onAddTag={handleAddTag}
      />
    </div>
  );
};

export default Index;
