import React, { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface LazyTabContentProps {
  isActive: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function LazyTabContent({ isActive, children, fallback }: LazyTabContentProps) {
  const defaultFallback = (
    <div className="space-y-4">
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="md" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );

  if (!isActive) {
    return null;
  }

  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  );
}