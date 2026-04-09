// src/components/dashboard/MainDashboard.tsx
'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Terminal, Activity, Cpu, Zap, FileCode2,
  ChevronDown, RefreshCw, Square, Play,
  Layers, Clock, Hash, TrendingUp, AlertCircle,
  CheckCircle2, Loader2, Database, Globe,
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { useModelStore } from '@/store/modelStore';
import { useModels } from '@/hooks/useModels';
import { useCodegen } from '@/hooks/useCodegen';
import { AGENTS } from '@/constants/agents';
import { formatTime, truncate } from '@/lib/utils/helpers';
import type { LogEntry, ModelInfo } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Mini components
// ─────────────────────────────────────────────────────────────────────────────

function StatusDot({ active }: { active: boolean }) {
  return (
    <span className="relative flex h-2 w-2">
      {active && (
        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
      )}
      <span className={`relative inline-flex h-2 w-2 rounded-full ${active ? 'bg-emerald-400' : 'bg-slate-600'}`} />
    </span>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color = 'text-slate-400',
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
      <Icon className={`w-3.5 h-3.5 ${color} shrink-0`} />
      <div className="min-w-0">
        <p className="text-[9px] font-mono uppercase tracking-widest text-slate-500 truncate">{label}</p>
        <p className={`text-sm font-bold font-mono ${color} truncate`}>{value}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Log Row
// ─────────────────────────────────────────────────────────────────────────────

const LOG_TYPE_COLORS: Record<string, string> = {
  write:    'text-emerald-400',
  read:     'text-blue-400',
  test:     'text-yellow-400',
  deploy:   'text-purple-400',
  optimize: 'text-orange-400',
  review:   'text-pink-400',
};

const LOG_TYPE_ICONS: Record<string, string> = {
  write:    '✍',
  read:     '👁',
  test:     '🧪',
  deploy:   '🚀',
  optimize: '⚡',
  review:   '🔍',
};

function LogRow({ entry }: { entry: LogEntry }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8, height: 0 }}
      animate={{ opacity: 1, x: 0, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.03] group transition-colors"
    >
      {/* Agent color dot */}
      <span
        className="mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ring-1 ring-white/10"
        style={{ backgroundColor: entry.agentColor }}
      />

      {/* Agent name */}
      <span
        className="text-[10px] font-bold font-mono shrink-0 w-7"
        style={{ color: entry.agentColor }}
      >
        {entry.agentName.slice(0, 3)}
      </span>

      {/* Type icon */}
      <span className="text-[10px] shrink-0 w-3">
        {LOG_TYPE_ICONS[entry.type] ?? '•'}
      </span>

      {/* Filename */}
      <span className="text-[10px] font-mono text-slate-400 shrink-0 max-w-[120px] truncate">
        {entry.filename.split('/').pop()}
      </span>

      {/* Snippet */}
      <span className="text-[10px] font-mono text-slate-600 truncate flex-1 min-w-0">
        {truncate(entry.snippet, 60)}
      </span>

      {/* Time */}
      <span className="text-[9px] font-mono text-slate-700 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {formatTime(entry.timestamp)}
      </span>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Progress Bar
// ─────────────────────────────────────────────────────────────────────────────

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full">
      <div className="flex justify-between mb-1">
        <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Progress</span>
        <span className="text-[9px] font-mono text-slate-400">{value}%</span>
      </div>
      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Model Selector
// ─────────────────────────────────────────────────────────────────────────────

function ModelSelector({
  models,
  selected,
  onSelect,
  isFetching,
}: {
  models:     ModelInfo[];
  selected:   string;
  onSelect:   (id: string) => void;
  isFetching: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref             = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selectedModel = models.find((m) => m.id === selected);

  return (
    <div ref={ref} className="relative w-full">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 hover:border-indigo-500/40 hover:bg-white/[0.07] transition-all text-left"
      >
        <Globe className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
        <span className="text-[11px] font-mono text-slate-300 truncate flex-1 min-w-0">
          {isFetching ? 'Loading models…' : (selectedModel?.name ?? 'Select model')}
        </span>
        {isFetching
          ? <Loader2 className="w-3 h-3 text-slate-500 animate-spin shrink-0" />
          : <ChevronDown className={`w-3 h-3 text-slate-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        }
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scaleY: 0.95 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -6, scaleY: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 top-full mt-1 w-full max-h-56 overflow-y-auto rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl"
          >
            {models.length === 0 ? (
              <div className="px-3 py-4 text-center text-[11px] font-mono text-slate-500">
                No models available
              </div>
            ) : (
              models.map((m) => (
                <button
                  key={m.id}
                  onClick={() => { onSelect(m.id); setOpen(false); }}
                  className={`w-full text-left px-3 py-2 flex items-start gap-2 hover:bg-white/[0.06] transition-colors ${
                    m.id === selected ? 'bg-indigo-500/10' : ''
                  }`}
                >
                  <span className={`text-[10px] font-mono truncate flex-1 ${
                    m.id === selected ? 'text-indigo-300' : 'text-slate-300'
                  }`}>
                    {m.name}
                  </span>
                  {m.contextLength && (
                    <span className="text-[9px] font-mono text-slate-600 shrink-0">
                      {(m.contextLength / 1000).toFixed(0)}k
                    </span>
                  )}
                </button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent Grid — who is thinking/active
// ─────────────────────────────────────────────────────────────────────────────

function AgentGrid({
  activeAgentId,
  thinkingAgentId,
}: {
  activeAgentId:   number | null;
  thinkingAgentId: number | null;
}) {
  return (
    <div className="grid grid-cols-5 gap-1">
      {AGENTS.map((agent) => {
        const isActive   = agent.id === activeAgentId;
        const isThinking = agent.id === thinkingAgentId;
        return (
          <motion.div
            key={agent.id}
            animate={isThinking ? {
              boxShadow: [
                `0 0 0px ${agent.color}00`,
                `0 0 8px ${agent.color}99`,
                `0 0 0px ${agent.color}00`,
              ],
            } : {}}
            transition={{ duration: 1.2, repeat: Infinity }}
            className={`relative flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-lg border transition-all cursor-default ${
              isThinking
                ? 'border-white/20 bg-white/[0.08]'
                : isActive
                ? 'border-white/10 bg-white/[0.04]'
                : 'border-white/[0.04] bg-transparent'
            }`}
          >
            {/* Rainbow ring for thinking */}
            {isThinking && (
              <motion.div
                className="absolute inset-0 rounded-lg"
                style={{
                  background: `conic-gradient(from 0deg, ${agent.color}, #818cf8, #f472b6, #34d399, ${agent.color})`,
                  padding: '1px',
                  WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                  WebkitMaskComposite: 'xor',
                  maskComposite: 'exclude',
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              />
            )}

            <span
              className="text-[9px] font-bold font-mono"
              style={{ color: isActive || isThinking ? agent.color : '#475569' }}
            >
              {agent.name}
            </span>

            {isThinking ? (
              <motion.div
                className="flex gap-0.5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="w-0.5 h-0.5 rounded-full"
                    style={{ backgroundColor: agent.color }}
                    animate={{ scaleY: [1, 2.5, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </motion.div>
            ) : (
              <span
                className="w-1 h-1 rounded-full"
                style={{ backgroundColor: isActive ? agent.color : '#1e293b' }}
              />
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Dashboard
// ─────────────────────────────────────────────────────────────────────────────

export function MainDashboard() {
  const {
    codeLog, generatedFiles,
    isGenerating, activeAgentId, thinkingAgentId,
    progress, isSynthesized, maxFiles, prompt,
    setMaxFiles, setPrompt, clearAll,
  } = useAppStore();

  const { models, isFetching } = useModels();
  const { start, stop }        = useCodegen();

  const scrollRef             = useRef<HTMLDivElement>(null);
  const [selectedModel, setSelectedModel] = useState('');
  const [showAgents, setShowAgents]       = useState(true);

  // Auto-scroll log
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [codeLog]);

  // Auto-select first model
  useEffect(() => {
    if (models.length > 0 && !selectedModel) {
      setSelectedModel(models[0].id);
    }
  }, [models, selectedModel]);

  const handleBuild = useCallback(async () => {
    if (!prompt.trim() || isGenerating) return;
    await start(prompt.trim(), maxFiles);
  }, [prompt, isGenerating, maxFiles, start]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !isGenerating) {
      handleBuild();
    }
  }, [handleBuild, isGenerating]);

  // Stats
  const totalLines  = generatedFiles.reduce((s, f) => s + f.linesAdded, 0);
  const uniqueLangs = new Set(generatedFiles.map((f) => f.language)).size;
  const elapsed     = codeLog.length > 0
    ? Math.round((Date.now() - codeLog[0].timestamp) / 1000)
    : 0;

  return (
    <div className="relative flex flex-col w-full rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl shadow-2xl overflow-hidden h-full">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/10 bg-gradient-to-r from-indigo-950/60 to-slate-900/60 flex-shrink-0">
        <StatusDot active={isGenerating} />
        <Terminal className="w-4 h-4 text-indigo-400" />
        <h2 className="text-xs font-mono tracking-widest text-white font-bold">NEXUS CORE</h2>

        <div className="ml-auto flex items-center gap-3">
          {/* Refresh models */}
          <button
            onClick={() => window.location.reload()}
            className="p-1 rounded hover:bg-white/10 transition-colors"
            title="Refresh models"
          >
            <RefreshCw className={`w-3 h-3 text-slate-500 hover:text-slate-300 ${isFetching ? 'animate-spin' : ''}`} />
          </button>

          <Activity className={`w-3.5 h-3.5 ${isGenerating ? 'text-emerald-400' : 'text-slate-600'}`} />
          <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">
            {isGenerating ? 'ACTIVE' : isSynthesized ? 'DONE' : 'STANDBY'}
          </span>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-4 gap-2 px-3 py-2.5 border-b border-white/[0.06] flex-shrink-0">
        <StatCard icon={FileCode2}  label="Files"   value={generatedFiles.length} color="text-indigo-400" />
        <StatCard icon={Hash}       label="Lines"   value={totalLines.toLocaleString()} color="text-emerald-400" />
        <StatCard icon={Layers}     label="Langs"   value={uniqueLangs} color="text-purple-400" />
        <StatCard icon={Clock}      label="Elapsed" value={elapsed > 0 ? `${elapsed}s` : '--'} color="text-orange-400" />
      </div>

      {/* ── Progress (when generating) ── */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-3 py-2 border-b border-white/[0.06] flex-shrink-0 overflow-hidden"
          >
            <ProgressBar value={progress} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Agent Grid ── */}
      <div className="flex-shrink-0 border-b border-white/[0.06]">
        <button
          onClick={() => setShowAgents((p) => !p)}
          className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-white/[0.02] transition-colors"
        >
          <Cpu className="w-3 h-3 text-slate-600" />
          <span className="text-[9px] font-mono uppercase tracking-widest text-slate-600">
            Agents ({AGENTS.length})
          </span>
          <ChevronDown className={`w-3 h-3 text-slate-700 ml-auto transition-transform ${showAgents ? '' : '-rotate-90'}`} />
        </button>

        <AnimatePresence>
          {showAgents && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-3 pb-2.5 overflow-hidden"
            >
              <AgentGrid
                activeAgentId={activeAgentId}
                thinkingAgentId={thinkingAgentId}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Log Stream ── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-1 py-1.5 space-y-0 min-h-0 hide-scrollbar"
      >
        {codeLog.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-700">
            <Terminal className="w-8 h-8 opacity-20" />
            <p className="text-[11px] font-mono">Waiting for synthesis…</p>
            {isSynthesized && (
              <div className="flex items-center gap-1.5 text-emerald-500">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="text-[10px] font-mono">Generation complete</span>
              </div>
            )}
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {codeLog.map((entry) => (
              <LogRow key={entry.id} entry={entry} />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* ── Input Area ── */}
      <div className="flex-shrink-0 border-t border-white/10 bg-black/40 p-3 space-y-2">

        {/* Model selector */}
        <ModelSelector
          models={models}
          selected={selectedModel}
          onSelect={setSelectedModel}
          isFetching={isFetching}
        />

        {/* Prompt textarea */}
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your project… (⌘+Enter to build)"
            rows={3}
            disabled={isGenerating}
            className="w-full resize-none rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2.5 text-[12px] font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.06] transition-all disabled:opacity-50"
          />
          <div className="absolute bottom-2 right-2 text-[9px] font-mono text-slate-700">
            {prompt.length > 0 ? `${prompt.length} chars` : ''}
          </div>
        </div>

        {/* Max files + controls */}
        <div className="flex items-center gap-2">
          {/* Max files */}
          <div className="flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.06] rounded-lg px-2 py-1.5">
            <TrendingUp className="w-3 h-3 text-slate-600" />
            <span className="text-[10px] font-mono text-slate-500">Files:</span>
            <input
              type="number"
              min={1}
              max={1000}
              value={maxFiles}
              onChange={(e) => setMaxFiles(Number(e.target.value))}
              disabled={isGenerating}
              className="w-12 bg-transparent text-[11px] font-mono text-slate-300 focus:outline-none disabled:opacity-50 text-center"
            />
          </div>

          {/* Clear */}
          {!isGenerating && codeLog.length > 0 && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] hover:bg-red-500/10 hover:border-red-500/30 text-slate-500 hover:text-red-400 transition-all text-[10px] font-mono"
            >
              <AlertCircle className="w-3 h-3" />
              Clear
            </button>
          )}

          {/* Build / Stop */}
          <div className="flex-1" />
          {isGenerating ? (
            <motion.button
              onClick={stop}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 text-red-400 text-[11px] font-mono font-bold transition-all"
            >
              <Square className="w-3 h-3 fill-current" />
              STOP
            </motion.button>
          ) : (
            <motion.button
              onClick={handleBuild}
              whileTap={{ scale: 0.97 }}
              disabled={!prompt.trim() || models.length === 0}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[11px] font-mono font-bold transition-all shadow-lg shadow-indigo-500/20"
            >
              <Play className="w-3 h-3 fill-current" />
              BUILD
            </motion.button>
          )}
        </div>

        {/* Status line */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Database className="w-3 h-3 text-slate-700" />
            <span className="text-[9px] font-mono text-slate-700">
              {models.length} models · OpenRouter
            </span>
          </div>
          {isSynthesized && (
            <div className="flex items-center gap-1 text-emerald-600">
              <CheckCircle2 className="w-3 h-3" />
              <span className="text-[9px] font-mono">
                {generatedFiles.length} files generated
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}