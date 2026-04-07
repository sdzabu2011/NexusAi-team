'use client';
import React from 'react';
import { AGENTS } from '@/constants/agents';
import { AgentCard } from './AgentCard';
import type { AgentDef } from '@/types';

interface AgentTeamProps { onAgentClick?: (agent: AgentDef) => void; }

export function AgentTeam({ onAgentClick }: AgentTeamProps) {
  return (
    <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-15 gap-2 w-full max-w-5xl mx-auto">
      {AGENTS.map((agent, i) => (
        <AgentCard key={agent.id} agent={agent} index={i} onClick={onAgentClick} />
      ))}
    </div>
  );
}
