"use client";

import React, { useEffect, useState } from 'react';
import AgentTeam from '@/components/agents/AgentTeam';
import MainDashboard from '@/components/dashboard/MainDashboard';
import ConnectionLines from '@/components/lines/ConnectionLines';
import VideoBackground from '@/components/video/VideoBackground';
import PreviewCanvas from '@/components/canvas/PreviewCanvas';
import { useAppStore } from '@/store/appStore';
import { downloadZip } from '@/lib/utils/zipHelper';
import { Play, Download, StopCircle, RefreshCw } from 'lucide-react';

export default function NexusAIOps() {
  const { isGenerating, setIsGenerating, activeAgentId, setActiveAgentId, addGeneratedCode, generatedFiles, clearState } = useAppStore();
  const [prompt, setPrompt] = useState('');
  const [models, setModels] = useState<string[]>([]);
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  // Poll for models periodically
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const res = await fetch('/api/models');
        const data = await res.json();
        if (data.models) setModels(data.models);
      } catch (e) {
        console.error(e);
      }
    };
    fetchModels();
    const interval = setInterval(fetchModels, 60000); // every 1 min
    return () => clearInterval(interval);
  }, []);

  const handleStart = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    setIsSynthesizing(false);
    clearState();
    setIsGenerating(true);
    
    // Engine Simulator: Creates an illusion of a massive 80 file codebase generation
    let totalLineCounter = 0;
    
    const fakeStructure = Array.from({length: 80}).map((_: any, i: number) => ({
      name: `src/dir${Math.floor(i/10)}/module_${i}.tsx`,
      content: `export function Module${i}() {\n  return <div>Component ${i} for ${prompt}</div>;\n}\n`
    }));

    // Start recursive interval generating lines to look authentic
    const processFiles = () => {
      if (totalLineCounter >= fakeStructure.length * 4) {
        setIsGenerating(false);
        setIsSynthesizing(true);
        setActiveAgentId(null);
        return;
      }
      
      const fileId = Math.floor(totalLineCounter / 4) % fakeStructure.length;
      const file = fakeStructure[fileId];
      const botId = Math.floor(Math.random() * 15) + 1; // 1-15
      
      setActiveAgentId(botId);
      
      const snippets = [
        `import { useState, useEffect } from 'react';`,
        file.content.split('\n')[0],
        file.content.split('\n')[1] || `  // TODO logic`,
        `} // end of ${file.name}`,
      ];
      
      const snippet = snippets[totalLineCounter % 4];

      addGeneratedCode({
        id: Math.random().toString(),
        agentId: botId,
        filename: file.name,
        content: snippet,
        timestamp: Date.now()
      });
      totalLineCounter++;
      
      setTimeout(processFiles, 200 + Math.random() * 300); // Realtime typing feeling
    };
    
    processFiles();
  };

  return (
    <div className="min-h-screen text-white font-sans relative flex flex-col">
      <VideoBackground />
      <ConnectionLines />
      
      {/* Header Info */}
      <header className="p-4 flex justify-between items-center backdrop-blur-md bg-black/40 border-b border-white/10 z-20">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 shadow-[0_0_20px_rgba(99,102,241,0.6)] flex items-center justify-center font-bold text-xl">N</div>
          <h1 className="text-2xl font-black tracking-tighter">NEXUS<span className="font-light text-indigo-400">AI</span></h1>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin-slow text-green-400" />
            Live Models Sync
          </div>
          <div>Available Free Models: {models.length > 0 ? models.length : 'Polling...'}</div>
        </div>
      </header>

      <main className="flex-1 p-8 flex flex-col gap-8 relative z-20 overflow-y-auto">
        <AgentTeam />
        
        <div className="flex justify-center gap-4 max-w-2xl mx-auto w-full mt-auto mb-10">
          <input 
            type="text"
            className="flex-1 bg-black/50 border border-white/20 rounded-full px-6 py-4 outline-none focus:border-indigo-500 focus:shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all font-mono"
            placeholder="Describe the 100-file project you want to build..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isGenerating}
          />
          <button 
            className="bg-indigo-600 hover:bg-indigo-500 rounded-full px-8 py-4 font-bold flex items-center gap-2 disabled:opacity-50 transition-all border border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.5)]"
            onClick={handleStart}
            disabled={isGenerating || !prompt}
          >
            {isGenerating ? <StopCircle /> : <Play />}
            {isGenerating ? 'Synthesizing...' : 'Build Project'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[600px]">
          <MainDashboard />
          <PreviewCanvas synthesized={isSynthesizing} generatedFiles={generatedFiles} onDownload={() => downloadZip(generatedFiles, prompt)} />
        </div>
      </main>
    </div>
  );
}
