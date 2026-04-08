'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Send, Download, Layers, Sparkles,
  FileCode2, Trash2, Bot, Copy, Check,
  ChevronDown, Terminal, Globe,
} from 'lucide-react';
import { useModelStore } from '@/store/modelStore';
import { AGENTS } from '@/constants/agents';
import { downloadZip } from '@/lib/utils/zipHelper';
import type { AgentDef, ModelInfo } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface CodexFile {
  filename: string;
  content:  string;
  language: string;
  agentId:  number;
}

interface Message {
  id:         string;
  role:       'user' | 'assistant';
  content:    string;
  isCode:     boolean;
  codeFile?:  CodexFile;
  agentName?: string;
  agentColor?: string;
  error?:     boolean;
}

interface Props {
  open:    boolean;
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Language detection
// ─────────────────────────────────────────────────────────────────────────────

const LANG_EXTENSIONS: Record<string, string> = {
  typescript: 'ts', tsx: 'tsx', javascript: 'js', jsx: 'jsx',
  python: 'py', rust: 'rs', go: 'go', java: 'java',
  css: 'css', html: 'html', sql: 'sql', bash: 'sh',
  sh: 'sh', yaml: 'yaml', yml: 'yaml', json: 'json',
  markdown: 'md', md: 'md', prisma: 'prisma', graphql: 'graphql',
  cpp: 'cpp', c: 'c', csharp: 'cs', php: 'php', ruby: 'rb',
  swift: 'swift', kotlin: 'kt', scala: 'scala', r: 'r',
  dockerfile: 'dockerfile', nginx: 'conf', toml: 'toml',
};

function detectLanguage(text: string): { lang: string; ext: string } {
  const match = text.match(/^```(\w+)/m);
  if (match) {
    const raw = match[1].toLowerCase();
    return { lang: raw, ext: LANG_EXTENSIONS[raw] ?? raw };
  }
  // Heuristic detection
  if (/import React|jsx|tsx|className=/.test(text))  return { lang: 'tsx',        ext: 'tsx' };
  if (/^import |^export |interface |^type /.test(text)) return { lang: 'typescript', ext: 'ts' };
  if (/def |import |print\(|__name__/.test(text))    return { lang: 'python',     ext: 'py' };
  if (/fn |pub |use std|impl /.test(text))            return { lang: 'rust',       ext: 'rs' };
  if (/^func |package main/.test(text))               return { lang: 'go',         ext: 'go' };
  if (/SELECT |CREATE TABLE|INSERT INTO/i.test(text)) return { lang: 'sql',        ext: 'sql' };
  if (/<html|<div|<body/.test(text))                  return { lang: 'html',       ext: 'html' };
  return { lang: 'typescript', ext: 'ts' };
}

function isCodeResponse(text: string): boolean {
  if (/```[\w]*\n/.test(text)) return true;
  const lines = text.split('\n');
  if (lines.length < 5) return false;
  const codePatterns = [
    /^(import|export|const|let|var|function|class|interface|type) /,
    /^(def |fn |pub |use |#include|package |module )/,
    /^(SELECT|CREATE|INSERT|UPDATE|DELETE)/i,
    /[{};]\s*$/,
  ];
  const codeLines = lines.filter((l) => codePatterns.some((p) => p.test(l)));
  return codeLines.length / lines.length > 0.3;
}

function extractCode(text: string): string {
  // Remove fenced code blocks
  const match = text.match(/```[\w]*\n?([\s\S]*?)```/);
  if (match) return match[1].trim();
  return text.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Filename generator — smart, context-aware, unique
// ─────────────────────────────────────────────────────────────────────────────

const AGENT_DIRS: Record<number, string> = {
  1:  'src/components/ui',
  2:  'src/hooks',
  3:  'src/app/api',
  4:  'src/db',
  5:  'src/lib/auth',
  6:  'src/store',
  7:  'scripts',
  8:  'src/config',
  9:  'src/animations',
  10: 'src/components/dashboard',
  11: 'tests',
  12: 'docs',
  13: 'src/components/preview',
  14: 'src/lib',
  15: 'src/seo',
};

function generateSmartFilename(
  agent: AgentDef,
  lang: string,
  ext: string,
  userMessage: string,
  existingFiles: CodexFile[],
): string {
  const dir = AGENT_DIRS[agent.id] ?? 'src';

  // Try to extract a meaningful name from user's message
  const words = userMessage
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !['create', 'make', 'write', 'build', 'generate', 'with', 'that', 'this', 'for', 'the'].includes(w));

  let baseName = words.slice(0, 2).join('-') || agent.name.toLowerCase();

  // PascalCase for React components
  if (ext === 'tsx' || ext === 'jsx') {
    baseName = baseName
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join('');
  }

  let candidate = `${dir}/${baseName}.${ext}`;

  // Ensure uniqueness
  const existingPaths = new Set(existingFiles.map((f) => f.filename));
  let counter = 1;
  while (existingPaths.has(candidate)) {
    candidate = `${dir}/${baseName}-${counter}.${ext}`;
    counter++;
  }

  return candidate;
}

// ─────────────────────────────────────────────────────────────────────────────
// Copy button
// ─────────────────────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="p-1 rounded text-slate-500 hover:text-white transition-colors"
      title="Copy code"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ThinkingDots — rainbow THINKING animation
// ─────────────────────────────────────────────────────────────────────────────

const RAINBOW_COLORS = [
  '#ff0080', '#ff4500', '#ffaa00',
  '#00ff88', '#00d4ff', '#8b5cf6',
];

function ThinkingDots({ agent }: { agent: AgentDef }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10">
      <div
        className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold flex-shrink-0"
        style={{ background: `${agent.color}22`, color: agent.color }}
      >
        {agent.name.slice(0, 2)}
      </div>
      <div className="flex items-end gap-[2px]">
        {'THINKING'.split('').map((l, i) => (
          <motion.span
            key={i}
            className="text-[12px] font-black font-mono leading-none"
            animate={{
              color: RAINBOW_COLORS,
              y: [0, -5, 0],
            }}
            transition={{
              duration: 1.4,
              repeat: Infinity,
              delay: i * 0.08,
              ease: 'easeInOut',
            }}
          >
            {l}
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
      {/* Agent avatar */}
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5"
        style={{
          background: `${msg.agentColor}20`,
          color: msg.agentColor,
          border: `1px solid ${msg.agentColor}40`,
        }}
      >
        {msg.agentName?.slice(0, 2)}
      </div>

      <div className="flex-1 min-w-0">
        {msg.isCode && msg.codeFile ? (
          <div className="rounded-xl overflow-hidden border border-white/10 shadow-lg">
            {/* File header */}
            <div
              className="flex items-center gap-2 px-3 py-2"
              style={{
                background: `${msg.agentColor}18`,
                borderBottom: `1px solid ${msg.agentColor}28`,
              }}
            >
              <FileCode2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: msg.agentColor }} />
              <span
                className="text-[11px] font-mono font-semibold truncate flex-1"
                style={{ color: msg.agentColor }}
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
          <div
            className={`px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm whitespace-pre-wrap break-words leading-relaxed ${
              msg.error
                ? 'bg-red-500/10 border border-red-500/20 text-red-300'
                : 'bg-white/5 border border-white/10 text-slate-200'
            }`}
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

export function CodexTeamPanel({ open, onClose }: Props) {
  const { models } = useModelStore();

  const [messages,       setMessages]       = useState<Message[]>([]);
  const [input,          setInput]          = useState('');
  const [isLoading,      setIsLoading]      = useState(false);
  const [selectedAgent,  setSelectedAgent]  = useState<AgentDef>(AGENTS[0]);
  const [selectedModel,  setSelectedModel]  = useState<ModelInfo | null>(null);
  const [codeFiles,      setCodeFiles]      = useState<CodexFile[]>([]);
  const [agentPickerOpen, setAgentPickerOpen] = useState(false);

  const scrollRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const msgCounter = useRef(0);

  // ── Auto-select first model ───────────────────────────────────────────────
  useEffect(() => {
    if (models.length > 0 && !selectedModel) {
      setSelectedModel(models[0]);
    }
  }, [models, selectedModel]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // ── Focus input when panel opens ──────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  // ── Send message ──────────────────────────────────────────────────────────
  const send = useCallback(async () => {
    if (!input.trim() || !selectedModel || isLoading) return;

    const userText = input.trim();
    const userMsg: Message = {
      id:      `u-${++msgCounter.current}`,
      role:    'user',
      content: userText,
      isCode:  false,
    };

    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    setInput('');
    setIsLoading(true);

    try {
      const chatPayload = updatedHistory.map((m) => ({
        role:    m.role,
        content: m.isCode && m.codeFile ? m.codeFile.content : m.content,
      }));

      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider:  selectedModel.provider,
          model:     selectedModel.id,
          system:    selectedAgent.system,
          messages:  chatPayload,
          maxTokens: 3000,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error ?? `HTTP ${res.status}`);
      }

      const data = await res.json();
      const raw: string = data?.choices?.[0]?.message?.content ?? '';

      if (!raw) throw new Error('Empty response from AI');

      const codeDetected = isCodeResponse(raw);
      let assistantMsg: Message;

      if (codeDetected) {
        const { lang, ext }  = detectLanguage(raw);
        const cleanCode      = extractCode(raw);
        const filename       = generateSmartFilename(
          selectedAgent, lang, ext, userText, codeFiles,
        );

        const newFile: CodexFile = {
          filename,
          content:  cleanCode,
          language: lang,
          agentId:  selectedAgent.id,
        };

        setCodeFiles((prev) => [...prev, newFile]);

        assistantMsg = {
          id:         `a-${++msgCounter.current}`,
          role:       'assistant',
          content:    cleanCode,
          isCode:     true,
          codeFile:   newFile,
          agentName:  selectedAgent.name,
          agentColor: selectedAgent.color,
        };
      } else {
        assistantMsg = {
          id:         `a-${++msgCounter.current}`,
          role:       'assistant',
          content:    raw,
          isCode:     false,
          agentName:  selectedAgent.name,
          agentColor: selectedAgent.color,
        };
      }

      setMessages([...updatedHistory, assistantMsg]);

    } catch (err) {
      const errMsg: Message = {
        id:         `e-${++msgCounter.current}`,
        role:       'assistant',
        content:    `⚠ ${(err as Error).message}`,
        isCode:     false,
        error:      true,
        agentName:  selectedAgent.name,
        agentColor: selectedAgent.color,
      };
      setMessages([...updatedHistory, errMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [input, selectedModel, isLoading, messages, selectedAgent, codeFiles]);

  // ── Download all code files ───────────────────────────────────────────────
  const downloadAll = useCallback(async () => {
    if (codeFiles.length === 0) return;
    const files = codeFiles.map((f, i) => ({
      id:         `cf-${i}`,
      agentId:    f.agentId,
      agentName:  selectedAgent.name,
      agentColor: selectedAgent.color,
      filename:   f.filename,
      content:    f.content,
      language:   f.language,
      timestamp:  Date.now(),
      linesAdded: f.content.split('\n').length,
    }));
    await downloadZip(files, `codex-${selectedAgent.name.toLowerCase()}`);
  }, [codeFiles, selectedAgent]);

  const clearAll = () => {
    setMessages([]);
    setCodeFiles([]);
  };

  if (!open) return null;

  const orModels = models.filter((m) => m.provider === 'openrouter');
  const gqModels = models.filter((m) => m.provider === 'groq');

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
              background: 'linear-gradient(135deg, #08091a 0%, #0d0f2a 50%, #06081a 100%)',
              borderLeft: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '-20px 0 60px rgba(0,0,0,0.6)',
            }}
          >
            {/* ── Header ──────────────────────────────────────────────────── */}
            <div
              className="flex items-center gap-3 px-5 py-4 flex-shrink-0"
              style={{
                background: 'linear-gradient(90deg, rgba(88,28,135,0.3), rgba(49,46,129,0.3))',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {/* Logo */}
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
                  Code workspace •{' '}
                  <span className="text-purple-400">{codeFiles.length} files</span>
                  {' '}generated
                </p>
              </div>

              {/* Actions */}
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

            {/* ── Toolbar: Agent + Model ───────────────────────────────────── */}
            <div className="px-4 py-2.5 border-b border-white/5 flex items-center gap-3 flex-shrink-0 flex-wrap">
              {/* Agent selector */}
              <div className="relative">
                <button
                  onClick={() => setAgentPickerOpen((s) => !s)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/8 transition-all text-xs font-mono"
                >
                  <div
                    className="w-4 h-4 rounded flex items-center justify-center text-[8px] font-black"
                    style={{ background: `${selectedAgent.color}22`, color: selectedAgent.color }}
                  >
                    {selectedAgent.name.slice(0, 1)}
                  </div>
                  <span style={{ color: selectedAgent.color }} className="font-semibold">
                    {selectedAgent.name}
                  </span>
                  <span className="text-slate-500">{selectedAgent.role}</span>
                  <ChevronDown className="w-3 h-3 text-slate-500" />
                </button>

                <AnimatePresence>
                  {agentPickerOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      className="absolute top-full left-0 mt-1 z-50 bg-[#0d0f2a] border border-white/10 rounded-xl shadow-2xl p-2 grid grid-cols-3 gap-1 w-64"
                    >
                      {AGENTS.map((a) => (
                        <button
                          key={a.id}
                          onClick={() => {
                            setSelectedAgent(a);
                            setAgentPickerOpen(false);
                          }}
                          className={`flex flex-col items-center gap-1 p-2 rounded-lg text-[10px] font-mono transition-all ${
                            selectedAgent.id === a.id
                              ? 'text-white'
                              : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                          }`}
                          style={
                            selectedAgent.id === a.id
                              ? { background: `${a.color}20`, border: `1px solid ${a.color}40` }
                              : {}
                          }
                        >
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
                  {gqModels.length > 0 && (
                    <optgroup label="⚡ Groq">
                      {gqModels.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
            </div>

            {/* ── Generated files bar ──────────────────────────────────────── */}
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
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/8 flex-shrink-0"
                      >
                        <FileCode2 className="w-3 h-3 text-purple-400" />
                        <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap">
                          {f.filename.split('/').pop()}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Messages ─────────────────────────────────────────────────── */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 hide-scrollbar min-h-0"
            >
              {/* Welcome screen */}
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-600 py-16">
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                  >
                    <Sparkles className="w-12 h-12 opacity-20" />
                  </motion.div>
                  <div className="text-center space-y-2">
                    <p className="text-sm font-mono font-semibold text-slate-500">
                      NexusAI-CodexTeam
                    </p>
                    <p className="text-xs font-mono text-slate-700 max-w-xs">
                      Ask any agent to write code in any language.
                      Code is automatically detected, named, and
                      ready to download as ZIP.
                    </p>
                  </div>
                  {/* Example prompts */}
                  <div className="grid grid-cols-1 gap-2 w-full max-w-sm">
                    {[
                      'Write a Python FastAPI authentication endpoint',
                      'Create a React hook for infinite scrolling',
                      'Build a Rust CLI tool for file processing',
                      'Write SQL queries for a user analytics dashboard',
                    ].map((ex) => (
                      <button
                        key={ex}
                        onClick={() => setInput(ex)}
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

            {/* ── Input area ───────────────────────────────────────────────── */}
            <div
              className="px-4 py-3 flex-shrink-0"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex gap-2 items-end">
                {/* Clear button */}
                <button
                  onClick={clearAll}
                  title="Clear conversation"
                  className="p-2 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                {/* Textarea */}
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
                    placeholder={`Ask ${selectedAgent.name} to write code in any language… (Enter to send)`}
                    rows={3}
                    disabled={isLoading}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-purple-500/60 focus:shadow-[0_0_16px_rgba(139,92,246,0.15)] resize-none font-mono disabled:opacity-50 transition-all"
                  />
                  <div className="absolute bottom-2 right-3 text-[9px] font-mono text-slate-700">
                    Shift+Enter for new line
                  </div>
                </div>

                {/* Send button */}
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

              {/* Status bar */}
              <div className="flex items-center justify-between mt-2 px-1">
                <span className="text-[9px] font-mono text-slate-700">
                  {selectedAgent.name} • {selectedModel?.name ?? 'No model'}
                </span>
                {codeFiles.length > 0 && (
                  <span className="text-[9px] font-mono text-purple-600">
                    {codeFiles.length} file{codeFiles.length !== 1 ? 's' : ''} ready to download
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