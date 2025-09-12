import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ScoringWeights {
  ICP: number;
  Pain: number;
  Reachability: number;
  ComplianceRisk: number;
}

export interface ScoringProfile {
  id: string;
  name: string;
  description: string;
  weights: ScoringWeights;
  vertical?: string;
  isDefault: boolean;
}

export const DEFAULT_PROFILES: ScoringProfile[] = [
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

export function useScoring() {
  const [currentProfile, setCurrentProfile] = useState<string>('generic');
  const [customWeights, setCustomWeights] = useState<ScoringWeights>(DEFAULT_PROFILES[0].weights);
  const [isRescoring, setIsRescoring] = useState(false);
  const { toast } = useToast();

  const getActiveProfile = useCallback(() => {
    return DEFAULT_PROFILES.find(p => p.id === currentProfile) || DEFAULT_PROFILES[0];
  }, [currentProfile]);

  const getActiveWeights = useCallback(() => {
    return customWeights;
  }, [customWeights]);

  const updateProfile = useCallback((profileId: string) => {
    const profile = DEFAULT_PROFILES.find(p => p.id === profileId);
    if (profile) {
      setCurrentProfile(profileId);
      setCustomWeights(profile.weights);
    }
  }, []);

  const updateWeights = useCallback((weights: ScoringWeights) => {
    setCustomWeights(weights);
  }, []);

  const rescoreLeads = useCallback(async (searchJobId: string): Promise<boolean> => {
    setIsRescoring(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to re-score leads.",
          variant: "destructive"
        });
        return false;
      }

      const { data, error } = await supabase.functions.invoke('rescore-leads', {
        body: { 
          searchJobId,
          weights: customWeights
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        console.error('Re-scoring error:', error);
        toast({
          title: "Re-scoring Failed",
          description: "Failed to update lead scores. Please try again.",
          variant: "destructive"
        });
        return false;
      }

      toast({
        title: "Leads Re-scored",
        description: `Successfully updated scores for ${data.updated} leads`,
        variant: "default"
      });

      return true;

    } catch (error) {
      console.error('Error re-scoring leads:', error);
      toast({
        title: "Re-scoring Error",
        description: "An unexpected error occurred while re-scoring leads.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsRescoring(false);
    }
  }, [customWeights, toast]);

  const explainScore = useCallback((leadSignals: any[], leadScore: number) => {
    const explanations: string[] = [];
    
    // Calculate what contributed to the score
    let icpScore = 25; // Base score
    let painScore = 0;
    let reachabilityScore = 0;
    let complianceRisk = 5;

    leadSignals.forEach(signal => {
      switch (signal.type) {
        case 'no_website':
          if (signal.value_json === true) {
            painScore += 15;
            explanations.push('No website detected (+15 Pain points)');
          }
          break;
        case 'has_chatbot':
          if (signal.value_json === false) {
            painScore += 10;
            explanations.push('No chatbot/live chat (+10 Pain points)');
          }
          break;
        case 'has_online_booking':
          if (signal.value_json === false) {
            painScore += 10;
            explanations.push('No online booking system (+10 Pain points)');
          }
          break;
        case 'owner_identified':
          if (signal.value_json === true) {
            reachabilityScore += 15;
            explanations.push('Owner contact identified (+15 Reachability points)');
          }
          break;
        case 'franchise_guess':
          if (signal.value_json === false) {
            icpScore += 10;
            explanations.push('Independent business (not franchise) (+10 ICP points)');
          }
          break;
      }
    });

    // Apply current weights
    const weightedIcp = Math.round((icpScore * customWeights.ICP) / 100);
    const weightedPain = Math.round((painScore * customWeights.Pain) / 100);
    const weightedReachability = Math.round((reachabilityScore * customWeights.Reachability) / 100);
    const weightedRisk = Math.round((complianceRisk * customWeights.ComplianceRisk) / 100);

    return {
      totalScore: leadScore,
      breakdown: {
        ICP: weightedIcp,
        Pain: weightedPain,
        Reachability: weightedReachability,
        ComplianceRisk: weightedRisk
      },
      explanations: [
        ...explanations,
        `ICP Score: ${icpScore} raw × ${customWeights.ICP}% weight = ${weightedIcp}`,
        `Pain Score: ${painScore} raw × ${customWeights.Pain}% weight = ${weightedPain}`,
        `Reachability Score: ${reachabilityScore} raw × ${customWeights.Reachability}% weight = ${weightedReachability}`,
        `Compliance Risk: ${complianceRisk} raw × ${customWeights.ComplianceRisk}% weight = -${weightedRisk}`
      ]
    };
  }, [customWeights]);

  return {
    currentProfile,
    customWeights,
    isRescoring,
    profiles: DEFAULT_PROFILES,
    getActiveProfile,
    getActiveWeights,
    updateProfile,
    updateWeights,
    rescoreLeads,
    explainScore
  };
}