import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, TrendingUp, Target, MapPin } from 'lucide-react';

interface SearchSuggestion {
  id: string;
  prompt: string;
  category: 'trending' | 'similar' | 'optimization' | 'geographic';
  reason: string;
  confidence: number;
}

interface SearchSuggestionsProps {
  currentPrompt?: string;
  onSuggestionSelect: (prompt: string) => void;
  isVisible: boolean;
}

export function SearchSuggestions({ currentPrompt, onSuggestionSelect, isVisible }: SearchSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentPrompt && isVisible) {
      generateSuggestions(currentPrompt);
    }
  }, [currentPrompt, isVisible]);

  const generateSuggestions = async (prompt: string) => {
    setLoading(true);
    try {
      // Parse prompt to identify key components
      const promptLower = prompt.toLowerCase();
      const hasLocation = /\b(in|near|around)\s+[\w\s,]+/i.test(prompt);
      const hasBusiness = /\b(restaurant|dental|medical|retail|salon|gym|spa|clinic|office|shop|store)/i.test(prompt);
      const hasOwner = /\b(owner|contact|email|phone)\b/i.test(prompt);
      const hasWebsite = /\b(website|online|digital|web)\b/i.test(prompt);
      const hasReviews = /\b(review|rating|reputation)\b/i.test(prompt);
      
      const dynamicSuggestions: SearchSuggestion[] = [];
      
      // Geographic expansion suggestions
      if (hasLocation) {
        const location = prompt.match(/(?:in|near|around)\s+([\w\s,]+?)(?:\s+with|\s+that|\s+who|$)/i)?.[1];
        if (location) {
          dynamicSuggestions.push({
            id: `geo-1`,
            prompt: prompt.replace(location, 'nearby metropolitan areas'),
            category: 'geographic',
            reason: 'Expand search to surrounding markets for more opportunities',
            confidence: 0.82
          });
        }
      }
      
      // Optimization suggestions based on missing criteria
      if (!hasOwner) {
        dynamicSuggestions.push({
          id: 'opt-1',
          prompt: prompt + ' with verified owner contact information',
          category: 'optimization',
          reason: 'Leads with owner info have 3x higher conversion rates',
          confidence: 0.95
        });
      }
      
      if (!hasWebsite) {
        dynamicSuggestions.push({
          id: 'opt-2',
          prompt: prompt + ' lacking professional website',
          category: 'optimization',
          reason: 'Businesses without websites are prime candidates for digital services',
          confidence: 0.88
        });
      }
      
      if (!hasReviews) {
        dynamicSuggestions.push({
          id: 'opt-3',
          prompt: prompt + ' with less than 10 online reviews',
          category: 'optimization',
          reason: 'Low review count indicates opportunity for reputation management',
          confidence: 0.86
        });
      }
      
      // Industry-specific suggestions
      if (hasBusiness) {
        const businessType = prompt.match(/\b(restaurant|dental|medical|retail|salon|gym|spa|clinic|office|shop|store)/i)?.[1];
        if (businessType) {
          // Similar business types
          const similarTypes: Record<string, string[]> = {
            'restaurant': ['cafe', 'bakery', 'food truck', 'catering service'],
            'dental': ['orthodontist', 'oral surgeon', 'pediatric dentist'],
            'medical': ['urgent care', 'specialist clinic', 'wellness center'],
            'retail': ['boutique', 'specialty store', 'online retailer'],
            'salon': ['spa', 'barbershop', 'nail salon', 'beauty studio'],
            'gym': ['fitness studio', 'yoga studio', 'martial arts', 'personal training']
          };
          
          const similar = similarTypes[businessType.toLowerCase()]?.[0];
          if (similar) {
            dynamicSuggestions.push({
              id: 'sim-1',
              prompt: prompt.replace(new RegExp(businessType, 'i'), similar),
              category: 'similar',
              reason: `${similar} businesses have similar needs and pain points`,
              confidence: 0.79
            });
          }
        }
      }
      
      // Trending patterns
      dynamicSuggestions.push({
        id: 'trend-1',
        prompt: promptLower.includes('small') ? prompt : `Small ${prompt}`,
        category: 'trending',
        reason: 'Small businesses (1-10 employees) show highest engagement rates',
        confidence: 0.91
      });
      
      if (!promptLower.includes('new') && !promptLower.includes('recently')) {
        dynamicSuggestions.push({
          id: 'trend-2',
          prompt: 'Recently opened ' + prompt.replace(/^(find|search for|get)\s+/i, ''),
          category: 'trending',
          reason: 'New businesses are 2x more likely to need services',
          confidence: 0.87
        });
      }
      
      // Filter out suggestions that are too similar to current prompt
      const filteredSuggestions = dynamicSuggestions
        .filter(s => s.prompt.toLowerCase() !== prompt.toLowerCase())
        .slice(0, 6); // Limit to 6 suggestions
      
      setSuggestions(filteredSuggestions);
    } catch (error) {
      console.error('Error generating suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: SearchSuggestion['category']) => {
    switch (category) {
      case 'trending': return <TrendingUp className="w-3 h-3" />;
      case 'similar': return <Target className="w-3 h-3" />;
      case 'optimization': return <Lightbulb className="w-3 h-3" />;
      case 'geographic': return <MapPin className="w-3 h-3" />;
    }
  };

  const getCategoryColor = (category: SearchSuggestion['category']) => {
    switch (category) {
      case 'trending': return 'bg-blue-500/10 text-blue-700 border-blue-200';
      case 'similar': return 'bg-green-500/10 text-green-700 border-green-200';
      case 'optimization': return 'bg-yellow-500/10 text-yellow-700 border-yellow-200';
      case 'geographic': return 'bg-purple-500/10 text-purple-700 border-purple-200';
    }
  };

  if (!isVisible || !currentPrompt) return null;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-primary" />
          AI Search Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="group p-3 rounded-lg border border-border hover:border-primary/20 cursor-pointer transition-colors"
              onClick={() => onSuggestionSelect(suggestion.prompt)}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${getCategoryColor(suggestion.category)}`}
                >
                  {getCategoryIcon(suggestion.category)}
                  {suggestion.category}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {Math.round(suggestion.confidence * 100)}% match
                </span>
              </div>
              <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                {suggestion.prompt}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {suggestion.reason}
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}