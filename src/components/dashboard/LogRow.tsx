import React from 'react';
import { motion } from 'framer-motion';
import type { LogEntry } from '@/types';
import { formatTime } from '@/lib/utils/helpers';

const TYPE_ICONS: Record<LogEntry['type'], string> = {
  write: '✍', read: '👁', test: '✓', deploy: '🚀', optimize: '⚡', review: '🔍',
};

interface LogRowProps { entry: LogEntry; }

export function LogRow({ entry }: LogRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className="group px-3 py-2 rounded-lg border border-transparent hover:border-white/5 hover:bg-white/[0.02] transition-all"
    >
      <div className="flex items-center justify-between mb-0.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px]">{TYPE_ICONS[entry.type]}</span>
          <span className="text-[10px] font-title tracking-wider font-bold" style={{ color: entry.agentColor }}>
            {entry.agentName}
          </span>
          <span className="text-[10px] text-slate-600 font-mono">{entry.type.toUpperCase()}</span>
        </div>
        <span className="text-[9px] text-slate-700 font-mono">{formatTime(entry.timestamp)}</span>
      </div>
      <div className="text-[10px] text-slate-400 font-mono truncate">{entry.filename}</div>
      <div className="text-[10px] text-emerald-400/70 font-mono mt-0.5 truncate">{entry.snippet}</div>
    </motion.div>
  );
}
