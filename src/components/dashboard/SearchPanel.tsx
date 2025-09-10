import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Search, Sparkles } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

interface SearchPanelProps {
  onSearch: (prompt: string) => void;
  isSearching: boolean;
}

const PROMPT_EXAMPLES = [
  "Dentists in Columbia, SC with no chat widget",
  "Law firms in Charleston without online booking",
  "HVAC contractors in Atlanta with owner identified",
  "Roofing companies in Dallas with no website"
];

export function SearchPanel({ onSearch, isSearching }: SearchPanelProps) {
  const [prompt, setPrompt] = useState('');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const debouncedPrompt = useDebounce(prompt, 300);
  
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (debouncedPrompt.trim() && !isSubmitting && !isSearching) {
      setIsSubmitting(true);
      try {
        await onSearch(debouncedPrompt);
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [debouncedPrompt, onSearch, isSubmitting, isSearching]);

  const handleExampleClick = useCallback((example: string) => {
    if (!isSearching && !isSubmitting) {
      setPrompt(example);
    }
  }, [isSearching, isSubmitting]);

  return (
    <div className="w-80 h-full bg-card border-r border-border flex flex-col">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-glow rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <h1 className="text-lg font-semibold">Mothership Leads</h1>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Describe your ideal leads
            </label>
            <div className="relative">
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., dentists in Columbia, SC with no chat widget"
                className="pr-10"
                disabled={isSearching || isSubmitting}
              />
              <Search className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground" />
            </div>
          </div>
          
          <Button 
            type="submit" 
            disabled={!debouncedPrompt.trim() || isSearching || isSubmitting}
            className="w-full"
            variant="default"
          >
            {isSearching || isSubmitting ? 'Searching...' : 'Find Leads'}
          </Button>
        </form>
      </div>

      <div className="p-6 space-y-4">
        <div>
          <h3 className="text-sm font-medium mb-3">Example searches</h3>
          <div className="space-y-2">
            {PROMPT_EXAMPLES.map((example, index) => (
              <Badge
                key={index}
                variant="secondary"
                className={`cursor-pointer hover:bg-secondary/80 text-left justify-start w-full p-2 h-auto whitespace-normal ${
                  isSearching || isSubmitting ? 'opacity-50 pointer-events-none' : ''
                }`}
                onClick={() => handleExampleClick(example)}
              >
                {example}
              </Badge>
            ))}
          </div>
        </div>

        <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              Advanced Options
              <ChevronDown className="w-4 h-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-4">
            <div className="text-sm text-muted-foreground p-4 bg-muted rounded-lg">
              Advanced filtering options coming soon. The AI will automatically extract location, industry, and constraints from your prompt.
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}