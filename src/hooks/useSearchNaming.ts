import { LeadQuery } from '@/types/lead';

export const generateSearchName = (dsl: LeadQuery, originalPrompt?: string): string => {
  if (originalPrompt) {
    // If we have the original prompt, create a name based on it
    return originalPrompt.length > 50 
      ? originalPrompt.substring(0, 47) + '...'
      : originalPrompt;
  }

  const parts = [];
  
  // Add vertical with proper formatting
  if (dsl.vertical && dsl.vertical !== 'generic') {
    const verticalNames: Record<string, string> = {
      'dentist': 'Dentists',
      'law_firm': 'Law Firms', 
      'contractor': 'Contractors',
      'hvac': 'HVAC Businesses',
      'roofing': 'Roofing Companies'
    };
    parts.push(verticalNames[dsl.vertical] || dsl.vertical.replace('_', ' '));
  } else {
    parts.push('Businesses');
  }
  
  // Add location
  if (dsl.geo) {
    if (dsl.geo.radius_km && dsl.geo.radius_km > 0) {
      parts.push(`near ${dsl.geo.city}, ${dsl.geo.state}`);
    } else {
      parts.push(`in ${dsl.geo.city}, ${dsl.geo.state}`);
    }
  }
  
  // Add key constraints with business-friendly language
  const constraints = [];
  if (dsl.constraints?.must) {
    dsl.constraints.must.forEach(constraint => {
      if (constraint.no_website) constraints.push('without websites');
      if (constraint.has_chatbot === false) constraints.push('no chat widgets');
      if (constraint.has_online_booking === false) constraints.push('no online booking');
      if (constraint.owner_identified) constraints.push('owner identified');
      if (constraint.franchise === false) constraints.push('non-franchise');
    });
  }
  
  if (constraints.length > 0) {
    if (constraints.length === 1) {
      parts.push(`with ${constraints[0]}`);
    } else if (constraints.length === 2) {
      parts.push(`with ${constraints.join(' and ')}`);
    } else {
      parts.push(`with ${constraints.slice(0, -1).join(', ')} and ${constraints[constraints.length - 1]}`);
    }
  }
  
  return parts.join(' ');
};

export const generateSearchTags = (dsl: LeadQuery): string[] => {
  const tags = [];
  
  // Add vertical tag
  if (dsl.vertical && dsl.vertical !== 'generic') {
    tags.push(dsl.vertical.toUpperCase());
  }
  
  // Add location tag
  if (dsl.geo) {
    tags.push(`${dsl.geo.city}-${dsl.geo.state}`.toUpperCase());
  }
  
  // Add constraint tags
  if (dsl.constraints?.must) {
    dsl.constraints.must.forEach(constraint => {
      if (constraint.no_website) tags.push('NO-WEBSITE');
      if (constraint.has_chatbot === false) tags.push('NO-CHAT');
      if (constraint.has_online_booking === false) tags.push('NO-BOOKING');
      if (constraint.owner_identified) tags.push('OWNER-ID');
      if (constraint.franchise === false) tags.push('NON-FRANCHISE');
    });
  }
  
  return tags;
};

export const categorizeLeadType = (dsl: LeadQuery): string => {
  const vertical = dsl.vertical || 'generic';
  const location = dsl.geo ? `${dsl.geo.city}-${dsl.geo.state}` : 'unknown';
  
  const constraints = [];
  if (dsl.constraints?.must) {
    dsl.constraints.must.forEach(constraint => {
      if (constraint.no_website) constraints.push('no-site');
      if (constraint.has_chatbot === false) constraints.push('no-chat');
      if (constraint.has_online_booking === false) constraints.push('no-booking');
      if (constraint.owner_identified) constraints.push('owner-known');
    });
  }
  
  const constraintSuffix = constraints.length > 0 ? `-${constraints.join('-')}` : '';
  
  return `${vertical}-${location}${constraintSuffix}`.toLowerCase();
};