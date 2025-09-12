import React from 'react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface ScoreDisplayProps {
  score: number;
  maxScore?: number;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  showLabel?: boolean;
  className?: string;
}

interface ScoreBreakdownProps {
  subscores: {
    ICP?: number;
    Pain?: number;
    Reachability?: number;
    ComplianceRisk?: number;
  };
  maxScores?: {
    ICP: number;
    Pain: number;
    Reachability: number;
    ComplianceRisk: number;
  };
}

export function ScoreDisplay({ 
  score, 
  maxScore = 100, 
  size = 'md', 
  showProgress = false,
  showLabel = true,
  className 
}: ScoreDisplayProps) {
  const percentage = (score / maxScore) * 100;
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-destructive';
  };

  const getScoreDescription = (score: number) => {
    if (score >= 90) return 'Excellent Match';
    if (score >= 80) return 'Strong Lead';
    if (score >= 70) return 'Good Prospect';
    if (score >= 60) return 'Moderate Fit';
    if (score >= 50) return 'Weak Lead';
    return 'Poor Match';
  };

  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl'
  };

  return (
    <div className={cn('text-right', className)}>
      <div className={cn('font-bold', getScoreColor(score), sizeClasses[size])}>
        {score}/{maxScore}
      </div>
      {showLabel && (
        <div className="text-xs text-muted-foreground">
          {getScoreDescription(score)}
        </div>
      )}
      {showProgress && (
        <div className="w-16 mt-1">
          <Progress 
            value={percentage} 
            className="h-2"
          />
        </div>
      )}
    </div>
  );
}

export function ScoreBreakdown({ 
  subscores, 
  maxScores = { ICP: 35, Pain: 35, Reachability: 20, ComplianceRisk: 10 }
}: ScoreBreakdownProps) {
  const getProgressColor = (value: number, max: number) => {
    const percentage = (value / max) * 100;
    if (percentage >= 80) return 'hsl(var(--success))';
    if (percentage >= 60) return 'hsl(var(--warning))';
    return 'hsl(var(--destructive))';
  };

  return (
    <div className="space-y-3">
      {Object.entries(maxScores).map(([key, maxValue]) => {
        const value = subscores[key as keyof typeof subscores] || 0;
        const percentage = (Math.abs(value) / maxValue) * 100;
        const isNegative = key === 'ComplianceRisk';
        
        return (
          <div key={key} className="space-y-1">
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </span>
              <span className="text-muted-foreground">
                {isNegative ? '-' : ''}{Math.abs(value)}/{maxValue}
              </span>
            </div>
            <div className="relative">
              <Progress 
                value={percentage} 
                className="h-2"
              />
              <div 
                className="absolute top-0 left-0 h-2 rounded-full transition-all"
                style={{ 
                  width: `${percentage}%`,
                  backgroundColor: getProgressColor(Math.abs(value), maxValue)
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}