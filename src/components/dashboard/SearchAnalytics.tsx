import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  Target, 
  Users, 
  MapPin, 
  Calendar,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';

interface SearchMetrics {
  totalSearches: number;
  totalLeadsFound: number;
  averageScore: number;
  topVertical: string;
  topLocation: string;
  conversionRate: number;
  qualifiedLeads: number;
  timeToFirstLead: number; // seconds
}

interface VerticalPerformance {
  vertical: string;
  searches: number;
  leads: number;
  avgScore: number;
  conversionRate: number;
}

interface LocationPerformance {
  location: string;
  searches: number;
  leads: number;
  avgScore: number;
}

export function SearchAnalytics() {
  const [metrics, setMetrics] = useState<SearchMetrics | null>(null);
  const [verticalData, setVerticalData] = useState<VerticalPerformance[]>([]);
  const [locationData, setLocationData] = useState<LocationPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      // Mock analytics data - in real implementation, this would come from Supabase
      const mockMetrics: SearchMetrics = {
        totalSearches: 24,
        totalLeadsFound: 486,
        averageScore: 73,
        topVertical: 'dentist',
        topLocation: 'Columbia, SC',
        conversionRate: 18.5,
        qualifiedLeads: 90,
        timeToFirstLead: 45
      };

      const mockVerticalData: VerticalPerformance[] = [
        { vertical: 'dentist', searches: 12, leads: 240, avgScore: 78, conversionRate: 22.5 },
        { vertical: 'law_firm', searches: 8, leads: 160, avgScore: 71, conversionRate: 15.6 },
        { vertical: 'contractor', searches: 4, leads: 86, avgScore: 69, conversionRate: 12.8 }
      ];

      const mockLocationData: LocationPerformance[] = [
        { location: 'Columbia, SC', searches: 8, leads: 160, avgScore: 76 },
        { location: 'Charleston, SC', searches: 6, leads: 120, avgScore: 74 },
        { location: 'Atlanta, GA', searches: 4, leads: 86, avgScore: 72 },
        { location: 'Dallas, TX', searches: 3, leads: 60, avgScore: 70 },
        { location: 'Charlotte, NC', searches: 3, leads: 60, avgScore: 68 }
      ];

      setMetrics(mockMetrics);
      setVerticalData(mockVerticalData);
      setLocationData(mockLocationData);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-8 bg-muted rounded w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{metrics.totalSearches}</p>
                <p className="text-sm text-muted-foreground">Total Searches</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{metrics.totalLeadsFound}</p>
                <p className="text-sm text-muted-foreground">Leads Found</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Target className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{metrics.averageScore}</p>
                <p className="text-sm text-muted-foreground">Avg Score</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{metrics.conversionRate}%</p>
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vertical Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PieChart className="w-4 h-4" />
              Performance by Vertical
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {verticalData.map((item) => (
              <div key={item.vertical} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="capitalize">
                      {item.vertical.replace('_', ' ')}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {item.leads} leads
                    </span>
                  </div>
                  <span className="text-sm font-medium">{item.conversionRate}%</span>
                </div>
                <Progress value={item.conversionRate} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Location Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Performance by Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {locationData.map((item) => (
              <div key={item.location} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{item.location}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.searches} searches • {item.leads} leads
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{item.avgScore}</p>
                  <p className="text-xs text-muted-foreground">avg score</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Performance Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">Top Performer</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Dentist searches in Columbia, SC have the highest conversion rate at 22.5%
              </p>
            </div>
            
            <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">Speed Benchmark</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Average time to first lead is {metrics.timeToFirstLead}s (target: &lt;60s)
              </p>
            </div>
            
            <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-700">Quality Score</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {metrics.qualifiedLeads} leads qualified out of {metrics.totalLeadsFound} found
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}