import React from 'react';
import { cn } from '@/lib/utils/cn';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-white/5 rounded-lg', className)} />;
}
