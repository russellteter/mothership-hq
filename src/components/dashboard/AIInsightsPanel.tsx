import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  TrendingUp, 
  Target, 
  Lightbulb,
  MessageSquare,
  ExternalLink,
  Sparkles,
  BarChart3,
  Users,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import { Lead } from '@/types/lead';
import { useAIInsights, AIInsight } from '@/hooks/useAIInsights';
import { useWebsiteAnalysis, WebsiteAnalysis } from '@/hooks/useWebsiteAnalysis';

interface AIInsightsPanelProps {
  lead: Lead;
}

export function AIInsightsPanel({ lead }: AIInsightsPanelProps) {
  const [activeTab, setActiveTab] = useState('insights');
  const { insights, isGenerating, generateInsights } = useAIInsights();
  const { analysis, isAnalyzing, analyzeWebsite } = useWebsiteAnalysis();

  const handleGenerateInsights = async () => {
    await generateInsights(lead);
  };

  const handleAnalyzeWebsite = async () => {
    if (lead.website) {
      await analyzeWebsite(lead);
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          AI Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="insights">Business Intel</TabsTrigger>
            <TabsTrigger value="website">Website Analysis</TabsTrigger>
            <TabsTrigger value="outreach">Outreach Ideas</TabsTrigger>
          </TabsList>

          <TabsContent value="insights" className="space-y-4">
            {!insights ? (
              <div className="text-center py-8">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50 text-primary" />
                <p className="text-muted-foreground mb-4">
                  Generate AI-powered business insights for this lead
                </p>
                <Button 
                  onClick={handleGenerateInsights} 
                  disabled={isGenerating}
                  className="shadow-sm hover:shadow-md transition-all duration-200"
                >
                  {isGenerating ? (
                    <>
                      <Brain className="h-4 w-4 mr-2 animate-pulse" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      Generate Insights
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <BusinessInsights insights={insights} />
            )}
          </TabsContent>

          <TabsContent value="website" className="space-y-4">
            {!lead.website ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No website available for analysis</p>
              </div>
            ) : !analysis ? (
              <div className="text-center py-8">
                <ExternalLink className="h-12 w-12 mx-auto mb-4 opacity-50 text-primary" />
                <p className="text-muted-foreground mb-4">
                  Analyze this business's website for insights
                </p>
                <Button 
                  onClick={handleAnalyzeWebsite} 
                  disabled={isAnalyzing}
                  variant="outline"
                  className="shadow-sm hover:shadow-md transition-all duration-200"
                >
                  {isAnalyzing ? (
                    <>
                      <Brain className="h-4 w-4 mr-2 animate-pulse" />
                      Analyzing Website...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Analyze Website
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <WebsiteInsights analysis={analysis} />
            )}
          </TabsContent>

          <TabsContent value="outreach" className="space-y-4">
            {insights ? (
              <OutreachSuggestions insights={insights} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Generate business insights first to see outreach suggestions</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function BusinessInsights({ insights }: { insights: AIInsight }) {
  return (
    <ScrollArea className="h-96">
      <div className="space-y-4">
        {/* Opportunity Score */}
        <Card className="border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Opportunity Score
              </h4>
              <Badge variant={insights.opportunityScore >= 80 ? 'success' : insights.opportunityScore >= 60 ? 'warning' : 'destructive'}>
                {insights.opportunityScore}/100
              </Badge>
            </div>
            <Progress value={insights.opportunityScore} className="mb-2" />
            <p className="text-sm text-muted-foreground">
              Overall business opportunity assessment
            </p>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Business Summary
            </h4>
            <p className="text-sm">{insights.summary}</p>
          </CardContent>
        </Card>

        {/* Key Insights */}
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-warning" />
              Key Insights
            </h4>
            <div className="space-y-2">
              {insights.keyInsights.map((insight, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <p className="text-sm">{insight}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              Recommendations
            </h4>
            <div className="space-y-2">
              {insights.recommendations.map((rec, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-success mt-2 flex-shrink-0" />
                  <p className="text-sm">{rec}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}

function WebsiteInsights({ analysis }: { analysis: WebsiteAnalysis }) {
  return (
    <ScrollArea className="h-96">
      <div className="space-y-4">
        {/* Business Type & Market */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium mb-2">Business Type</h4>
              <Badge variant="outline">{analysis.businessType}</Badge>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium mb-2">Target Market</h4>
              <p className="text-sm">{analysis.targetMarket}</p>
            </CardContent>
          </Card>
        </div>

        {/* Services */}
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Services Offered
            </h4>
            <div className="flex flex-wrap gap-2">
              {analysis.services.map((service, index) => (
                <Badge key={index} variant="secondary">
                  {service}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pain Points & Opportunities */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium mb-3 text-destructive">Pain Points</h4>
              <div className="space-y-2">
                {analysis.painPoints.map((pain, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-destructive mt-2 flex-shrink-0" />
                    <p className="text-sm">{pain}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium mb-3 text-success">Opportunities</h4>
              <div className="space-y-2">
                {analysis.opportunities.map((opp, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-success mt-2 flex-shrink-0" />
                    <p className="text-sm">{opp}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Competitive Advantages */}
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Competitive Advantages
            </h4>
            <div className="space-y-2">
              {analysis.competitiveAdvantages.map((advantage, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <p className="text-sm">{advantage}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}

function OutreachSuggestions({ insights }: { insights: AIInsight }) {
  return (
    <ScrollArea className="h-96">
      <div className="space-y-4">
        <Card className="border-primary/20">
          <CardContent className="p-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              Suggested Outreach
            </h4>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm whitespace-pre-line">{insights.outreachSuggestion}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-warning" />
              Business Analysis Talking Points
            </h4>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm whitespace-pre-line">{insights.businessAnalysis}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium mb-2">Quick Actions</h4>
            <div className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start">
                <MessageSquare className="h-4 w-4 mr-2" />
                Draft Email Template
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <DollarSign className="h-4 w-4 mr-2" />
                Create Proposal Outline
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Users className="h-4 w-4 mr-2" />
                Schedule Follow-up
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}