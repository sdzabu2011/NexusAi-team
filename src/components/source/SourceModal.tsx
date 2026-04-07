'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileCode2, Copy, Check } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useAppStore } from '@/store/appStore';

interface SourceModalProps { open: boolean; onClose: () => void; }

export function SourceModal({ open, onClose }: SourceModalProps) {
  const { generatedFiles } = useAppStore();
  const [selected, setSelected] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  const file = generatedFiles[selected];

  const copy = async () => {
    if (!file) return;
    await navigator.clipboard.writeText(file.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal open={open} onClose={onClose} title="GENERATED SOURCE FILES" size="xl">
      <div className="flex h-[600px]">
        {/* File tree */}
        <div className="w-56 border-r border-white/8 overflow-y-auto hide-scrollbar flex-shrink-0 py-2">
          {generatedFiles.length === 0 ? (
            <p className="text-xs text-slate-600 font-mono px-4 py-3">No files generated yet</p>
          ) : (
            generatedFiles.map((f, i) => (
              <button
                key={f.id}
                onClick={() => setSelected(i)}
                className={`w-full text-left flex items-center gap-2 px-3 py-1.5 text-[10px] font-mono transition-all ${
                  selected === i
                    ? 'bg-indigo-500/15 text-indigo-300 border-r-2 border-indigo-500'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                }`}
              >
                <FileCode2 className="w-3 h-3 flex-shrink-0" style={{ color: f.agentColor }} />
                <span className="truncate">{f.filename.split('/').pop()}</span>
              </button>
            ))
          )}
        </div>

        {/* Code viewer */}
        <div className="flex-1 flex flex-col min-w-0">
          {file ? (
            <>
              <div className="flex items-center justify-between px-4 py-2 border-b border-white/8 bg-black/20 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: file.agentColor }} />
                  <span className="text-[10px] font-mono text-slate-400">{file.filename}</span>
                  <span className="text-[9px] font-title tracking-widest px-1.5 py-0.5 rounded" style={{ color: file.agentColor, background: `${file.agentColor}15` }}>
                    {file.agentName}
                  </span>
                </div>
                <button
                  onClick={copy}
                  className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/5"
                >
                  <AnimatePresence mode="wait">
                    {copied
                      ? <motion.span key="check" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1 text-emerald-400"><Check className="w-3 h-3" /> Copied!</motion.span>
                      : <motion.span key="copy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1"><Copy className="w-3 h-3" /> Copy</motion.span>
                    }
                  </AnimatePresence>
                </button>
              </div>
              <pre className="flex-1 overflow-auto p-4 text-[11px] font-mono leading-relaxed text-slate-300 hide-scrollbar whitespace-pre-wrap break-words">
                {file.content}
              </pre>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-600 text-xs font-mono">
              Select a file from the tree
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
