import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ExternalLink, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Eye,
  RefreshCw,
  Shield,
  FileText,
  Zap
} from 'lucide-react';
import { Signal } from '@/types/lead';

interface EvidenceHubProps {
  signals: Signal[];
  onSignalOverride: (signalId: string, isCorrect: boolean) => void;
}

export function EvidenceHub({ signals, onSignalOverride }: EvidenceHubProps) {
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);

  const getSignalIcon = (type: string) => {
    switch (type) {
      case 'no_website': return FileText;
      case 'has_chatbot': return Zap;
      case 'has_online_booking': return CheckCircle;
      case 'owner_identified': return Shield;
      default: return Eye;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.6) return 'warning';
    return 'destructive';
  };

  const getSignalStatusIcon = (signal: Signal) => {
    if (signal.overridden_by_user) {
      return <RefreshCw className="h-4 w-4 text-warning" />;
    }
    return signal.confidence >= 0.7 ? 
      <CheckCircle className="h-4 w-4 text-success" /> : 
      <AlertTriangle className="h-4 w-4 text-warning" />;
  };

  const criticalSignals = signals.filter(s => s.confidence < 0.6);
  const verifiedSignals = signals.filter(s => s.confidence >= 0.8 && !s.overridden_by_user);
  const reviewableSignals = signals.filter(s => s.confidence >= 0.6 && s.confidence < 0.8);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Evidence Hub
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All ({signals.length})</TabsTrigger>
              <TabsTrigger value="critical">Critical ({criticalSignals.length})</TabsTrigger>
              <TabsTrigger value="verified">Verified ({verifiedSignals.length})</TabsTrigger>
              <TabsTrigger value="review">Review ({reviewableSignals.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              <SignalList 
                signals={signals} 
                onSignalSelect={setSelectedSignal}
                onSignalOverride={onSignalOverride}
              />
            </TabsContent>

            <TabsContent value="critical" className="space-y-4">
              {criticalSignals.length > 0 ? (
                <>
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      These signals have low confidence and may need manual verification.
                    </AlertDescription>
                  </Alert>
                  <SignalList 
                    signals={criticalSignals} 
                    onSignalSelect={setSelectedSignal}
                    onSignalOverride={onSignalOverride}
                  />
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No critical signals requiring attention</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="verified" className="space-y-4">
              <SignalList 
                signals={verifiedSignals} 
                onSignalSelect={setSelectedSignal}
                onSignalOverride={onSignalOverride}
              />
            </TabsContent>

            <TabsContent value="review" className="space-y-4">
              <SignalList 
                signals={reviewableSignals} 
                onSignalSelect={setSelectedSignal}
                onSignalOverride={onSignalOverride}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {selectedSignal && (
        <SignalDetailCard 
          signal={selectedSignal} 
          onClose={() => setSelectedSignal(null)}
          onOverride={onSignalOverride}
        />
      )}
    </div>
  );
}

interface SignalListProps {
  signals: Signal[];
  onSignalSelect: (signal: Signal) => void;
  onSignalOverride: (signalId: string, isCorrect: boolean) => void;
}

function SignalList({ signals, onSignalSelect, onSignalOverride }: SignalListProps) {
  const getSignalIcon = (type: string) => {
    switch (type) {
      case 'no_website': return FileText;
      case 'has_chatbot': return Zap;
      case 'has_online_booking': return CheckCircle;
      case 'owner_identified': return Shield;
      default: return Eye;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.6) return 'warning';
    return 'destructive';
  };

  return (
    <ScrollArea className="h-96">
      <div className="space-y-3">
        {signals.map((signal) => {
          const Icon = getSignalIcon(signal.type);
          return (
            <div 
              key={signal.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:shadow-md transition-all cursor-pointer"
              onClick={() => onSignalSelect(signal)}
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium capitalize">{signal.type.replace(/_/g, ' ')}</h4>
                    <Badge variant={getConfidenceColor(signal.confidence)}>
                      {Math.round(signal.confidence * 100)}%
                    </Badge>
                    {signal.overridden_by_user && (
                      <Badge variant="outline">Override</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Source: {signal.source_key}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSignalOverride(signal.id, true);
                  }}
                  className="text-success"
                >
                  <CheckCircle className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSignalOverride(signal.id, false);
                  }}
                  className="text-destructive"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

interface SignalDetailCardProps {
  signal: Signal;
  onClose: () => void;
  onOverride: (signalId: string, isCorrect: boolean) => void;
}

function SignalDetailCard({ signal, onClose, onOverride }: SignalDetailCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Signal Details
          <Button variant="ghost" size="sm" onClick={onClose}>
            <XCircle className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium mb-1">Type</h4>
            <p className="text-sm text-muted-foreground capitalize">
              {signal.type.replace(/_/g, ' ')}
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-1">Confidence</h4>
            <Badge variant={signal.confidence >= 0.8 ? 'success' : signal.confidence >= 0.6 ? 'warning' : 'destructive'}>
              {Math.round(signal.confidence * 100)}%
            </Badge>
          </div>
          <div>
            <h4 className="font-medium mb-1">Source</h4>
            <p className="text-sm text-muted-foreground">{signal.source_key}</p>
          </div>
          <div>
            <h4 className="font-medium mb-1">Detected</h4>
            <p className="text-sm text-muted-foreground">
              {new Date(signal.detected_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {signal.evidence_snippet && (
          <div>
            <h4 className="font-medium mb-2">Evidence</h4>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm">{signal.evidence_snippet}</p>
            </div>
          </div>
        )}

        {signal.evidence_url && (
          <div>
            <h4 className="font-medium mb-2">Source URL</h4>
            <Button variant="outline" size="sm" asChild>
              <a href={signal.evidence_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                View Source
              </a>
            </Button>
          </div>
        )}

        <div className="flex gap-2 pt-4 border-t">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => onOverride(signal.id, true)}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Mark Correct
          </Button>
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => onOverride(signal.id, false)}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Mark Incorrect
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}