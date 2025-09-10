import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Globe, Phone, MapPin, Eye } from 'lucide-react';
import { Lead } from '@/types/lead';

interface BoardViewProps {
  leads: Lead[];
  onLeadSelect: (lead: Lead) => void;
  onStatusChange: (leadId: string, status: 'new' | 'qualified' | 'ignored') => void;
}

export function BoardView({ leads, onLeadSelect, onStatusChange }: BoardViewProps) {
  const columns = [
    { id: 'new', title: 'New Leads', status: 'new' as const },
    { id: 'qualified', title: 'Qualified', status: 'qualified' as const },
    { id: 'ignored', title: 'Ignored', status: 'ignored' as const },
  ];

  const getLeadsByStatus = (status: string) => {
    return leads.filter(lead => lead.status === status);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'border-l-success';
    if (score >= 60) return 'border-l-warning';
    return 'border-l-muted-foreground';
  };

  const handleDragStart = (e: React.DragEvent, lead: Lead) => {
    e.dataTransfer.setData('application/json', JSON.stringify(lead));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: 'new' | 'qualified' | 'ignored') => {
    e.preventDefault();
    const leadData = e.dataTransfer.getData('application/json');
    if (leadData) {
      const lead = JSON.parse(leadData) as Lead;
      if (lead.status !== status) {
        onStatusChange(lead.business.id, status);
      }
    }
  };

  const renderSignalBadges = (signals: Lead['signals']) => {
    const badges = [];
    
    if (signals.no_website) {
      badges.push(<Badge key="no-website" variant="destructive" className="text-xs">No Site</Badge>);
    }
    if (signals.has_chatbot === false) {
      badges.push(<Badge key="no-chat" variant="outline" className="text-xs">No Chat</Badge>);
    }
    if (signals.owner_identified) {
      badges.push(<Badge key="owner" variant="secondary" className="text-xs">Owner ID'd</Badge>);
    }
    
    return badges.slice(0, 2);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Lead Board</h2>
        <p className="text-muted-foreground">Drag leads between columns to update their status</p>
      </div>
      
      <div className="grid grid-cols-3 gap-6 min-h-[600px]">
        {columns.map((column) => {
          const columnLeads = getLeadsByStatus(column.status);
          
          return (
            <div key={column.id} className="flex flex-col min-h-[500px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">{column.title}</h3>
                <Badge variant="secondary">{columnLeads.length}</Badge>
              </div>
              
              <div 
                className="flex-1 space-y-3 overflow-y-auto p-2 border-2 border-dashed border-muted rounded-lg min-h-[200px]"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column.status)}
              >
                {columnLeads.map((lead) => (
                  <Card 
                    key={lead.business.id}
                    className={`cursor-move hover:shadow-md transition-shadow border-l-4 ${getScoreColor(lead.score)}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-sm font-medium line-clamp-1">
                          {lead.name}
                        </CardTitle>
                        <Badge variant="outline" className="text-xs ml-2">
                          {lead.score}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          {lead.city}, {lead.state}
                        </div>
                        
                        {lead.phone && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            {lead.phone}
                          </div>
                        )}
                        
                        {lead.website && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Globe className="w-3 h-3" />
                            <span className="truncate">{lead.website}</span>
                          </div>
                        )}
                        
                        <div className="flex flex-wrap gap-1 mt-2">
                          {renderSignalBadges(lead.signals)}
                        </div>
                        
                        <div className="flex justify-between items-center mt-3">
                          {lead.owner && (
                            <span className="text-xs font-medium text-primary">
                              {lead.owner}
                            </span>
                          )}
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={(e) => {
                              e.stopPropagation();
                              onLeadSelect(lead);
                            }}
                            className="h-6 px-2"
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {columnLeads.length === 0 && (
                  <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                    Drop leads here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}