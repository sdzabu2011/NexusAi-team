// src/app/page.tsx
'use client';

import React, { useState, useCallback } from 'react';
import {
  Play, Square, Download, Code2,
  RefreshCw, Layers, Zap, Sparkles,
  Eye, Image as ImageIcon
} from 'lucide-react';
import { VideoBackground }       from '@/components/video/VideoBackground';
import { ConnectionLines }       from '@/components/lines/ConnectionLines';
import { Header }                from '@/components/layout/Header';
import { AgentTeam }             from '@/components/agents/AgentTeam';
import { MainDashboard }         from '@/components/dashboard/MainDashboard';
import { PreviewCanvas }         from '@/components/preview/PreviewCanvas';
import { ChatModal }             from '@/components/modals/ChatModal';
import { CodexTeamPanel }        from '@/components/codex/CodexTeamPanel';
import { SourceModal }           from '@/components/source/SourceModal';
import { ToastProvider, toast }  from '@/components/ui/Toast';
import { Button }                from '@/components/ui/Button';
import { FileCountSelector }     from '@/components/ui/FileCountSelector';
import { useAppStore }           from '@/store/appStore';
import { useCodegen }            from '@/hooks/useCodegen';
import { useModels }             from '@/hooks/useModels';
import { downloadZip }           from '@/lib/utils/zipHelper';
import type { AgentDef }         from '@/types';
import { VisionModal }           from '@/components/modals/VisionModal';
import { ImagineModal }          from '@/components/modals/ImagineModal';

export default function NexusAIPage() {
  const {
    prompt, setPrompt,
    isGenerating, isSynthesized,
    generatedFiles, progress,
    clearAll,
    maxFiles, setMaxFiles,
  } = useAppStore();
  
  const [showVision,  setShowVision]  = useState(false);
  const [showImagine, setShowImagine] = useState(false);
  
  const { start, stop }   = useCodegen();
  const { count, models } = useModels();

  const [chatAgent,  setChatAgent]  = useState<AgentDef | null>(null);
  const [showSource, setShowSource] = useState(false);
  const [showCodex,  setShowCodex]  = useState(false);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleBuild = useCallback(() => {
    if (!prompt.trim()) {
      toast('Please enter a project description first', 'error');
      return;
    }
    if (models.length === 0) {
      toast('No models loaded yet — please wait', 'error');
      return;
    }
    start(prompt.trim(), maxFiles);
    toast(`🚀 Build started! Generating ${maxFiles} files with 15 agents…`, 'success');
  }, [prompt, models, maxFiles, start]);

  const handleStop = useCallback(() => {
    stop();
    toast('Build stopped', 'info');
  }, [stop]);

  const handleDownload = useCallback(async () => {
    if (generatedFiles.length === 0) {
      toast('No files to download yet', 'error');
      return;
    }
    await downloadZip(generatedFiles, prompt || 'nexus-project');
    toast(`✅ ZIP downloaded! (${generatedFiles.length} files)`, 'success');
  }, [generatedFiles, prompt]);

  const handleReset = useCallback(() => {
    clearAll();
    toast('Workspace cleared', 'info');
  }, [clearAll]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isGenerating && prompt.trim()) {
      handleBuild();
    }
  }, [isGenerating, prompt, handleBuild]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <ToastProvider />

      {/* Fixed background */}
      <VideoBackground />
      <ConnectionLines />

      {/* App shell */}
      <div className="relative z-20 flex flex-col h-screen overflow-hidden">

        {/* Header */}
        <Header
          onDownload={isSynthesized ? handleDownload : undefined}
          onViewSource={() => setShowSource(true)}
        />

        <main className="flex-1 overflow-y-auto hide-scrollbar px-4 md:px-6 py-4 flex flex-col gap-4">

          {/* ── Agent Team ── */}
          <section>
            <div className="flex items-center justify-center gap-3 mb-2">
              <p className="text-[10px] font-mono text-slate-600 tracking-widest uppercase">
                Click any agent to chat
              </p>
              <span className="text-slate-700">•</span>

              {count > 0 ? (
                <p className="text-[10px] font-mono text-emerald-600 tracking-widest uppercase flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5" />
                  {count} free models · OpenRouter
                </p>
              ) : (
                <p className="text-[10px] font-mono text-slate-700 tracking-widest uppercase flex items-center gap-1.5 animate-pulse">
                  <Sparkles className="w-2.5 h-2.5" />
                  Loading models…
                </p>
              )}
            </div>

            <AgentTeam onAgentClick={setChatAgent} />
          </section>

          {/* ── File Count + Prompt + Controls ── */}
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
                  onKeyDown={handleKeyDown}
                  placeholder="Describe your project — e.g. FastAPI SaaS with auth, Stripe, PostgreSQL…"
                  disabled={isGenerating}
                  className="w-full bg-black/50 border border-white/15 rounded-2xl px-5 py-3.5 text-sm font-mono text-white placeholder-slate-600 outline-none focus:border-indigo-500 focus:shadow-[0_0_20px_rgba(99,102,241,0.2)] transition-all disabled:opacity-50"
                />

                {/* Progress bar on input bottom */}
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
                  Build
                </Button>
              ) : (
                <Button variant="danger" size="lg" onClick={handleStop}>
                  <Square className="w-4 h-4" />
                  Stop
                </Button>
              )}
            </div>

            {/* Generating status */}
            {isGenerating && (
              <p className="text-center text-[10px] font-mono text-slate-600 animate-pulse">
                Generating {generatedFiles.length} / {maxFiles} files… ({progress}% complete)
              </p>
            )}

            {/* Done status */}
            {isSynthesized && !isGenerating && (
              <p className="text-center text-[10px] font-mono text-emerald-600">
                ✅ {generatedFiles.length} files generated successfully
              </p>
            )}
          </section>

          {/* ── Dashboard + Preview ── */}
          <section
            className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0"
            style={{ minHeight: '420px' }}
          >
            <MainDashboard />
            <PreviewCanvas onDownload={handleDownload} />
          </section>

          {/* ── Bottom Bar ── */}
          <section className="flex items-center justify-between pb-2 flex-wrap gap-2">

            {/* Left — version info */}
            <div className="text-[10px] font-mono text-slate-700">
              NexusAI Team v3.0 · 15 Agents · {count} OpenRouter models
            </div>

            {/* Right — actions */}
            <div className="flex items-center gap-2 flex-wrap">

              {/* Vision */}
              <button
                onClick={() => setShowVision(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-all
                  text-pink-300 border-pink-500/40 bg-pink-950/30
                  hover:bg-pink-900/40 hover:border-pink-400/60
                  hover:shadow-[0_0_16px_rgba(236,72,153,0.3)]"
              >
                <Eye className="w-3.5 h-3.5" />
                Vision
              </button>

              {/* Imagine */}
              <button
                onClick={() => setShowImagine(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-all
                  text-amber-300 border-amber-500/40 bg-amber-950/30
                  hover:bg-amber-900/40 hover:border-amber-400/60
                  hover:shadow-[0_0_16px_rgba(245,158,11,0.3)]"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                Imagine
              </button>

              {/* Codex — always visible */}
              <button
                onClick={() => setShowCodex(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-all
                  text-purple-300 border-purple-500/40 bg-purple-950/30
                  hover:bg-purple-900/40 hover:border-purple-400/60 hover:text-purple-200
                  hover:shadow-[0_0_16px_rgba(168,85,247,0.3)]"
              >
                <Layers className="w-3.5 h-3.5" />
                NexusAI-Codex
              </button>

              {generatedFiles.length > 0 && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSource(true)}
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    View Code
                  </Button>

                  <Button
                    variant="success"
                    size="sm"
                    onClick={handleDownload}
                  >
                    <Download className="w-3.5 h-3.5" />
                    ZIP ({generatedFiles.length})
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Reset
                  </Button>
                </>
              )}
            </div>
          </section>

        </main>
      </div>

      {/* ── Modals ── */}
      <ChatModal
        agent={chatAgent}
        onClose={() => setChatAgent(null)}
      />
      <SourceModal
        open={showSource}
        onClose={() => setShowSource(false)}
      />
      <CodexTeamPanel
        open={showCodex}
        onClose={() => setShowCodex(false)}
      />
      <VisionModal  
        open={showVision}  
        onClose={() => setShowVision(false)} 
      />
      <ImagineModal 
        open={showImagine} 
        onClose={() => setShowImagine(false)} 
      />
    </>
  );
}