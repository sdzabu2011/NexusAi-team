'use client';
import React from 'react';
import { RefreshCw, Download, Code2 } from 'lucide-react';
import { useModels } from '@/hooks/useModels';
import { useCountdown } from '@/hooks/useCountdown';
import { Button } from '@/components/ui/Button';

interface HeaderProps { onDownload?: () => void; onViewSource?: () => void; }

export function Header({ onDownload, onViewSource }: HeaderProps) {
  const { count, isFetching } = useModels();
  const secs = useCountdown();

  return (
    <header className="relative z-30 flex items-center justify-between px-6 py-3 border-b border-white/10 glass-dark">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-cyan-500 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.5)]">
          <span className="font-title font-black text-white text-sm">N</span>
        </div>
        <div>
          <h1 className="font-title font-black text-white tracking-wider text-base leading-none">
            NEXUS<span className="text-cyan-400">AI</span>
          </h1>
          <p className="text-[10px] text-slate-500 font-mono tracking-widest mt-0.5">TEAM v3.0</p>
        </div>
      </div>

      {/* Center status */}
      <div className="flex items-center gap-4 text-xs font-mono">
        <div className="flex items-center gap-2 text-slate-400">
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-cyan-400' : 'text-slate-600'}`} />
          <span className="text-emerald-400 font-semibold">{count}</span>
          <span>free models</span>
        </div>
        <div className="text-slate-600">·</div>
        <div className="text-slate-500">
          Refresh in <span className="text-slate-300">{secs}s</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {onViewSource && (
          <Button variant="ghost" size="sm" onClick={onViewSource}>
            <Code2 className="w-3.5 h-3.5" /> Source
          </Button>
        )}
        {onDownload && (
          <Button variant="primary" size="sm" onClick={onDownload}>
            <Download className="w-3.5 h-3.5" /> ZIP
          </Button>
        )}
      </div>
    </header>
  );
}
