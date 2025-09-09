import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, LayoutGrid, Table as TableIcon } from 'lucide-react';
import { SearchPanel } from '@/components/dashboard/SearchPanel';
import { LeadsTable } from '@/components/dashboard/LeadsTable';
import { LeadDetailDrawer } from '@/components/dashboard/LeadDetailDrawer';
import { BoardView } from '@/components/dashboard/BoardView';
import { Lead } from '@/types/lead';
import { sampleLeads } from '@/data/sampleLeads';

const Index = () => {
  const [leads, setLeads] = useState<Lead[]>(sampleLeads);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [activeView, setActiveView] = useState<'table' | 'board'>('table');

  const handleSearch = async (prompt: string) => {
    setIsSearching(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsSearching(false);
    // For demo, we're using the sample data
  };

  const handleLeadSelect = (lead: Lead) => {
    setSelectedLead(lead);
    setIsDrawerOpen(true);
  };

  const handleStatusChange = (leadId: string, status: 'new' | 'qualified' | 'ignored') => {
    setLeads(leads.map(lead => 
      lead.business.id === leadId 
        ? { ...lead, status }
        : lead
    ));
    if (selectedLead?.business.id === leadId) {
      setSelectedLead({ ...selectedLead, status });
    }
  };

  const handleAddNote = (note: string) => {
    if (!selectedLead) return;
    const newNote = {
      id: `n${Date.now()}`,
      business_id: selectedLead.business.id,
      text: note,
      created_at: new Date().toISOString()
    };
    const updatedLead = { ...selectedLead, notes: [...selectedLead.notes, newNote] };
    setSelectedLead(updatedLead);
    setLeads(leads.map(lead => 
      lead.business.id === selectedLead.business.id ? updatedLead : lead
    ));
  };

  const handleAddTag = (tag: string) => {
    if (!selectedLead) return;
    const updatedLead = { ...selectedLead, tags: [...selectedLead.tags, tag] };
    setSelectedLead(updatedLead);
    setLeads(leads.map(lead => 
      lead.business.id === selectedLead.business.id ? updatedLead : lead
    ));
  };

  const exportToCsv = () => {
    const csvContent = [
      ['Rank', 'Name', 'City', 'State', 'Phone', 'Website', 'Owner', 'Score', 'Status'].join(','),
      ...leads.map(lead => [
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
    a.download = 'leads.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="h-screen flex bg-background">
      <SearchPanel onSearch={handleSearch} isSearching={isSearching} />
      
      <div className="flex-1 flex flex-col">
        <div className="border-b border-border p-4">
          <div className="flex items-center justify-between">
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
            
            <Button onClick={exportToCsv} variant="outline" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {activeView === 'table' ? (
            <LeadsTable
              leads={leads}
              selectedLead={selectedLead}
              onLeadSelect={handleLeadSelect}
              isLoading={isSearching}
            />
          ) : (
            <BoardView
              leads={leads}
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
