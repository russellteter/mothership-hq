import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Search, Sparkles } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { SearchSuggestions } from './SearchSuggestions';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

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
      setShowSuggestions(true);
    }
  }, [isSearching, isSubmitting]);

  const handleSuggestionSelect = useCallback((suggestedPrompt: string) => {
    setPrompt(suggestedPrompt);
    setShowSuggestions(false);
  }, []);

  return (
    <div className="w-80 h-full bg-card border-r border-border flex flex-col">
      <div className="p-3 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 bg-gradient-to-br from-primary to-primary-glow rounded flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-primary-foreground" />
          </div>
          <h1 className="text-base font-semibold">Mothership Leads</h1>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Describe your ideal leads
            </label>
            <div className="relative">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., dentists in Columbia, SC with no chat widget and owner identified"
                className="min-h-[80px] text-sm resize-none"
                disabled={isSearching || isSubmitting}
              />
              <Search className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
            </div>
          </div>
          
          <Button 
            type="submit" 
            disabled={!debouncedPrompt.trim() || isSearching || isSubmitting}
            className="w-full h-10 text-sm font-medium"
            variant="default"
          >
            {isSearching || isSubmitting ? 'Searching...' : 'Find Leads'}
          </Button>
        </form>
      </div>

      <div className="p-3 space-y-3">
        <div>
          <h3 className="text-xs font-medium mb-2">Example searches</h3>
          <div className="space-y-1">
            {PROMPT_EXAMPLES.map((example, index) => (
              <Badge
                key={index}
                variant="secondary"
                className={`cursor-pointer hover:bg-secondary/80 text-left justify-start w-full p-1.5 h-auto whitespace-normal text-xs ${
                  isSearching || isSubmitting ? 'opacity-50 pointer-events-none' : ''
                }`}
                onClick={() => handleExampleClick(example)}
              >
                {example}
              </Badge>
            ))}
          </div>
        </div>

        <SearchSuggestions
          currentPrompt={prompt}
          onSuggestionSelect={handleSuggestionSelect}
          isVisible={showSuggestions && prompt.length > 10}
        />

        {/* Advanced Options - Always Visible */}
        <div className="space-y-4 border-t border-border pt-4">
          <h3 className="text-sm font-medium text-foreground">Advanced Options</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Industry</label>
              <select className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-md text-sm">
                <option value="">Auto-detect from prompt</option>
                <option value="dentist">Dentist</option>
                <option value="law_firm">Law Firm</option>
                <option value="contractor">Contractor</option>
                <option value="hvac">HVAC</option>
                <option value="roofing">Roofing</option>
              </select>
            </div>
            
            <div>
              <label className="text-xs font-medium text-muted-foreground">Search Radius</label>
              <select className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-md text-sm">
                <option value="20">20 km</option>
                <option value="40" defaultValue="40">40 km</option>
                <option value="80">80 km</option>
                <option value="100">100 km</option>
              </select>
            </div>
            
            <div>
              <label className="text-xs font-medium text-muted-foreground">Result Limit</label>
              <select className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-md text-sm">
                <option value="50">50 leads</option>
                <option value="100">100 leads</option>
                <option value="250" defaultValue="250">250 leads</option>
                <option value="500">500 leads</option>
              </select>
            </div>
            
            <div className="pt-2 border-t border-border">
              <label className="text-xs font-medium text-muted-foreground">Constraints</label>
              <div className="mt-2 space-y-2">
                <label className="flex items-center space-x-2 text-sm">
                  <input type="checkbox" className="rounded border-border" />
                  <span>Must have website</span>
                </label>
                <label className="flex items-center space-x-2 text-sm">
                  <input type="checkbox" className="rounded border-border" />
                  <span>Owner identified</span>
                </label>
                <label className="flex items-center space-x-2 text-sm">
                  <input type="checkbox" className="rounded border-border" />
                  <span>Has online booking</span>
                </label>
                <label className="flex items-center space-x-2 text-sm">
                  <input type="checkbox" className="rounded border-border" />
                  <span>Exclude franchises</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}