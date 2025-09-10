import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { 
  X, 
  Star, 
  MapPin, 
  Phone, 
  Globe, 
  Mail, 
  User, 
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Tag as TagIcon,
  Brain,
  Search as SearchIcon,
  Loader2,
  ArrowRight
} from 'lucide-react';
import { Lead } from '@/types/lead';
import { useAIInsights } from '@/hooks/useAIInsights';
import { useWebsiteAnalysis } from '@/hooks/useWebsiteAnalysis';

interface LeadDetailDrawerProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (status: 'new' | 'qualified' | 'ignored') => void;
  onAddNote: (note: string) => void;
  onAddTag: (tag: string) => void;
  onSignalOverride?: (signalId: string, isCorrect: boolean) => void;
}

export function LeadDetailDrawer({ 
  lead, 
  isOpen, 
  onClose, 
  onStatusChange, 
  onAddNote, 
  onAddTag,
  onSignalOverride 
}: LeadDetailDrawerProps) {
  const [newNote, setNewNote] = useState('');
  const [newTag, setNewTag] = useState('');
  
  const { isGenerating: isGeneratingInsights, insights, generateInsights, clearInsights } = useAIInsights();
  const { isAnalyzing: isAnalyzingWebsite, analysis, analyzeWebsite, clearAnalysis } = useWebsiteAnalysis();

  // Clear insights when lead changes - MUST be before early return
  React.useEffect(() => {
    if (lead) {
      clearInsights();
      clearAnalysis();
    }
  }, [lead?.business.id, clearInsights, clearAnalysis]);

  if (!lead) return null;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-muted-foreground';
  };

  const handleAddNote = () => {
    if (newNote.trim()) {
      onAddNote(newNote);
      setNewNote('');
    }
  };

  const handleAddTag = () => {
    if (newTag.trim()) {
      onAddTag(newTag);
      setNewTag('');
    }
  };

  const handleGenerateInsights = async () => {
    if (lead) {
      await generateInsights(lead);
    }
  };

  const handleAnalyzeWebsite = async () => {
    if (lead) {
      await analyzeWebsite(lead);
    }
  };


  const renderSignalIcon = (value: boolean | undefined, type: string) => {
    if (value === true) {
      return <CheckCircle className="w-4 h-4 text-success" />;
    } else if (value === false) {
      return <XCircle className="w-4 h-4 text-destructive" />;
    }
    return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
  };

  const renderEvidenceTooltip = (signal: any) => {
    if (signal.evidence_snippet) {
      return (
        <div className="text-xs text-muted-foreground mt-1 p-2 bg-muted rounded">
          "{signal.evidence_snippet}"
          {signal.evidence_url && (
            <Button 
              size="sm" 
              variant="link" 
              className="p-0 h-auto text-xs"
              onClick={() => window.open(signal.evidence_url, '_blank')}
            >
              View source <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[500px] sm:w-[600px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="text-xl">{lead.name}</SheetTitle>
              <div className="flex items-center gap-2 mt-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {lead.business.address_json.street}, {lead.city}, {lead.state}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold ${getScoreColor(lead.score)}`}>
                {lead.score}
              </div>
              <div className="text-xs text-muted-foreground">Score</div>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Status Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Lead Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant={lead.status === 'new' ? 'default' : 'outline'}
                  onClick={() => onStatusChange('new')}
                >
                  New
                </Button>
                <Button 
                  size="sm" 
                  variant={lead.status === 'qualified' ? 'default' : 'outline'}
                  onClick={() => onStatusChange('qualified')}
                >
                  Qualified
                </Button>
                <Button 
                  size="sm" 
                  variant={lead.status === 'ignored' ? 'default' : 'outline'}
                  onClick={() => onStatusChange('ignored')}
                >
                  Ignored
                </Button>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="signals">Signals</TabsTrigger>
              <TabsTrigger value="contacts">Contacts</TabsTrigger>
              <TabsTrigger value="insights">AI Insights</TabsTrigger>
              <TabsTrigger value="evidence">Evidence</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {/* Score Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Score Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground">ICP Match</div>
                      <div className="font-semibold">{lead.score * 0.35}/35</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Pain Signals</div>
                      <div className="font-semibold">{lead.score * 0.35}/35</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Reachability</div>
                      <div className="font-semibold">{lead.score * 0.20}/20</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Compliance</div>
                      <div className="font-semibold">{lead.score * 0.10}/10</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Basic Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Business Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {lead.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      <Button 
                        variant="link" 
                        className="p-0 h-auto text-sm"
                        onClick={() => window.open(lead.website, '_blank')}
                      >
                        {lead.website} <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  )}
                  {lead.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{lead.phone}</span>
                    </div>
                  )}
                  {lead.review_count && (
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{lead.review_count} reviews</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tags */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {lead.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        <TagIcon className="w-3 h-3 mr-1" />
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
                    <Button size="sm" onClick={handleAddTag}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="signals" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">AI Signals</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(lead.signals).map(([key, value]) => (
                    <div key={key} className="flex items-start gap-3">
                      {renderSignalIcon(value, key)}
                      <div className="flex-1">
                        <div className="text-sm font-medium capitalize">
                          {key.replace(/_/g, ' ')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {value === true ? 'Detected' : value === false ? 'Not detected' : 'Unknown'}
                        </div>
                        {/* Mock evidence for demo */}
                        {key === 'no_website' && value && (
                          <div className="text-xs text-muted-foreground mt-1 p-2 bg-muted rounded">
                            "Google profile has no website field"
                            <Button 
                              size="sm" 
                              variant="link" 
                              className="p-0 h-auto text-xs ml-2"
                              onClick={() => window.open('https://maps.google.com', '_blank')}
                            >
                              View source <ExternalLink className="w-3 h-3 ml-1" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contacts" className="space-y-4">
              {lead.people.length > 0 ? (
                lead.people.map((person) => (
                  <Card key={person.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{person.name}</div>
                          <div className="text-sm text-muted-foreground">{person.role}</div>
                          {person.email && (
                            <div className="flex items-center gap-1 mt-1">
                              <Mail className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs">{person.email}</span>
                            </div>
                          )}
                          {person.phone && (
                            <div className="flex items-center gap-1 mt-1">
                              <Phone className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs">{person.phone}</span>
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground mt-1">
                            Confidence: {Math.round(person.confidence * 100)}%
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No contact information available
                </div>
              )}
            </TabsContent>

            <TabsContent value="insights" className="space-y-4">
              {/* AI Insights Section */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Brain className="h-4 w-4" />
                      AI Insights
                    </CardTitle>
                    <Button 
                      size="sm" 
                      onClick={handleGenerateInsights}
                      disabled={isGeneratingInsights}
                      className="bg-primary hover:bg-primary/90"
                    >
                      {isGeneratingInsights ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Brain className="h-4 w-4" />
                      )}
                      {isGeneratingInsights ? 'Analyzing...' : 'Generate Insights'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {insights ? (
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-sm mb-2">Business Summary</h4>
                        <p className="text-sm text-muted-foreground">{insights.summary}</p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-sm mb-2">Outreach Suggestion</h4>
                        <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                          <p className="text-sm">{insights.outreachSuggestion}</p>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-sm mb-2">Opportunity Score</h4>
                        <div className="flex items-center gap-2">
                          <div className="text-2xl font-bold text-primary">{insights.opportunityScore}/100</div>
                          <div className="text-xs text-muted-foreground">AI Confidence</div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-sm mb-2">Key Insights</h4>
                        <ul className="space-y-1">
                          {insights.keyInsights.map((insight, index) => (
                            <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                              <CheckCircle className="h-3 w-3 mt-0.5 text-success flex-shrink-0" />
                              {insight}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-medium text-sm mb-2">Recommendations</h4>
                        <ul className="space-y-1">
                          {insights.recommendations.map((rec, index) => (
                            <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                              <ArrowRight className="h-3 w-3 mt-0.5 text-primary flex-shrink-0" />
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-sm">Generate AI insights to get detailed analysis and recommendations for this lead.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Website Analysis Section */}
              {lead.website && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <SearchIcon className="h-4 w-4" />
                        Website Analysis
                      </CardTitle>
                      <Button 
                        size="sm" 
                        onClick={handleAnalyzeWebsite}
                        disabled={isAnalyzingWebsite}
                        variant="outline"
                      >
                        {isAnalyzingWebsite ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <SearchIcon className="h-4 w-4" />
                        )}
                        {isAnalyzingWebsite ? 'Analyzing...' : 'Analyze Website'}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {analysis ? (
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium text-sm mb-2">Business Summary</h4>
                          <p className="text-sm text-muted-foreground">{analysis.summary}</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium text-sm mb-2">Services</h4>
                            <ul className="space-y-1">
                              {analysis.services.slice(0, 3).map((service, index) => (
                                <li key={index} className="text-xs text-muted-foreground">• {service}</li>
                              ))}
                            </ul>
                          </div>
                          
                          <div>
                            <h4 className="font-medium text-sm mb-2">Opportunities</h4>
                            <ul className="space-y-1">
                              {analysis.opportunities.slice(0, 3).map((opp, index) => (
                                <li key={index} className="text-xs text-muted-foreground">• {opp}</li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium text-sm mb-2">Target Market</h4>
                          <p className="text-sm text-muted-foreground">{analysis.targetMarket}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <SearchIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-sm">Analyze this lead's website to extract business insights, services, and opportunities.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="evidence" className="space-y-4">
              {onSignalOverride ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Evidence Hub
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Evidence hub integration coming soon</p>
                      <p className="text-xs mt-2">Signal override functionality detected</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Evidence hub requires signal override functionality</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="notes" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Add Note</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Add your notes about this lead..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="mb-3"
                  />
                  <Button onClick={handleAddNote} disabled={!newNote.trim()}>
                    Add Note
                  </Button>
                </CardContent>
              </Card>

              {lead.notes.length > 0 ? (
                <div className="space-y-3">
                  {lead.notes.map((note) => (
                    <Card key={note.id}>
                      <CardContent className="pt-4">
                        <p className="text-sm">{note.text}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(note.created_at).toLocaleDateString()}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No notes yet
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}