import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Download, LayoutGrid, Table as TableIcon } from 'lucide-react';
import { SearchPanel } from '@/components/dashboard/SearchPanel';
import { LeadsTable } from '@/components/dashboard/LeadsTable';
import { LeadDetailDrawer } from '@/components/dashboard/LeadDetailDrawer';
import { BoardView } from '@/components/dashboard/BoardView';
import { Lead } from '@/types/lead';
import { useLeadSearch } from '@/hooks/useLeadSearch';
import { toast } from '@/hooks/use-toast';

const Index = () => {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeView, setActiveView] = useState<'table' | 'board'>('table');
  
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
      
    } catch (error) {
      console.error('Search failed:', error);
    }
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

  const exportToCsv = () => {
    if (searchResults.length === 0) {
      toast({
        title: "No Data to Export",
        description: "Please run a search first",
        variant: "destructive"
      });
      return;
    }

    const csvContent = [
      ['Rank', 'Name', 'City', 'State', 'Phone', 'Website', 'Owner', 'Score', 'Status'].join(','),
      ...searchResults.map(lead => [
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
      description: `Exported ${searchResults.length} leads to CSV`
    });
  };

  return (
    <div className="h-screen flex bg-background">
      <SearchPanel onSearch={handleSearch} isSearching={isSearching} />
      
      <div className="flex-1 flex flex-col">
        <div className="border-b border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Tabs value={activeView} onValueChange={(value) => setActiveView(value as 'table' | 'board')}>
                <TabsList>
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
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  {searchResults.length} leads found
                </Badge>
                {currentSearchJob && (
                  <Badge variant="secondary">
                    Status: {currentSearchJob.status}
                  </Badge>
                )}
              </div>
            </div>
            
            <Button 
              onClick={exportToCsv} 
              variant="outline" 
              className="flex items-center gap-2"
              disabled={searchResults.length === 0}
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {activeView === 'table' ? (
            <LeadsTable
              leads={searchResults}
              selectedLead={selectedLead}
              onLeadSelect={handleLeadSelect}
              isLoading={isSearching}
            />
          ) : (
            <BoardView
              leads={searchResults}
              onLeadSelect={handleLeadSelect}
              onStatusChange={handleStatusChange}
            />
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
