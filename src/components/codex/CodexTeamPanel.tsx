'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Send, Download, Layers, Sparkles,
  FileCode2, Trash2, Copy, Check,
  ChevronDown, Terminal, Globe,
} from 'lucide-react';
import Image from 'next/image';
import { useModelStore } from '@/store/modelStore';
import { AGENTS } from '@/constants/agents';
import { downloadZip } from '@/lib/utils/zipHelper';
import type { AgentDef, ModelInfo } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface CodexFile {
  filename: string;
  content: string;
  language: string;
  agentId: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isCode: boolean;
  codeFile?: CodexFile;
  agentName?: string;
  agentColor?: string;
  error?: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Language → extension map (every major language)
// ─────────────────────────────────────────────────────────────────────────────

const LANG_EXT: Record<string, string> = {
  typescript: 'ts', tsx: 'tsx', javascript: 'js',
  jsx: 'jsx', html: 'html', css: 'css',
  scss: 'scss', sass: 'sass', less: 'less',
  rust: 'rs', go: 'go', cpp: 'cpp',
  c: 'c', csharp: 'cs', java: 'java',
  swift: 'swift', kotlin: 'kt', scala: 'scala',
  python: 'py', ruby: 'rb', php: 'php',
  perl: 'pl', lua: 'lua', luau: 'luau',
  r: 'r', julia: 'jl', matlab: 'm',
  bash: 'sh', sh: 'sh', shell: 'sh',
  powershell: 'ps1', zsh: 'sh',
  sql: 'sql', graphql: 'graphql', json: 'json',
  yaml: 'yaml', yml: 'yaml', toml: 'toml',
  xml: 'xml', markdown: 'md', md: 'md',
  dockerfile: 'dockerfile', nginx: 'conf', prisma: 'prisma',
  proto: 'proto', terraform: 'tf', haskell: 'hs',
  elixir: 'ex', erlang: 'erl', clojure: 'clj',
  dart: 'dart', gdscript: 'gd', glsl: 'glsl',
  hlsl: 'hlsl', wgsl: 'wgsl', solidity: 'sol',
};

// ─────────────────────────────────────────────────────────────────────────────
// Language detection
// ─────────────────────────────────────────────────────────────────────────────

function detectLanguage(text: string): { lang: string; ext: string } {
  // 1. Fenced code block tag — most reliable
  const fenceMatch = text.match(/```(\w+)/);
  if (fenceMatch) {
    const raw = fenceMatch[1].toLowerCase();
    const ext = LANG_EXT[raw] ?? raw;
    return { lang: raw, ext };
  }

  // 2. Heuristic patterns — ordered specific → general
  const patterns: Array<[RegExp, string, string]> = [
    // Luau / Roblox (before Lua)
    [/game:GetService|LocalScript|RemoteEvent|TweenService|workspace\.|Players\.LocalPlayer|Humanoid\.|CharacterAdded/, 'luau', 'luau'],
    // Lua
    [/^local\s+\w|require\s*\(|coroutine\.|io\.read\(\)|love\.|ngx\./, 'lua', 'lua'],
    // Python
    [/^def\s+\w|^class\s+\w.*:|^from\s+\w+\s+import|^import\s+\w|print\(|if\s+__name__|async\s+def\s|@app\.route|FastAPI\(|Django/, 'python', 'py'],
    // Rust
    [/^fn\s+\w|^pub\s+fn\s|^impl\s+|^use\s+std::|^mod\s+\w|^struct\s+\w|^enum\s+\w|\.unwrap\(\)|Result<|Option</, 'rust', 'rs'],
    // Go
    [/^package\s+\w|^func\s+\w|^import\s+\(|^type\s+\w+\s+struct|fmt\.Print|:=\s*&?\w|\bgoroutine\b/, 'go', 'go'],
    // Java
    [/^public\s+class\s+|^import\s+java\.|@Override|System\.out\.print|public\s+static\s+void\s+main/, 'java', 'java'],
    // C#
    [/^using\s+System|^namespace\s+\w|Console\.Write|async\s+Task|\.NET|\[HttpGet\]|\[ApiController\]/, 'csharp', 'cs'],
    // C++
    [/#include\s+<[a-z]+>|std::|cout\s*<<|int\s+main\s*\(|namespace\s+\w|template\s*</, 'cpp', 'cpp'],
    // C (after C++)
    [/#include\s+<stdio|int\s+main\s*\(\s*void\s*\)|printf\s*\(|malloc\s*\(|sizeof\s*\(/, 'c', 'c'],
    // Swift
    [/^import\s+SwiftUI|^import\s+UIKit|@State\s+|@Binding\s+|\.padding\(\)|\.foregroundColor|UIViewController/, 'swift', 'swift'],
    // Kotlin
    [/^fun\s+\w|^val\s+\w|^data\s+class\s+|println\s*\(|@Composable|@ViewModel|suspend\s+fun/, 'kotlin', 'kt'],
    // Ruby
    [/^def\s+\w|^class\s+\w|^module\s+\w|puts\s+|\.each\s*\{|\.map\s*\{|require\s+'|attr_accessor/, 'ruby', 'rb'],
    // PHP
    [/^<\?php|^echo\s+|->|\$this->|namespace\s+App|use\s+App\\|Eloquent|Laravel|Illuminate\\/, 'php', 'php'],
    // SQL
    [/^SELECT\s+|^INSERT\s+INTO\s+|^CREATE\s+TABLE\s+|^ALTER\s+TABLE\s+|^DROP\s+|^UPDATE\s+/i, 'sql', 'sql'],
    // GraphQL
    [/^type\s+Query\s*\{|^type\s+Mutation\s*\{|^schema\s*\{|^query\s*\{|^mutation\s*\{/, 'graphql', 'graphql'],
    // Dockerfile
    [/^FROM\s+\w|^RUN\s+|^CMD\s+|^EXPOSE\s+|^ENV\s+|^COPY\s+|^WORKDIR\s+/, 'dockerfile', 'dockerfile'],
    // Terraform
    [/^resource\s+"|^provider\s+"|^variable\s+"|^output\s+"/, 'terraform', 'tf'],
    // Bash/Shell
    [/^#!\/bin\/(bash|sh|zsh)|^\$\(|export\s+\w+=|chmod\s+|mkdir\s+-p|grep\s+|awk\s+'/, 'bash', 'sh'],
    // HTML
    [/<!DOCTYPE\s+html|<html|<head>|<body>|<div\s|<span\s|<p>/, 'html', 'html'],
    // CSS/SCSS
    [/^[.#]?\w[\w-]*\s*\{|@media\s+|@keyframes\s+|font-family\s*:|margin\s*:|display\s*:/, 'css', 'css'],
    // YAML
    [/^---\n|^[a-z_]+:\s*\n|^\s{2}-\s+\w/, 'yaml', 'yaml'],
    // JSON
    [/^\s*\{[\s\S]*"[\w-]+":\s*[\[{"'\d]/, 'json', 'json'],
    // Prisma
    [/^model\s+\w+\s*\{|^datasource\s+\w+|^generator\s+\w+|@id|@default|@relation/, 'prisma', 'prisma'],
    // TSX / React
    [/import\s+React|React\.FC|jsx|className=|useState\s*\(|useEffect\s*\(|<[A-Z]\w+/, 'tsx', 'tsx'],
    // TypeScript
    [/^import\s+|^export\s+|interface\s+\w|^type\s+\w+\s*=|:\s*string|:\s*number|:\s*boolean/, 'typescript', 'ts'],
    // JavaScript
    [/^const\s+|^let\s+|^var\s+|^function\s+|=>\s*\{|module\.exports|require\s*\(/, 'javascript', 'js'],
  ];

  for (const [pattern, lang, ext] of patterns) {
    if (pattern.test(text)) return { lang, ext };
  }

  return { lang: 'text', ext: 'txt' };
}

// ─────────────────────────────────────────────────────────────────────────────
// Is this a code response?
// ─────────────────────────────────────────────────────────────────────────────

function isCodeResponse(text: string): boolean {
  if (/```[\w]*\n/.test(text)) return true;

  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length < 4) return false;

  const codePatterns = [
    /^(import|export|const|let|var|function|class|interface|type|enum)\s/,
    /^(def |async def |fn |pub fn |func |package |module |local )/,
    /^(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\s/i,
    /^(FROM |RUN |CMD |COPY |WORKDIR |EXPOSE )/,
    /^(#include|#define|using |namespace )/,
    /^(<\?php|<!DOCTYPE|<html)/i,
    /^(public class |private class |protected class )/,
    /\{\s*$/,
    /;\s*$/,
  ];

  const codeLines = lines.filter((l) =>
    codePatterns.some((p) => p.test(l)),
  ).length;

  return codeLines / lines.length > 0.2;
}

// ─────────────────────────────────────────────────────────────────────────────
// Extract code from fenced blocks
// ─────────────────────────────────────────────────────────────────────────────

function extractCode(text: string): string {
  const match = text.match(/```[\w]*\r?\n?([\s\S]*?)```/);
  if (match) return match[1].trim();
  return text.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Smart filename generator — language-aware
// ─────────────────────────────────────────────────────────────────────────────

const BASE_DIRS: Record<string, string> = {
  tsx: 'src/components', jsx: 'src/components',
  ts: 'src/lib', js: 'src/lib',
  py: 'src', rs: 'src',
  go: 'cmd', java: 'src/main/java',
  cs: 'src', cpp: 'src',
  c: 'src', swift: 'Sources',
  kt: 'app/src/main', rb: 'lib',
  php: 'app', lua: 'scripts',
  luau: 'src', sh: 'scripts',
  sql: 'db/migrations', graphql: 'graphql',
  yaml: 'config', toml: 'config',
  json: 'config', dockerfile: '.',
  tf: 'terraform', md: 'docs',
  html: 'public', css: 'styles',
  scss: 'styles', prisma: 'prisma',
  proto: 'proto', gd: 'scripts',
  dart: 'lib', glsl: 'shaders',
  sol: 'contracts',
};

const AGENT_DIR_OVERRIDES: Record<number, Record<string, string>> = {
  1: { tsx: 'src/components/ui', css: 'src/styles', html: 'src/components' },
  2: { ts: 'src/hooks', tsx: 'src/components', js: 'src/utils' },
  3: { ts: 'src/app/api', py: 'api', go: 'api', rs: 'src/api' },
  4: { sql: 'db/migrations', ts: 'src/db', py: 'db', prisma: 'prisma' },
  5: { ts: 'src/lib/auth', py: 'auth', go: 'pkg/auth', rs: 'src/auth' },
  6: { ts: 'src/store', py: 'store', rs: 'src/store' },
  7: { sh: 'scripts', dockerfile: '.', yaml: '.github/workflows', tf: 'terraform' },
  8: { json: '.', yaml: '.', toml: '.', ts: 'src/config', js: '.' },
  9: { tsx: 'src/animations', ts: 'src/lib/animations', py: 'animations', luau: 'animations' },
  10: { tsx: 'src/components/debug', ts: 'src/lib/debug', py: 'debug' },
  11: { ts: 'tests', py: 'tests', rs: 'tests', go: 'tests', java: 'src/test/java' },
  12: { md: 'docs', ts: 'docs' },
  13: { ts: 'src/lib/perf', tsx: 'src/components/preview', py: 'perf', rs: 'benches' },
  14: { ts: 'src/lib', py: 'src/api', graphql: 'graphql', yaml: 'api-spec', proto: 'proto' },
  15: { ts: 'src/seo', py: 'seo', md: 'docs/seo' },
};

const STOP_WORDS = new Set([
  'create', 'make', 'write', 'build', 'generate', 'implement', 'add',
  'with', 'that', 'this', 'for', 'the', 'and', 'using', 'use', 'give',
  'show', 'need', 'want', 'please', 'can', 'could', 'would', 'should',
  'python', 'typescript', 'javascript', 'rust', 'golang', 'java', 'lua',
  'react', 'next', 'node', 'code', 'file', 'script', 'program', 'function',
  'simple', 'basic', 'complete', 'full', 'entire', 'whole',
]);

function generateSmartFilename(
  agent: AgentDef,
  lang: string,
  ext: string,
  userMessage: string,
  existingFiles: CodexFile[],
): string {
  const overrides = AGENT_DIR_OVERRIDES[agent.id] ?? {};
  const dir = overrides[ext] ?? overrides[lang] ?? BASE_DIRS[ext] ?? 'src';

  // Extract meaningful words from the user's request
  const words = userMessage
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  let baseName = words.slice(0, 3).join('-') || agent.name.toLowerCase();

  // Format based on language convention
  if (['tsx', 'jsx', 'swift', 'kt', 'dart'].includes(ext)) {
    // PascalCase for components
    baseName = baseName
      .split(/[-_\s]+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join('');
  } else if (['py', 'rb', 'go', 'rs', 'lua', 'luau', 'c', 'cpp'].includes(ext)) {
    // snake_case for Python, Ruby, Go, Rust, C
    baseName = baseName.replace(/-/g, '_');
  } else if (['java', 'cs', 'kt'].includes(ext)) {
    // PascalCase for Java/C#/Kotlin classes
    baseName = baseName
      .split(/[-_\s]+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join('');
  }
  // kebab-case for others (ts, js, css, yaml, etc.) — already in that format

  // Special files without standard extension display
  let baseFilename: string;
  if (ext === 'dockerfile') {
    baseFilename = `${dir}/Dockerfile`;
  } else if (ext === 'makefile') {
    baseFilename = `${dir}/Makefile`;
  } else {
    baseFilename = `${dir}/${baseName}.${ext}`;
  }

  // Ensure uniqueness
  const existingPaths = new Set(existingFiles.map((f) => f.filename));
  if (!existingPaths.has(baseFilename)) return baseFilename;

  let counter = 2;
  while (true) {
    const candidate = ext === 'dockerfile'
      ? `${dir}/Dockerfile.${counter}`
      : `${dir}/${baseName}_${counter}.${ext}`;
    if (!existingPaths.has(candidate)) return candidate;
    counter++;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AgentAvatar — image with fallback
// ─────────────────────────────────────────────────────────────────────────────

function AgentAvatar({
  agent,
  size = 28,
  className = '',
}: {
  agent: AgentDef;
  size?: number;
  className?: string;
}) {
  const [imgError, setImgError] = useState(false);

  if (!imgError && agent.avatar) {
    return (
      <div
        className={`rounded-lg overflow-hidden flex-shrink-0 ${className}`}
        style={{ width: size, height: size }}
      >
        <Image
          src={agent.avatar}
          alt={agent.name}
          width={size}
          height={size}
          className="object-cover w-full h-full"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg flex items-center justify-center font-black flex-shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.32),
        background: `${agent.color}22`,
        color: agent.color,
        border: `1px solid ${agent.color}44`,
      }}
    >
      {agent.name.slice(0, 2)}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Copy button
// ─────────────────────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(text).catch(() => { });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={copy}
      className="p-1 rounded text-slate-500 hover:text-white transition-colors"
      title="Copy code"
    >
      {copied
        ? <Check className="w-3.5 h-3.5 text-emerald-400" />
        : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Rainbow THINKING animation
// ─────────────────────────────────────────────────────────────────────────────

const RAINBOW = [
  '#ff0080', '#ff4500', '#ffaa00',
  '#00ff88', '#00d4ff', '#8b5cf6',
];

function ThinkingDots({ agent }: { agent: AgentDef }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10">
      <AgentAvatar agent={agent} size={24} />

      <div className="flex items-end gap-[2px]">
        {'THINKING'.split('').map((letter, i) => (
          <motion.span
            key={i}
            className="text-[12px] font-black font-mono leading-none"
            animate={{ color: RAINBOW, y: [0, -5, 0] }}
            transition={{
              duration: 1.4,
              repeat: Infinity,
              delay: i * 0.08,
              ease: 'easeInOut',
            }}
          >
            {letter}
          </motion.span>
        ))}
      </div>

      <div className="flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-1 h-1 rounded-full"
            style={{ background: agent.color }}
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Message bubble
// ─────────────────────────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
  const agent = AGENTS.find((a) => a.name === msg.agentName);

  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm bg-indigo-600/25 border border-indigo-500/30 text-blue-100 whitespace-pre-wrap break-words">
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start gap-2.5">
      {/* Avatar */}
      {agent ? (
        <AgentAvatar agent={agent} size={28} className="mt-0.5" />
      ) : (
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5"
          style={{
            background: `${msg.agentColor ?? '#6366f1'}20`,
            color: msg.agentColor ?? '#6366f1',
            border: `1px solid ${msg.agentColor ?? '#6366f1'}40`,
          }}
        >
          {msg.agentName?.slice(0, 2) ?? '??'}
        </div>
      )}

      <div className="flex-1 min-w-0">
        {msg.isCode && msg.codeFile ? (
          /* Code block */
          <div className="rounded-xl overflow-hidden border border-white/10 shadow-lg">
            {/* Header */}
            <div
              className="flex items-center gap-2 px-3 py-2"
              style={{
                background: `${msg.agentColor ?? '#818cf8'}18`,
                borderBottom: `1px solid ${msg.agentColor ?? '#818cf8'}28`,
              }}
            >
              <FileCode2
                className="w-3.5 h-3.5 flex-shrink-0"
                style={{ color: msg.agentColor ?? '#818cf8' }}
              />
              <span
                className="text-[11px] font-mono font-semibold truncate flex-1"
                style={{ color: msg.agentColor ?? '#818cf8' }}
              >
                {msg.codeFile.filename}
              </span>
              <span className="text-[9px] font-mono text-slate-500 uppercase bg-black/30 px-1.5 py-0.5 rounded">
                {msg.codeFile.language}
              </span>
              <CopyButton text={msg.codeFile.content} />
            </div>

            {/* Code body */}
            <pre className="p-4 text-[11px] leading-relaxed text-slate-300 overflow-x-auto bg-black/50 max-h-96 hide-scrollbar">
              <code>{msg.codeFile.content}</code>
            </pre>

            {/* Footer */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-black/30 border-t border-white/5">
              <span className="text-[9px] font-mono text-slate-600">
                {msg.codeFile.content.split('\n').length} lines
              </span>
              <span className="text-[9px] font-mono text-slate-600">
                {(new TextEncoder().encode(msg.codeFile.content).length / 1024).toFixed(1)} KB
              </span>
            </div>
          </div>
        ) : (
          /* Text bubble */
          <div
            className={[
              'px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm whitespace-pre-wrap break-words leading-relaxed',
              msg.error
                ? 'bg-red-500/10 border border-red-500/20 text-red-300'
                : 'bg-white/5 border border-white/10 text-slate-200',
            ].join(' ')}
          >
            {msg.content}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main CodexTeamPanel
// ─────────────────────────────────────────────────────────────────────────────

const EXAMPLE_PROMPTS = [
  'Write a Python FastAPI JWT authentication endpoint',
  'Create a Rust CLI tool for batch file processing',
  'Build a Go HTTP server with rate limiting middleware',
  'Write Luau script for Roblox character movement system',
  'Create a React hook for infinite scrolling with TypeScript',
  'Write SQL schema for a multi-tenant SaaS application',
  'Build a Dockerfile for Next.js production deployment',
  'Write a Bash script for automated PostgreSQL backups',
];

export function CodexTeamPanel({ open, onClose }: Props) {
  const { models } = useModelStore();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentDef>(AGENTS[0]);
  const [selectedModel, setSelectedModel] = useState<ModelInfo | null>(null);
  const [codeFiles, setCodeFiles] = useState<CodexFile[]>([]);
  const [agentPickerOpen, setAgentPickerOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const msgCounter = useRef(0);

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (models.length > 0 && !selectedModel) {
      setSelectedModel(models[0]);
    }
  }, [models, selectedModel]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  // ── Send ──────────────────────────────────────────────────────────────────

  const send = useCallback(async () => {
    if (!input.trim() || !selectedModel || isLoading) return;

    const userText = input.trim();
    const userMsg: Message = {
      id: `u-${++msgCounter.current}`,
      role: 'user',
      content: userText,
      isCode: false,
    };

    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setIsLoading(true);

    try {
      const chatPayload = history.map((m) => ({
        role: m.role,
        content: m.isCode && m.codeFile ? m.codeFile.content : m.content,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedModel.provider,
          model: selectedModel.id,
          system: selectedAgent.system,
          messages: chatPayload,
          maxTokens: 3000,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error((errData as { error?: string }).error ?? `HTTP ${res.status}`);
      }

      const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
      const raw = data?.choices?.[0]?.message?.content ?? '';
      if (!raw) throw new Error('Empty response from AI');

      const codeDetected = isCodeResponse(raw);
      let assistantMsg: Message;

      if (codeDetected) {
        const { lang, ext } = detectLanguage(raw);
        const cleanCode = extractCode(raw);
        const filename = generateSmartFilename(
          selectedAgent, lang, ext, userText, codeFiles,
        );

        const newFile: CodexFile = {
          filename,
          content: cleanCode,
          language: lang,
          agentId: selectedAgent.id,
        };

        setCodeFiles((prev) => [...prev, newFile]);

        assistantMsg = {
          id: `a-${++msgCounter.current}`,
          role: 'assistant',
          content: cleanCode,
          isCode: true,
          codeFile: newFile,
          agentName: selectedAgent.name,
          agentColor: selectedAgent.color,
        };
      } else {
        assistantMsg = {
          id: `a-${++msgCounter.current}`,
          role: 'assistant',
          content: raw,
          isCode: false,
          agentName: selectedAgent.name,
          agentColor: selectedAgent.color,
        };
      }

      setMessages([...history, assistantMsg]);

    } catch (err) {
      setMessages([...history, {
        id: `e-${++msgCounter.current}`,
        role: 'assistant',
        content: `⚠ ${(err as Error).message}`,
        isCode: false,
        error: true,
        agentName: selectedAgent.name,
        agentColor: selectedAgent.color,
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, selectedModel, isLoading, messages, selectedAgent, codeFiles]);

  // ── Download ──────────────────────────────────────────────────────────────

  const downloadAll = useCallback(async () => {
    if (codeFiles.length === 0) return;
    const files = codeFiles.map((f, i) => ({
      id: `cf-${i}`,
      agentId: f.agentId,
      agentName: selectedAgent.name,
      agentColor: selectedAgent.color,
      filename: f.filename,
      content: f.content,
      language: f.language,
      timestamp: Date.now(),
      linesAdded: f.content.split('\n').length,
    }));
    await downloadZip(files, `codex-${selectedAgent.name.toLowerCase()}`);
  }, [codeFiles, selectedAgent]);

  const clearAll = useCallback(() => {
    setMessages([]);
    setCodeFiles([]);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  if (!open) return null;

  const orModels = models.filter((m) => m.provider === 'openrouter');


  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm"
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-2xl flex flex-col"
            style={{
              background: 'linear-gradient(135deg,#08091a 0%,#0d0f2a 50%,#06081a 100%)',
              borderLeft: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '-20px 0 60px rgba(0,0,0,0.6)',
            }}
          >
            {/* ── Header ─────────────────────────────────────────────────── */}
            <div
              className="flex items-center gap-3 px-5 py-4 flex-shrink-0"
              style={{
                background: 'linear-gradient(90deg,rgba(88,28,135,0.3),rgba(49,46,129,0.3))',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-[0_0_16px_rgba(139,92,246,0.4)]">
                <Layers className="w-5 h-5 text-white" />
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="font-title font-black text-white tracking-wider text-sm leading-none">
                  NexusAI
                  <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
                    -CodexTeam
                  </span>
                </h2>
                <p className="text-[10px] text-slate-500 font-mono mt-1">
                  Any language • Any framework •{' '}
                  <span className="text-purple-400">{codeFiles.length} files</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                {codeFiles.length > 0 && (
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={downloadAll}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold text-purple-300 border border-purple-500/30 bg-purple-900/20 hover:bg-purple-800/30 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    ZIP ({codeFiles.length})
                  </motion.button>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* ── Toolbar ─────────────────────────────────────────────────── */}
            <div className="px-4 py-2.5 border-b border-white/5 flex items-center gap-3 flex-shrink-0 flex-wrap">
              {/* Agent picker */}
              <div className="relative">
                <button
                  onClick={() => setAgentPickerOpen((s) => !s)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/8 transition-all text-xs font-mono"
                >
                  <AgentAvatar agent={selectedAgent} size={20} />
                  <span style={{ color: selectedAgent.color }} className="font-semibold">
                    {selectedAgent.name}
                  </span>
                  <span className="text-slate-500 hidden sm:inline">
                    {selectedAgent.role}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-500" />
                </button>

                <AnimatePresence>
                  {agentPickerOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      className="absolute top-full left-0 mt-1 z-50 bg-[#0d0f2a] border border-white/10 rounded-xl shadow-2xl p-2 grid grid-cols-3 gap-1 w-72"
                    >
                      {AGENTS.map((a) => (
                        <button
                          key={a.id}
                          onClick={() => {
                            setSelectedAgent(a);
                            setAgentPickerOpen(false);
                          }}
                          className={[
                            'flex flex-col items-center gap-1.5 p-2 rounded-lg text-[10px] font-mono transition-all',
                            selectedAgent.id === a.id
                              ? 'text-white'
                              : 'text-slate-500 hover:text-slate-300 hover:bg-white/5',
                          ].join(' ')}
                          style={
                            selectedAgent.id === a.id
                              ? { background: `${a.color}20`, border: `1px solid ${a.color}40` }
                              : {}
                          }
                        >
                          <AgentAvatar agent={a} size={32} />
                          <span className="font-bold" style={{ color: a.color }}>
                            {a.name}
                          </span>
                          <span className="text-[8px] text-center leading-tight opacity-70">
                            {a.role}
                          </span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Model selector */}
              <div className="flex items-center gap-2 ml-auto">
                <Globe className="w-3.5 h-3.5 text-slate-600" />
                <select
                  value={selectedModel?.id ?? ''}
                  onChange={(e) =>
                    setSelectedModel(models.find((m) => m.id === e.target.value) ?? null)
                  }
                  className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px] font-mono text-slate-300 outline-none focus:border-purple-500 max-w-[200px]"
                >
                  {orModels.length > 0 && (
                    <optgroup label="⬡ OpenRouter (Free)">
                      {orModels.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </optgroup>
                  )}
                  <select
                    value={selectedModel?.id ?? ''}
                    onChange={(e) =>
                      setSelectedModel(models.find((m) => m.id === e.target.value) ?? null)
                    }
                    className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px] font-mono text-slate-300 outline-none focus:border-purple-500 max-w-[200px]"
                  >
                    <optgroup label="⬡ OpenRouter (Free)">
                      {models.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </optgroup>
                  </select>
                </select>
              </div>
            </div>

            {/* ── Files bar ───────────────────────────────────────────────── */}
            <AnimatePresence>
              {codeFiles.length > 0 && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="overflow-hidden border-b border-white/5 flex-shrink-0"
                >
                  <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto hide-scrollbar">
                    <Terminal className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                    {codeFiles.map((f, i) => (
                      <div
                        key={i}
                        title={f.filename}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/8 flex-shrink-0"
                      >
                        <FileCode2 className="w-3 h-3 text-purple-400" />
                        <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap">
                          {f.filename.split('/').pop()}
                        </span>
                        <span className="text-[8px] font-mono text-slate-700 uppercase">
                          {f.language}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Messages ────────────────────────────────────────────────── */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 hide-scrollbar min-h-0"
            >
              {/* Welcome */}
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-4 py-8">
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                  >
                    <Sparkles className="w-10 h-10 text-slate-700" />
                  </motion.div>
                  <div className="text-center space-y-1">
                    <p className="text-sm font-mono font-semibold text-slate-500">
                      Any language. Any framework.
                    </p>
                    <p className="text-xs font-mono text-slate-700 max-w-xs">
                      Python, Rust, Go, Lua, Luau, Java, C++, SQL, Bash, Swift…
                      code is auto-detected, properly named and ready to ZIP.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 w-full max-w-sm">
                    {EXAMPLE_PROMPTS.map((ex) => (
                      <button
                        key={ex}
                        onClick={() => { setInput(ex); inputRef.current?.focus(); }}
                        className="text-left px-3 py-2 rounded-lg bg-white/3 border border-white/8 text-[11px] font-mono text-slate-600 hover:text-slate-400 hover:bg-white/5 hover:border-white/15 transition-all"
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Message list */}
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', damping: 24, stiffness: 280 }}
                  >
                    <MessageBubble msg={msg} />
                  </motion.div>
                ))}

                {isLoading && (
                  <motion.div
                    key="thinking"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <ThinkingDots agent={selectedAgent} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Input ───────────────────────────────────────────────────── */}
            <div
              className="px-4 py-3 flex-shrink-0"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex gap-2 items-end">
                <button
                  onClick={clearAll}
                  title="Clear conversation"
                  className="p-2 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="relative flex-1">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    placeholder={`Ask ${selectedAgent.name} to code in any language… (Enter to send)`}
                    rows={3}
                    disabled={isLoading}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-purple-500/60 focus:shadow-[0_0_16px_rgba(139,92,246,0.15)] resize-none font-mono disabled:opacity-50 transition-all"
                  />
                  <span className="absolute bottom-2 right-3 text-[9px] font-mono text-slate-700">
                    Shift+Enter newline
                  </span>
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={send}
                  disabled={!input.trim() || !selectedModel || isLoading}
                  className="p-3 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-[0_0_16px_rgba(139,92,246,0.3)] flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </motion.button>
              </div>

              <div className="flex items-center justify-between mt-2 px-1">
                <span className="text-[9px] font-mono text-slate-700">
                  {selectedAgent.name} • {selectedModel?.name ?? 'No model selected'}
                </span>
                {codeFiles.length > 0 && (
                  <span className="text-[9px] font-mono text-purple-600">
                    {codeFiles.length} file{codeFiles.length !== 1 ? 's' : ''} ready
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}