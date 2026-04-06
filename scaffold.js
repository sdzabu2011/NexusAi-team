const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

const dirsToCreate = [
  'components/agents',
  'components/dashboard',
  'components/layout',
  'components/ui',
  'components/canvas',
  'components/video',
  'components/lines',
  'components/codeviewer',
  'store',
  'lib/api',
  'lib/utils',
  'lib/constants',
  'lib/hooks',
  'types',
  'services',
  'assets/icons',
  'styles',
  'config',
  'app/api/models',
  'app/api/generate',
];

dirsToCreate.forEach(dir => {
  fs.mkdirSync(path.join(srcDir, dir), { recursive: true });
});

const defaultAgentContent = (id, name, role) => `"use client";

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

export default function Agent${id}() {
  const { isGenerating, activeAgentId } = useAppStore();
  const isActive = activeAgentId === ${id};
  const Icon = icons[${id} as keyof typeof icons] || Code;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: isActive ? 1.1 : 1 }}
      className={cn(
        "flex flex-col items-center justify-center p-4 rounded-xl border border-white/10 backdrop-blur-md transition-all duration-300",
        isActive ? "bg-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.5)] border-indigo-500/50" : "bg-black/30"
      )}
      id={"agent-" + String(${id})}
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
        <h3 className="text-sm font-bold text-white">${name}</h3>
        <p className="text-xs text-slate-400">${role}</p>
      </div>
      {isActive && (
        <div className="text-[10px] text-indigo-300 mt-1 animate-pulse">Typing code...</div>
      )}
    </motion.div>
  );
}
`;

const agents = [
  { id: 1, name: 'Ava', role: 'UI/UX Designer' },
  { id: 2, name: 'Ben', role: 'Frontend Engineer' },
  { id: 3, name: 'Ciro', role: 'Backend Dev' },
  { id: 4, name: 'Dan', role: 'DevOps Ops' },
  { id: 5, name: 'Eve', role: 'Security Analyst' },
  { id: 6, name: 'Fin', role: 'System Architect' },
  { id: 7, name: 'Gia', role: 'Cloud Specialist' },
  { id: 8, name: 'Hal', role: 'Platform Engineer' },
  { id: 9, name: 'Ian', role: 'QA Tester' },
  { id: 10, name: 'Jax', role: 'Bug Finder' },
  { id: 11, name: 'Kai', role: 'Visual Inspector' },
  { id: 12, name: 'Leo', role: 'Router Manager' },
  { id: 13, name: 'Moe', role: 'Performance Eng' },
  { id: 14, name: 'Ned', role: 'State Manager' },
  { id: 15, name: 'Oli', role: 'Database Admin' },
];

agents.forEach(agent => {
  fs.writeFileSync(
    path.join(srcDir, 'components/agents/Agent' + agent.id + '.tsx'),
    defaultAgentContent(agent.id, agent.name, agent.role)
  );
});

// Create Agent Team container
const agentTeamContent = `"use client";

import React from 'react';
` + agents.map(a => `import Agent${a.id} from './Agent${a.id}';`).join('\n') + `

export default function AgentTeam() {
  return (
    <div className="grid grid-cols-5 gap-4 lg:gap-8 w-full max-w-5xl mx-auto mb-10 z-10 relative">
      ` + agents.map(a => `<Agent${a.id} />`).join('\n      ') + `
    </div>
  );
}
`;
fs.writeFileSync(path.join(srcDir, 'components/agents/AgentTeam.tsx'), agentTeamContent);

// utils
fs.writeFileSync(path.join(srcDir, 'lib/utils/index.ts'), `import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`);

console.log('Successfully scaffolded base structure!');
