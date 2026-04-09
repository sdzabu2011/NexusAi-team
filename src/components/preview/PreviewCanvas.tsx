// src/components/preview/PreviewCanvas.tsx
'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MonitorPlay, Download, FolderOpen, FileCode2,
  CheckCircle, Eye, EyeOff, Code2, RefreshCw,
  Maximize2, X, ChevronRight, ChevronDown,
  Terminal, Layers, Hash,
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { Button }      from '@/components/ui/Button';
import type { GeneratedFile } from '@/types';

interface PreviewCanvasProps {
  onDownload: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Escape HTML
// ─────────────────────────────────────────────────────────────────────────────

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─────────────────────────────────────────────────────────────────────────────
// Language → color map
// ─────────────────────────────────────────────────────────────────────────────

const LANG_COLORS: Record<string, string> = {
  python:     '#3b82f6', py:         '#3b82f6',
  typescript: '#60a5fa', ts:         '#60a5fa',
  tsx:        '#818cf8', jsx:        '#f59e0b',
  javascript: '#fbbf24', js:         '#fbbf24',
  rust:       '#f97316', rs:         '#f97316',
  go:         '#34d399', golang:     '#34d399',
  java:       '#f87171', kotlin:     '#a855f7',
  csharp:     '#60a5fa', cs:         '#60a5fa',
  cpp:        '#fb923c', c:          '#94a3b8',
  swift:      '#f97316', dart:       '#38bdf8',
  ruby:       '#ef4444', rb:         '#ef4444',
  php:        '#8b5cf6', lua:        '#a78bfa',
  luau:       '#c084fc', gdscript:   '#4ade80',
  sql:        '#fb923c', graphql:    '#f43f5e',
  css:        '#f472b6', scss:       '#f472b6',
  html:       '#ef4444', yaml:       '#67e8f9',
  json:       '#e879f9', toml:       '#fbbf24',
  bash:       '#4ade80', sh:         '#4ade80',
  dockerfile: '#38bdf8', markdown:   '#94a3b8',
  md:         '#94a3b8', prisma:     '#2dd4bf',
  terraform:  '#a78bfa', tf:         '#a78bfa',
  solidity:   '#818cf8', sol:        '#818cf8',
};

function getLangColor(lang: string): string {
  return LANG_COLORS[lang.toLowerCase()] ?? '#64748b';
}

// ─────────────────────────────────────────────────────────────────────────────
// Build REAL preview HTML — project-aware
// ─────────────────────────────────────────────────────────────────────────────

function buildPreviewHTML(files: GeneratedFile[]): string {
  // ── 1. Real HTML/CSS/JS web project ──────────────────────────────────────
  const htmlFiles = files.filter((f) =>
    f.language === 'html' || f.filename.endsWith('.html'),
  );
  const cssFiles = files.filter((f) =>
    ['css', 'scss', 'sass'].includes(f.language) ||
    f.filename.endsWith('.css') || f.filename.endsWith('.scss'),
  );
  const jsFiles = files.filter((f) =>
    ['javascript', 'js', 'jsx'].includes(f.language) ||
    (f.filename.endsWith('.js') && !f.filename.endsWith('.ts')),
  );

  if (htmlFiles.length > 0) {
    let html = htmlFiles[0].content;
    const css = cssFiles.map((f) => f.content).join('\n\n');
    const js  = jsFiles.map((f) => f.content).join('\n\n');

    if (css) {
      const tag = `<style>\n${css}\n</style>`;
      html = html.includes('</head>')
        ? html.replace('</head>', `${tag}\n</head>`)
        : tag + '\n' + html;
    }
    if (js) {
      const tag = `<script>\n${js}\n<\/script>`;
      html = html.includes('</body>')
        ? html.replace('</body>', `${tag}\n</body>`)
        : html + '\n' + tag;
    }
    return html;
  }

  // ── 2. Synthetic — real code viewer ──────────────────────────────────────
  const totalLines = files.reduce((s, f) => s + f.linesAdded, 0);

  // Language stats
  const langStats: Record<string, number> = {};
  for (const f of files) {
    const l = f.language || 'unknown';
    langStats[l] = (langStats[l] ?? 0) + 1;
  }

  // Agent groups
  const byAgent: Record<string, GeneratedFile[]> = {};
  for (const f of files) {
    (byAgent[f.agentName] ??= []).push(f);
  }

  // Lang badge HTML
  const langBadges = Object.entries(langStats)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 16)
    .map(([lang, count]) => {
      const color = getLangColor(lang);
      return `<span style="
        display:inline-flex;align-items:center;gap:4px;
        padding:3px 10px;border-radius:20px;font-size:10px;
        font-family:monospace;font-weight:600;
        background:${color}18;border:1px solid ${color}40;color:${color}
      ">${esc(lang)} <b>${count}</b></span>`;
    })
    .join('');

  // File list per agent — showing REAL code snippets
  const agentCards = Object.entries(byAgent)
    .map(([agentName, agentFiles]) => {
      const color = agentFiles[0]?.agentColor ?? '#818cf8';

      const fileRows = agentFiles.map((f) => {
        const lc = getLangColor(f.language);
        // First real code line (not comment)
        const firstLine = f.content
          .split('\n')
          .find((l) => {
            const t = l.trim();
            return t.length > 2 && !t.startsWith('#') && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
          })
          ?.trim()
          .slice(0, 70) ?? '';

        return `
          <div class="file-item" onclick="toggleCode('${esc(f.id)}')">
            <div class="file-top">
              <span class="file-dot" style="background:${lc}"></span>
              <span class="file-path">${esc(f.filename)}</span>
              <span class="file-lang" style="color:${lc};border-color:${lc}40">${esc(f.language)}</span>
              <span class="file-lines">+${f.linesAdded}L</span>
              <span class="file-toggle" id="toggle-${esc(f.id)}">▶</span>
            </div>
            ${firstLine ? `<div class="file-preview">${esc(firstLine)}</div>` : ''}
            <div class="file-code" id="code-${esc(f.id)}" style="display:none">
              <pre>${esc(f.content.split('\n').slice(0, 40).join('\n'))}</pre>
              ${f.content.split('\n').length > 40 ? `<div class="code-more">… ${f.content.split('\n').length - 40} more lines</div>` : ''}
            </div>
          </div>`;
      }).join('');

      return `
        <div class="agent-card">
          <div class="agent-header" style="border-left:3px solid ${color}">
            <span class="agent-name" style="color:${color}">${esc(agentName)}</span>
            <span class="agent-badge" style="background:${color}20;color:${color}">${agentFiles.length} files</span>
          </div>
          <div class="agent-files">${fileRows}</div>
        </div>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>NexusAI — Project Output</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',system-ui,sans-serif;background:#020410;color:#e2e8f0;min-height:100vh}

  /* Hero */
  .hero{
    background:linear-gradient(135deg,#0d0f2a,#08091a);
    border-bottom:1px solid rgba(99,102,241,0.2);
    padding:28px 20px 20px;text-align:center;
    position:relative;overflow:hidden;
  }
  .hero::before{
    content:'';position:absolute;inset:0;
    background:radial-gradient(ellipse at 50% 0%,rgba(99,102,241,0.12),transparent 65%);
    pointer-events:none;
  }
  .hero-title{
    font-size:24px;font-weight:900;letter-spacing:0.06em;
    background:linear-gradient(90deg,#818cf8,#06b6d4,#a78bfa);
    -webkit-background-clip:text;-webkit-text-fill-color:transparent;
    background-clip:text;
  }
  .hero-sub{font-size:11px;color:#475569;font-family:monospace;letter-spacing:0.1em;margin-top:4px}

  /* Stats */
  .stats{display:flex;justify-content:center;gap:16px;margin-top:20px;flex-wrap:wrap}
  .stat{
    background:rgba(255,255,255,0.04);
    border:1px solid rgba(255,255,255,0.08);
    border-radius:10px;padding:10px 18px;text-align:center;min-width:80px;
  }
  .stat-v{
    font-size:20px;font-weight:800;font-family:monospace;
    background:linear-gradient(135deg,#818cf8,#06b6d4);
    -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
  }
  .stat-l{font-size:9px;color:#475569;text-transform:uppercase;letter-spacing:0.1em;margin-top:2px}

  /* Lang badges */
  .langs{display:flex;flex-wrap:wrap;gap:5px;justify-content:center;margin-top:16px;padding:0 12px}

  /* Content */
  .content{max-width:960px;margin:0 auto;padding:20px 14px;display:flex;flex-direction:column;gap:16px}

  /* Section */
  .section-title{
    font-size:10px;font-family:monospace;color:#334155;letter-spacing:0.15em;
    text-transform:uppercase;margin-bottom:10px;display:flex;align-items:center;gap:8px;
  }
  .section-title::after{content:'';flex:1;height:1px;background:rgba(255,255,255,0.05)}

  /* Agent grid */
  .agents-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}

  /* Agent card */
  .agent-card{
    background:rgba(255,255,255,0.02);
    border:1px solid rgba(255,255,255,0.07);
    border-radius:12px;overflow:hidden;
  }
  .agent-header{
    display:flex;align-items:center;justify-content:space-between;
    padding:10px 14px;background:rgba(255,255,255,0.03);
  }
  .agent-name{font-family:monospace;font-size:11px;font-weight:700;letter-spacing:0.1em}
  .agent-badge{padding:2px 8px;border-radius:20px;font-size:9px;font-family:monospace}

  /* Files */
  .agent-files{padding:6px}
  .file-item{
    border-radius:8px;margin-bottom:3px;
    border:1px solid transparent;
    cursor:pointer;transition:all 0.15s;
  }
  .file-item:hover{background:rgba(255,255,255,0.04);border-color:rgba(255,255,255,0.08)}
  .file-top{display:flex;align-items:center;gap:6px;padding:5px 8px;flex-wrap:nowrap}
  .file-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
  .file-path{
    font-family:monospace;font-size:10px;color:#94a3b8;
    flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
  }
  .file-lang{
    font-family:monospace;font-size:8px;padding:1px 5px;
    border-radius:4px;border:1px solid;flex-shrink:0;text-transform:uppercase;
  }
  .file-lines{font-family:monospace;font-size:9px;color:#334155;flex-shrink:0}
  .file-toggle{font-size:9px;color:#334155;flex-shrink:0;transition:transform 0.2s}
  .file-preview{
    padding:2px 8px 4px 28px;font-family:monospace;
    font-size:9px;color:#334155;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  }
  .file-code{
    background:#000;border-top:1px solid rgba(255,255,255,0.06);
    padding:10px 12px;overflow-x:auto;
  }
  .file-code pre{
    font-family:'Cascadia Code','Fira Code',monospace;font-size:10px;
    line-height:1.6;color:#94a3b8;white-space:pre;
  }
  .code-more{
    font-family:monospace;font-size:9px;color:#334155;
    padding:4px 0;font-style:italic;border-top:1px solid rgba(255,255,255,0.04);
    margin-top:6px;
  }

  /* Footer */
  .footer{
    text-align:center;padding:20px;font-size:10px;
    font-family:monospace;color:#1e293b;
    border-top:1px solid rgba(255,255,255,0.04);
  }

  ::-webkit-scrollbar{width:4px;height:4px}
  ::-webkit-scrollbar-track{background:transparent}
  ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
</style>
</head>
<body>

<div class="hero">
  <div class="hero-title">⬡ NexusAI — Project Output</div>
  <div class="hero-sub">Generated by 15 AI Agents • ${new Date().toLocaleString()}</div>

  <div class="stats">
    <div class="stat">
      <div class="stat-v">${files.length}</div>
      <div class="stat-l">Files</div>
    </div>
    <div class="stat">
      <div class="stat-v">${totalLines.toLocaleString()}</div>
      <div class="stat-l">Lines</div>
    </div>
    <div class="stat">
      <div class="stat-v">${Object.keys(langStats).length}</div>
      <div class="stat-l">Languages</div>
    </div>
    <div class="stat">
      <div class="stat-v">${Object.keys(byAgent).length}</div>
      <div class="stat-l">Agents</div>
    </div>
  </div>

  <div class="langs">${langBadges}</div>
</div>

<div class="content">
  <div>
    <div class="section-title">Agent Output — click file to expand code</div>
    <div class="agents-grid">${agentCards}</div>
  </div>
</div>

<div class="footer">
  NexusAI Team v3.0 • ${files.length} files • ${Object.keys(byAgent).length} agents
</div>

<script>
function toggleCode(id) {
  var el = document.getElementById('code-' + id);
  var tg = document.getElementById('toggle-' + id);
  if (!el) return;
  var hidden = el.style.display === 'none';
  el.style.display = hidden ? 'block' : 'none';
  if (tg) tg.style.transform = hidden ? 'rotate(90deg)' : '';
}
<\/script>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// File Tree Item — collapsible
// ─────────────────────────────────────────────────────────────────────────────

function FileTreeItem({
  files,
  agentId,
}: {
  files:   GeneratedFile[];
  agentId: number;
}) {
  const [open, setOpen] = useState(false);
  if (files.length === 0) return null;
  const color = files[0].agentColor;

  return (
    <div>
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center gap-2 py-1 px-1 hover:bg-white/5 rounded-lg transition-colors"
      >
        {open
          ? <ChevronDown  className="w-3 h-3 text-slate-600" />
          : <ChevronRight className="w-3 h-3 text-slate-600" />}
        <FolderOpen className="w-3 h-3" style={{ color }} />
        <span className="text-[10px] font-mono font-bold" style={{ color }}>
          {files[0].agentName}
        </span>
        <span className="text-[9px] font-mono text-slate-600 ml-auto">
          {files.length} files
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden pl-5 space-y-0.5"
          >
            {files.map((f) => {
              const lc = getLangColor(f.language);
              return (
                <div
                  key={f.id}
                  className="flex items-center gap-2 py-0.5 text-[10px] font-mono"
                >
                  <Code2 className="w-3 h-3 text-slate-700 shrink-0" />
                  <span className="text-slate-500 truncate flex-1 min-w-0">
                    {f.filename}
                  </span>
                  <span
                    className="text-[8px] shrink-0 px-1 rounded"
                    style={{ color: lc, background: lc + '18' }}
                  >
                    {f.language}
                  </span>
                  <span className="text-slate-700 shrink-0">+{f.linesAdded}L</span>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main PreviewCanvas
// ─────────────────────────────────────────────────────────────────────────────

export function PreviewCanvas({ onDownload }: PreviewCanvasProps) {
  const { isSynthesized, generatedFiles, progress, isGenerating } = useAppStore();

  const [showPreview, setShowPreview] = useState(false);
  const [fullscreen,  setFullscreen]  = useState(false);
  const [previewKey,  setPreviewKey]  = useState(0);

  // Build preview HTML every time files change
  const previewHTML = useMemo(() => {
    if (generatedFiles.length === 0) return '';
    return buildPreviewHTML(generatedFiles);
  }, [generatedFiles]);

  // Auto-switch to preview when done
  useEffect(() => {
    if (isSynthesized && generatedFiles.length > 0) {
      setShowPreview(true);
    }
  }, [isSynthesized, generatedFiles.length]);

  const refresh = useCallback(() => setPreviewKey((k) => k + 1), []);

  // Group by agent
  const byAgent = useMemo(
    () =>
      generatedFiles.reduce<Record<number, GeneratedFile[]>>((acc, f) => {
        (acc[f.agentId] ??= []).push(f);
        return acc;
      }, {}),
    [generatedFiles],
  );

  // Stats
  const totalLines  = generatedFiles.reduce((s, f) => s + f.linesAdded, 0);
  const uniqueLangs = new Set(generatedFiles.map((f) => f.language)).size;

  return (
    <>
      {/* Fullscreen */}
      {fullscreen && previewHTML && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
          <div className="flex items-center gap-3 px-4 py-2.5 bg-[#08091a] border-b border-white/10 shrink-0">
            <MonitorPlay className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-mono text-slate-400">
              NexusAI Preview — Fullscreen
            </span>
            <div className="ml-auto flex gap-2">
              <button
                onClick={refresh}
                className="p-1.5 text-slate-500 hover:text-white transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setFullscreen(false)}
                className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <iframe
            key={`fs-${previewKey}`}
            srcDoc={previewHTML}
            sandbox="allow-scripts allow-same-origin"
            className="flex-1 w-full border-0"
            title="Fullscreen Preview"
          />
        </div>
      )}

      <div className="relative flex flex-col w-full rounded-2xl border border-white/10 bg-slate-900/50 backdrop-blur-xl shadow-2xl overflow-hidden h-full">

        {/* ── Header ── */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10 bg-gradient-to-r from-slate-900/60 to-indigo-950/60 shrink-0">
          <MonitorPlay className="w-4 h-4 text-emerald-400" />
          <h2 className="text-xs font-mono tracking-widest text-white font-bold">LIVE BUILD</h2>

          {/* Stats inline */}
          {generatedFiles.length > 0 && (
            <div className="flex items-center gap-3 ml-2">
              <span className="text-[9px] font-mono text-slate-600">
                <span className="text-indigo-400 font-bold">{generatedFiles.length}</span> files
              </span>
              <span className="text-[9px] font-mono text-slate-600">
                <span className="text-emerald-400 font-bold">
                  {totalLines.toLocaleString()}
                </span> lines
              </span>
              <span className="text-[9px] font-mono text-slate-600">
                <span className="text-purple-400 font-bold">{uniqueLangs}</span> langs
              </span>
            </div>
          )}

          <div className="ml-auto flex items-center gap-1.5">
            {isSynthesized && (
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            )}

            {previewHTML && (
              <>
                <button
                  onClick={() => setShowPreview((p) => !p)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono border transition-all ${
                    showPreview
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  {showPreview
                    ? <><EyeOff className="w-3 h-3" /> Files</>
                    : <><Eye    className="w-3 h-3" /> Preview</>}
                </button>

                {showPreview && (
                  <>
                    <button
                      onClick={refresh}
                      className="p-1 text-slate-600 hover:text-white transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setFullscreen(true)}
                      className="p-1 text-slate-600 hover:text-white transition-colors"
                    >
                      <Maximize2 className="w-3 h-3" />
                    </button>
                  </>
                )}
              </>
            )}

            {isSynthesized && (
              <Button variant="success" size="sm" onClick={onDownload}>
                <Download className="w-3 h-3" /> ZIP
              </Button>
            )}
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <AnimatePresence mode="wait">

            {/* Empty / Generating */}
            {!previewHTML && (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-full gap-4 p-8 text-slate-600"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                >
                  <MonitorPlay className="w-12 h-12 opacity-15" />
                </motion.div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-mono">
                    {isGenerating ? 'Building…' : 'Canvas ready'}
                  </p>
                  {isGenerating && (
                    <p className="text-xs text-indigo-500/60">
                      {generatedFiles.length} files · {progress}%
                    </p>
                  )}
                  {!isGenerating && (
                    <p className="text-xs text-slate-700">
                      Start building to see output
                    </p>
                  )}
                </div>

                {/* Live feed during generation */}
                {generatedFiles.length > 0 && (
                  <div className="w-full max-w-xs space-y-1 mt-2">
                    {generatedFiles.slice(-6).map((f) => (
                      <motion.div
                        key={f.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2 text-[10px] font-mono text-slate-600"
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ background: f.agentColor }}
                        />
                        <span className="truncate flex-1">{f.filename}</span>
                        <span
                          className="shrink-0 text-[8px]"
                          style={{ color: getLangColor(f.language) }}
                        >
                          {f.language}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Preview iframe */}
            {previewHTML && showPreview && (
              <motion.div
                key="preview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full"
              >
                <iframe
                  key={previewKey}
                  srcDoc={previewHTML}
                  sandbox="allow-scripts allow-same-origin"
                  className="w-full h-full border-0 bg-[#020410]"
                  title="NexusAI Preview"
                />
              </motion.div>
            )}

            {/* File Tree */}
            {previewHTML && !showPreview && (
              <motion.div
                key="tree"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full overflow-y-auto hide-scrollbar p-3 space-y-2"
              >
                {/* Done banner */}
                {isSynthesized && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-3">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-emerald-300">
                        Build Complete
                      </p>
                      <p className="text-[10px] text-emerald-700">
                        {generatedFiles.length} files · {totalLines.toLocaleString()} lines · {uniqueLangs} languages
                      </p>
                    </div>
                    <button
                      onClick={() => setShowPreview(true)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-all shrink-0"
                    >
                      <Eye className="w-3 h-3" /> Preview
                    </button>
                  </div>
                )}

                {/* Generating banner */}
                {isGenerating && (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 mb-2">
                    <Layers className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                    <span className="text-[10px] font-mono text-indigo-400">
                      {generatedFiles.length} / {progress}% — agents working…
                    </span>
                  </div>
                )}

                {/* File tree */}
                <div className="space-y-1">
                  {Object.entries(byAgent).map(([agentId, files]) => (
                    <FileTreeItem
                      key={agentId}
                      agentId={Number(agentId)}
                      files={files}
                    />
                  ))}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </>
  );
}