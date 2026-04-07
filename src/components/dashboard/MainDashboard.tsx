'use client';
import React, { useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Terminal, Activity } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { StatsBar } from './StatsBar';
import { LogRow } from './LogRow';

export function MainDashboard() {
  const { codeLog, isGenerating, progress } = useAppStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [codeLog]);

  return (
    <div
      id="main-dashboard"
      className="relative flex flex-col w-full rounded-2xl border border-white/10 bg-black/50 backdrop-blur-xl shadow-2xl overflow-hidden h-full"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-gradient-to-r from-indigo-950/50 to-slate-900/50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isGenerating ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
          <Terminal className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-title tracking-widest text-white font-bold">NEXUS CORE</h2>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Activity className={`w-3.5 h-3.5 ${isGenerating ? 'text-emerald-400' : 'text-slate-600'}`} />
          <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">
            {isGenerating ? 'ACTIVE' : 'STANDBY'}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 py-3 border-b border-white/5 flex-shrink-0">
        <StatsBar />
        {isGenerating && (
          <div className="mt-3">
            <ProgressBar value={progress} />
          </div>
        )}
      </div>

      {/* Log stream */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5 hide-scrollbar min-h-0"
      >
        {codeLog.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-600">
            <Terminal className="w-10 h-10 opacity-20" />
            <p className="text-xs font-mono">Waiting for synthesis…</p>
            <p className="text-[10px] font-mono text-slate-700">Type a project idea and click Build</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {codeLog.map((entry) => (
              <LogRow key={entry.id} entry={entry} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
