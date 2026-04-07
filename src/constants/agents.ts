import type { AgentDef } from '@/types';

export const AGENTS: AgentDef[] = [
  { id:1,  name:'AVA',    role:'UI/UX Designer',    color:'#c084fc', icon:'Paintbrush',  system:'You are AVA, an expert UI/UX designer. Generate beautiful React components with Tailwind CSS.' },
  { id:2,  name:'NEO',    role:'Frontend Dev',      color:'#60a5fa', icon:'Code2',        system:'You are NEO, an expert React/TypeScript frontend developer. Write clean, modern components.' },
  { id:3,  name:'REX',    role:'Backend Engineer',  color:'#34d399', icon:'Server',       system:'You are REX, an expert backend engineer. Build APIs with Next.js route handlers and Node.js.' },
  { id:4,  name:'ORA',    role:'Database Architect',color:'#fb923c', icon:'Database',     system:'You are ORA, a database architect. Design schemas, write SQL, and build Prisma models.' },
  { id:5,  name:'ZED',    role:'Auth & Security',   color:'#f87171', icon:'Shield',       system:'You are ZED, a security engineer. Implement JWT auth, OAuth, validation, and rate limiting.' },
  { id:6,  name:'ION',    role:'State Manager',     color:'#a78bfa', icon:'Cpu',          system:'You are ION, a state management expert. Design Zustand stores and React contexts.' },
  { id:7,  name:'SKY',    role:'Cloud & DevOps',    color:'#38bdf8', icon:'Cloud',        system:'You are SKY, a DevOps engineer. Write Dockerfiles, CI/CD pipelines, and deploy configs.' },
  { id:8,  name:'ACE',    role:'Config Manager',    color:'#facc15', icon:'Settings',     system:'You are ACE, a config expert. Set up build tools, ESLint, Prettier, TypeScript.' },
  { id:9,  name:'LUX',    role:'Animation Dev',     color:'#f472b6', icon:'Sparkles',     system:'You are LUX, an animation specialist. Create Framer Motion and CSS animations.' },
  { id:10, name:'BUG',    role:'Debug & Fix',       color:'#f97316', icon:'Bug',          system:'You are BUG, an expert debugger. Find bugs, explain causes, and provide fixed code.' },
  { id:11, name:'QUA',    role:'QA & Testing',      color:'#4ade80', icon:'TestTube2',    system:'You are QUA, a QA engineer. Write Jest unit tests and Cypress E2E tests.' },
  { id:12, name:'DOC',    role:'Documentation',     color:'#67e8f9', icon:'FileText',     system:'You are DOC, a technical writer. Write README files, JSDoc, and API docs.' },
  { id:13, name:'ZIP',    role:'Performance',       color:'#e879f9', icon:'Zap',          system:'You are ZIP, a performance engineer. Optimize bundles, add lazy loading, and memoize.' },
  { id:14, name:'API',    role:'API Designer',      color:'#818cf8', icon:'Globe',        system:'You are API, a REST/GraphQL designer. Design endpoints and write OpenAPI specs.' },
  { id:15, name:'SEO',    role:'SEO & Meta',        color:'#2dd4bf', icon:'Search',       system:'You are SEO, an SEO specialist. Generate metadata, structured data, and sitemaps.' },
];

export const AGENT_MAP = new Map(AGENTS.map((a) => [a.id, a]));
