'use client';
import React from 'react';
import { cn } from '@/lib/utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export function Button({ variant = 'primary', size = 'md', isLoading, children, className, disabled, ...props }: ButtonProps) {
  return (
    <button
      disabled={disabled || isLoading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 select-none',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        {
          'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] border border-indigo-500/50': variant === 'primary',
          'bg-transparent border border-white/20 hover:border-white/40 text-white hover:bg-white/5': variant === 'ghost',
          'bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30': variant === 'danger',
          'bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/30': variant === 'success',
          'px-3 py-1.5 text-xs': size === 'sm',
          'px-5 py-2.5 text-sm': size === 'md',
          'px-8 py-3.5 text-base': size === 'lg',
        },
        className
      )}
      {...props}
    >
      {isLoading && (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
