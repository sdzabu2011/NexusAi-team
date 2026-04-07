'use client';
import React from 'react';
import { motion } from 'framer-motion';

interface ProgressBarProps { value: number; color?: string; showLabel?: boolean; }

export function ProgressBar({ value, color = '#00d4ff', showLabel = true }: ProgressBarProps) {
  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between mb-1 text-xs font-mono" style={{ color }}>
          <span>Building project…</span>
          <span>{value}%</span>
        </div>
      )}
      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${color}88, ${color})`, boxShadow: `0 0 10px ${color}88` }}
          initial={{ width: '0%' }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
