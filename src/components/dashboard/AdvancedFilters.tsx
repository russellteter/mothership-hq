import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Filter, 
  X, 
  MapPin, 
  Building, 
  Users, 
  Star,
  Globe,
  Search
} from 'lucide-react';
import { Lead } from '@/types/lead';

interface FilterCriteria {
  scoreRange: [number, number];
  statuses: string[];
  verticals: string[];
  hasWebsite: string; // 'all' | 'yes' | 'no'
  hasChatbot: string;
  hasOnlineBooking: string;
  ownerIdentified: string;
  reviewCountMin: number;
  cities: string[];
  searchText: string;
}

interface AdvancedFiltersProps {
  leads: Lead[];
  onFilterChange: (filteredLeads: Lead[]) => void;
  isVisible: boolean;
  onToggle: () => void;
}

const VERTICALS = [
  { value: 'dentist', label: 'Dentist' },
  { value: 'law_firm', label: 'Law Firm' },
  { value: 'contractor', label: 'Contractor' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'generic', label: 'Generic' }
];

const STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'ignored', label: 'Ignored' }
];

export function AdvancedFilters({ leads, onFilterChange, isVisible, onToggle }: AdvancedFiltersProps) {
  const [filters, setFilters] = useState<FilterCriteria>({
    scoreRange: [0, 100],
    statuses: ['new', 'qualified', 'ignored'],
    verticals: [],
    hasWebsite: 'all',
    hasChatbot: 'all',
    hasOnlineBooking: 'all',
    ownerIdentified: 'all',
    reviewCountMin: 0,
    cities: [],
    searchText: ''
  });

  const [activeFilterCount, setActiveFilterCount] = useState(0);

  React.useEffect(() => {
    applyFilters();
  }, [filters, leads]);

  const applyFilters = () => {
    let filtered = [...leads];
    let activeCount = 0;

    // Score range filter
    if (filters.scoreRange[0] > 0 || filters.scoreRange[1] < 100) {
      filtered = filtered.filter(lead => 
        lead.score >= filters.scoreRange[0] && lead.score <= filters.scoreRange[1]
      );
      activeCount++;
    }

    // Status filter
    if (filters.statuses.length < 3) {
      filtered = filtered.filter(lead => filters.statuses.includes(lead.status));
      activeCount++;
    }

    // Vertical filter
    if (filters.verticals.length > 0) {
      filtered = filtered.filter(lead => 
        filters.verticals.includes(lead.business.vertical || 'generic')
      );
      activeCount++;
    }

    // Website filter
    if (filters.hasWebsite !== 'all') {
      const hasWebsite = filters.hasWebsite === 'yes';
      filtered = filtered.filter(lead => !!lead.website === hasWebsite);
      activeCount++;
    }

    // Chatbot filter
    if (filters.hasChatbot !== 'all') {
      const hasChatbot = filters.hasChatbot === 'yes';
      filtered = filtered.filter(lead => 
        lead.signals.has_chatbot === hasChatbot
      );
      activeCount++;
    }

    // Online booking filter
    if (filters.hasOnlineBooking !== 'all') {
      const hasBooking = filters.hasOnlineBooking === 'yes';
      filtered = filtered.filter(lead => 
        lead.signals.has_online_booking === hasBooking
      );
      activeCount++;
    }

    // Owner identified filter
    if (filters.ownerIdentified !== 'all') {
      const ownerIdentified = filters.ownerIdentified === 'yes';
      filtered = filtered.filter(lead => 
        lead.signals.owner_identified === ownerIdentified
      );
      activeCount++;
    }

    // Review count filter
    if (filters.reviewCountMin > 0) {
      filtered = filtered.filter(lead => 
        (lead.review_count || 0) >= filters.reviewCountMin
      );
      activeCount++;
    }

    // Cities filter
    if (filters.cities.length > 0) {
      filtered = filtered.filter(lead => 
        filters.cities.includes(lead.city)
      );
      activeCount++;
    }

    // Search text filter
    if (filters.searchText.trim()) {
      const searchTerm = filters.searchText.toLowerCase();
      filtered = filtered.filter(lead => 
        lead.name.toLowerCase().includes(searchTerm) ||
        lead.city.toLowerCase().includes(searchTerm) ||
        lead.state.toLowerCase().includes(searchTerm) ||
        (lead.owner && lead.owner.toLowerCase().includes(searchTerm))
      );
      activeCount++;
    }

    setActiveFilterCount(activeCount);
    onFilterChange(filtered);
  };

  const updateFilter = (key: keyof FilterCriteria, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearAllFilters = () => {
    setFilters({
      scoreRange: [0, 100],
      statuses: ['new', 'qualified', 'ignored'],
      verticals: [],
      hasWebsite: 'all',
      hasChatbot: 'all',
      hasOnlineBooking: 'all',
      ownerIdentified: 'all',
      reviewCountMin: 0,
      cities: [],
      searchText: ''
    });
  };

  const uniqueCities = React.useMemo(() => {
    const cities = [...new Set(leads.map(lead => lead.city))].sort();
    return cities.slice(0, 20); // Limit to first 20 cities
  }, [leads]);

  if (!isVisible) {
    return (
      <div className="flex items-center gap-2 mb-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onToggle}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 min-w-5 text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
        {activeFilterCount > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearAllFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            Clear All
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Advanced Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary">{activeFilterCount} active</Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              Clear All
            </Button>
            <Button variant="ghost" size="sm" onClick={onToggle}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search Text */}
        <div>
          <label className="text-sm font-medium mb-2 block">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, city, owner..."
              value={filters.searchText}
              onChange={(e) => updateFilter('searchText', e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Separator />

        {/* Score Range */}
        <div>
          <label className="text-sm font-medium mb-2 block">
            Lead Score: {filters.scoreRange[0]} - {filters.scoreRange[1]}
          </label>
          <div className="px-2">
            <Slider
              value={filters.scoreRange}
              onValueChange={(value) => updateFilter('scoreRange', value)}
              max={100}
              min={0}
              step={5}
              className="w-full"
            />
          </div>
        </div>

        {/* Status Filter */}
        <div>
          <label className="text-sm font-medium mb-2 block">Status</label>
          <div className="flex gap-2">
            {STATUSES.map((status) => (
              <div key={status.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`status-${status.value}`}
                  checked={filters.statuses.includes(status.value)}
                  onCheckedChange={(checked) => {
                    const newStatuses = checked
                      ? [...filters.statuses, status.value]
                      : filters.statuses.filter(s => s !== status.value);
                    updateFilter('statuses', newStatuses);
                  }}
                />
                <label htmlFor={`status-${status.value}`} className="text-sm">
                  {status.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Business Properties */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block flex items-center gap-1">
              <Globe className="h-4 w-4" />
              Has Website
            </label>
            <Select value={filters.hasWebsite} onValueChange={(value) => updateFilter('hasWebsite', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Has Chatbot</label>
            <Select value={filters.hasChatbot} onValueChange={(value) => updateFilter('hasChatbot', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Online Booking</label>
            <Select value={filters.hasOnlineBooking} onValueChange={(value) => updateFilter('hasOnlineBooking', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Owner Identified</label>
            <Select value={filters.ownerIdentified} onValueChange={(value) => updateFilter('ownerIdentified', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        {/* Vertical Filter */}
        <div>
          <label className="text-sm font-medium mb-2 block flex items-center gap-1">
            <Building className="h-4 w-4" />
            Business Type
          </label>
          <div className="grid grid-cols-3 gap-2">
            {VERTICALS.map((vertical) => (
              <div key={vertical.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`vertical-${vertical.value}`}
                  checked={filters.verticals.includes(vertical.value)}
                  onCheckedChange={(checked) => {
                    const newVerticals = checked
                      ? [...filters.verticals, vertical.value]
                      : filters.verticals.filter(v => v !== vertical.value);
                    updateFilter('verticals', newVerticals);
                  }}
                />
                <label htmlFor={`vertical-${vertical.value}`} className="text-sm">
                  {vertical.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Cities Filter */}
        {uniqueCities.length > 1 && (
          <div>
            <label className="text-sm font-medium mb-2 block flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              Cities
            </label>
            <div className="grid grid-cols-4 gap-2 max-h-24 overflow-y-auto">
              {uniqueCities.map((city) => (
                <div key={city} className="flex items-center space-x-2">
                  <Checkbox
                    id={`city-${city}`}
                    checked={filters.cities.includes(city)}
                    onCheckedChange={(checked) => {
                      const newCities = checked
                        ? [...filters.cities, city]
                        : filters.cities.filter(c => c !== city);
                      updateFilter('cities', newCities);
                    }}
                  />
                  <label htmlFor={`city-${city}`} className="text-xs">
                    {city}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Review Count */}
        <div>
          <label className="text-sm font-medium mb-2 block flex items-center gap-1">
            <Star className="h-4 w-4" />
            Minimum Reviews: {filters.reviewCountMin}
          </label>
          <div className="px-2">
            <Slider
              value={[filters.reviewCountMin]}
              onValueChange={(value) => updateFilter('reviewCountMin', value[0])}
              max={500}
              min={0}
              step={10}
              className="w-full"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}