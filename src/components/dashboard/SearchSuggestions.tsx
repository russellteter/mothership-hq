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
      // Simulate AI-powered suggestions based on prompt analysis
      const mockSuggestions: SearchSuggestion[] = [
        {
          id: '1',
          prompt: prompt.replace('Columbia, SC', 'Charleston, SC'),
          category: 'geographic',
          reason: 'Similar market with higher lead density',
          confidence: 0.85
        },
        {
          id: '2',
          prompt: prompt + ' with owner identified',
          category: 'optimization',
          reason: 'Adding owner identification improves reachability by 40%',
          confidence: 0.92
        },
        {
          id: '3',
          prompt: prompt.replace('dentists', 'orthodontists'),
          category: 'similar',
          reason: 'Adjacent vertical with similar pain points',
          confidence: 0.78
        },
        {
          id: '4',
          prompt: 'Small dental practices in ' + (prompt.match(/in ([^,]+)/)?.[1] || 'Columbia') + ' with no online reviews',
          category: 'trending',
          reason: 'High-converting pattern from recent searches',
          confidence: 0.88
        }
      ];

      // Filter out suggestions that are too similar to current prompt
      const filteredSuggestions = mockSuggestions.filter(s => 
        s.prompt.toLowerCase() !== prompt.toLowerCase()
      );

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