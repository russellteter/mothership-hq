import React, { useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ExternalLink, Eye, Star, Phone, Globe, MapPin } from 'lucide-react';
import { Lead } from '@/types/lead';

interface LeadsTableProps {
  leads: Lead[];
  selectedLead: Lead | null;
  onLeadSelect: (lead: Lead) => void;
  isLoading: boolean;
}

export function LeadsTable({ leads, selectedLead, onLeadSelect, isLoading }: LeadsTableProps) {
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
      badges.push(<Badge key="no-website" variant="destructive" className="text-xs">No Website</Badge>);
    }
    if (signals.has_chatbot === false) {
      badges.push(<Badge key="no-chat" variant="warning" className="text-xs">No Chat</Badge>);
    }
    if (signals.has_online_booking === false) {
      badges.push(<Badge key="no-booking" variant="warning" className="text-xs">No Booking</Badge>);
    }
    if (signals.owner_identified) {
      badges.push(<Badge key="owner" variant="success" className="text-xs">Owner ID'd</Badge>);
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
        <div className="p-6 border-b border-border flex-shrink-0">
          <h2 className="text-lg font-semibold">Search Results ({leads.length} leads)</h2>
        </div>
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Rank</TableHead>
                <TableHead className="w-16">Score</TableHead>
                <TableHead>Business</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Signals</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow 
                  key={lead.business.id}
                  className={`cursor-pointer hover:bg-muted/50 ${selectedLead?.business.id === lead.business.id ? 'bg-muted' : ''}`}
                  onClick={useCallback(() => onLeadSelect(lead), [lead, onLeadSelect])}
                >
                  <TableCell className="font-medium text-muted-foreground">
                    #{lead.rank}
                  </TableCell>
                  <TableCell>
                    <span className={`font-semibold ${getScoreColor(lead.score)}`}>
                      {lead.score}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{lead.name}</div>
                      {lead.website && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Globe className="w-3 h-3" />
                          <span className="truncate max-w-[200px]">{lead.website}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <MapPin className="w-3 h-3 text-muted-foreground" />
                      {lead.city}, {lead.state}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {renderSignalBadges(lead.signals)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {lead.owner && (
                      <div className="text-sm">
                        <div>{lead.owner}</div>
                        {lead.owner_email && (
                          <div className="text-xs text-muted-foreground">{lead.owner_email}</div>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {lead.phone && (
                      <div className="flex items-center gap-1 text-sm">
                        <Phone className="w-3 h-3 text-muted-foreground" />
                        {lead.phone}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(lead.status)}>
                      {lead.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={useCallback((e: React.MouseEvent) => { 
                          e.stopPropagation(); 
                          onLeadSelect(lead); 
                        }, [lead, onLeadSelect])}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {lead.website && (
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={useCallback((e: React.MouseEvent) => { 
                            e.stopPropagation(); 
                            window.open(lead.website, '_blank'); 
                          }, [lead.website])}
                        >
                          <ExternalLink className="w-4 h-4" />
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