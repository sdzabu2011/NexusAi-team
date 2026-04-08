'use client';

import React, { useState } from 'react';
import {
  Play, Square, Download, Code2, RefreshCw, Layers, Zap,
} from 'lucide-react';
import { VideoBackground }  from '@/components/video/VideoBackground';
import { ConnectionLines }  from '@/components/lines/ConnectionLines';
import { Header }           from '@/components/layout/Header';
import { AgentTeam }        from '@/components/agents/AgentTeam';
import { MainDashboard }    from '@/components/dashboard/MainDashboard';
import { PreviewCanvas }    from '@/components/preview/PreviewCanvas';
import { ChatModal }        from '@/components/modals/ChatModal';
import { CodexTeamPanel }   from '@/components/codex/CodexTeamPanel';
import { SourceModal }      from '@/components/source/SourceModal';
import { ToastProvider, toast } from '@/components/ui/Toast';
import { Button }           from '@/components/ui/Button';
import { FileCountSelector } from '@/components/ui/FileCountSelector';
import { useAppStore }      from '@/store/appStore';
import { useCodegen }       from '@/hooks/useCodegen';
import { useModels }        from '@/hooks/useModels';
import { downloadZip }      from '@/lib/utils/zipHelper';
import type { AgentDef }    from '@/types';

export default function NexusAIPage() {
  const {
    prompt, setPrompt,
    isGenerating, isSynthesized,
    generatedFiles, progress,
    clearAll,
    maxFiles, setMaxFiles,
  } = useAppStore();

  const { start, stop } = useCodegen();
  const { count }       = useModels();

  const [chatAgent,  setChatAgent]  = useState<AgentDef | null>(null);
  const [showSource, setShowSource] = useState(false);
  const [showCodex,  setShowCodex]  = useState(false);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleBuild = () => {
    if (!prompt.trim()) {
      toast('Please enter a project description first', 'error');
      return;
    }
    start(prompt.trim(), maxFiles);
    toast(`🚀 Build started! Generating ${maxFiles} files with 15 agents…`, 'success');
  };

  const handleStop = () => {
    stop();
    toast('Build stopped', 'info');
  };

  const handleDownload = async () => {
    if (generatedFiles.length === 0) {
      toast('No files to download yet', 'error');
      return;
    }
    await downloadZip(generatedFiles, prompt || 'nexus-project');
    toast(`✅ ZIP downloaded! (${generatedFiles.length} files)`, 'success');
  };

  const handleReset = () => {
    clearAll();
    toast('Workspace cleared', 'info');
  };

  return (
    <>
      <ToastProvider />

      {/* ── Fixed background layers ─────────────────────────────────────── */}
      <VideoBackground />
      <ConnectionLines />

      {/* ── App shell ──────────────────────────────────────────────────── */}
      <div className="relative z-20 flex flex-col h-screen overflow-hidden">

        {/* Header */}
        <Header
          onDownload={isSynthesized ? handleDownload : undefined}
          onViewSource={() => setShowSource(true)}
        />

        <main className="flex-1 overflow-y-auto hide-scrollbar px-6 py-4 flex flex-col gap-4">

          {/* ── Agent team ───────────────────────────────────────────────── */}
          <section>
            <div className="flex items-center justify-center gap-3 mb-2">
              <p className="text-[10px] font-mono text-slate-600 tracking-widest uppercase">
                Click any agent to chat
              </p>
              <span className="text-slate-700">•</span>
              {count > 0 ? (
                <p className="text-[10px] font-mono text-emerald-600 tracking-widest uppercase flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5" />
                  {count} free models live
                </p>
              ) : (
                <p className="text-[10px] font-mono text-slate-700 tracking-widest uppercase animate-pulse">
                  Loading models…
                </p>
              )}
            </div>
            <AgentTeam onAgentClick={setChatAgent} />
          </section>

          {/* ── File count + Prompt + Controls ───────────────────────────── */}
          <section className="flex flex-col gap-3 max-w-3xl mx-auto w-full">

            {/* File count selector */}
            <FileCountSelector
              value={maxFiles}
              onChange={setMaxFiles}
              disabled={isGenerating}
            />

            {/* Prompt row */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isGenerating) handleBuild();
                  }}
                  placeholder="Describe the project you want to build — e.g. SaaS dashboard with auth, payments, analytics…"
                  disabled={isGenerating}
                  className="w-full bg-black/50 border border-white/15 rounded-2xl px-5 py-3.5 text-sm font-mono text-white placeholder-slate-600 outline-none focus:border-indigo-500 focus:shadow-[0_0_20px_rgba(99,102,241,0.2)] transition-all disabled:opacity-50"
                />
                {/* Live progress overlay on input border */}
                {isGenerating && (
                  <div
                    className="absolute bottom-0 left-0 h-0.5 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                )}
              </div>

              {!isGenerating ? (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleBuild}
                  disabled={!prompt.trim() || count === 0}
                >
                  <Play className="w-4 h-4" />
                  Build Project
                </Button>
              ) : (
                <Button variant="danger" size="lg" onClick={handleStop}>
                  <Square className="w-4 h-4" />
                  Stop
                </Button>
              )}
            </div>

            {/* Status line */}
            {isGenerating && (
              <p className="text-center text-[10px] font-mono text-slate-600 animate-pulse">
                Generating {generatedFiles.length} / {maxFiles} files…
                {' '}({progress}% complete)
              </p>
            )}
          </section>

          {/* ── Dashboard + Preview ──────────────────────────────────────── */}
          <section
            className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0"
            style={{ minHeight: '420px' }}
          >
            <MainDashboard />
            <PreviewCanvas onDownload={handleDownload} />
          </section>

          {/* ── Bottom action bar ────────────────────────────────────────── */}
          <section className="flex items-center justify-between pb-2 flex-wrap gap-2">
            <div className="text-[10px] font-mono text-slate-700">
              NexusAI Team v3.0 • 15 AI Agents • OpenRouter + Groq • {count} models
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* NexusAI-CodexTeam — always visible */}
              <button
                onClick={() => setShowCodex(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-all
                  text-purple-300 border-purple-500/40 bg-purple-950/30
                  hover:bg-purple-900/40 hover:border-purple-400/60 hover:text-purple-200
                  hover:shadow-[0_0_16px_rgba(168,85,247,0.3)]"
              >
                <Layers className="w-3.5 h-3.5" />
                NexusAI-CodexTeam
              </button>

              {generatedFiles.length > 0 && (
                <>
                  <Button variant="ghost" size="sm" onClick={() => setShowSource(true)}>
                    <Code2 className="w-3.5 h-3.5" /> View Code
                  </Button>
                  <Button variant="success" size="sm" onClick={handleDownload}>
                    <Download className="w-3.5 h-3.5" />
                    Download ZIP ({generatedFiles.length})
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleReset}>
                    <RefreshCw className="w-3.5 h-3.5" /> Reset
                  </Button>
                </>
              )}
            </div>
          </section>

        </main>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      <ChatModal   agent={chatAgent}  onClose={() => setChatAgent(null)} />
      <SourceModal open={showSource}  onClose={() => setShowSource(false)} />
      <CodexTeamPanel open={showCodex} onClose={() => setShowCodex(false)} />
    </>
  );
}