import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  Check, 
  X, 
  Clock, 
  Download, 
  Tag as TagIcon, 
  Users,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Lead } from '@/types/lead';
import { toast } from '@/hooks/use-toast';

interface BulkOperationsProps {
  leads: Lead[];
  selectedLeads: string[];
  onSelectionChange: (leadIds: string[]) => void;
  onStatusChange: (leadIds: string[], status: 'new' | 'qualified' | 'ignored') => void;
  onBulkTag: (leadIds: string[], tag: string) => void;
  onBulkExport: (leadIds: string[]) => void;
}

export function BulkOperations({ 
  leads, 
  selectedLeads, 
  onSelectionChange,
  onStatusChange,
  onBulkTag,
  onBulkExport
}: BulkOperationsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<string>('');
  const [bulkTag, setBulkTag] = useState('');

  const allSelected = leads.length > 0 && selectedLeads.length === leads.length;
  const someSelected = selectedLeads.length > 0 && selectedLeads.length < leads.length;
  const noneSelected = selectedLeads.length === 0;

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(leads.map(lead => lead.business.id));
    }
  };

  const handleBulkStatusChange = () => {
    if (bulkStatus && selectedLeads.length > 0) {
      onStatusChange(selectedLeads, bulkStatus as 'new' | 'qualified' | 'ignored');
      setBulkStatus('');
      toast({
        title: "Status Updated",
        description: `Updated ${selectedLeads.length} leads to ${bulkStatus}`
      });
    }
  };

  const handleBulkTagAdd = () => {
    if (bulkTag.trim() && selectedLeads.length > 0) {
      onBulkTag(selectedLeads, bulkTag.trim());
      setBulkTag('');
      toast({
        title: "Tag Added",
        description: `Added "${bulkTag}" tag to ${selectedLeads.length} leads`
      });
    }
  };

  const handleBulkExport = () => {
    if (selectedLeads.length > 0) {
      onBulkExport(selectedLeads);
      toast({
        title: "Export Started",
        description: `Exporting ${selectedLeads.length} selected leads`
      });
    }
  };

  const getSelectionSummary = () => {
    if (noneSelected) return "No leads selected";
    const statusCounts = selectedLeads.reduce((acc, leadId) => {
      const lead = leads.find(l => l.business.id === leadId);
      if (lead) {
        acc[lead.status] = (acc[lead.status] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return (
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4" />
        <span>{selectedLeads.length} selected</span>
        {Object.entries(statusCounts).map(([status, count]) => (
          <Badge key={status} variant="secondary" className="text-xs">
            {count} {status}
          </Badge>
        ))}
      </div>
    );
  };

  if (leads.length === 0) return null;

  return (
    <Card className={`mb-4 transition-all duration-200 ${selectedLeads.length > 0 ? 'border-primary' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={allSelected}
                ref={(el) => {
                  if (el && 'indeterminate' in el) (el as any).indeterminate = someSelected;
                }}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm font-medium">Select All</span>
            </div>
            
            <div className="text-sm text-muted-foreground">
              {getSelectionSummary()}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedLeads.length > 0 && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="flex items-center gap-1"
                >
                  Bulk Actions
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
                
                <Button
                  size="sm"
                  onClick={handleBulkExport}
                  className="flex items-center gap-1"
                >
                  <Download className="h-4 w-4" />
                  Export ({selectedLeads.length})
                </Button>
              </>
            )}
          </div>
        </div>

        {isExpanded && selectedLeads.length > 0 && (
          <div className="mt-4 pt-4 border-t space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Bulk Status Change */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Change Status</label>
                <div className="flex gap-2">
                  <Select value={bulkStatus} onValueChange={setBulkStatus}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-warning" />
                          New
                        </div>
                      </SelectItem>
                      <SelectItem value="qualified">
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-success" />
                          Qualified
                        </div>
                      </SelectItem>
                      <SelectItem value="ignored">
                        <div className="flex items-center gap-2">
                          <X className="h-4 w-4 text-destructive" />
                          Ignored
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={handleBulkStatusChange}
                    disabled={!bulkStatus}
                  >
                    Apply
                  </Button>
                </div>
              </div>

              {/* Bulk Tag Addition */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Add Tag</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Tag name"
                    value={bulkTag}
                    onChange={(e) => setBulkTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleBulkTagAdd()}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    onClick={handleBulkTagAdd}
                    disabled={!bulkTag.trim()}
                  >
                    <TagIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Quick Actions</label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onStatusChange(selectedLeads, 'qualified');
                      toast({
                        title: "Marked as Qualified",
                        description: `${selectedLeads.length} leads marked as qualified`
                      });
                    }}
                    className="flex items-center gap-1"
                  >
                    <Check className="h-4 w-4" />
                    Qualify All
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onStatusChange(selectedLeads, 'ignored');
                      toast({
                        title: "Marked as Ignored",
                        description: `${selectedLeads.length} leads marked as ignored`
                      });
                    }}
                    className="flex items-center gap-1"
                  >
                    <X className="h-4 w-4" />
                    Ignore All
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}