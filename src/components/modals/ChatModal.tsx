'use client';
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useModelStore } from '@/store/modelStore';
import type { AgentDef, ChatMessage, ModelInfo } from '@/types';

interface ChatModalProps { agent: AgentDef | null; onClose: () => void; }

export function ChatModal({ agent, onClose }: ChatModalProps) {
  const { models } = useModelStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelInfo | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (models.length > 0 && !selectedModel) setSelectedModel(models[0]);
  }, [models, selectedModel]);

  useEffect(() => {
    setMessages([]);
    setInput('');
  }, [agent]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const send = async () => {
    if (!input.trim() || !agent || !selectedModel || isLoading) return;
    const userMsg: ChatMessage = { role: 'user', content: input.trim() };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedModel.provider,
          model: selectedModel.id,
          messages: history,
          system: agent.system,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content ?? data.error ?? 'No response.';
      setMessages([...history, { role: 'assistant', content: reply }]);
    } catch (err) {
      setMessages([...history, { role: 'assistant', content: `⚠ Error: ${(err as Error).message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!agent) return null;

  const orModels = models.filter((m) => m.provider === 'openrouter');
  const gqModels = models.filter((m) => m.provider === 'groq');

  return (
    <Modal open={!!agent} onClose={onClose} size="lg">
      {/* Agent header */}
      <div
        className="flex items-center gap-4 px-6 py-4 border-b border-white/10"
        style={{ borderTopColor: agent.color, borderTopWidth: 2 }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center font-title font-black text-sm"
          style={{ background: `${agent.color}22`, color: agent.color, border: `1px solid ${agent.color}44` }}
        >
          {agent.name.slice(0, 2)}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-title text-sm font-bold tracking-widest text-white">{agent.name}</h3>
            <Badge label={agent.role} color={agent.color} />
          </div>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">Chat with this specialized AI agent</p>
        </div>
        <div className="ml-auto">
          <select
            value={selectedModel?.id ?? ''}
            onChange={(e) => setSelectedModel(models.find((m) => m.id === e.target.value) ?? null)}
            className="bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-300 outline-none focus:border-indigo-500 max-w-[200px] truncate"
          >
            {orModels.length > 0 && (
              <optgroup label="⬡ OpenRouter (Free)">
                {orModels.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </optgroup>
            )}
            {gqModels.length > 0 && (
              <optgroup label="⚡ Groq">
                {gqModels.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </optgroup>
            )}
          </select>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px] max-h-[400px] hide-scrollbar">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-600 pt-16">
            <div className="text-3xl" style={{ color: agent.color + '66' }}>{agent.name[0]}</div>
            <p className="text-xs font-mono">Ask {agent.name} anything about {agent.role}</p>
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                  msg.role === 'user'
                    ? 'bg-indigo-600/30 border border-indigo-500/30 text-blue-100'
                    : 'bg-white/5 border border-white/8 text-slate-200'
                }`}
              >
                {msg.content}
              </div>
            </motion.div>
          ))}
          {isLoading && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div className="bg-white/5 border border-white/8 rounded-2xl px-4 py-2.5">
                <div className="flex gap-1">
                  {[0,1,2].map((i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-white/10 flex gap-2 items-end flex-shrink-0">
        <button
          onClick={() => setMessages([])}
          className="p-2 text-slate-600 hover:text-red-400 transition-colors flex-shrink-0"
          title="Clear chat"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={`Message ${agent.name}… (Enter to send)`}
          rows={2}
          className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500 resize-none font-mono"
          disabled={isLoading}
        />
        <Button variant="primary" size="sm" onClick={send} isLoading={isLoading} disabled={!input.trim() || !selectedModel}>
          <Send className="w-3.5 h-3.5" />
        </Button>
      </div>
    </Modal>
  );
}
