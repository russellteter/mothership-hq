import React, { useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ExternalLink, Eye, Star, Phone, Globe, MapPin } from 'lucide-react';
import { Lead } from '@/types/lead';

interface LeadsTableProps {
  leads: Lead[];
  selectedLead: Lead | null;
  onLeadSelect: (lead: Lead) => void;
  isLoading: boolean;
  selectedLeads?: string[];
  onSelectionChange?: (leadIds: string[]) => void;
}

export function LeadsTable({ 
  leads, 
  selectedLead, 
  onLeadSelect, 
  isLoading, 
  selectedLeads = [], 
  onSelectionChange 
}: LeadsTableProps) {
  const handleRowClick = useCallback((lead: Lead) => {
    onLeadSelect(lead);
  }, [onLeadSelect]);

  const handleViewDetails = useCallback((e: React.MouseEvent, lead: Lead) => {
    e.stopPropagation();
    onLeadSelect(lead);
  }, [onLeadSelect]);

  const handleOpenWebsite = useCallback((e: React.MouseEvent, website: string) => {
    e.stopPropagation();
    window.open(website, '_blank');
  }, []);

  const handleLeadSelection = useCallback((leadId: string, checked: boolean) => {
    if (!onSelectionChange) return;
    
    if (checked) {
      onSelectionChange([...selectedLeads, leadId]);
    } else {
      onSelectionChange(selectedLeads.filter(id => id !== leadId));
    }
  }, [selectedLeads, onSelectionChange]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-muted-foreground';
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'qualified': return 'default';
      case 'ignored': return 'secondary';
      default: return 'outline';
    }
  };

  const renderSignalBadges = (signals: Lead['signals']) => {
    const badges = [];
    
    if (signals.no_website) {
      badges.push(<Badge key="no-website" variant="destructive" className="text-xs px-1 py-0 text-xs">No Site</Badge>);
    }
    if (signals.has_chatbot === false) {
      badges.push(<Badge key="no-chat" variant="warning" className="text-xs px-1 py-0">No Chat</Badge>);
    }
    if (signals.has_online_booking === false) {
      badges.push(<Badge key="no-booking" variant="warning" className="text-xs px-1 py-0">No Book</Badge>);
    }
    if (signals.owner_identified) {
      badges.push(<Badge key="owner" variant="success" className="text-xs px-1 py-0">Owner</Badge>);
    }
    
    return badges.slice(0, 3); // Show max 3 badges
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Finding leads...</p>
          <p className="text-xs text-muted-foreground mt-2">This may take up to 2 minutes</p>
        </div>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Star className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No leads found</h3>
          <p className="text-muted-foreground">Try adjusting your search criteria or expanding your location radius.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <Card className="h-full flex flex-col">
        <div className="p-3 border-b border-border flex-shrink-0">
          <h2 className="text-base font-semibold">Search Results ({leads.length} leads)</h2>
        </div>
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="h-8">
                {onSelectionChange && <TableHead className="w-10 p-2"></TableHead>}
                <TableHead className="w-10 p-2 text-xs">Rank</TableHead>
                <TableHead className="w-12 p-2 text-xs">Score</TableHead>
                <TableHead className="p-2 text-xs">Business</TableHead>
                <TableHead className="p-2 text-xs">Location</TableHead>
                <TableHead className="p-2 text-xs">Signals</TableHead>
                <TableHead className="p-2 text-xs">Owner</TableHead>
                <TableHead className="p-2 text-xs">Contact</TableHead>
                <TableHead className="w-20 p-2 text-xs">Status</TableHead>
                <TableHead className="w-16 p-2 text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                 <TableRow 
                  key={lead.business.id}
                  className={`cursor-pointer hover:bg-muted/50 h-10 ${selectedLead?.business.id === lead.business.id ? 'bg-muted' : ''}`}
                  onClick={() => handleRowClick(lead)}
                >
                  {onSelectionChange && (
                    <TableCell className="p-2" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedLeads.includes(lead.business.id)}
                        onCheckedChange={(checked) => handleLeadSelection(lead.business.id, !!checked)}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-medium text-muted-foreground text-xs p-2">
                    #{lead.rank}
                  </TableCell>
                  <TableCell className="p-2">
                    <span className={`font-semibold text-sm ${getScoreColor(lead.score)}`}>
                      {lead.score}
                    </span>
                  </TableCell>
                  <TableCell className="p-2">
                    <div>
                      <div className="font-medium text-sm">{lead.name}</div>
                      {lead.website && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Globe className="w-2 h-2" />
                          <span className="truncate max-w-[150px]">{lead.website}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="p-2">
                    <div className="flex items-center gap-1 text-xs">
                      <MapPin className="w-2 h-2 text-muted-foreground" />
                      {lead.city}, {lead.state}
                    </div>
                  </TableCell>
                  <TableCell className="p-2">
                    <div className="flex flex-wrap gap-1">
                      {renderSignalBadges(lead.signals)}
                    </div>
                  </TableCell>
                  <TableCell className="p-2">
                    {lead.owner && (
                      <div className="text-xs">
                        <div>{lead.owner}</div>
                        {lead.owner_email && (
                          <div className="text-xs text-muted-foreground truncate max-w-[120px]">{lead.owner_email}</div>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="p-2">
                    {lead.phone && (
                      <div className="flex items-center gap-1 text-xs">
                        <Phone className="w-2 h-2 text-muted-foreground" />
                        <span className="truncate">{lead.phone}</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="p-2">
                    <Badge variant={getStatusBadgeVariant(lead.status)} className="text-xs px-1 py-0">
                      {lead.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="p-2">
                    <div className="flex gap-1">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-6 w-6 p-0"
                        onClick={(e) => handleViewDetails(e, lead)}
                      >
                        <Eye className="w-3 h-3" />
                      </Button>
                      {lead.website && (
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={(e) => handleOpenWebsite(e, lead.website!)}
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}