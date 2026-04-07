import React from 'react';
import { cn } from '@/lib/utils/cn';

interface BadgeProps { label: string; color?: string; className?: string; }

export function Badge({ label, color = '#00d4ff', className }: BadgeProps) {
  return (
    <span
      className={cn('inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-widest uppercase', className)}
      style={{ color, border: `1px solid ${color}44`, background: `${color}11` }}
    >
      {label}
    </span>
  );
}
