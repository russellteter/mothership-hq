import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Calendar, MapPin, Building, Filter, Target } from 'lucide-react';
import { LeadQuery, SearchJob } from '@/types/lead';

interface SearchContextProps {
  searchJob: SearchJob | null;
  resultsCount: number;
  onSaveSearch?: (customName: string) => void;
  onEditSearch?: () => void;
}

export function SearchContext({ 
  searchJob, 
  resultsCount, 
  onSaveSearch, 
  onEditSearch 
}: SearchContextProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [customName, setCustomName] = useState('');

  if (!searchJob) return null;

  const dsl = searchJob.dsl_json;
  
  // Generate a descriptive search name
  const generateSearchName = (dsl: LeadQuery): string => {
    const parts = [];
    
    // Add vertical
    if (dsl.vertical && dsl.vertical !== 'generic') {
      parts.push(dsl.vertical.replace('_', ' '));
    }
    
    // Add location
    if (dsl.geo) {
      if (dsl.geo.radius_km) {
        parts.push(`in ${dsl.geo.city}, ${dsl.geo.state} (${dsl.geo.radius_km}km radius)`);
      } else {
        parts.push(`in ${dsl.geo.city}, ${dsl.geo.state}`);
      }
    }
    
    // Add key constraints
    const constraints = [];
    if (dsl.constraints?.must) {
      dsl.constraints.must.forEach(constraint => {
        if (constraint.no_website) constraints.push('without websites');
        if (constraint.has_chatbot === false) constraints.push('without chat widgets');
        if (constraint.has_online_booking === false) constraints.push('without online booking');
        if (constraint.owner_identified) constraints.push('with owner identified');
      });
    }
    
    if (constraints.length > 0) {
      parts.push(constraints.join(', '));
    }
    
    return parts.join(' ') || 'Business search';
  };

  const searchName = searchJob.custom_name || generateSearchName(dsl);
  const searchDate = new Date(searchJob.created_at).toLocaleDateString();

  const formatConstraints = (constraints: any) => {
    const mustHave = [];
    const optional = [];
    
    if (constraints?.must) {
      constraints.must.forEach((constraint: any) => {
        Object.entries(constraint).forEach(([key, value]) => {
          if (value === true) {
            mustHave.push(key.replace('_', ' '));
          } else if (value === false) {
            mustHave.push(`no ${key.replace('_', ' ')}`);
          }
        });
      });
    }
    
    if (constraints?.optional) {
      constraints.optional.forEach((constraint: any) => {
        Object.entries(constraint).forEach(([key, value]) => {
          if (value === true) {
            optional.push(key.replace('_', ' '));
          } else if (value === false) {
            optional.push(`no ${key.replace('_', ' ')}`);
          }
        });
      });
    }
    
    return { mustHave, optional };
  };

  const { mustHave, optional } = formatConstraints(dsl.constraints);

  const handleSaveSearch = () => {
    if (onSaveSearch && customName.trim()) {
      onSaveSearch(customName.trim());
      setIsEditingName(false);
      setCustomName('');
    }
  };

  return (
    <Card className="mb-4 border-primary/20 bg-primary/5">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              <div>
                <h3 className="font-semibold text-base">Search Results</h3>
                <p className="text-sm text-muted-foreground">
                  {searchJob.original_prompt || searchName}
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="font-medium">
              {resultsCount} leads found
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Calendar className="w-3 h-3 mr-1" />
              {searchDate}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditingName(true)}
              className="text-xs"
            >
              Save Search
            </Button>
            {onEditSearch && (
              <Button
                variant="outline"
                size="sm"
                onClick={onEditSearch}
                className="text-xs"
              >
                Edit & Re-run
              </Button>
            )}
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="p-1">
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          </div>
        </div>

        {/* Save Search Input */}
        {isEditingName && (
          <div className="mt-3 p-3 border rounded-lg bg-background">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Enter custom search name..."
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="flex-1 px-3 py-2 border rounded text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveSearch();
                  if (e.key === 'Escape') setIsEditingName(false);
                }}
              />
              <Button size="sm" onClick={handleSaveSearch} disabled={!customName.trim()}>
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsEditingName(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleContent className="mt-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 bg-background/50 rounded-lg border">
              {/* Business Type & Location */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Building className="w-4 h-4" />
                  Business Type
                </div>
                <Badge variant="outline" className="capitalize">
                  {dsl.vertical?.replace('_', ' ') || 'Any business'}
                </Badge>
                
                <div className="flex items-center gap-2 text-sm font-medium mt-3">
                  <MapPin className="w-4 h-4" />
                  Location
                </div>
                <div className="space-y-1">
                  <Badge variant="outline">
                    {dsl.geo?.city}, {dsl.geo?.state}
                  </Badge>
                  {dsl.geo?.radius_km && (
                    <Badge variant="outline" className="text-xs">
                      {dsl.geo.radius_km}km radius
                    </Badge>
                  )}
                </div>
              </div>

              {/* Must-Have Criteria */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Filter className="w-4 h-4" />
                  Required Criteria
                </div>
                <div className="flex flex-wrap gap-1">
                  {mustHave.length > 0 ? (
                    mustHave.map((criterion, index) => (
                      <Badge key={index} variant="default" className="text-xs capitalize">
                        {criterion}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">None specified</span>
                  )}
                </div>
              </div>

              {/* Optional Criteria */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Target className="w-4 h-4" />
                  Preferred Criteria
                </div>
                <div className="flex flex-wrap gap-1">
                  {optional.length > 0 ? (
                    optional.map((criterion, index) => (
                      <Badge key={index} variant="secondary" className="text-xs capitalize">
                        {criterion}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">None specified</span>
                  )}
                </div>
              </div>
            </div>

            {/* Search Performance & Settings */}
            <div className="mt-3 p-3 bg-background/30 rounded border text-xs text-muted-foreground">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="font-medium">Lead Profile:</span> {dsl.lead_profile}
                </div>
                <div>
                  <span className="font-medium">Target Results:</span> {dsl.result_size?.target || 250}
                </div>
                <div>
                  <span className="font-medium">Sort By:</span> {dsl.sort_by?.replace('_', ' ') || 'Score'}
                </div>
                <div>
                  <span className="font-medium">Status:</span> {searchJob.status}
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </Card>
  );
}