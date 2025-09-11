import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Star, StarOff, ExternalLink, Phone, Mail, Globe, Copy, Download, Share2, Maximize2, Minimize2 } from 'lucide-react';
import { Lead } from '@/types/lead';
import { useAIInsights } from '@/hooks/useAIInsights';
import { useWebsiteAnalysis } from '@/hooks/useWebsiteAnalysis';
import { ScoreDisplay, ScoreBreakdown } from '@/components/ui/score-display';
import { QuickActions } from '@/components/ui/quick-actions';
import { LazyTabContent } from '@/components/ui/lazy-tab-content';
import { toast } from '@/hooks/use-toast';

interface LeadDetailPanelProps {
  lead: Lead;
  onClose: () => void;
  onStatusChange: (status: 'new' | 'qualified' | 'ignored') => void;
  onAddNote: (note: string) => void;
  onAddTag: (tag: string) => void;
  onSignalOverride: (signalId: string, isCorrect: boolean) => void;
}

export function LeadDetailPanel({
  lead,
  onClose,
  onStatusChange,
  onAddNote,
  onAddTag,
  onSignalOverride
}: LeadDetailPanelProps) {
  const [newNote, setNewNote] = useState('');
  const [newTag, setNewTag] = useState('');
  const [isMaximized, setIsMaximized] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [fetchedSignals, setFetchedSignals] = useState<any[]>([]);
  const [subscores, setSubscores] = useState<any>({});

  const { generateInsights, insights, isGenerating: insightsLoading } = useAIInsights();
  const { analyzeWebsite, analysis, isAnalyzing: analysisLoading } = useWebsiteAnalysis();

  useEffect(() => {
    if (lead?.website) {
      analyzeWebsite(lead);
    }
    generateInsights(lead);
  }, [lead]);

  const handleAddNote = () => {
    if (newNote.trim()) {
      onAddNote(newNote.trim());
      setNewNote('');
      toast({
        title: "Note Added",
        description: "Your note has been saved successfully."
      });
    }
  };

  const handleAddTag = () => {
    if (newTag.trim()) {
      onAddTag(newTag.trim());
      setNewTag('');
      toast({
        title: "Tag Added",
        description: "Tag has been applied to this lead."
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'qualified': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'ignored': return 'bg-red-500/10 text-red-600 border-red-500/20';
      default: return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    }
  };

  const getSignalIcon = (signal: any) => {
    if (signal.overridden_by_user) {
      return signal.value_json ? <Star className="h-4 w-4 text-yellow-500" /> : <StarOff className="h-4 w-4 text-gray-400" />;
    }
    return signal.value_json ? <Star className="h-4 w-4 text-green-500" /> : <StarOff className="h-4 w-4 text-red-500" />;
  };

  const handleExport = (format: 'csv' | 'json') => {
    const data = format === 'json' ? JSON.stringify(lead, null, 2) : 
      [lead.name, lead.city, lead.state, lead.phone, lead.website, lead.owner, lead.score].join(',');
    
    const blob = new Blob([data], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lead-${lead.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = () => {
    const shareData = `${lead.name}\n${lead.city}, ${lead.state}\nScore: ${lead.score}/100`;
    navigator.clipboard.writeText(shareData);
    toast({
      title: "Lead Copied",
      description: "Lead information copied to clipboard"
    });
  };

  return (
    <div className={`flex flex-col h-full bg-background border-l border-border ${isMaximized ? 'absolute inset-0 z-50' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card/50">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold truncate">{lead.name}</h2>
            <p className="text-sm text-muted-foreground truncate">
              {lead.city}, {lead.state}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ScoreDisplay score={lead.score} size="md" showProgress showLabel />
            <Badge className={`${getStatusColor(lead.status)} capitalize`}>
              {lead.status}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-1 ml-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMaximized(!isMaximized)}
            className="h-8 w-8 p-0"
          >
            {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-b border-border bg-card/30">
        <QuickActions 
          lead={lead} 
          onExport={handleExport}
          onShare={handleShare}
        />
      </div>

      {/* Status Change Buttons */}
      <div className="flex gap-2 p-4 border-b border-border">
        <Button
          variant={lead.status === 'new' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onStatusChange('new')}
          className="flex-1"
        >
          New
        </Button>
        <Button
          variant={lead.status === 'qualified' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onStatusChange('qualified')}
          className="flex-1"
        >
          Qualified
        </Button>
        <Button
          variant={lead.status === 'ignored' ? 'outline' : 'outline'}
          size="sm"
          onClick={() => onStatusChange('ignored')}
          className="flex-1"
        >
          Ignored
        </Button>
      </div>

      {/* Content Tabs */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-6 mx-4 mt-4">
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="signals" className="text-xs">Signals</TabsTrigger>
            <TabsTrigger value="contacts" className="text-xs">Contacts</TabsTrigger>
            <TabsTrigger value="insights" className="text-xs">AI Insights</TabsTrigger>
            <TabsTrigger value="evidence" className="text-xs">Evidence</TabsTrigger>
            <TabsTrigger value="notes" className="text-xs">Notes</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 px-4">
            <LazyTabContent isActive={activeTab === 'overview'}>
              <TabsContent value="overview" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Score Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScoreBreakdown 
                      subscores={{ ICP: 30, Pain: 35, Reachability: 20, ComplianceRisk: 10 }}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Business Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 gap-2 text-sm">
                      <div><span className="font-medium">Name:</span> {lead.name}</div>
                      <div><span className="font-medium">Location:</span> {lead.city}, {lead.state}</div>
                      {lead.phone && <div><span className="font-medium">Phone:</span> {lead.phone}</div>}
                      {lead.website && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Website:</span>
                          <a href={lead.website} target="_blank" rel="noopener noreferrer" 
                             className="text-primary hover:underline flex items-center gap-1">
                            {lead.website}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                      {lead.owner && <div><span className="font-medium">Owner:</span> {lead.owner}</div>}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Tags</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {lead.tags?.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add tag..."
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                        className="text-sm"
                      />
                      <Button onClick={handleAddTag} size="sm">Add</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </LazyTabContent>

            <LazyTabContent isActive={activeTab === 'signals'}>
              <TabsContent value="signals" className="space-y-3 mt-4">
                {lead.signal_details?.map((signal, index) => (
                  <Card key={index}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getSignalIcon(signal)}
                          <span className="font-medium text-sm capitalize">
                            {signal.type.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onSignalOverride(signal.id, true)}
                            className="h-6 w-6 p-0"
                          >
                            ✓
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onSignalOverride(signal.id, false)}
                            className="h-6 w-6 p-0"
                          >
                            ✗
                          </Button>
                        </div>
                      </div>
                      {signal.evidence_snippet && (
                        <p className="text-xs text-muted-foreground">{signal.evidence_snippet}</p>
                      )}
                      {signal.evidence_url && (
                        <a href={signal.evidence_url} target="_blank" rel="noopener noreferrer"
                           className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
                          View source <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </LazyTabContent>

            <LazyTabContent isActive={activeTab === 'contacts'}>
              <TabsContent value="contacts" className="space-y-3 mt-4">
                {lead.people?.map((person, index) => (
                  <Card key={index}>
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm">{person.name}</h4>
                          <Badge variant="outline" className="text-xs">{person.role}</Badge>
                        </div>
                        <div className="space-y-1 text-sm">
                          {person.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <a href={`mailto:${person.email}`} className="text-primary hover:underline">
                                {person.email}
                              </a>
                            </div>
                          )}
                          {person.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <a href={`tel:${person.phone}`} className="text-primary hover:underline">
                                {person.phone}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </LazyTabContent>

            <LazyTabContent isActive={activeTab === 'insights'}>
              <TabsContent value="insights" className="space-y-3 mt-4">
                {insights ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">AI Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 text-sm">
                        <div>
                          <h4 className="font-medium mb-1">Summary</h4>
                          <p className="text-muted-foreground">{insights.summary}</p>
                        </div>
                        <div>
                          <h4 className="font-medium mb-1">Recommendations</h4>
                          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                            {insights.recommendations?.map((rec, index) => (
                              <li key={index}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {insightsLoading ? 'Generating insights...' : 'No insights available'}
                  </div>
                )}
              </TabsContent>
            </LazyTabContent>

            <LazyTabContent isActive={activeTab === 'evidence'}>
              <TabsContent value="evidence" className="space-y-3 mt-4">
                {analysis ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Website Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div><span className="font-medium">Business Type:</span> {analysis.businessType || 'Not detected'}</div>
                        <div><span className="font-medium">Target Market:</span> {analysis.targetMarket || 'Not available'}</div>
                        <div><span className="font-medium">Services:</span> {analysis.services?.join(', ') || 'Not available'}</div>
                        <div><span className="font-medium">Opportunities:</span> {analysis.opportunities?.join(', ') || 'Not available'}</div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {analysisLoading ? 'Analyzing website...' : 'No website analysis available'}
                  </div>
                )}
              </TabsContent>
            </LazyTabContent>

            <LazyTabContent isActive={activeTab === 'notes'}>
              <TabsContent value="notes" className="space-y-3 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Add Note</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Textarea
                        placeholder="Add your notes about this lead..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        className="min-h-[80px] text-sm"
                      />
                      <Button onClick={handleAddNote} size="sm" className="w-full">
                        Add Note
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {lead.notes?.map((note, index) => (
                  <Card key={index}>
                    <CardContent className="pt-4">
                      <p className="text-sm">{note.text}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(note.created_at).toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </LazyTabContent>
          </ScrollArea>
        </Tabs>
      </div>
    </div>
  );
}