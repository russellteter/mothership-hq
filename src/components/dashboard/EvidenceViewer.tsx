import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, ExternalLink, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { EvidenceEntry } from '@/types/lead';

interface EvidenceViewerProps {
  evidenceLog: EvidenceEntry[];
  confidenceReasons?: string[];
  evidenceCitations?: string[];
  websiteAuditData?: any;
  className?: string;
}

export function EvidenceViewer({ 
  evidenceLog, 
  confidenceReasons, 
  evidenceCitations, 
  websiteAuditData,
  className 
}: EvidenceViewerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedCheckType, setSelectedCheckType] = useState<string>('all');

  const checkTypes = [...new Set(evidenceLog.map(e => e.check_type))];
  const filteredEvidence = selectedCheckType === 'all' 
    ? evidenceLog 
    : evidenceLog.filter(e => e.check_type === selectedCheckType);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'found':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'not_found':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'found':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'not_found':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'error':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  if (!evidenceLog || evidenceLog.length === 0) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Evidence & Verification</CardTitle>
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
        </div>
        
        {/* Summary Stats */}
        <div className="flex gap-2 text-xs text-muted-foreground">
          <span>{evidenceLog.length} checks</span>
          <span>•</span>
          <span>{evidenceLog.filter(e => e.status === 'found').length} found</span>
          <span>•</span>
          <span>{evidenceLog.filter(e => e.status === 'not_found').length} not found</span>
          {evidenceLog.filter(e => e.status === 'error').length > 0 && (
            <>
              <span>•</span>
              <span>{evidenceLog.filter(e => e.status === 'error').length} errors</span>
            </>
          )}
        </div>
      </CardHeader>

      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {/* Confidence Reasons (GPT-5 synthesis) */}
            {confidenceReasons && confidenceReasons.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2">AI Confidence Assessment</h4>
                <ul className="space-y-1">
                  {confidenceReasons.map((reason, index) => (
                    <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                      <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Filter Controls */}
            <div className="mb-3">
              <div className="flex gap-1 flex-wrap">
                <Button
                  variant={selectedCheckType === 'all' ? 'default' : 'outline'}
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setSelectedCheckType('all')}
                >
                  All ({evidenceLog.length})
                </Button>
                {checkTypes.map(type => (
                  <Button
                    key={type}
                    variant={selectedCheckType === type ? 'default' : 'outline'}
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setSelectedCheckType(type)}
                  >
                    {type} ({evidenceLog.filter(e => e.check_type === type).length})
                  </Button>
                ))}
              </div>
            </div>

            {/* Evidence List */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredEvidence.map((evidence, index) => (
                <div
                  key={index}
                  className="border border-border rounded-lg p-2 text-xs"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(evidence.status)}
                      <Badge className={`text-xs px-1 py-0 ${getStatusColor(evidence.status)}`}>
                        {evidence.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs px-1 py-0">
                        {evidence.check_type}
                      </Badge>
                      <Badge variant="outline" className="text-xs px-1 py-0">
                        {evidence.source}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {Math.round(evidence.confidence * 100)}%
                    </div>
                  </div>
                  
                  {evidence.url && (
                    <div className="flex items-center gap-1 mb-1">
                      <ExternalLink className="w-3 h-3 text-muted-foreground" />
                      <a
                        href={evidence.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-800 truncate"
                      >
                        {evidence.url}
                      </a>
                      {evidence.path && (
                        <span className="text-xs text-muted-foreground">
                          ({evidence.path})
                        </span>
                      )}
                    </div>
                  )}
                  
                  {evidence.selector && (
                    <div className="text-xs text-muted-foreground mb-1">
                      <code className="bg-muted px-1 rounded">{evidence.selector}</code>
                    </div>
                  )}
                  
                  {evidence.snippet && (
                    <div className="text-xs text-muted-foreground">
                      <span className="italic">"{evidence.snippet}"</span>
                    </div>
                  )}
                  
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(evidence.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>

            {/* Evidence Citations */}
            {evidenceCitations && evidenceCitations.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Key Evidence</h4>
                <ul className="space-y-1">
                  {evidenceCitations.map((citation, index) => (
                    <li key={index} className="text-xs text-muted-foreground">
                      • {citation}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Website Audit Summary */}
            {websiteAuditData && (
              <div className="mt-4 p-2 bg-muted rounded-lg">
                <h4 className="text-sm font-medium mb-2">Website Audit Summary</h4>
                <div className="text-xs space-y-1">
                  <div>Website: {websiteAuditData.has_website ? '✓ Found' : '✗ Not found'}</div>
                  <div>SSL: {websiteAuditData.detected_features?.ssl_certificate?.found ? '✓ Yes' : '✗ No'}</div>
                  <div>Mobile: {websiteAuditData.detected_features?.mobile_responsive?.found ? '✓ Yes' : '✗ No'}</div>
                  <div>Booking: {websiteAuditData.detected_features?.online_booking?.found ? '✓ Found' : '✗ Not found'}</div>
                  {websiteAuditData.detected_features?.online_booking?.vendor_detected && (
                    <div>Vendor: {websiteAuditData.detected_features.online_booking.vendor_detected}</div>
                  )}
                  <div>Confidence: {Math.round(websiteAuditData.confidence_score * 100)}%</div>
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}