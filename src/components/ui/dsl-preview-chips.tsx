import React from 'react';
import { Badge } from '@/components/ui/badge';
import { MapPin, Building, Filter, Target } from 'lucide-react';
import { LeadQuery } from '@/types/lead';
import { cn } from '@/lib/utils';

interface DSLPreviewChipsProps {
  dsl: LeadQuery;
  className?: string;
  maxChips?: number;
}

export function DSLPreviewChips({ dsl, className, maxChips = 5 }: DSLPreviewChipsProps) {
  const chips = [];

  // Vertical chip
  if (dsl.vertical && dsl.vertical !== 'generic') {
    chips.push({
      icon: Building,
      label: dsl.vertical.replace('_', ' '),
      variant: 'default' as const
    });
  }

  // Location chip
  if (dsl.geo?.city) {
    const location = `${dsl.geo.city}${dsl.geo.state ? `, ${dsl.geo.state}` : ''}`;
    chips.push({
      icon: MapPin,
      label: location,
      variant: 'secondary' as const
    });
  }

  // Radius chip
  if (dsl.geo?.radius_km) {
    chips.push({
      icon: Target,
      label: `${dsl.geo.radius_km}km radius`,
      variant: 'outline' as const
    });
  }

  // Constraint chips
  if (dsl.constraints?.must) {
    const constraints = dsl.constraints.must.slice(0, 3); // Show max 3 constraints
    constraints.forEach((constraint) => {
      const key = Object.keys(constraint)[0];
      const value = Object.values(constraint)[0];
      
      let label = '';
      switch (key) {
        case 'no_website':
          label = value ? 'No Website' : 'Has Website';
          break;
        case 'has_chatbot':
          label = value ? 'Has Chatbot' : 'No Chatbot';
          break;
        case 'has_online_booking':
          label = value ? 'Has Booking' : 'No Booking';
          break;
        case 'owner_identified':
          label = value ? 'Owner ID' : 'No Owner ID';
          break;
        default:
          label = `${key}: ${value}`;
      }

      chips.push({
        icon: Filter,
        label,
        variant: 'outline' as const
      });
    });
  }

  // Limit to maxChips
  const displayChips = chips.slice(0, maxChips);
  const remainingCount = chips.length - maxChips;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {displayChips.map((chip, index) => (
        <Badge
          key={index}
          variant={chip.variant}
          className="text-xs px-2 py-1 flex items-center gap-1"
        >
          <chip.icon className="w-3 h-3" />
          {chip.label}
        </Badge>
      ))}
      
      {remainingCount > 0 && (
        <Badge variant="outline" className="text-xs px-2 py-1">
          +{remainingCount} more
        </Badge>
      )}
    </div>
  );
}