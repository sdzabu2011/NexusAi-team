export interface AgentDef {
  id:      number;
  name:    string;
  role:    string;
  color:   string;
  icon:    string;
  avatar:  string;
  system:  string;
}

export interface GeneratedFile {
  id:         string;
  agentId:    number;
  agentName:  string;
  agentColor: string;
  filename:   string;
  content:    string;
  language:   string;
  timestamp:  number;
  linesAdded: number;
}

export interface LogEntry {
  id:         string;
  agentId:    number;
  agentName:  string;
  agentColor: string;
  filename:   string;
  snippet:    string;
  timestamp:  number;
  type:       'write' | 'read' | 'test' | 'deploy' | 'optimize' | 'review';
}

export interface ModelInfo {
  id:             string;
  name:           string;
  provider:       'openrouter';
  contextLength?: number;
}

export interface ContentPart {
  type:       string;        // ← string (literal emas)
  text?:      string;
  image_url?: { url: string };
}

export interface ChatMessage {
  role:    'user' | 'assistant' | 'system';
  content: string | ContentPart[];
}

export type Tab = 'dashboard' | 'files' | 'preview';

export interface GenerationStatus {
  phase:    'idle' | 'thinking' | 'generating' | 'synthesizing' | 'done' | 'error';
  message?: string;
  progress: number;
}

export interface ORChatResponse {
  id:      string;
  model:   string;
  choices: Array<{
    message: {
      role:    string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens:     number;
    completion_tokens: number;
    total_tokens:      number;
  };
}