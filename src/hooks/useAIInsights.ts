import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Lead } from '@/types/lead';

export interface AIInsight {
  summary: string;
  outreachSuggestion: string;
  businessAnalysis: string;
  opportunityScore: number;
  keyInsights: string[];
  recommendations: string[];
}

export function useAIInsights() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [insights, setInsights] = useState<AIInsight | null>(null);

  const generateInsights = async (lead: Lead): Promise<AIInsight | null> => {
    setIsGenerating(true);
    setInsights(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-lead-insights', {
        body: {
          lead: {
            name: lead.name,
            city: lead.city,
            state: lead.state,
            website: lead.website,
            phone: lead.phone,
            signals: lead.signals,
            people: lead.people,
            business: lead.business,
            score: lead.score
          }
        }
      });

      if (error) {
        console.error('AI Insights error:', error);
        throw error;
      }

      const insight = data.insights as AIInsight;
      setInsights(insight);
      
      // Store the insight in artifacts table for future reference
      await supabase.from('artifacts').insert({
        business_id: lead.business.id,
        type: 'ai_insights',
        uri: `ai_insights_${lead.business.id}_${Date.now()}`,
        metadata_json: insight as any
      });

      return insight;
    } catch (error) {
      console.error('Error generating AI insights:', error);
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const clearInsights = () => {
    setInsights(null);
  };

  return {
    isGenerating,
    insights,
    generateInsights,
    clearInsights
  };
}