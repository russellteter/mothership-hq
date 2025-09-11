import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { 
  Brain, 
  Target, 
  TrendingUp, 
  Users, 
  AlertTriangle,
  RotateCcw,
  Save,
  Settings,
  RefreshCw
} from 'lucide-react';
import { useScoring } from '@/hooks/useScoring';

interface ScoringWeights {
  ICP: number;          // Ideal Customer Profile (location, vertical, size)
  Pain: number;         // Pain signals (no website, no chat, etc.)
  Reachability: number; // Owner identified, contact info available
  ComplianceRisk: number; // Regulatory or compliance concerns
}

interface ScoringProfile {
  id: string;
  name: string;
  description: string;
  weights: ScoringWeights;
  vertical?: string;
  isDefault: boolean;
}

const DEFAULT_PROFILES: ScoringProfile[] = [
  {
    id: 'generic',
    name: 'Generic',
    description: 'Balanced scoring for all business types',
    weights: { ICP: 35, Pain: 35, Reachability: 20, ComplianceRisk: 10 },
    isDefault: true
  },
  {
    id: 'dentist-intake',
    name: 'Dental Practice - Patient Intake',
    description: 'Optimized for dental practices needing better patient intake systems',
    weights: { ICP: 40, Pain: 30, Reachability: 25, ComplianceRisk: 5 },
    vertical: 'dentist',
    isDefault: false
  },
  {
    id: 'contractor-quote',
    name: 'Contractor - Quote Automation',
    description: 'Focus on contractors who need automated quoting systems',
    weights: { ICP: 30, Pain: 45, Reachability: 20, ComplianceRisk: 5 },
    vertical: 'contractor',
    isDefault: false
  },
  {
    id: 'law-compliance',
    name: 'Law Firm - Compliance Focused',
    description: 'Law firms with emphasis on compliance and professional standards',
    weights: { ICP: 25, Pain: 25, Reachability: 25, ComplianceRisk: 25 },
    vertical: 'law_firm',
    isDefault: false
  },
  {
    id: 'high-reachability',
    name: 'High Reachability',
    description: 'Prioritize leads where owner contact information is available',
    weights: { ICP: 20, Pain: 30, Reachability: 45, ComplianceRisk: 5 },
    isDefault: false
  }
];

interface LeadScoringProfilesProps {
  searchJobId?: string;
  onScoreUpdate?: () => void;
}

export function LeadScoringProfiles({ 
  searchJobId,
  onScoreUpdate
}: LeadScoringProfilesProps) {
  const {
    currentProfile,
    customWeights,
    isRescoring,
    profiles,
    getActiveProfile,
    updateProfile,
    updateWeights,
    rescoreLeads
  } = useScoring();
  
  const [isCustomizing, setIsCustomizing] = useState(false);
  const activeProfile = getActiveProfile();

  const handleProfileSelect = (profileId: string) => {
    updateProfile(profileId);
  };

  const handleWeightChange = (factor: keyof ScoringWeights, value: number) => {
    const newWeights = { ...customWeights, [factor]: value };
    
    // Ensure weights always sum to 100
    const total = Object.values(newWeights).reduce((sum, w) => sum + w, 0);
    if (total !== 100) {
      // Proportionally adjust other weights
      const otherFactors = Object.keys(newWeights).filter(k => k !== factor) as (keyof ScoringWeights)[];
      const remaining = 100 - value;
      const currentOtherTotal = otherFactors.reduce((sum, k) => sum + newWeights[k], 0);
      
      if (currentOtherTotal > 0) {
        otherFactors.forEach(k => {
          newWeights[k] = Math.round((newWeights[k] / currentOtherTotal) * remaining);
        });
      }
    }
    
    updateWeights(newWeights);
  };

  const resetToProfile = () => {
    updateWeights(activeProfile.weights);
  };

  const handleRescoreLeads = async () => {
    if (!searchJobId) return;
    
    const success = await rescoreLeads(searchJobId);
    if (success && onScoreUpdate) {
      onScoreUpdate();
    }
  };

  const getWeightColor = (weight: number) => {
    if (weight >= 40) return 'text-success';
    if (weight >= 25) return 'text-warning';
    return 'text-muted-foreground';
  };

  const getFactorIcon = (factor: keyof ScoringWeights) => {
    switch (factor) {
      case 'ICP': return <Target className="h-4 w-4" />;
      case 'Pain': return <AlertTriangle className="h-4 w-4" />;
      case 'Reachability': return <Users className="h-4 w-4" />;
      case 'ComplianceRisk': return <Brain className="h-4 w-4" />;
    }
  };

  const getFactorDescription = (factor: keyof ScoringWeights) => {
    switch (factor) {
      case 'ICP': return 'Geography, vertical, business size match';
      case 'Pain': return 'Missing website, chat, booking systems';
      case 'Reachability': return 'Owner identified, contact info available';
      case 'ComplianceRisk': return 'Regulatory and compliance considerations';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Lead Scoring Profile
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCustomizing(!isCustomizing)}
            >
              <Settings className="h-4 w-4 mr-1" />
              {isCustomizing ? 'Done' : 'Customize'}
            </Button>
            {searchJobId && (
              <Button
                variant="default"
                size="sm"
                onClick={handleRescoreLeads}
                disabled={isRescoring}
              >
                {isRescoring ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                    Re-scoring...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Re-score Leads
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Profile Selection */}
        <div>
          <label className="text-sm font-medium mb-2 block">Scoring Profile</label>
          <Select value={currentProfile} onValueChange={handleProfileSelect}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {profiles.map((profile) => (
                <SelectItem key={profile.id} value={profile.id}>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      {profile.name}
                      {profile.isDefault && (
                        <Badge variant="secondary" className="text-xs">Default</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {profile.description}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Current Profile Info */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium">{activeProfile.name}</h4>
            {activeProfile.vertical && (
              <Badge variant="outline" className="text-xs">
                {activeProfile.vertical.replace('_', ' ')}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{activeProfile.description}</p>
        </div>

        {/* Weight Visualization */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Scoring Weights</h4>
            <div className="text-xs text-muted-foreground">
              Total: {Object.values(customWeights).reduce((sum, w) => sum + w, 0)}%
            </div>
          </div>
          
          {(Object.entries(customWeights) as [keyof ScoringWeights, number][]).map(([factor, weight]) => (
            <div key={factor} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getFactorIcon(factor)}
                  <span className="text-sm font-medium">{factor}</span>
                  <span className={`text-sm font-semibold ${getWeightColor(weight)}`}>
                    {weight}%
                  </span>
                </div>
                {isCustomizing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetToProfile}
                    className="text-xs"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                )}
              </div>
              
              {isCustomizing ? (
                <div className="px-2">
                  <Slider
                    value={[weight]}
                    onValueChange={(value) => handleWeightChange(factor, value[0])}
                    max={60}
                    min={0}
                    step={5}
                    className="w-full"
                  />
                </div>
              ) : (
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary rounded-full h-2 transition-all duration-300"
                    style={{ width: `${(weight / 60) * 100}%` }}
                  />
                </div>
              )}
              
              <p className="text-xs text-muted-foreground">
                {getFactorDescription(factor)}
              </p>
            </div>
          ))}
        </div>

        {/* Profile Performance Hint */}
        <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
          <div className="flex items-start gap-2">
            <TrendingUp className="h-4 w-4 text-primary mt-0.5" />
            <div>
              <h5 className="text-sm font-medium text-primary">Profile Tip</h5>
              <p className="text-xs text-primary/80 mt-1">
                {activeProfile.id === 'dentist-intake' && 
                  "This profile works best for dental practices struggling with patient intake and scheduling."
                }
                {activeProfile.id === 'contractor-quote' && 
                  "Optimized for contractors who lose deals due to slow quoting processes."
                }
                {activeProfile.id === 'law-compliance' && 
                  "Balances business opportunity with regulatory compliance requirements."
                }
                {activeProfile.id === 'high-reachability' && 
                  "Use when you need leads you can contact immediately."
                }
                {activeProfile.id === 'generic' && 
                  "A balanced approach suitable for exploring new markets or verticals."
                }
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}