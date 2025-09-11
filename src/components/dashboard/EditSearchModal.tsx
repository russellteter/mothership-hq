import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DSLPreviewChips } from '@/components/ui/dsl-preview-chips';
import { SearchJob, LeadQuery } from '@/types/lead';
import { Card } from '@/components/ui/card';

interface EditSearchModalProps {
  searchJob: SearchJob;
  onSave: (updatedJob: SearchJob) => void;
  onCancel: () => void;
}

export function EditSearchModal({ searchJob, onSave, onCancel }: EditSearchModalProps) {
  const [prompt, setPrompt] = useState(searchJob.original_prompt || '');
  const [previewDSL, setPreviewDSL] = useState<LeadQuery>(searchJob.dsl_json);
  const [isLoading, setIsLoading] = useState(false);

  // Mock DSL preview update (in real app, this would call the parse API)
  useEffect(() => {
    if (prompt !== searchJob.original_prompt) {
      // Debounced DSL preview update would go here
      // For now, just keep the existing DSL
      setPreviewDSL(searchJob.dsl_json);
    }
  }, [prompt, searchJob]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // In real app, would re-parse prompt and update search job
      const updatedJob: SearchJob = {
        ...searchJob,
        original_prompt: prompt,
        dsl_json: previewDSL
      };
      onSave(updatedJob);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => onCancel()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit & Re-run Search</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Original Prompt */}
          <div className="space-y-2">
            <Label htmlFor="prompt">Search Query</Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your ideal leads..."
              className="min-h-[100px]"
            />
          </div>

          {/* DSL Preview */}
          <div className="space-y-2">
            <Label>Search Parameters Preview</Label>
            <Card className="p-4">
              <DSLPreviewChips dsl={previewDSL} maxChips={10} />
              
              {/* Detailed DSL View */}
              <div className="mt-4 space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium text-muted-foreground">Vertical:</span>
                    <span className="ml-2">{previewDSL.vertical || 'Auto-detect'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Location:</span>
                    <span className="ml-2">
                      {previewDSL.geo?.city ? `${previewDSL.geo.city}, ${previewDSL.geo.state}` : 'Not specified'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Radius:</span>
                    <span className="ml-2">{previewDSL.geo?.radius_km || 40} km</span>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Target Results:</span>
                    <span className="ml-2">{previewDSL.result_size?.target || 250} leads</span>
                  </div>
                </div>
                
                {previewDSL.constraints?.must && previewDSL.constraints.must.length > 0 && (
                  <div>
                    <span className="font-medium text-muted-foreground">Constraints:</span>
                    <ul className="ml-4 mt-1 space-y-1">
                      {previewDSL.constraints.must.map((constraint, index) => {
                        const key = Object.keys(constraint)[0];
                        const value = Object.values(constraint)[0];
                        return (
                          <li key={index} className="text-xs">
                            • {key.replace(/_/g, ' ')}: {String(value)}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading || !prompt.trim()}>
            {isLoading ? 'Updating...' : 'Re-run Search'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
