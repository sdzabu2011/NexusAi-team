"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/store/appStore';
import { cn } from '@/lib/utils';
import { Code, FileCode2, Paintbrush, Database, Lock, Cpu, Cloud, Settings, Monitor, Bug, Eye, Compass, Zap, Layers, Server, Search } from 'lucide-react';

const icons = {
  1: Paintbrush,
  2: FileCode2,
  3: Database,
  4: Server,
  5: Lock,
  6: Cpu,
  7: Cloud,
  8: Settings,
  9: Monitor,
  10: Bug,
  11: Eye,
  12: Compass,
  13: Zap,
  14: Layers,
  15: Search,
};

export default function Agent4() {
  const { isGenerating, activeAgentId } = useAppStore();
  const isActive = activeAgentId === 4;
  const Icon = icons[4 as keyof typeof icons] || Code;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: isActive ? 1.1 : 1 }}
      className={cn(
        "flex flex-col items-center justify-center p-4 rounded-xl border border-white/10 backdrop-blur-md transition-all duration-300",
        isActive ? "bg-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.5)] border-indigo-500/50" : "bg-black/30"
      )}
      id={"agent-" + String(4)}
    >
      <div className="relative">
        <Icon className={cn("w-8 h-8", isActive ? "text-indigo-400" : "text-slate-400")} />
        {isActive && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
          </span>
        )}
      </div>
      <div className="mt-2 text-center">
        <h3 className="text-sm font-bold text-white">Dan</h3>
        <p className="text-xs text-slate-400">DevOps Ops</p>
      </div>
      {isActive && (
        <div className="text-[10px] text-indigo-300 mt-1 animate-pulse">Typing code...</div>
      )}
    </motion.div>
  );
}
