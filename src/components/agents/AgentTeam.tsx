'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AGENTS } from '@/constants/agents';
import { AgentCard } from './AgentCard';
import { useAppStore } from '@/store/appStore';
import type { AgentDef } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Particle {
  id:       number;
  fromId:   number;
  toId:     number;
  progress: number; // 0 → 1
  color:    string;
  size:     number;
  speed:    number;
}

interface AgentTeamProps {
  onAgentClick?: (agent: AgentDef) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Bezier helpers
// ─────────────────────────────────────────────────────────────────────────────

function quadBezier(
  t: number,
  x1: number, y1: number,
  cx: number, cy: number,
  x2: number, y2: number,
) {
  const mt = 1 - t;
  return {
    x: mt * mt * x1 + 2 * mt * t * cx + t * t * x2,
    y: mt * mt * y1 + 2 * mt * t * cy + t * t * y2,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Rainbow THINKING letters
// ─────────────────────────────────────────────────────────────────────────────

const RAINBOW = [
  '#ff0080', '#ff4500', '#ffd700',
  '#00ff88', '#00d4ff', '#8b5cf6',
];

function ThinkingBadge({ agent }: { agent: AgentDef }) {
  const letters = 'THINKING'.split('');
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, y: 8 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      className="flex items-center gap-3 px-5 py-2 rounded-full backdrop-blur-md"
      style={{
        background: `${agent.color}12`,
        border: `1px solid ${agent.color}30`,
        boxShadow: `0 0 24px ${agent.color}20`,
      }}
    >
      {/* Agent chip */}
      <div
        className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold"
        style={{ background: `${agent.color}22`, color: agent.color }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ background: agent.color }}
        />
        {agent.name}
      </div>

      {/* Rainbow letters */}
      <div className="flex items-end gap-[1px]">
        {letters.map((letter, i) => (
          <motion.span
            key={i}
            className="text-[13px] font-black font-mono leading-none"
            animate={{
              color: RAINBOW,
              y: [0, -6, 0],
              scale: [1, 1.15, 1],
            }}
            transition={{
              duration: 1.6,
              repeat: Infinity,
              delay: i * 0.09,
              ease: 'easeInOut',
            }}
          >
            {letter}
          </motion.span>
        ))}
      </div>

      {/* Animated dots */}
      <div className="flex gap-0.5 items-center">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1 h-1 rounded-full"
            style={{ background: agent.color }}
            animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AgentTeam component
// ─────────────────────────────────────────────────────────────────────────────

export function AgentTeam({ onAgentClick }: AgentTeamProps) {
  const { activeAgentId, isGenerating, thinkingAgentId } = useAppStore();

  const containerRef  = useRef<HTMLDivElement>(null);
  const svgRef        = useRef<SVGSVGElement>(null);
  const cardRects     = useRef<Map<number, DOMRect>>(new Map());
  const particles     = useRef<Particle[]>([]);
  const particleIdRef = useRef(0);
  const rafRef        = useRef<number>();
  const lastTimeRef   = useRef<number>(0);
  const [, forceUpdate] = useState(0);

  // ── Measure card positions ─────────────────────────────────────────────────
  const measureCards = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const map = new Map<number, DOMRect>();
    container.querySelectorAll<HTMLElement>('[data-agent-id]').forEach((el) => {
      const id = Number(el.dataset.agentId);
      map.set(id, el.getBoundingClientRect());
    });
    cardRects.current = map;
  }, []);

  useEffect(() => {
    measureCards();
    const ro = new ResizeObserver(measureCards);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', measureCards);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measureCards);
    };
  }, [measureCards]);

  // ── Particle animation loop ────────────────────────────────────────────────
  useEffect(() => {
    if (!isGenerating) {
      particles.current = [];
      forceUpdate((n) => n + 1);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    const tick = (now: number) => {
      const dt = Math.min((now - (lastTimeRef.current || now)) / 1000, 0.1);
      lastTimeRef.current = now;

      // Move existing particles
      particles.current = particles.current
        .map((p) => ({ ...p, progress: p.progress + dt * p.speed }))
        .filter((p) => p.progress < 1);

      // Spawn new particles (~3 per second)
      if (activeAgentId && Math.random() < dt * 3) {
        const fromAgent = AGENTS.find((a) => a.id === activeAgentId);
        if (fromAgent) {
          // Pick a random target (not same as source)
          const others = AGENTS.filter((a) => a.id !== activeAgentId);
          const toAgent = others[Math.floor(Math.random() * others.length)];
          particles.current.push({
            id:       ++particleIdRef.current,
            fromId:   fromAgent.id,
            toId:     toAgent.id,
            progress: 0,
            color:    fromAgent.color,
            size:     1.5 + Math.random() * 2,
            speed:    0.6 + Math.random() * 0.8,
          });
        }
      }

      // Cap at 30 particles
      if (particles.current.length > 30) {
        particles.current = particles.current.slice(-30);
      }

      forceUpdate((n) => n + 1);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isGenerating, activeAgentId]);

  // ── Render particle paths ─────────────────────────────────────────────────
  const containerRect = containerRef.current?.getBoundingClientRect();

  const thinkingAgent = thinkingAgentId
    ? AGENTS.find((a) => a.id === thinkingAgentId)
    : null;

  return (
    <div className="relative select-none">
      {/* ── SVG particle overlay ──────────────────────────────────────────── */}
      {containerRect && (
        <svg
          ref={svgRef}
          className="absolute pointer-events-none z-10"
          style={{
            left: 0, top: 0,
            width:  containerRect.width,
            height: containerRect.height,
          }}
        >
          <defs>
            {AGENTS.map((a) => (
              <radialGradient key={a.id} id={`rg-${a.id}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%"   stopColor={a.color} stopOpacity="1" />
                <stop offset="100%" stopColor={a.color} stopOpacity="0" />
              </radialGradient>
            ))}
          </defs>

          {particles.current.map((p) => {
            const fromRect = cardRects.current.get(p.fromId);
            const toRect   = cardRects.current.get(p.toId);
            if (!fromRect || !toRect || !containerRect) return null;

            const ox = containerRect.left;
            const oy = containerRect.top;

            const x1 = fromRect.left - ox + fromRect.width  / 2;
            const y1 = fromRect.top  - oy + fromRect.height / 2;
            const x2 = toRect.left   - ox + toRect.width    / 2;
            const y2 = toRect.top    - oy + toRect.height   / 2;

            // Control point: arc upward
            const cx = (x1 + x2) / 2;
            const cy = Math.min(y1, y2) - Math.abs(x2 - x1) * 0.25 - 20;

            const pos = quadBezier(p.progress, x1, y1, cx, cy, x2, y2);
            const trail = quadBezier(
              Math.max(0, p.progress - 0.15),
              x1, y1, cx, cy, x2, y2,
            );

            const alpha = Math.sin(p.progress * Math.PI); // fade in/out

            return (
              <g key={p.id} opacity={alpha}>
                {/* Path trail */}
                <path
                  d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
                  stroke={p.color}
                  strokeWidth="0.8"
                  strokeOpacity={0.12 * alpha}
                  fill="none"
                  strokeDasharray="3 5"
                />
                {/* Trail dot */}
                <circle
                  cx={trail.x} cy={trail.y}
                  r={p.size * 0.6}
                  fill={p.color}
                  opacity={0.3 * alpha}
                />
                {/* Glow halo */}
                <circle
                  cx={pos.x} cy={pos.y}
                  r={p.size * 3}
                  fill={`url(#rg-${p.fromId})`}
                  opacity={0.5 * alpha}
                />
                {/* Core dot */}
                <circle
                  cx={pos.x} cy={pos.y}
                  r={p.size}
                  fill={p.color}
                  opacity={alpha}
                />
              </g>
            );
          })}
        </svg>
      )}

      {/* ── Agent grid ───────────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-15 gap-2 w-full max-w-5xl mx-auto"
      >
        {AGENTS.map((agent, i) => {
          const isActive   = activeAgentId   === agent.id;
          const isThinking = thinkingAgentId === agent.id;

          return (
            <div
              key={agent.id}
              data-agent-id={agent.id}
              className="relative"
            >
              {/* Active agent glow ring */}
              <AnimatePresence>
                {isActive && !isThinking && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    className="absolute inset-[-2px] rounded-xl pointer-events-none z-20"
                    style={{
                      boxShadow: `0 0 0 2px ${agent.color}bb, 0 0 16px ${agent.color}55`,
                    }}
                  />
                )}
              </AnimatePresence>

              {/* Thinking rainbow ring */}
              <AnimatePresence>
                {isThinking && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-[-3px] rounded-xl pointer-events-none z-20 thinking-ring"
                  />
                )}
              </AnimatePresence>

              {/* Thinking pulse halo */}
              <AnimatePresence>
                {isThinking && (
                  <motion.div
                    initial={{ opacity: 0, scale: 1 }}
                    animate={{ opacity: [0, 0.4, 0], scale: [1, 1.4, 1] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                    className="absolute inset-0 rounded-xl pointer-events-none z-10"
                    style={{ background: `radial-gradient(circle, ${agent.color}44, transparent 70%)` }}
                  />
                )}
              </AnimatePresence>

              <AgentCard agent={agent} index={i} onClick={onAgentClick} />
            </div>
          );
        })}
      </div>

      {/* ── Thinking badge ───────────────────────────────────────────────── */}
      <div className="flex justify-center mt-4 min-h-[40px]">
        <AnimatePresence mode="wait">
          {thinkingAgent ? (
            <ThinkingBadge key={thinkingAgent.id} agent={thinkingAgent} />
          ) : isGenerating ? (
            <motion.p
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-[10px] font-mono text-slate-700 tracking-widest uppercase"
            >
              agents processing…
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}