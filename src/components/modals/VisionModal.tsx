'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, X, Send, Loader2,
  Image as ImageIcon, FileCode2, FileArchive,
  Sparkles, Copy, Check,
} from 'lucide-react';
import { FileUpload } from '@/components/ui/FileUpload';

interface Props {
  open:    boolean;
  onClose: () => void;
}

interface AnalysisResult {
  content:    string;
  usedModel?: string;
}

export function VisionModal({ open, onClose }: Props) {
  const [uploadedFile, setUploadedFile] = useState<{
    file:     File;
    preview?: string;
    type:     'image' | 'code' | 'zip' | 'other';
  } | null>(null);

  const [prompt,    setPrompt]    = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result,    setResult]    = useState<AnalysisResult | null>(null);
  const [error,     setError]     = useState('');
  const [copied,    setCopied]    = useState(false);
  const [zipFiles,  setZipFiles]  = useState<Array<{
    filename: string;
    content:  string;
    language: string;
    size:     number;
  }>>([]);
  const [selectedZipFile, setSelectedZipFile] = useState<number>(0);

  const handleUpload = useCallback(async (uploaded: {
    file:     File;
    preview?: string;
    type:     'image' | 'code' | 'zip' | 'other';
  }) => {
    setUploadedFile(uploaded);
    setResult(null);
    setError('');
    setZipFiles([]);

    // ZIP — extract immediately
    if (uploaded.type === 'zip') {
      setIsLoading(true);
      try {
        const formData = new FormData();
        formData.append('file', uploaded.file);

        const res  = await fetch('/api/extract', { method: 'POST', body: formData });
        const data = await res.json() as {
          files?: Array<{ filename: string; content: string; language: string; size: number }>;
          error?: string;
        };

        if (data.error) throw new Error(data.error);
        setZipFiles(data.files ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Extract failed');
      } finally {
        setIsLoading(false);
      }
    }
  }, []);

  const analyze = useCallback(async () => {
    if (!uploadedFile) return;
    setIsLoading(true);
    setResult(null);
    setError('');

    try {
      let body: Record<string, unknown>;

      if (uploadedFile.type === 'image' && uploadedFile.preview) {
        body = {
          image:  uploadedFile.preview,
          prompt: prompt || 'Describe this image in detail',
          type:   'image',
        };
      } else if (uploadedFile.type === 'zip' && zipFiles.length > 0) {
        const fileContent = zipFiles
          .slice(0, 10)
          .map((f) => `// ${f.filename}\n${f.content}`)
          .join('\n\n---\n\n');

        body = {
          text:   fileContent,
          prompt: prompt || 'Analyze this project structure and code',
          type:   'zip',
        };
      } else {
        const text = await uploadedFile.file.text();
        body = {
          text:   text.slice(0, 8000),
          prompt: prompt || 'Analyze this code',
          type:   'code',
        };
      }

      const res  = await fetch('/api/vision', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });

      const data = await res.json() as {
        choices?:   Array<{ message?: { content?: string } }>;
        usedModel?: string;
        error?:     string;
      };

      if (data.error) throw new Error(data.error);

      setResult({
        content:    data.choices?.[0]?.message?.content ?? 'No response',
        usedModel:  data.usedModel,
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsLoading(false);
    }
  }, [uploadedFile, prompt, zipFiles]);

  const copy = useCallback(async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [result]);

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
              style={{
                background:  'linear-gradient(135deg,#08091a,#0d0f2a)',
                border:      '1px solid rgba(255,255,255,0.08)',
                boxShadow:   '0 25px 60px rgba(0,0,0,0.6)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-white/8 flex-shrink-0">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-600 to-purple-600 flex items-center justify-center">
                  <Eye className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white font-mono">
                    NexusAI Vision
                  </h2>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Rasm · Kod · ZIP tahlil
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="ml-auto p-1.5 text-slate-500 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 hide-scrollbar">

                {/* Upload */}
                <FileUpload
                  onUpload={handleUpload}
                  accept="image/*,.zip,.ts,.tsx,.js,.jsx,.py,.rs,.go,.java,.cs,.cpp,.c,.rb,.php,.lua,.sql,.json,.yaml,.md,.txt,.sh"
                  maxSizeMB={20}
                />

                {/* ZIP file tree */}
                {zipFiles.length > 0 && (
                  <div className="rounded-xl border border-white/8 overflow-hidden">
                    <div className="px-3 py-2 bg-white/5 border-b border-white/8">
                      <p className="text-[10px] font-mono text-slate-400">
                        <FileArchive className="w-3 h-3 inline mr-1 text-orange-400" />
                        {zipFiles.length} fayl topildi
                      </p>
                    </div>
                    <div className="max-h-40 overflow-y-auto hide-scrollbar">
                      {zipFiles.map((f, i) => (
                        <button
                          key={i}
                          onClick={() => setSelectedZipFile(i)}
                          className={`w-full text-left flex items-center gap-2 px-3 py-1.5 text-[10px] font-mono transition-all ${
                            selectedZipFile === i
                              ? 'bg-indigo-500/15 text-indigo-300'
                              : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                          }`}
                        >
                          <FileCode2 className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate flex-1">{f.filename}</span>
                          <span className="text-slate-700 text-[9px]">{f.language}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ZIP file preview */}
                {zipFiles.length > 0 && zipFiles[selectedZipFile] && (
                  <div className="rounded-xl border border-white/8 overflow-hidden">
                    <div className="px-3 py-2 bg-white/5 border-b border-white/8 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-indigo-400">
                        {zipFiles[selectedZipFile].filename}
                      </span>
                      <span className="text-[9px] font-mono text-slate-600">
                        {zipFiles[selectedZipFile].language}
                      </span>
                    </div>
                    <pre className="p-3 text-[10px] font-mono text-slate-400 max-h-40 overflow-auto hide-scrollbar">
                      {zipFiles[selectedZipFile].content.slice(0, 1000)}
                    </pre>
                  </div>
                )}

                {/* Prompt */}
                {uploadedFile && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && analyze()}
                      placeholder={
                        uploadedFile.type === 'image'
                          ? 'Bu rasmda nima bor? Tahlil qil...'
                          : uploadedFile.type === 'zip'
                          ? 'Bu loyihani tahlil qil...'
                          : 'Bu kodni tahlil qil, xatolarni top...'
                      }
                      className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-pink-500/50 font-mono transition-all"
                    />
                    <button
                      onClick={analyze}
                      disabled={isLoading || !uploadedFile}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 text-white font-mono text-sm disabled:opacity-40 transition-all hover:brightness-110 flex items-center gap-2"
                    >
                      {isLoading
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Send className="w-4 h-4" />}
                      Tahlil
                    </button>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm font-mono">
                    ⚠ {error}
                  </div>
                )}

                {/* Result */}
                {result && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-white/10 overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-4 py-2.5 bg-white/5 border-b border-white/8">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                        <span className="text-[10px] font-mono text-slate-400">
                          {result.usedModel?.split('/').pop() ?? 'AI'} natijasi
                        </span>
                      </div>
                      <button
                        onClick={copy}
                        className="flex items-center gap-1 text-[10px] font-mono text-slate-500 hover:text-white transition-colors"
                      >
                        {copied
                          ? <><Check className="w-3 h-3 text-emerald-400" /> Copied!</>
                          : <><Copy className="w-3 h-3" /> Copy</>}
                      </button>
                    </div>
                    <div className="p-4 text-sm text-slate-200 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto hide-scrollbar">
                      {result.content}
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}