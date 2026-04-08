'use client';
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Files, ChevronDown, ChevronUp, Info } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Preset groups
// ─────────────────────────────────────────────────────────────────────────────

const PRESETS = [
  { label: '10',   value: 10,   hint: '~30s',   tier: 'quick' },
  { label: '25',   value: 25,   hint: '~1.5m',  tier: 'quick' },
  { label: '50',   value: 50,   hint: '~3m',    tier: 'medium' },
  { label: '100',  value: 100,  hint: '~6m',    tier: 'medium' },
  { label: '200',  value: 200,  hint: '~12m',   tier: 'large' },
  { label: '500',  value: 500,  hint: '~30m',   tier: 'large' },
  { label: '1000', value: 1000, hint: '~60m',   tier: 'max' },
] as const;

const TIER_COLORS = {
  quick:  { bg: 'bg-emerald-500/10',  border: 'border-emerald-500/30', text: 'text-emerald-400', active: 'bg-emerald-500' },
  medium: { bg: 'bg-indigo-500/10',   border: 'border-indigo-500/30',  text: 'text-indigo-400',  active: 'bg-indigo-500'  },
  large:  { bg: 'bg-amber-500/10',    border: 'border-amber-500/30',   text: 'text-amber-400',   active: 'bg-amber-500'   },
  max:    { bg: 'bg-red-500/10',      border: 'border-red-500/30',     text: 'text-red-400',     active: 'bg-red-500'     },
};

// ─────────────────────────────────────────────────────────────────────────────
// Estimate time from file count
// ─────────────────────────────────────────────────────────────────────────────

function estimateTime(n: number): string {
  // ~2.5s per file average (2-3s cooldown + API latency)
  const secs = Math.round(n * 2.5);
  if (secs < 60)  return `~${secs}s`;
  if (secs < 3600) return `~${Math.round(secs / 60)}m`;
  return `~${(secs / 3600).toFixed(1)}h`;
}

function getTierForValue(v: number): keyof typeof TIER_COLORS {
  if (v <= 25)  return 'quick';
  if (v <= 100) return 'medium';
  if (v <= 500) return 'large';
  return 'max';
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  value:    number;
  onChange: (n: number) => void;
  disabled?: boolean;
}

export function FileCountSelector({ value, onChange, disabled }: Props) {
  const [inputRaw, setInputRaw]     = useState(String(value));
  const [showInfo, setShowInfo]     = useState(false);

  const tier   = getTierForValue(value);
  const colors = TIER_COLORS[tier];

  // ── Handlers ────────────────────────────────────────────────────────────

  const commit = useCallback((raw: string) => {
    const n = parseInt(raw, 10);
    if (!isNaN(n)) {
      const clamped = Math.min(1000, Math.max(1, n));
      onChange(clamped);
      setInputRaw(String(clamped));
    }
  }, [onChange]);

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const n = Number(e.target.value);
    onChange(n);
    setInputRaw(String(n));
  };

  const nudge = (delta: number) => {
    const n = Math.min(1000, Math.max(1, value + delta));
    onChange(n);
    setInputRaw(String(n));
  };

  return (
    <div
      className={`rounded-xl border p-3 transition-all ${colors.bg} ${colors.border}`}
    >
      {/* ── Top row ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Files className={`w-4 h-4 ${colors.text}`} />
          <span className="text-xs font-mono text-slate-400">Files to generate:</span>
        </div>

        {/* Preset buttons */}
        <div className="flex items-center gap-1 flex-wrap">
          {PRESETS.map((p) => {
            const isActive = value === p.value;
            const c = TIER_COLORS[p.tier];
            return (
              <button
                key={p.value}
                disabled={disabled}
                onClick={() => { onChange(p.value); setInputRaw(String(p.value)); }}
                title={`${p.value} files • ${p.hint}`}
                className={`
                  relative px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold
                  border transition-all disabled:opacity-30 disabled:cursor-not-allowed
                  ${isActive
                    ? `${c.active} text-white border-transparent shadow-[0_0_12px_rgba(0,0,0,0.3)]`
                    : `${c.bg} ${c.text} ${c.border} hover:brightness-125`
                  }
                `}
              >
                {p.label}
                {isActive && (
                  <motion.span
                    layoutId="activePreset"
                    className="absolute inset-0 rounded-lg ring-2 ring-white/20"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Manual number input with nudge buttons */}
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => nudge(-1)}
            disabled={disabled || value <= 1}
            className="p-0.5 text-slate-500 hover:text-white disabled:opacity-20 transition-colors"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <input
            type="number"
            min={1}
            max={1000}
            value={inputRaw}
            onChange={(e) => setInputRaw(e.target.value)}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commit(inputRaw); }}
            disabled={disabled}
            className={`
              w-16 text-center rounded-lg px-2 py-1 text-xs font-mono font-bold
              bg-black/40 border outline-none transition-all
              disabled:opacity-40
              ${colors.border} ${colors.text}
              focus:ring-1 focus:ring-indigo-500
            `}
          />
          <button
            onClick={() => nudge(1)}
            disabled={disabled || value >= 1000}
            className="p-0.5 text-slate-500 hover:text-white disabled:opacity-20 transition-colors"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>

        {/* Info toggle */}
        <button
          onClick={() => setShowInfo((s) => !s)}
          className="text-slate-600 hover:text-slate-400 transition-colors"
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Slider ───────────────────────────────────────────────────────── */}
      <div className="mt-3 px-1">
        <div className="relative">
          <input
            type="range"
            min={1}
            max={1000}
            value={value}
            onChange={handleSlider}
            disabled={disabled}
            className="nexus-slider w-full h-2 rounded-full appearance-none cursor-pointer disabled:opacity-40"
            style={{
              background: `linear-gradient(to right,
                #6366f1 0%,
                #8b5cf6 ${(value / 1000) * 60}%,
                #06b6d4 ${(value / 1000) * 100}%,
                #1e293b ${(value / 1000) * 100}%,
                #1e293b 100%)`,
            }}
          />
          {/* Tick marks */}
          <div className="absolute top-4 left-0 right-0 flex justify-between pointer-events-none">
            {[1, 100, 250, 500, 750, 1000].map((tick) => (
              <div key={tick} className="flex flex-col items-center">
                <div className="w-px h-1.5 bg-slate-700" />
                <span className="text-[8px] font-mono text-slate-700 mt-0.5">{tick}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Status row ───────────────────────────────────────────────────── */}
      <div className="mt-6 flex items-center justify-between px-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={value}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="flex items-center gap-3 text-[10px] font-mono"
          >
            <span className={`font-bold text-sm ${colors.text}`}>{value}</span>
            <span className="text-slate-600">files</span>
            <span className="text-slate-700">•</span>
            <span className="text-slate-500">{estimateTime(value)} estimated</span>
            <span className="text-slate-700">•</span>
            <span className="text-slate-600">{Math.ceil(value / 15)} rounds × 15 agents</span>
          </motion.div>
        </AnimatePresence>

        <div className={`text-[9px] font-mono font-bold uppercase tracking-widest ${colors.text}`}>
          {tier}
        </div>
      </div>

      {/* ── Info panel ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-2 gap-2">
              {PRESETS.map((p) => {
                const c = TIER_COLORS[p.tier];
                return (
                  <div key={p.value} className={`flex items-center justify-between px-3 py-1.5 rounded-lg ${c.bg} border ${c.border}`}>
                    <span className={`text-[10px] font-mono font-bold ${c.text}`}>{p.value} files</span>
                    <span className="text-[10px] font-mono text-slate-500">{p.hint}</span>
                  </div>
                );
              })}
              <div className="col-span-2 text-[9px] font-mono text-slate-600 mt-1">
                * Times based on 2-3s cooldown per file × 10 API key rotation
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}