"use client";

import React, { useEffect, useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { motion } from 'framer-motion';

export default function ConnectionLines() {
  const { activeAgentId, isGenerating } = useAppStore();
  const [lines, setLines] = useState<{ id: number, x1: number, y1: number, x2: number, y2: number }[]>([]);

  useEffect(() => {
    // A simplified tracker that looks for all agents and dashboard DOM elements and calculates coords
    const updateLines = () => {
      const db = document.getElementById('main-dashboard');
      if (!db) return;
      const dbRect = db.getBoundingClientRect();
      const centerX = dbRect.left + dbRect.width / 2;
      const centerY = dbRect.top + dbRect.height / 2;

      const newLines = [];
      for (let i = 1; i <= 15; i++) {
        const agent = document.getElementById(`agent-${i}`);
        if (agent) {
          const aRect = agent.getBoundingClientRect();
          newLines.push({
            id: i,
            x1: aRect.left + aRect.width / 2,
            y1: aRect.top + aRect.height / 2,
            x2: centerX,
            y2: centerY
          });
        }
      }
      setLines(newLines);
    };

    updateLines();
    window.addEventListener('resize', updateLines);
    return () => window.removeEventListener('resize', updateLines);
  }, []);

  return (
    <svg className="fixed inset-0 w-full h-full pointer-events-none z-0" style={{ zIndex: 0 }}>
      {lines.map((l) => {
        const isActive = activeAgentId === l.id;
        return (
          <g key={l.id}>
            {/* The stationary background line */}
            <line
              x1={l.x1}
              y1={l.y1}
              x2={l.x2}
              y2={l.y2}
              stroke="rgba(255, 255, 255, 0.05)"
              strokeWidth="1"
            />
            {/* The active animation beam */}
            {isActive && isGenerating && (
              <motion.line
                x1={l.x1}
                y1={l.y1}
                x2={l.x2}
                y2={l.y2}
                stroke="rgba(99, 102, 241, 0.8)" // indigo-500
                strokeWidth="2"
                strokeDasharray="20 1000"
                initial={{ strokeDashoffset: 1000 }}
                animate={{ strokeDashoffset: 0 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
