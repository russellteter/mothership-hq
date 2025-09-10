import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
      // Get real data from Supabase
      const { data: searchJobs, error } = await supabase
        .from('search_jobs')
        .select(`
          *,
          lead_views!inner(
            id,
            score,
            business:businesses!inner(
              vertical,
              address_json
            )
          )
        `)
        .eq('status', 'completed');

      if (error) throw error;

      if (!searchJobs || searchJobs.length === 0) {
        // No data yet - set empty metrics
        setMetrics({
          totalSearches: 0,
          totalLeadsFound: 0,
          averageScore: 0,
          topVertical: '',
          topLocation: '',
          conversionRate: 0,
          qualifiedLeads: 0,
          timeToFirstLead: 0
        });
        setVerticalData([]);
        setLocationData([]);
        return;
      }

      // Calculate real metrics from actual data
      const totalSearches = searchJobs.length;
      const totalLeadsFound = searchJobs.reduce((sum, job) => sum + (job.lead_views?.length || 0), 0);
      
      const allLeadViews = searchJobs.flatMap(job => job.lead_views || []);
      const averageScore = allLeadViews.length > 0 
        ? Math.round(allLeadViews.reduce((sum, lv) => sum + (lv.score || 0), 0) / allLeadViews.length)
        : 0;

      // Get qualified leads count from status_logs
      const { data: qualifiedData } = await supabase
        .from('status_logs')
        .select('business_id')
        .eq('status', 'qualified');
      
      const qualifiedLeads = qualifiedData?.length || 0;
      const conversionRate = totalLeadsFound > 0 ? Math.round((qualifiedLeads / totalLeadsFound) * 100 * 10) / 10 : 0;

      // Calculate vertical performance
      const verticalStats = new Map<string, {searches: number, leads: number, scores: number[]}>();
      searchJobs.forEach(job => {
        job.lead_views?.forEach(lv => {
          const vertical = (lv.business as any)?.vertical || 'unknown';
          if (!verticalStats.has(vertical)) {
            verticalStats.set(vertical, {searches: 0, leads: 0, scores: []});
          }
          const stats = verticalStats.get(vertical)!;
          stats.leads++;
          if (lv.score) stats.scores.push(lv.score);
        });
      });

      const verticalData: VerticalPerformance[] = Array.from(verticalStats.entries())
        .map(([vertical, stats]) => ({
          vertical,
          searches: stats.searches,
          leads: stats.leads,
          avgScore: stats.scores.length > 0 ? Math.round(stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length) : 0,
          conversionRate: 0 // Would need to join with status_logs for actual conversion
        }))
        .filter(v => v.leads > 0)
        .sort((a, b) => b.leads - a.leads)
        .slice(0, 5);

      // Calculate location performance
      const locationStats = new Map<string, {searches: number, leads: number, scores: number[]}>();
      searchJobs.forEach(job => {
        const dsl = job.dsl_json as any;
        const location = dsl?.geo ? `${dsl.geo.city}, ${dsl.geo.state}` : 'Unknown';
        if (!locationStats.has(location)) {
          locationStats.set(location, {searches: 1, leads: 0, scores: []});
        }
        const stats = locationStats.get(location)!;
        job.lead_views?.forEach(lv => {
          stats.leads++;
          if (lv.score) stats.scores.push(lv.score);
        });
      });

      const locationData: LocationPerformance[] = Array.from(locationStats.entries())
        .map(([location, stats]) => ({
          location,
          searches: stats.searches,
          leads: stats.leads,
          avgScore: stats.scores.length > 0 ? Math.round(stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length) : 0
        }))
        .filter(l => l.leads > 0)
        .sort((a, b) => b.leads - a.leads)
        .slice(0, 5);

      const topVertical = verticalData[0]?.vertical || '';
      const topLocation = locationData[0]?.location || '';

      setMetrics({
        totalSearches,
        totalLeadsFound,
        averageScore,
        topVertical,
        topLocation,
        conversionRate,
        qualifiedLeads,
        timeToFirstLead: 0 // Would need timestamp tracking for actual calculation
      });
      setVerticalData(verticalData);
      setLocationData(locationData);
    } catch (error) {
      console.error('Error loading analytics:', error);
      // Set empty state on error
      setMetrics({
        totalSearches: 0,
        totalLeadsFound: 0,
        averageScore: 0,
        topVertical: '',
        topLocation: '',
        conversionRate: 0,
        qualifiedLeads: 0,
        timeToFirstLead: 0
      });
      setVerticalData([]);
      setLocationData([]);
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
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                <Activity className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xl font-bold truncate">{metrics.totalSearches}</p>
                <p className="text-xs text-muted-foreground truncate">Total Searches</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg flex-shrink-0">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xl font-bold truncate">{metrics.totalLeadsFound}</p>
                <p className="text-xs text-muted-foreground truncate">Leads Found</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg flex-shrink-0">
                <Target className="w-4 h-4 text-green-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xl font-bold truncate">{metrics.averageScore}</p>
                <p className="text-xs text-muted-foreground truncate">Avg Score</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg flex-shrink-0">
                <TrendingUp className="w-4 h-4 text-yellow-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xl font-bold truncate">{metrics.conversionRate}%</p>
                <p className="text-xs text-muted-foreground truncate">Conversion Rate</p>
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
                {metrics.topVertical && metrics.topLocation 
                  ? `${metrics.topVertical} searches in ${metrics.topLocation} show strong performance`
                  : 'Run more searches to see performance insights'
                }
              </p>
            </div>
            
            <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">Speed Benchmark</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {metrics.totalSearches > 0 
                  ? `Performance tracking enabled for ${metrics.totalSearches} searches`
                  : 'Run searches to track performance metrics'
                }
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