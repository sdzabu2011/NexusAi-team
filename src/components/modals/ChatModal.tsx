'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Trash2, Layers, MessageSquare } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useModelStore } from '@/store/modelStore';
import type { AgentDef, ChatMessage, ModelInfo } from '@/types';

interface ChatModalProps {
  agent:   AgentDef | null;
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Conversational system prompt — no forced code output
// ─────────────────────────────────────────────────────────────────────────────

function buildChatSystem(agent: AgentDef): string {
  return `You are ${agent.name}, a ${agent.role} working on the NexusAI Team.

Personality: Helpful, knowledgeable, and conversational. You have deep expertise in ${agent.role}.

Behavior rules:
- Answer questions naturally and helpfully in a conversational tone.
- If the user asks a general question, answer it directly — do NOT produce code unless asked.
- If the user explicitly asks for code, write it cleanly.
- Keep answers concise unless depth is requested.
- You can discuss concepts, explain ideas, give advice, or just chat.
- For code-heavy work, suggest using NexusAI-CodexTeam.
- Never say you're an AI language model — stay in character as ${agent.name}.

Your expertise: ${agent.system.replace(/^You are [^.]+\. /, '')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function ChatModal({ agent, onClose }: ChatModalProps) {
  const { models } = useModelStore();

  const [messages,      setMessages]      = useState<ChatMessage[]>([]);
  const [input,         setInput]         = useState('');
  const [isLoading,     setIsLoading]     = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelInfo | null>(null);
  const [charCount,     setCharCount]     = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (models.length > 0 && !selectedModel) setSelectedModel(models[0]);
  }, [models, selectedModel]);

  useEffect(() => {
    setMessages([]);
    setInput('');
    setCharCount(0);
  }, [agent]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (agent) setTimeout(() => inputRef.current?.focus(), 200);
  }, [agent]);

  // ── Send ──────────────────────────────────────────────────────────────────
  const send = useCallback(async () => {
    if (!input.trim() || !agent || !selectedModel || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: input.trim() };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setCharCount(0);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider:  selectedModel.provider,
          model:     selectedModel.id,
          messages:  history,
          system:    buildChatSystem(agent),
          maxTokens: 1024,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error ?? `HTTP ${res.status}`);
      }

      const data  = await res.json();
      const reply = data?.choices?.[0]?.message?.content ?? data?.error ?? 'No response.';
      setMessages([...history, { role: 'assistant', content: reply }]);

    } catch (err) {
      setMessages([
        ...history,
        { role: 'assistant', content: `⚠ Error: ${(err as Error).message}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, agent, selectedModel, isLoading, messages]);

  if (!agent) return null;

  const orModels = models.filter((m) => m.provider === 'openrouter');
  const gqModels = models.filter((m) => m.provider === 'groq');

  // Suggested starter prompts per agent role
  const starters = [
    `What are best practices for ${agent.role.toLowerCase()}?`,
    `How would you approach a complex ${agent.role.toLowerCase()} problem?`,
    `What tools do you recommend for ${agent.role.toLowerCase()}?`,
  ];

  return (
    <Modal open={!!agent} onClose={onClose} size="lg">
      {/* ── Agent header ─────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-4 px-6 py-4 border-b border-white/10 flex-shrink-0"
        style={{ borderTopColor: agent.color, borderTopWidth: 2 }}
      >
        {/* Avatar */}
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center font-title font-black text-base flex-shrink-0"
          style={{
            background: `${agent.color}18`,
            color:       agent.color,
            border:      `1px solid ${agent.color}40`,
            boxShadow:   `0 0 20px ${agent.color}25`,
          }}
        >
          {agent.name.slice(0, 2)}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-title text-sm font-bold tracking-widest text-white">
              {agent.name}
            </h3>
            <Badge label={agent.role} color={agent.color} />
          </div>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">
            <MessageSquare className="w-2.5 h-2.5 inline mr-1" />
            Free chat • for code projects use{' '}
            <span className="text-purple-400 font-semibold">CodexTeam</span>
          </p>
        </div>

        {/* Model selector */}
        <select
          value={selectedModel?.id ?? ''}
          onChange={(e) =>
            setSelectedModel(models.find((m) => m.id === e.target.value) ?? null)
          }
          className="bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-[11px] font-mono text-slate-300 outline-none focus:border-indigo-500 max-w-[180px]"
        >
          {orModels.length > 0 && (
            <optgroup label="⬡ OpenRouter">
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

      {/* ── Messages ─────────────────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 hide-scrollbar"
        style={{ minHeight: 320, maxHeight: 420 }}
      >
        {/* Empty state with starters */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 pt-8 pb-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black font-title"
              style={{
                background: `${agent.color}15`,
                color:       agent.color,
                border:      `1px solid ${agent.color}30`,
                boxShadow:   `0 0 30px ${agent.color}18`,
              }}
            >
              {agent.name[0]}
            </div>
            <div className="text-center">
              <p className="text-sm font-mono text-slate-400 font-semibold">{agent.name}</p>
              <p className="text-xs text-slate-600 font-mono mt-1">{agent.role}</p>
            </div>
            <div className="w-full max-w-sm space-y-1.5">
              {starters.map((s) => (
                <button
                  key={s}
                  onClick={() => { setInput(s); inputRef.current?.focus(); }}
                  className="w-full text-left px-3 py-2 rounded-lg bg-white/3 border border-white/8 text-[11px] font-mono text-slate-600 hover:text-slate-400 hover:bg-white/5 hover:border-white/15 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', damping: 24, stiffness: 280 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black mr-2 flex-shrink-0 mt-0.5"
                  style={{
                    background: `${agent.color}18`,
                    color:       agent.color,
                    border:      `1px solid ${agent.color}30`,
                  }}
                >
                  {agent.name.slice(0, 2)}
                </div>
              )}
              <div
                className={`max-w-[82%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap break-words leading-relaxed ${
                  msg.role === 'user'
                    ? 'rounded-tr-sm bg-indigo-600/25 border border-indigo-500/30 text-blue-100'
                    : 'rounded-tl-sm bg-white/5 border border-white/8 text-slate-200'
                }`}
              >
                {msg.content}
              </div>
            </motion.div>
          ))}

          {isLoading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex justify-start items-center gap-2"
            >
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black flex-shrink-0"
                style={{ background: `${agent.color}18`, color: agent.color, border: `1px solid ${agent.color}30` }}
              >
                {agent.name.slice(0, 2)}
              </div>
              <div className="flex items-end gap-[2px] px-3 py-2.5 rounded-2xl rounded-tl-sm bg-white/5 border border-white/8">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: agent.color }}
                    animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
                    transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.18 }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Input ────────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-t border-white/10 flex flex-col gap-2 flex-shrink-0">
        <div className="flex gap-2 items-end">
          <button
            onClick={() => setMessages([])}
            className="p-2 text-slate-600 hover:text-red-400 transition-colors flex-shrink-0"
            title="Clear chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <div className="relative flex-1">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => { setInput(e.target.value); setCharCount(e.target.value.length); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={`Message ${agent.name}… (Enter to send, Shift+Enter for new line)`}
              rows={2}
              disabled={isLoading}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 pr-12 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500/60 focus:shadow-[0_0_16px_rgba(99,102,241,0.15)] resize-none font-mono disabled:opacity-50 transition-all"
            />
            <span className="absolute bottom-2 right-3 text-[9px] font-mono text-slate-700">
              {charCount}
            </span>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={send}
            isLoading={isLoading}
            disabled={!input.trim() || !selectedModel}
            className="flex-shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* CodexTeam hint */}
        <p className="text-[9px] font-mono text-slate-700 text-center flex items-center justify-center gap-1">
          <Layers className="w-2.5 h-2.5 text-purple-700" />
          Need to generate code files? Use{' '}
          <span className="text-purple-600 font-semibold">NexusAI-CodexTeam</span>
        </p>
      </div>
    </Modal>
  );
}