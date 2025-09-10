import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Lead } from '@/types/lead';

export interface WebsiteAnalysis {
  summary: string;
  services: string[];
  pricingIndicators: string[];
  painPoints: string[];
  opportunities: string[];
  businessType: string;
  targetMarket: string;
  competitiveAdvantages: string[];
  contactMethods: string[];
  socialPresence: string[];
}

export function useWebsiteAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<WebsiteAnalysis | null>(null);

  const analyzeWebsite = async (lead: Lead): Promise<WebsiteAnalysis | null> => {
    if (!lead.website) {
      return null;
    }

    setIsAnalyzing(true);
    setAnalysis(null);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-website', {
        body: {
          website: lead.website,
          businessName: lead.name,
          businessLocation: `${lead.city}, ${lead.state}`,
          businessId: lead.business.id
        }
      });

      if (error) {
        console.error('Website Analysis error:', error);
        throw error;
      }

      const websiteAnalysis = data.analysis as WebsiteAnalysis;
      setAnalysis(websiteAnalysis);
      
      // Store the analysis in artifacts table for future reference
      await supabase.from('artifacts').insert({
        business_id: lead.business.id,
        type: 'website_analysis',
        uri: `website_analysis_${lead.business.id}_${Date.now()}`,
        metadata_json: websiteAnalysis as any
      });

      return websiteAnalysis;
    } catch (error) {
      console.error('Error analyzing website:', error);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearAnalysis = () => {
    setAnalysis(null);
  };

  return {
    isAnalyzing,
    analysis,
    analyzeWebsite,
    clearAnalysis
  };
}