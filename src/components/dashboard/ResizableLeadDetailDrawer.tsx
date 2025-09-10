import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  ArrowRight,
  GripVertical,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { Lead, Signal } from '@/types/lead';
import { useAIInsights } from '@/hooks/useAIInsights';
import { useWebsiteAnalysis } from '@/hooks/useWebsiteAnalysis';
import { supabase } from '@/integrations/supabase/client';

interface ResizableLeadDetailDrawerProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (status: 'new' | 'qualified' | 'ignored') => void;
  onAddNote: (note: string) => void;
  onAddTag: (tag: string) => void;
  onSignalOverride?: (signalId: string, isCorrect: boolean) => void;
}

export function ResizableLeadDetailDrawer({ 
  lead, 
  isOpen, 
  onClose, 
  onStatusChange, 
  onAddNote, 
  onAddTag,
  onSignalOverride 
}: ResizableLeadDetailDrawerProps) {
  const [newNote, setNewNote] = useState('');
  const [newTag, setNewTag] = useState('');
  const [width, setWidth] = useState(600);
  const [isResizing, setIsResizing] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [realSignals, setRealSignals] = useState<Signal[]>([]);
  const [realSubscores, setRealSubscores] = useState<any>(null);
  
  const resizeRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const { isGenerating: isGeneratingInsights, insights, generateInsights, clearInsights } = useAIInsights();
  const { isAnalyzing: isAnalyzingWebsite, analysis, analyzeWebsite, clearAnalysis } = useWebsiteAnalysis();

  // Fetch real signals and subscores when lead changes
  useEffect(() => {
    if (lead?.business.id) {
      fetchRealSignals();
      fetchRealSubscores();
      clearInsights();
      clearAnalysis();
    }
  }, [lead?.business.id, clearInsights, clearAnalysis]);

  const fetchRealSignals = async () => {
    if (!lead?.business.id) return;
    
    try {
      const { data: signals, error } = await supabase
        .from('signals')
        .select('*')
        .eq('business_id', lead.business.id);
      
      if (error) {
        console.error('Error fetching signals:', error);
        return;
      }
      
      setRealSignals(signals || []);
    } catch (error) {
      console.error('Error fetching signals:', error);
    }
  };

  const fetchRealSubscores = async () => {
    if (!lead?.business.id) return;
    
    try {
      const { data: leadViews, error } = await supabase
        .from('lead_views')
        .select('subscores_json')
        .eq('business_id', lead.business.id)
        .limit(1);
      
      if (error) {
        console.error('Error fetching subscores:', error);
        return;
      }
      
      if (leadViews && leadViews.length > 0) {
        setRealSubscores(leadViews[0].subscores_json);
      }
    } catch (error) {
      console.error('Error fetching subscores:', error);
    }
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    startX.current = e.clientX;
    startWidth.current = width;
    e.preventDefault();
  }, [width]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    const deltaX = e.clientX - startX.current;
    const newWidth = Math.max(400, Math.min(window.innerWidth - 100, startWidth.current + deltaX));
    setWidth(newWidth);
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

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

  const handleSignalOverride = async (signalId: string, isCorrect: boolean) => {
    if (!onSignalOverride) return;
    
    try {
      await supabase
        .from('signal_overrides')
        .insert({
          business_id: lead.business.id,
          signal_id: signalId,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          is_correct: isCorrect
        });
      
      onSignalOverride(signalId, isCorrect);
      // Refresh signals after override
      fetchRealSignals();
    } catch (error) {
      console.error('Error adding signal override:', error);
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

  const processedSignals = realSignals.reduce((acc, signal) => {
    acc[signal.type] = {
      value: signal.value_json,
      confidence: signal.confidence,
      evidence_url: signal.evidence_url,
      evidence_snippet: signal.evidence_snippet,
      id: signal.id
    };
    return acc;
  }, {} as Record<string, any>);

  const currentWidth = isMaximized ? '100vw' : `${width}px`;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        className="overflow-y-auto p-0 max-w-none border-l-2"
        style={{ width: currentWidth }}
      >
        {/* Resize Handle */}
        <div 
          ref={resizeRef}
          className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize bg-primary/20 hover:bg-primary/40 transition-colors z-50 flex items-center justify-center"
          onMouseDown={handleMouseDown}
        >
          <GripVertical className="w-4 h-4 text-primary" />
        </div>

        <div className="p-6">
          <SheetHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <SheetTitle className="text-xl truncate">{lead.name}</SheetTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsMaximized(!isMaximized)}
                    className="shrink-0"
                  >
                    {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground text-sm truncate">
                    {lead.business.address_json.street}, {lead.city}, {lead.state}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0 ml-4">
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
              <CardHeader className="pb-3">
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
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Score Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium py-2">ICP Match</TableCell>
                          <TableCell className="text-right py-2">
                            {realSubscores?.ICP || Math.round(lead.score * 0.35)}/35
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium py-2">Pain Signals</TableCell>
                          <TableCell className="text-right py-2">
                            {realSubscores?.Pain || Math.round(lead.score * 0.35)}/35
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium py-2">Reachability</TableCell>
                          <TableCell className="text-right py-2">
                            {realSubscores?.Reachability || Math.round(lead.score * 0.20)}/20
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium py-2">Compliance Risk</TableCell>
                          <TableCell className="text-right py-2">
                            -{realSubscores?.ComplianceRisk || Math.round(lead.score * 0.10)}/10
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Basic Info */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Business Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableBody>
                        {lead.website && (
                          <TableRow>
                            <TableCell className="font-medium py-2">
                              <div className="flex items-center gap-2">
                                <Globe className="w-4 h-4 text-muted-foreground" />
                                Website
                              </div>
                            </TableCell>
                            <TableCell className="py-2">
                              <Button 
                                variant="link" 
                                className="p-0 h-auto text-sm"
                                onClick={() => window.open(lead.website, '_blank')}
                              >
                                {lead.website} <ExternalLink className="w-3 h-3 ml-1" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        )}
                        {lead.phone && (
                          <TableRow>
                            <TableCell className="font-medium py-2">
                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-muted-foreground" />
                                Phone
                              </div>
                            </TableCell>
                            <TableCell className="py-2">{lead.phone}</TableCell>
                          </TableRow>
                        )}
                        {lead.review_count && (
                          <TableRow>
                            <TableCell className="font-medium py-2">
                              <div className="flex items-center gap-2">
                                <Star className="w-4 h-4 text-muted-foreground" />
                                Reviews
                              </div>
                            </TableCell>
                            <TableCell className="py-2">{lead.review_count} reviews</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Tags */}
                <Card>
                  <CardHeader className="pb-3">
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
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">AI Detected Signals</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Signal</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Confidence</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(processedSignals).map(([key, signalData]) => (
                          <TableRow key={key}>
                            <TableCell className="font-medium">
                              {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {renderSignalIcon(signalData.value, key)}
                                <span className="text-sm">
                                  {signalData.value === true ? 'Detected' : 
                                   signalData.value === false ? 'Not detected' : 'Unknown'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">{Math.round(signalData.confidence * 100)}%</span>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2"
                                  onClick={() => handleSignalOverride(signalData.id, true)}
                                >
                                  ✓
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2"
                                  onClick={() => handleSignalOverride(signalData.id, false)}
                                >
                                  ✗
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="contacts" className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {lead.people && lead.people.length > 0 ? (
                      <div className="space-y-4">
                        {/* Owner Information - Prominent Display */}
                        {lead.people.filter(p => p.role.toLowerCase().includes('owner') || p.role.toLowerCase().includes('principal')).map((owner) => (
                          <div key={owner.id} className="p-4 border rounded-lg bg-primary/5">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <User className="w-5 h-5 text-primary" />
                                <div>
                                  <h3 className="font-semibold text-lg">{owner.name}</h3>
                                  <Badge variant="default" className="text-xs">{owner.role}</Badge>
                                </div>
                              </div>
                              <div className="text-right text-xs text-muted-foreground">
                                Confidence: {Math.round((owner.confidence || 0) * 100)}%
                              </div>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                              {owner.email && (
                                <div className="flex items-center gap-3">
                                  <Mail className="w-4 h-4 text-muted-foreground" />
                                  <Button 
                                    variant="link" 
                                    className="p-0 h-auto text-sm font-medium text-primary"
                                    onClick={() => window.open(`mailto:${owner.email}`, '_blank')}
                                  >
                                    {owner.email}
                                  </Button>
                                </div>
                              )}
                              {owner.phone && (
                                <div className="flex items-center gap-3">
                                  <Phone className="w-4 h-4 text-muted-foreground" />
                                  <Button 
                                    variant="link" 
                                    className="p-0 h-auto text-sm font-medium"
                                    onClick={() => window.open(`tel:${owner.phone}`, '_blank')}
                                  >
                                    {owner.phone}
                                  </Button>
                                </div>
                              )}
                              {owner.source_url && owner.source_url.includes('linkedin.com') && (
                                <div className="flex items-center gap-3">
                                  <ExternalLink className="w-4 h-4 text-blue-600" />
                                  <Button 
                                    variant="link" 
                                    className="p-0 h-auto text-sm font-medium text-blue-600"
                                    onClick={() => window.open(owner.source_url, '_blank')}
                                  >
                                    LinkedIn Profile
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        
                        {/* Other Team Members */}
                        {lead.people.filter(p => !p.role.toLowerCase().includes('owner') && !p.role.toLowerCase().includes('principal')).length > 0 && (
                          <div>
                            <h4 className="font-medium text-sm mb-2">Other Team Members</h4>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Name</TableHead>
                                  <TableHead>Role</TableHead>
                                  <TableHead>Contact</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {lead.people.filter(p => !p.role.toLowerCase().includes('owner') && !p.role.toLowerCase().includes('principal')).map((person) => (
                                  <TableRow key={person.id}>
                                    <TableCell className="font-medium">{person.name}</TableCell>
                                    <TableCell>
                                      <Badge variant="outline">{person.role}</Badge>
                                    </TableCell>
                                    <TableCell>
                                      <div className="space-y-1">
                                        {person.email && (
                                          <div className="flex items-center gap-2">
                                            <Mail className="w-3 h-3 text-muted-foreground" />
                                            <Button 
                                              variant="link" 
                                              className="p-0 h-auto text-xs"
                                              onClick={() => window.open(`mailto:${person.email}`, '_blank')}
                                            >
                                              {person.email}
                                            </Button>
                                          </div>
                                        )}
                                        {person.phone && (
                                          <div className="flex items-center gap-2">
                                            <Phone className="w-3 h-3 text-muted-foreground" />
                                            <span className="text-xs">{person.phone}</span>
                                          </div>
                                        )}
                                        {person.source_url && person.source_url.includes('linkedin.com') && (
                                          <div className="flex items-center gap-2">
                                            <ExternalLink className="w-3 h-3 text-blue-600" />
                                            <Button 
                                              variant="link" 
                                              className="p-0 h-auto text-xs text-blue-600"
                                              onClick={() => window.open(person.source_url, '_blank')}
                                            >
                                              LinkedIn
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No contact information available</p>
                        <p className="text-xs mt-1">Owner identification signals detected but contact details not extracted</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="insights" className="space-y-4">
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
              </TabsContent>

              <TabsContent value="evidence" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Evidence Hub</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <SearchIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-sm">Evidence tracking system coming soon.</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notes" className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Add Note</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Add a note about this lead..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        className="min-h-[80px]"
                      />
                      <Button onClick={handleAddNote} disabled={!newNote.trim()}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {lead.notes.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Notes History</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {lead.notes.map((note) => (
                          <div key={note.id} className="p-3 bg-muted rounded-lg">
                            <p className="text-sm">{note.text}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {new Date(note.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
