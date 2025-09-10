import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  TrendingUp,
  Calendar,
  ArrowRight,
  Eye,
  BarChart3,
  Target
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SearchJob } from '@/types/lead';
import { useAuth } from '@/hooks/useAuth';
import { SearchAnalytics } from './SearchAnalytics';
import { LeadQualityTracker } from './LeadQualityTracker';

interface DashboardStats {
  totalLeads: number;
  qualifiedLeads: number;
  ignoredLeads: number;
  newLeads: number;
  totalSearches: number;
  recentSearches: SearchJob[];
}

interface DashboardHomeProps {
  onViewSearch: (searchJob: SearchJob) => void;
  onStartNewSearch: () => void;
}

export function DashboardHome({ onViewSearch, onStartNewSearch }: DashboardHomeProps) {
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    qualifiedLeads: 0,
    ignoredLeads: 0,
    newLeads: 0,
    totalSearches: 0,
    recentSearches: []
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadDashboardStats();
    }
  }, [user]);

  const loadDashboardStats = async () => {
    try {
      // Get search jobs
      const { data: searchJobs } = await supabase
        .from('search_jobs')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (!searchJobs) return;

      // Get lead views for completed searches
      const completedSearchIds = searchJobs
        .filter(job => job.status === 'completed')
        .map(job => job.id);

      const { data: leadViews } = await supabase
        .from('lead_views')
        .select('business_id, search_job_id')
        .in('search_job_id', completedSearchIds);

      // Get status logs to count lead statuses
      const businessIds = leadViews?.map(lv => lv.business_id) || [];
      
      const { data: statusLogs } = await supabase
        .from('status_logs')
        .select('business_id, status')
        .in('business_id', businessIds)
        .order('changed_at', { ascending: false });

      // Calculate stats
      const totalLeads = leadViews?.length || 0;
      const latestStatuses = new Map();
      
      statusLogs?.forEach(log => {
        if (!latestStatuses.has(log.business_id)) {
          latestStatuses.set(log.business_id, log.status);
        }
      });

      const qualifiedCount = Array.from(latestStatuses.values()).filter(status => status === 'qualified').length;
      const ignoredCount = Array.from(latestStatuses.values()).filter(status => status === 'ignored').length;
      const newCount = totalLeads - qualifiedCount - ignoredCount;

      setStats({
        totalLeads,
        qualifiedLeads: qualifiedCount,
        ignoredLeads: ignoredCount,
        newLeads: newCount,
        totalSearches: searchJobs.length,
        recentSearches: searchJobs.slice(0, 5) as any
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSearchDescription = (searchJob: SearchJob) => {
    const dsl = searchJob.dsl_json;
    return `${dsl.vertical} in ${dsl.geo.city}, ${dsl.geo.state}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'running': return 'warning';
      case 'failed': return 'destructive';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
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
    <div className="p-6 space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Your lead generation overview</p>
        </div>
        <Button onClick={onStartNewSearch} className="shadow-sm hover:shadow-md transition-all duration-200">
          <Search className="w-4 h-4 mr-2" />
          New Search
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border border-border/50 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Leads</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-foreground">{stats.totalLeads}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {stats.totalSearches} searches
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/50 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Qualified</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-success" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-success">{stats.qualifiedLeads}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalLeads > 0 ? Math.round((stats.qualifiedLeads / stats.totalLeads) * 100) : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/50 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">New Leads</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center">
              <Clock className="h-4 w-4 text-warning" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-warning">{stats.newLeads}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Awaiting review
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/50 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ignored</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-muted/20 flex items-center justify-center">
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-muted-foreground">{stats.ignoredLeads}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Not a good fit
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SearchAnalytics />
        <LeadQualityTracker />
      </div>

      {/* Recent Activity */}
      <Tabs defaultValue="searches" className="w-full">
        <TabsList>
          <TabsTrigger value="searches">Recent Searches</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="quality">Quality Metrics</TabsTrigger>
          <TabsTrigger value="activity">Lead Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="searches" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Search History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.recentSearches.length > 0 ? (
                <div className="space-y-3">
                  {stats.recentSearches.map((search) => (
                    <div key={search.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:shadow-md transition-shadow">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{getSearchDescription(search)}</h4>
                          <Badge variant={getStatusColor(search.status)}>
                            {search.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(search.created_at).toLocaleDateString()}
                          </div>
                          {search.summary_stats && (
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {search.summary_stats.total_found || 0} leads found
                            </div>
                          )}
                        </div>
                      </div>
                      {search.status === 'completed' && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => onViewSearch(search)}
                          className="ml-2"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                          <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">No searches yet</p>
                  <p className="text-sm">Start your first lead search to see results here</p>
                  <Button onClick={onStartNewSearch} className="mt-4">
                    Start Searching
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <SearchAnalytics />
        </TabsContent>

        <TabsContent value="quality" className="space-y-4">
          <LeadQualityTracker />
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Lead Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Lead activity tracking coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}