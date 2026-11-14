"use client";

import React from "react";

export interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`bg-surface-sub macro-skeleton rounded-lg ${className}`.trim()}
    />
  );
}

export function FoodRowSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-label="Loading food entries"
      className="rounded-2xl bg-card border border-border/50 overflow-hidden divide-y divide-border/60"
    >
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="flex items-center justify-between gap-3 px-4 py-3.5"
        >
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-3/5 rounded-md" />
            <Skeleton className="h-2.5 w-1/3 rounded-md" />
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="space-y-1.5 flex flex-col items-end">
              <Skeleton className="h-3.5 w-14 rounded-md" />
              <Skeleton className="h-2.5 w-20 rounded-md" />
            </div>
            <Skeleton className="w-8 h-8 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function RecipeCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-label="Loading recipes"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
    >
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-card border border-border/50 rounded-2xl p-4 sm:p-5 space-y-4"
        >
          <div className="space-y-2">
            <Skeleton className="h-4 w-2/3 rounded-md" />
            <Skeleton className="h-3 w-1/2 rounded-md" />
          </div>
          <div className="bg-surface-sub/60 rounded-xl p-3 flex items-center justify-between gap-2">
            <Skeleton className="h-6 w-20 rounded-md" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-8 rounded-md" />
              <Skeleton className="h-6 w-8 rounded-md" />
              <Skeleton className="h-6 w-8 rounded-md" />
            </div>
          </div>
          <div className="flex justify-end pt-2 border-t border-border/60">
            <Skeleton className="h-7 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
