import React, { useState, useEffect } from 'react';
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
      // Mock quality tracking data
      const mockMetrics: QualityMetric[] = [
        {
          id: 'precision',
          name: 'Lead Precision',
          value: 82,
          target: 80,
          trend: 'up',
          status: 'good',
          description: 'Percentage of leads that meet search criteria'
        },
        {
          id: 'enrichment',
          name: 'Enrichment Coverage',
          value: 73,
          target: 70,
          trend: 'stable',
          status: 'good',
          description: 'Leads with owner contact information'
        },
        {
          id: 'evidence',
          name: 'Evidence Quality',
          value: 96,
          target: 95,
          trend: 'up',
          status: 'good',
          description: 'Signals with supporting evidence'
        },
        {
          id: 'response_time',
          name: 'Response Time',
          value: 45,
          target: 120,
          trend: 'up',
          status: 'good',
          description: 'Seconds to first 20 leads'
        },
        {
          id: 'signal_accuracy',
          name: 'Signal Accuracy',
          value: 89,
          target: 85,
          trend: 'down',
          status: 'warning',
          description: 'Correctly detected business signals'
        }
      ];

      const mockFunnel: ConversionFunnel[] = [
        {
          stage: 'Leads Found',
          count: 486,
          rate: 100,
          icon: <Target className="w-4 h-4" />
        },
        {
          stage: 'High Quality',
          count: 398,
          rate: 82,
          icon: <CheckCircle className="w-4 h-4" />
        },
        {
          stage: 'Qualified',
          count: 90,
          rate: 18.5,
          icon: <Zap className="w-4 h-4" />
        },
        {
          stage: 'Contacted',
          count: 34,
          rate: 7.0,
          icon: <Clock className="w-4 h-4" />
        }
      ];

      setMetrics(mockMetrics);
      setFunnel(mockFunnel);
    } catch (error) {
      console.error('Error loading quality metrics:', error);
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
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-2 ${status.bg} rounded-lg`}>
                    <StatusIcon className={`w-5 h-5 ${status.color}`} />
                  </div>
                  {getTrendIcon(metric.trend)}
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-semibold">{metric.name}</h3>
                  <div className="flex items-end gap-1">
                    <span className="text-2xl font-bold">{metric.value}</span>
                    <span className="text-sm text-muted-foreground">
                      {metric.id === 'response_time' ? 's' : '%'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{metric.description}</p>
                  
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
          
          <div className="mt-6 p-4 bg-muted/30 rounded-lg">
            <h4 className="font-medium mb-2">Optimization Opportunities</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Improve signal accuracy to reduce false positives</li>
              <li>• Focus on verticals with higher qualification rates</li>
              <li>• Enhance owner identification for better reachability</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}