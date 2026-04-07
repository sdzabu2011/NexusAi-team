export interface AgentDef {
  id: number;
  name: string;
  role: string;
  color: string;
  icon: string;
  system: string;
}

export interface GeneratedFile {
  id: string;
  agentId: number;
  agentName: string;
  agentColor: string;
  filename: string;
  content: string;
  language: string;
  timestamp: number;
  linesAdded: number;
}

export interface LogEntry {
  id: string;
  agentId: number;
  agentName: string;
  agentColor: string;
  filename: string;
  snippet: string;
  timestamp: number;
  type: 'write' | 'read' | 'test' | 'deploy' | 'optimize' | 'review';
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: 'openrouter' | 'groq';
  contextLength?: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export type Tab = 'dashboard' | 'files' | 'preview';
