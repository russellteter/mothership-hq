import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Copy, 
  Mail, 
  Phone, 
  Download, 
  Share2,
  ExternalLink
} from 'lucide-react';
import { Lead } from '@/types/lead';
import { toast } from 'sonner';

interface QuickActionsProps {
  lead: Lead;
  onExport?: (format: 'csv' | 'json') => void;
  onShare?: () => void;
}

export function QuickActions({ lead, onExport, onShare }: QuickActionsProps) {
  const handleCopyLead = async () => {
    const leadInfo = `${lead.name}
Location: ${lead.city}, ${lead.state}
Phone: ${lead.phone || 'N/A'}
Website: ${lead.website || 'N/A'}
Score: ${lead.score}/100
Status: ${lead.status}`;

    try {
      await navigator.clipboard.writeText(leadInfo);
      toast.success('Lead information copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy lead information');
    }
  };

  const handleEmailClick = () => {
    // Try to find email from people array (contacts)
    const emailContact = lead.people?.find(person => person.email);
    if (emailContact?.email) {
      window.open(`mailto:${emailContact.email}`, '_blank');
    } else {
      toast.error('No email address available');
    }
  };

  const handlePhoneClick = () => {
    if (lead.phone) {
      window.open(`tel:${lead.phone}`, '_blank');
    } else {
      toast.error('No phone number available');
    }
  };

  const handleWebsiteClick = () => {
    if (lead.website) {
      window.open(lead.website, '_blank');
    } else {
      toast.error('No website available');
    }
  };

  return (
    <div className="flex gap-2 flex-wrap">
      <Button
        size="sm"
        variant="outline"
        onClick={handleCopyLead}
        className="gap-2"
      >
        <Copy className="w-4 h-4" />
        Copy Info
      </Button>
      
      {lead.people?.some(person => person.email) && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleEmailClick}
          className="gap-2"
        >
          <Mail className="w-4 h-4" />
          Email
        </Button>
      )}
      
      {lead.phone && (
        <Button
          size="sm"
          variant="outline"
          onClick={handlePhoneClick}
          className="gap-2"
        >
          <Phone className="w-4 h-4" />
          Call
        </Button>
      )}
      
      {lead.website && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleWebsiteClick}
          className="gap-2"
        >
          <ExternalLink className="w-4 h-4" />
          Visit Site
        </Button>
      )}
      
      <Button
        size="sm"
        variant="outline"
        onClick={() => onExport?.('csv')}
        className="gap-2"
      >
        <Download className="w-4 h-4" />
        Export
      </Button>
      
      <Button
        size="sm"
        variant="outline"
        onClick={onShare}
        className="gap-2"
      >
        <Share2 className="w-4 h-4" />
        Share
      </Button>
    </div>
  );
}