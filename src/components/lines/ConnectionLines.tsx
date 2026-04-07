'use client';
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/store/appStore';

interface Line { id: number; x1: number; y1: number; x2: number; y2: number; }

export function ConnectionLines() {
  const activeAgentId = useAppStore((s) => s.activeAgentId);
  const isGenerating  = useAppStore((s) => s.isGenerating);
  const [lines, setLines] = useState<Line[]>([]);

  useEffect(() => {
    const update = () => {
      const db = document.getElementById('main-dashboard');
      if (!db) return;
      const { left: dx, top: dy, width: dw, height: dh } = db.getBoundingClientRect();
      const cx = dx + dw / 2;
      const cy = dy + dh / 2;
      const newLines: Line[] = [];
      for (let i = 1; i <= 15; i++) {
        const el = document.getElementById(`agent-${i}`);
        if (!el) continue;
        const { left, top, width, height } = el.getBoundingClientRect();
        newLines.push({ id: i, x1: left + width / 2, y1: top + height / 2, x2: cx, y2: cy });
      }
      setLines(newLines);
    };
    update();
    window.addEventListener('resize', update);
    const t = setInterval(update, 500);
    return () => { window.removeEventListener('resize', update); clearInterval(t); };
  }, []);

  return (
    <svg className="fixed inset-0 w-full h-full pointer-events-none z-10" aria-hidden>
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      {lines.map((l) => {
        const isActive = activeAgentId === l.id && isGenerating;
        return (
          <g key={l.id}>
            <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
              stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            {isActive && (
              <motion.line
                x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                stroke="rgba(99,102,241,0.85)"
                strokeWidth="2"
                strokeDasharray="16 800"
                strokeLinecap="round"
                filter="url(#glow)"
                initial={{ strokeDashoffset: 800 }}
                animate={{ strokeDashoffset: 0 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
