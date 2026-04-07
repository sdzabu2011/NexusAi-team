'use client';

import React, { useState } from 'react';
import { Play, Square, Download, Code2, RefreshCw } from 'lucide-react';
import { VideoBackground }  from '@/components/video/VideoBackground';
import { ConnectionLines }  from '@/components/lines/ConnectionLines';
import { Header }           from '@/components/layout/Header';
import { AgentTeam }        from '@/components/agents/AgentTeam';
import { MainDashboard }    from '@/components/dashboard/MainDashboard';
import { PreviewCanvas }    from '@/components/preview/PreviewCanvas';
import { ChatModal }        from '@/components/modals/ChatModal';
import { SourceModal }      from '@/components/source/SourceModal';
import { ToastProvider, toast } from '@/components/ui/Toast';
import { Button }           from '@/components/ui/Button';
import { useAppStore }      from '@/store/appStore';
import { useCodegen }       from '@/hooks/useCodegen';
import { useModels }        from '@/hooks/useModels';
import { downloadZip }      from '@/lib/utils/zipHelper';
import type { AgentDef }    from '@/types';

export default function NexusAIPage() {
  const { prompt, setPrompt, isGenerating, isSynthesized, generatedFiles, clearAll } = useAppStore();
  const { start, stop } = useCodegen();
  const { count } = useModels();

  const [chatAgent,  setChatAgent]  = useState<AgentDef | null>(null);
  const [showSource, setShowSource] = useState(false);

  const handleBuild = () => {
    if (!prompt.trim()) { toast('Please enter a project description first', 'error'); return; }
    start(prompt.trim(), 80);
    toast('🚀 Build started! 15 agents working…', 'success');
  };

  const handleStop = () => {
    stop();
    toast('Build stopped', 'info');
  };

  const handleDownload = async () => {
    if (generatedFiles.length === 0) { toast('No files to download yet', 'error'); return; }
    await downloadZip(generatedFiles, prompt || 'nexus-project');
    toast('ZIP downloaded!', 'success');
  };

  return (
    <>
      <ToastProvider />

      {/* Fixed background layers */}
      <VideoBackground />
      <ConnectionLines />

      {/* App shell */}
      <div className="relative z-20 flex flex-col h-screen overflow-hidden">

        {/* Header */}
        <Header
          onDownload={isSynthesized ? handleDownload : undefined}
          onViewSource={() => setShowSource(true)}
        />

        {/* Main content */}
        <main className="flex-1 overflow-y-auto hide-scrollbar px-6 py-4 flex flex-col gap-4">

          {/* Agent team grid */}
          <section>
            <p className="text-[10px] font-mono text-slate-600 tracking-widest uppercase mb-2 text-center">
              Click any agent to chat • {count > 0 ? `${count} free models loaded` : 'Loading models…'}
            </p>
            <AgentTeam onAgentClick={setChatAgent} />
          </section>

          {/* Prompt + controls */}
          <section className="flex gap-3 max-w-3xl mx-auto w-full">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !isGenerating) handleBuild(); }}
              placeholder="Describe the project you want to build (e.g. SaaS dashboard with auth, payments, analytics)…"
              disabled={isGenerating}
              className="flex-1 bg-black/50 border border-white/15 rounded-2xl px-5 py-3.5 text-sm font-mono text-white placeholder-slate-600 outline-none focus:border-indigo-500 focus:shadow-[0_0_20px_rgba(99,102,241,0.2)] transition-all disabled:opacity-50"
            />
            {!isGenerating ? (
              <Button variant="primary" size="lg" onClick={handleBuild} disabled={!prompt.trim()}>
                <Play className="w-4 h-4" /> Build Project
              </Button>
            ) : (
              <Button variant="danger" size="lg" onClick={handleStop}>
                <Square className="w-4 h-4" /> Stop
              </Button>
            )}
          </section>

          {/* Dashboard + Preview grid */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0" style={{ minHeight: '420px' }}>
            <MainDashboard />
            <PreviewCanvas onDownload={handleDownload} />
          </section>

          {/* Bottom action bar */}
          <section className="flex items-center justify-between pb-2">
            <div className="text-[10px] font-mono text-slate-600">
              NexusAI Team v3.0 • 15 AI Agents • OpenRouter + Groq
            </div>
            <div className="flex items-center gap-2">
              {generatedFiles.length > 0 && (
                <>
                  <Button variant="ghost" size="sm" onClick={() => setShowSource(true)}>
                    <Code2 className="w-3.5 h-3.5" /> View Code
                  </Button>
                  <Button variant="success" size="sm" onClick={handleDownload}>
                    <Download className="w-3.5 h-3.5" /> Download ZIP
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { clearAll(); toast('Cleared', 'info'); }}>
                    <RefreshCw className="w-3.5 h-3.5" /> Reset
                  </Button>
                </>
              )}
            </div>
          </section>

        </main>
      </div>

      {/* Modals */}
      <ChatModal  agent={chatAgent}  onClose={() => setChatAgent(null)} />
      <SourceModal open={showSource} onClose={() => setShowSource(false)} />
    </>
  );
}
