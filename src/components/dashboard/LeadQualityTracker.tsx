import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  Target,
  Zap
} from 'lucide-react';

interface QualityMetric {
  id: string;
  name: string;
  value: number;
  target: number;
  trend: 'up' | 'down' | 'stable';
  status: 'good' | 'warning' | 'poor';
  description: string;
}

interface ConversionFunnel {
  stage: string;
  count: number;
  rate: number;
  icon: React.ReactNode;
}

export function LeadQualityTracker() {
  const [metrics, setMetrics] = useState<QualityMetric[]>([]);
  const [funnel, setFunnel] = useState<ConversionFunnel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQualityMetrics();
  }, []);

  const loadQualityMetrics = async () => {
    setLoading(true);
    try {
      // Get real data from Supabase
      const { data: leadViews } = await supabase
        .from('lead_views')
        .select(`
          id,
          score,
          business:businesses!inner(
            id,
            signals!inner(
              id,
              type,
              confidence,
              evidence_url,
              overridden_by_user
            ),
            people!inner(id, name, email, phone)
          )
        `);

      if (!leadViews || leadViews.length === 0) {
        setMetrics([]);
        setFunnel([]);
        return;
      }

      // Calculate evidence quality (signals with evidence)
      const allSignals = leadViews.flatMap(lv => (lv.business as any)?.signals || []);
      const signalsWithEvidence = allSignals.filter(s => s.evidence_url);
      const evidenceQuality = allSignals.length > 0 
        ? Math.round((signalsWithEvidence.length / allSignals.length) * 100)
        : 0;

      // Calculate enrichment coverage (leads with contact info)
      const leadsWithContacts = leadViews.filter(lv => {
        const people = (lv.business as any)?.people || [];
        return people.some((p: any) => p.email || p.phone);
      });
      const enrichmentCoverage = Math.round((leadsWithContacts.length / leadViews.length) * 100);

      // Calculate precision (leads with scores > 70)
      const highQualityLeads = leadViews.filter(lv => (lv.score || 0) >= 70);
      const precision = Math.round((highQualityLeads.length / leadViews.length) * 100);

      // Calculate signal accuracy (non-overridden signals)
      const overriddenSignals = allSignals.filter(s => s.overridden_by_user);
      const signalAccuracy = allSignals.length > 0 
        ? Math.round(((allSignals.length - overriddenSignals.length) / allSignals.length) * 100)
        : 100;

      // Get status data for funnel
      const { data: statusData } = await supabase
        .from('status_logs')
        .select('business_id, status')
        .order('changed_at', { ascending: false });

      const latestStatuses = new Map();
      statusData?.forEach(status => {
        if (!latestStatuses.has(status.business_id)) {
          latestStatuses.set(status.business_id, status.status);
        }
      });

      const qualifiedCount = Array.from(latestStatuses.values()).filter(status => status === 'qualified').length;
      const newCount = Array.from(latestStatuses.values()).filter(status => status === 'new').length;

      const realMetrics: QualityMetric[] = [
        {
          id: 'precision',
          name: 'Lead Precision',
          value: precision,
          target: 80,
          trend: 'stable',
          status: precision >= 80 ? 'good' : precision >= 60 ? 'warning' : 'poor',
          description: 'High-scoring leads that meet criteria'
        },
        {
          id: 'enrichment',
          name: 'Enrichment Coverage',
          value: enrichmentCoverage,
          target: 70,
          trend: 'stable',
          status: enrichmentCoverage >= 70 ? 'good' : enrichmentCoverage >= 50 ? 'warning' : 'poor',
          description: 'Leads with contact information'
        },
        {
          id: 'evidence',
          name: 'Evidence Quality',
          value: evidenceQuality,
          target: 95,
          trend: 'stable',
          status: evidenceQuality >= 95 ? 'good' : evidenceQuality >= 80 ? 'warning' : 'poor',
          description: 'Signals with supporting evidence'
        },
        {
          id: 'signal_accuracy',
          name: 'Signal Accuracy',
          value: signalAccuracy,
          target: 85,
          trend: 'stable',
          status: signalAccuracy >= 85 ? 'good' : signalAccuracy >= 70 ? 'warning' : 'poor',
          description: 'Correctly detected business signals'
        }
      ];

      const realFunnel: ConversionFunnel[] = [
        {
          stage: 'Leads Found',
          count: leadViews.length,
          rate: 100,
          icon: <Target className="w-4 h-4" />
        },
        {
          stage: 'High Quality',
          count: highQualityLeads.length,
          rate: precision,
          icon: <CheckCircle className="w-4 h-4" />
        },
        {
          stage: 'Qualified',
          count: qualifiedCount,
          rate: leadViews.length > 0 ? Math.round((qualifiedCount / leadViews.length) * 100) : 0,
          icon: <Zap className="w-4 h-4" />
        }
      ];

      setMetrics(realMetrics);
      setFunnel(realFunnel);
    } catch (error) {
      console.error('Error loading quality metrics:', error);
      setMetrics([]);
      setFunnel([]);
    } finally {
      setLoading(false);
    }
  };

  const getMetricStatus = (metric: QualityMetric) => {
    switch (metric.status) {
      case 'good':
        return { color: 'text-green-600', bg: 'bg-green-500/10', icon: CheckCircle };
      case 'warning':
        return { color: 'text-yellow-600', bg: 'bg-yellow-500/10', icon: AlertTriangle };
      case 'poor':
        return { color: 'text-red-600', bg: 'bg-red-500/10', icon: XCircle };
    }
  };

  const getTrendIcon = (trend: QualityMetric['trend']) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-3 h-3 text-green-600" />;
      case 'down':
        return <TrendingDown className="w-3 h-3 text-red-600" />;
      case 'stable':
        return <div className="w-3 h-3 rounded-full bg-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-8 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quality Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric) => {
          const status = getMetricStatus(metric);
          const StatusIcon = status.icon;
          
          return (
            <Card key={metric.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 ${status.bg} rounded-lg flex-shrink-0`}>
                    <StatusIcon className={`w-4 h-4 ${status.color}`} />
                  </div>
                  {getTrendIcon(metric.trend)}
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-medium text-sm">{metric.name}</h3>
                  <div className="flex items-end gap-1">
                    <span className="text-xl font-bold">{metric.value}</span>
                    <span className="text-xs text-muted-foreground">
                      {metric.id === 'response_time' ? 's' : '%'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-tight">{metric.description}</p>
                  
                  <div className="pt-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span>Progress</span>
                      <span>Target: {metric.target}{metric.id === 'response_time' ? 's' : '%'}</span>
                    </div>
                    <Progress 
                      value={metric.id === 'response_time' 
                        ? Math.min((metric.target / metric.value) * 100, 100)
                        : (metric.value / metric.target) * 100
                      } 
                      className="h-2" 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Conversion Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lead Conversion Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {funnel.map((stage, index) => (
              <div key={stage.stage} className="flex items-center gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    {stage.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{stage.stage}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{stage.count}</span>
                        <Badge variant="secondary" className="text-xs">
                          {stage.rate}%
                        </Badge>
                      </div>
                    </div>
                    <Progress value={stage.rate} className="h-2" />
                  </div>
                </div>
                {index < funnel.length - 1 && (
                  <div className="w-4 h-0.5 bg-border" />
                )}
              </div>
            ))}
          </div>
          
          {metrics.length > 0 && (
            <div className="mt-6 p-4 bg-muted/30 rounded-lg">
              <h4 className="font-medium mb-2">Optimization Opportunities</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                {metrics.find(m => m.id === 'signal_accuracy' && m.value < 85) && (
                  <li>• Review and correct signal detection errors to improve accuracy</li>
                )}
                {metrics.find(m => m.id === 'enrichment' && m.value < 70) && (
                  <li>• Focus on sources with better contact information coverage</li>
                )}
                {metrics.find(m => m.id === 'precision' && m.value < 80) && (
                  <li>• Refine search criteria to improve lead quality</li>
                )}
                {metrics.length === 0 && <li>• Run searches to generate optimization insights</li>}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}