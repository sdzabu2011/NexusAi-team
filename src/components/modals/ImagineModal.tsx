'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, X, Download, Loader2,
  RefreshCw, Image as ImageIcon,
} from 'lucide-react';

interface Props {
  open:    boolean;
  onClose: () => void;
}

const EXAMPLE_PROMPTS = [
  'Futuristic AI dashboard with neon lights and dark background',
  'Cyberpunk city at night with glowing signs',
  'Abstract neural network visualization with blue particles',
  'Modern SaaS landing page hero section design',
  'Robot programmer coding in a dark room with multiple screens',
  'Space station with Earth visible through windows',
];

const HF_MODELS = [
  { id: 'black-forest-labs/FLUX.1-schnell',                    name: 'FLUX.1 Schnell' },
  { id: 'stabilityai/stable-diffusion-xl-base-1.0',            name: 'SDXL' },
  { id: 'stabilityai/stable-diffusion-2-1',                    name: 'SD 2.1' },
  { id: 'runwayml/stable-diffusion-v1-5',                      name: 'SD 1.5' },
];

export function ImagineModal({ open, onClose }: Props) {
  const [prompt,      setPrompt]      = useState('');
  const [isLoading,   setIsLoading]   = useState(false);
  const [image,       setImage]       = useState<string | null>(null);
  const [usedModel,   setUsedModel]   = useState('');
  const [error,       setError]       = useState('');
  const [selectedModel, setSelectedModel] = useState(HF_MODELS[0].id);

  const generate = useCallback(async () => {
    if (!prompt.trim() || isLoading) return;
    setIsLoading(true);
    setImage(null);
    setError('');

    try {
      const res  = await fetch('/api/imagine', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ prompt, model: selectedModel }),
      });

      const data = await res.json() as {
        image?:  string;
        model?:  string;
        error?:  string;
      };

      if (data.error) throw new Error(data.error);
      if (!data.image) throw new Error('No image returned');

      setImage(data.image);
      setUsedModel(data.model ?? '');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsLoading(false);
    }
  }, [prompt, selectedModel, isLoading]);

  const download = useCallback(() => {
    if (!image) return;
    const a    = document.createElement('a');
    a.href     = image;
    a.download = `nexusai-${Date.now()}.png`;
    a.click();
  }, [image]);

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
              className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
              style={{
                background: 'linear-gradient(135deg,#08091a,#0d0f2a)',
                border:     '1px solid rgba(255,255,255,0.08)',
                boxShadow:  '0 25px 60px rgba(0,0,0,0.6)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-white/8 flex-shrink-0">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-pink-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white font-mono">
                    NexusAI Imagine
                  </h2>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Hugging Face · Bepul rasm generatsiya
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

                {/* Model selector */}
                <div className="flex gap-2 flex-wrap">
                  {HF_MODELS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedModel(m.id)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-mono border transition-all ${
                        selectedModel === m.id
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                          : 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>

                {/* Example prompts */}
                {!image && (
                  <div className="grid grid-cols-1 gap-1.5">
                    {EXAMPLE_PROMPTS.map((ex) => (
                      <button
                        key={ex}
                        onClick={() => setPrompt(ex)}
                        className="text-left px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-[11px] font-mono text-slate-600 hover:text-slate-400 hover:bg-white/[0.05] transition-all"
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                )}

                {/* Generated image */}
                {image && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="rounded-xl overflow-hidden border border-white/10"
                  >
                    <img
                      src={image}
                      alt={prompt}
                      className="w-full object-cover"
                    />
                    <div className="flex items-center justify-between px-3 py-2 bg-black/40 border-t border-white/8">
                      <span className="text-[9px] font-mono text-slate-600">
                        {usedModel.split('/').pop()}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={generate}
                          className="flex items-center gap-1 text-[10px] font-mono text-slate-500 hover:text-white transition-colors"
                        >
                          <RefreshCw className="w-3 h-3" /> Regenerate
                        </button>
                        <button
                          onClick={download}
                          className="flex items-center gap-1 text-[10px] font-mono text-emerald-500 hover:text-emerald-400 transition-colors"
                        >
                          <Download className="w-3 h-3" /> Download
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Loading */}
                {isLoading && (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    >
                      <Sparkles className="w-10 h-10 text-amber-400" />
                    </motion.div>
                    <p className="text-sm font-mono text-slate-500">
                      Rasm generatsiya bo'lmoqda…
                    </p>
                    <p className="text-xs font-mono text-slate-700">
                      20-60 sekund kutish mumkin
                    </p>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm font-mono">
                    ⚠ {error}
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="px-5 py-4 border-t border-white/8 flex-shrink-0">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && generate()}
                    placeholder="Rasm tasvirini yozing..."
                    disabled={isLoading}
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-amber-500/50 font-mono transition-all disabled:opacity-50"
                  />
                  <button
                    onClick={generate}
                    disabled={isLoading || !prompt.trim()}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-pink-600 text-white font-mono text-sm disabled:opacity-40 transition-all hover:brightness-110 flex items-center gap-2 flex-shrink-0"
                  >
                    {isLoading
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <ImageIcon className="w-4 h-4" />}
                    Generate
                  </button>
                </div>
                <p className="text-[9px] font-mono text-slate-700 mt-2 text-center">
                  Hugging Face Inference API • Bepul • Key shart emas
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}