'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useAppStore } from '@/store/appStore';
import { cn } from '@/lib/utils/cn';
import type { AgentDef } from '@/types';

interface AgentCardProps {
  agent:    AgentDef;
  index:    number;
  onClick?: (agent: AgentDef) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Avatar — shows image if available, falls back to initials
// ─────────────────────────────────────────────────────────────────────────────

function AgentAvatar({
  agent,
  isActive,
  isGenerating,
}: {
  agent:       AgentDef;
  isActive:    boolean;
  isGenerating: boolean;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="relative mb-2">
      {/* Avatar container */}
      <div
        className="w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center font-title font-bold text-sm transition-all duration-300"
        style={{
          background: imgError || !agent.avatar
            ? (isActive ? `${agent.color}22` : 'rgba(255,255,255,0.04)')
            : undefined,
          color:     isActive ? agent.color : '#8899bb',
          border:    `1px solid ${isActive ? agent.color + '55' : 'transparent'}`,
          boxShadow: isActive ? `0 0 12px ${agent.color}55` : 'none',
        }}
      >
        {!imgError && agent.avatar ? (
          <Image
            src={agent.avatar}
            alt={agent.name}
            width={36}
            height={36}
            className="object-cover w-full h-full"
            onError={() => setImgError(true)}
          />
        ) : (
          <span>{agent.name.slice(0, 2)}</span>
        )}
      </div>

      {/* Active ping indicator */}
      {isActive && isGenerating && (
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ background: agent.color }}
          />
          <span
            className="relative inline-flex rounded-full h-3 w-3"
            style={{ background: agent.color }}
          />
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AgentCard
// ─────────────────────────────────────────────────────────────────────────────

export function AgentCard({ agent, index, onClick }: AgentCardProps) {
  const activeAgentId  = useAppStore((s) => s.activeAgentId);
  const isGenerating   = useAppStore((s) => s.isGenerating);
  const thinkingAgentId = useAppStore((s) => s.thinkingAgentId);

  const isActive    = activeAgentId   === agent.id;
  const isThinking  = thinkingAgentId === agent.id;

  return (
    <motion.div
      id={`agent-${agent.id}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{
        opacity: 1,
        scale: isActive ? 1.08 : 1,
      }}
      transition={{
        delay:     index * 0.04,
        type:      'spring',
        damping:   16,
        stiffness: 240,
      }}
      onClick={() => onClick?.(agent)}
      className={cn(
        'relative flex flex-col items-center justify-center p-3 rounded-xl border',
        'cursor-pointer transition-all duration-300 select-none backdrop-blur-md',
        isActive
          ? 'bg-indigo-950/60 border-opacity-80 shadow-[0_0_24px_var(--agent-glow)]'
          : 'bg-black/30 border-white/8 hover:bg-white/5 hover:border-white/20',
      )}
      style={{
        borderColor:                isActive ? agent.color : undefined,
        ['--agent-glow' as string]: agent.color + '80',
      }}
    >
      {/* Top color strip */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl transition-opacity duration-300"
        style={{
          background: agent.color,
          opacity:    isActive ? 1 : 0.3,
        }}
      />

      {/* Avatar */}
      <AgentAvatar
        agent={agent}
        isActive={isActive}
        isGenerating={isGenerating}
      />

      {/* Name */}
      <p className="text-white text-[11px] font-title font-bold tracking-wider leading-none">
        {agent.name}
      </p>

      {/* Role */}
      <p className="text-slate-500 text-[9px] mt-0.5 text-center leading-tight">
        {agent.role}
      </p>

      {/* Status indicators */}
      {isThinking && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[8px] font-mono mt-1"
          style={{ color: agent.color }}
        >
          ◈ thinking
        </motion.p>
      )}

      {isActive && !isThinking && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[9px] font-mono mt-1 animate-pulse"
          style={{ color: agent.color }}
        >
          ● coding…
        </motion.p>
      )}
    </motion.div>
  );
}