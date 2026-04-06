"use client";

import React, { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/appStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Code, Terminal } from 'lucide-react';

export default function MainDashboard() {
  const { codeLog, isGenerating } = useAppStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [codeLog]);

  return (
    <div id="main-dashboard" className="relative flex flex-col w-full max-w-3xl border border-white/20 bg-black/60 backdrop-blur-xl rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden h-96 z-10 mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10 bg-gradient-to-r from-indigo-900/40 to-slate-900/40">
        <Terminal className="text-indigo-400 w-5 h-5" />
        <h2 className="text-lg font-semibold text-white tracking-wide">NexusAI Central Core</h2>
        <div className="ml-auto flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isGenerating ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
          <span className="text-xs text-slate-400 uppercase tracking-widest">{isGenerating ? 'ACTIVE SYNTHESIS' : 'STANDBY'}</span>
        </div>
      </div>
      
      {/* Log window */}
      <div 
        ref={scrollRef}
        className="flex-1 p-6 overflow-y-auto space-y-3 font-mono text-sm hide-scrollbar"
      >
        {codeLog.length === 0 && (
          <div className="h-full flex items-center justify-center text-slate-500 flex-col gap-2">
            <Code className="w-8 h-8 opacity-20" />
            <p>Waiting for team synthesis...</p>
          </div>
        )}
        <AnimatePresence initial={false}>
          {codeLog.map((log) => (
            <motion.div 
              key={log.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="px-3 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-md text-emerald-300 shadow-sm break-all"
            >
              <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                <span>Agent #{log.agentId}</span>
                <span>{log.filename}</span>
              </div>
              <div>{log.content}</div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
