import React, { useMemo, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { VirtualizedTable } from '@/components/ui/virtualized-table';
import { ExternalLink, Eye, Phone, Globe, MapPin } from 'lucide-react';
import { Lead } from '@/types/lead';
import { cn } from '@/lib/utils';

interface VirtualizedLeadsTableProps {
  leads: Lead[];
  selectedLead: Lead | null;
  onLeadSelect: (lead: Lead) => void;
  selectedLeads?: string[];
  onSelectionChange?: (leadIds: string[]) => void;
  height?: number;
}

export function VirtualizedLeadsTable({
  leads,
  selectedLead,
  onLeadSelect,
  selectedLeads = [],
  onSelectionChange,
  height = 400
}: VirtualizedLeadsTableProps) {
  
  const getScoreColor = useCallback((score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-muted-foreground';
  }, []);

  const getStatusBadgeVariant = useCallback((status: string) => {
    switch (status) {
      case 'qualified': return 'default';
      case 'ignored': return 'secondary';
      default: return 'outline';
    }
  }, []);

  const renderSignalBadges = useCallback((signals: Lead['signals']) => {
    const badges = [];
    
    if (signals.no_website) {
      badges.push(
        <Badge key="no-website" variant="destructive" className="text-xs px-1 py-0">
          No Site
        </Badge>
      );
    }
    if (signals.has_chatbot === false) {
      badges.push(
        <Badge key="no-chat" variant="outline" className="text-xs px-1 py-0 border-warning text-warning">
          No Chat
        </Badge>
      );
    }
    if (signals.has_online_booking === false) {
      badges.push(
        <Badge key="no-booking" variant="outline" className="text-xs px-1 py-0 border-warning text-warning">
          No Book
        </Badge>
      );
    }
    if (signals.owner_identified) {
      badges.push(
        <Badge key="owner" variant="outline" className="text-xs px-1 py-0 border-success text-success">
          Owner
        </Badge>
      );
    }
    
    const visibleBadges = badges.slice(0, 3);
    const remainingCount = badges.length - 3;
    
    return (
      <div className="flex flex-wrap gap-1">
        {visibleBadges}
        {remainingCount > 0 && (
          <Badge variant="secondary" className="text-xs px-1 py-0">
            +{remainingCount}
          </Badge>
        )}
      </div>
    );
  }, []);

  const handleLeadSelection = useCallback((leadId: string, checked: boolean) => {
    if (!onSelectionChange) return;
    
    if (checked) {
      onSelectionChange([...selectedLeads, leadId]);
    } else {
      onSelectionChange(selectedLeads.filter(id => id !== leadId));
    }
  }, [selectedLeads, onSelectionChange]);

  const handleViewDetails = useCallback((e: React.MouseEvent, lead: Lead) => {
    e.stopPropagation();
    onLeadSelect(lead);
  }, [onLeadSelect]);

  const handleOpenWebsite = useCallback((e: React.MouseEvent, website: string) => {
    e.stopPropagation();
    window.open(website, '_blank');
  }, []);

  const columns = useMemo(() => {
    const baseColumns = [
      {
        id: 'rank',
        header: 'Rank',
        width: 60,
        accessor: (lead: Lead) => (
          <span className="font-medium text-muted-foreground text-xs">
            #{lead.rank}
          </span>
        )
      },
      {
        id: 'score',
        header: 'Score',
        width: 70,
        accessor: (lead: Lead) => (
          <span className={cn("font-semibold text-sm", getScoreColor(lead.score))}>
            {lead.score}
          </span>
        )
      },
      {
        id: 'business',
        header: 'Business',
        width: 250,
        accessor: (lead: Lead) => (
          <div>
            <div className="font-medium text-sm truncate">{lead.name}</div>
            {lead.website && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Globe className="w-3 h-3" />
                <span className="truncate">{lead.website}</span>
              </div>
            )}
          </div>
        )
      },
      {
        id: 'location',
        header: 'Location',
        width: 140,
        accessor: (lead: Lead) => (
          <div className="flex items-center gap-1 text-xs">
            <MapPin className="w-3 h-3 text-muted-foreground" />
            {lead.city}, {lead.state}
          </div>
        )
      },
      {
        id: 'signals',
        header: 'Signals',
        width: 180,
        accessor: (lead: Lead) => renderSignalBadges(lead.signals)
      },
      {
        id: 'owner',
        header: 'Owner',
        width: 160,
        accessor: (lead: Lead) => (
          lead.owner ? (
            <div className="text-xs">
              <div className="truncate">{lead.owner}</div>
              {lead.owner_email && (
                <div className="text-muted-foreground truncate">{lead.owner_email}</div>
              )}
            </div>
          ) : null
        )
      },
      {
        id: 'contact',
        header: 'Contact',
        width: 120,
        accessor: (lead: Lead) => (
          lead.phone ? (
            <div className="flex items-center gap-1 text-xs">
              <Phone className="w-3 h-3 text-muted-foreground" />
              <span className="truncate">{lead.phone}</span>
            </div>
          ) : null
        )
      },
      {
        id: 'status',
        header: 'Status',
        width: 90,
        accessor: (lead: Lead) => (
          <Badge variant={getStatusBadgeVariant(lead.status)} className="text-xs px-2 py-1">
            {lead.status}
          </Badge>
        )
      },
      {
        id: 'actions',
        header: 'Actions',
        width: 80,
        accessor: (lead: Lead) => (
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
        )
      }
    ];

    // Add selection column if needed
    if (onSelectionChange) {
      baseColumns.unshift({
        id: 'select',
        header: '',
        width: 40,
        accessor: (lead: Lead) => (
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={selectedLeads.includes(lead.business.id)}
              onCheckedChange={(checked) => handleLeadSelection(lead.business.id, !!checked)}
            />
          </div>
        )
      });
    }

    return baseColumns;
  }, [
    getScoreColor,
    getStatusBadgeVariant,
    renderSignalBadges,
    selectedLeads,
    onSelectionChange,
    handleLeadSelection,
    handleViewDetails,
    handleOpenWebsite
  ]);

  const getItemId = useCallback((lead: Lead) => lead.business.id, []);

  return (
    <VirtualizedTable
      data={leads}
      columns={columns}
      rowHeight={48}
      height={height}
      onRowClick={onLeadSelect}
      selectedItemId={selectedLead?.business.id}
      getItemId={getItemId}
      stickyHeader
      className="border border-border rounded-lg"
    />
  );
}