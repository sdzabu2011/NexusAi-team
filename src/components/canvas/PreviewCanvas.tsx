import React from 'react';
import { Download, MonitorPlay } from 'lucide-react';

interface PreviewCanvasProps {
  synthesized: boolean;
  generatedFiles: Record<string, string>;
  onDownload: () => void;
}

export default function PreviewCanvas({ synthesized, generatedFiles, onDownload }: PreviewCanvasProps) {
  const fileCount = Object.keys(generatedFiles).length;

  return (
    <div className="relative flex flex-col w-full border border-white/20 bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden h-96 z-10">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10 bg-gradient-to-r from-slate-900/40 to-indigo-900/40">
        <MonitorPlay className="text-emerald-400 w-5 h-5" />
        <h2 className="text-lg font-semibold text-white tracking-wide">Live Build & Canvas</h2>
        {synthesized && (
          <button 
            onClick={onDownload}
            className="ml-auto bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 rounded-md px-3 py-1 flex items-center gap-2 border border-emerald-500/30 transition-colors text-sm"
          >
            <Download className="w-4 h-4" /> Download ZIP
          </button>
        )}
      </div>

      <div className="flex-1 p-6 flex items-center justify-center relative">
        {!synthesized ? (
          <div className="text-center text-slate-500">
             <div className="w-32 h-32 border-4 border-slate-700 border-dashed rounded-full flex items-center justify-center mx-auto mb-4 animate-[spin_10s_linear_infinite]">
                <MonitorPlay className="w-10 h-10 opacity-30" />
             </div>
             <p>Canvas will compile rendering after code generation.</p>
             <p className="text-xs text-indigo-400/50 mt-2">Files compiled: {fileCount} / +80</p>
          </div>
        ) : (
          <div className="w-full h-full bg-white text-black p-4 overflow-y-auto rounded shadow-inner">
             <h1 className="text-3xl font-black mb-4">Mock Site Compiled Successfully</h1>
             <p className="mb-4">The NexusAI Team has built <strong>{fileCount} files</strong> into this unified build output.</p>
             <div className="grid grid-cols-3 gap-2">
                {Object.keys(generatedFiles).slice(0, 10).map((f) => (
                    <div key={f} className="text-xs p-2 bg-slate-200 border border-slate-300 rounded">{f}</div>
                ))}
             </div>
             <p className="mt-4 text-xs italic text-slate-500">... and {fileCount > 10 ? fileCount - 10 : 0} more. Download the ZIP to view the full source code.</p>
          </div>
        )}
      </div>
    </div>
  );
}
