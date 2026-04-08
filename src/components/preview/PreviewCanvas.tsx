'use client';
import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MonitorPlay, Download, FolderOpen, FileCode2,
  CheckCircle, Eye, EyeOff, Code2, RefreshCw,
  Maximize2, X,
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { GeneratedFile } from '@/types';

interface PreviewCanvasProps {
  onDownload: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Build preview HTML from generated files
// Finds HTML, CSS, JS/TS files and combines them into a full page
// ─────────────────────────────────────────────────────────────────────────────

function buildPreviewHTML(files: GeneratedFile[]): string {
  // Collect by type
  const htmlFiles  = files.filter((f) => f.language === 'html' || f.filename.endsWith('.html'));
  const cssFiles   = files.filter((f) =>
    ['css', 'scss', 'sass'].includes(f.language) ||
    f.filename.endsWith('.css') || f.filename.endsWith('.scss'),
  );
  const jsFiles    = files.filter((f) =>
    ['javascript', 'js', 'jsx'].includes(f.language) ||
    f.filename.endsWith('.js') || f.filename.endsWith('.jsx'),
  );
  const tsFiles    = files.filter((f) =>
    ['typescript', 'ts', 'tsx'].includes(f.language) ||
    f.filename.endsWith('.ts') || f.filename.endsWith('.tsx'),
  );
  const pyFiles    = files.filter((f) => f.language === 'python' || f.filename.endsWith('.py'));
  const sqlFiles   = files.filter((f) => f.language === 'sql'    || f.filename.endsWith('.sql'));
  const rustFiles  = files.filter((f) => f.language === 'rust'   || f.filename.endsWith('.rs'));
  const goFiles    = files.filter((f) => f.language === 'go'     || f.filename.endsWith('.go'));
  const luaFiles   = files.filter((f) =>
    ['lua', 'luau'].includes(f.language) ||
    f.filename.endsWith('.lua') || f.filename.endsWith('.luau'),
  );
  const mdFiles    = files.filter((f) => f.language === 'markdown' || f.filename.endsWith('.md'));
  const jsonFiles  = files.filter((f) => f.language === 'json'   || f.filename.endsWith('.json'));
  const yamlFiles  = files.filter((f) =>
    ['yaml', 'yml'].includes(f.language) ||
    f.filename.endsWith('.yaml') || f.filename.endsWith('.yml'),
  );

  const combinedCSS = cssFiles.map((f) => f.content).join('\n\n');
  const combinedJS  = jsFiles.map((f) => f.content).join('\n\n');

  // ── If real HTML exists — inject CSS/JS into it ──────────────────────────
  if (htmlFiles.length > 0) {
    let html = htmlFiles[0].content;

    if (combinedCSS) {
      const styleTag = `<style>\n${combinedCSS}\n</style>`;
      html = html.includes('</head>')
        ? html.replace('</head>', `${styleTag}\n</head>`)
        : styleTag + '\n' + html;
    }

    if (combinedJS) {
      const scriptTag = `<script>\n${combinedJS}\n</script>`;
      html = html.includes('</body>')
        ? html.replace('</body>', `${scriptTag}\n</body>`)
        : html + '\n' + scriptTag;
    }

    return html;
  }

  // ── Build synthetic preview page ─────────────────────────────────────────
  const allFiles = files;
  const totalLines = allFiles.reduce((s, f) => s + f.linesAdded, 0);

  // Group by agent for display
  const byAgent: Record<string, GeneratedFile[]> = {};
  for (const f of allFiles) {
    const key = f.agentName;
    if (!byAgent[key]) byAgent[key] = [];
    byAgent[key].push(f);
  }

  // Language stat blocks
  const langStats: Record<string, number> = {};
  for (const f of allFiles) {
    const lang = f.language || 'unknown';
    langStats[lang] = (langStats[lang] ?? 0) + 1;
  }

  const langBadges = Object.entries(langStats)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 12)
    .map(([lang, count]) => {
      const colors: Record<string, string> = {
        python: '#3b82f6', typescript: '#60a5fa', tsx: '#818cf8',
        javascript: '#fbbf24', js: '#fbbf24', rust: '#f97316',
        go: '#34d399', sql: '#fb923c', css: '#f472b6',
        html: '#ef4444', java: '#f87171', lua: '#a78bfa',
        luau: '#c084fc', bash: '#4ade80', sh: '#4ade80',
        yaml: '#67e8f9', json: '#e879f9', markdown: '#94a3b8',
        md: '#94a3b8', dockerfile: '#38bdf8', prisma: '#2dd4bf',
        graphql: '#f43f5e', swift: '#fb923c', kotlin: '#a855f7',
        ruby: '#ef4444', php: '#8b5cf6', csharp: '#60a5fa',
      };
      const color = colors[lang] ?? '#6b7280';
      return `<span class="lang-badge" style="background:${color}22;border:1px solid ${color}44;color:${color}">${lang} <b>${count}</b></span>`;
    })
    .join('');

  // Agent sections
  const agentSections = Object.entries(byAgent)
    .map(([agentName, agentFiles]) => {
      const color = agentFiles[0].agentColor;
      const fileRows = agentFiles
        .slice(0, 8)
        .map((f) => `
          <div class="file-row">
            <span class="file-icon">◈</span>
            <span class="file-name">${escapeHtml(f.filename)}</span>
            <span class="file-lang">${f.language}</span>
            <span class="file-lines">+${f.linesAdded}L</span>
          </div>
        `)
        .join('');
      const more = agentFiles.length > 8
        ? `<div class="file-more">+${agentFiles.length - 8} more files…</div>`
        : '';
      return `
        <div class="agent-section">
          <div class="agent-header" style="border-left:3px solid ${color};color:${color}">
            <span class="agent-name">${escapeHtml(agentName)}</span>
            <span class="agent-count">${agentFiles.length} files</span>
          </div>
          <div class="agent-files">${fileRows}${more}</div>
        </div>
      `;
    })
    .join('');

  // Code preview sections for notable files
  const previewFiles = [
    ...pyFiles, ...tsFiles, ...jsFiles,
    ...rustFiles, ...goFiles, ...luaFiles,
  ].slice(0, 3);

  const codePreviewSections = previewFiles
    .map((f) => `
      <div class="code-preview">
        <div class="code-header">
          <span class="code-filename">${escapeHtml(f.filename)}</span>
          <span class="code-lang">${f.language}</span>
        </div>
        <pre class="code-body"><code>${escapeHtml(f.content.split('\n').slice(0, 20).join('\n'))}</code></pre>
        ${f.content.split('\n').length > 20 ? '<div class="code-more">… more lines</div>' : ''}
      </div>
    `)
    .join('');

  // Extra file type sections
  const extraSections = [
    pyFiles.length   > 0 && buildFileSection('🐍 Python',         pyFiles,   '#3b82f6'),
    sqlFiles.length  > 0 && buildFileSection('🗄️ SQL',             sqlFiles,  '#fb923c'),
    rustFiles.length > 0 && buildFileSection('🦀 Rust',            rustFiles, '#f97316'),
    goFiles.length   > 0 && buildFileSection('🐹 Go',             goFiles,   '#34d399'),
    luaFiles.length  > 0 && buildFileSection('🌙 Lua / Luau',     luaFiles,  '#a78bfa'),
    mdFiles.length   > 0 && buildFileSection('📝 Markdown',       mdFiles,   '#94a3b8'),
    jsonFiles.length > 0 && buildFileSection('{ } JSON',          jsonFiles, '#e879f9'),
    yamlFiles.length > 0 && buildFileSection('⚙️ YAML / Config',  yamlFiles, '#67e8f9'),
  ]
    .filter(Boolean)
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>NexusAI Preview</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Segoe UI', system-ui, sans-serif;
    background: #020410;
    color: #e2e8f0;
    min-height: 100vh;
    padding: 0;
  }

  /* ── Hero ── */
  .hero {
    background: linear-gradient(135deg, #0d0f2a 0%, #08091a 50%, #0a0c20 100%);
    border-bottom: 1px solid rgba(99,102,241,0.2);
    padding: 32px 24px 24px;
    text-align: center;
    position: relative;
    overflow: hidden;
  }
  .hero::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.15) 0%, transparent 70%);
    pointer-events: none;
  }
  .hero-logo {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  }
  .hero-icon {
    width: 48px; height: 48px;
    background: linear-gradient(135deg, #6366f1, #06b6d4);
    border-radius: 14px;
    display: flex; align-items: center; justify-content: center;
    font-size: 22px;
    box-shadow: 0 0 24px rgba(99,102,241,0.4);
  }
  .hero-title {
    font-size: 28px;
    font-weight: 900;
    letter-spacing: 0.05em;
    background: linear-gradient(90deg, #818cf8, #06b6d4, #a78bfa);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .hero-subtitle {
    font-size: 12px;
    color: #64748b;
    font-family: monospace;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-top: 4px;
  }

  /* ── Stats row ── */
  .stats-row {
    display: flex;
    justify-content: center;
    gap: 24px;
    margin-top: 24px;
    flex-wrap: wrap;
  }
  .stat-card {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px;
    padding: 12px 20px;
    text-align: center;
    min-width: 90px;
  }
  .stat-value {
    font-size: 22px;
    font-weight: 800;
    font-family: monospace;
    background: linear-gradient(135deg, #818cf8, #06b6d4);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .stat-label {
    font-size: 9px;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    margin-top: 2px;
  }

  /* ── Language badges ── */
  .lang-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    justify-content: center;
    margin-top: 20px;
    padding: 0 16px;
  }
  .lang-badge {
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 10px;
    font-family: monospace;
    font-weight: 500;
    letter-spacing: 0.05em;
  }

  /* ── Content ── */
  .content {
    max-width: 900px;
    margin: 0 auto;
    padding: 24px 16px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  /* ── Section title ── */
  .section-title {
    font-size: 11px;
    font-family: monospace;
    color: #475569;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .section-title::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgba(255,255,255,0.06);
  }

  /* ── Agent sections ── */
  .agents-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 12px;
  }
  .agent-section {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 12px;
    overflow: hidden;
  }
  .agent-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    background: rgba(255,255,255,0.03);
    font-family: monospace;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.1em;
  }
  .agent-count {
    font-size: 9px;
    color: #475569;
    font-weight: 400;
  }
  .agent-files { padding: 8px; }
  .file-row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 6px;
    border-radius: 6px;
    font-size: 10px;
    font-family: monospace;
    transition: background 0.15s;
  }
  .file-row:hover { background: rgba(255,255,255,0.05); }
  .file-icon { color: #475569; flex-shrink: 0; }
  .file-name { color: #94a3b8; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .file-lang { color: #334155; font-size: 9px; flex-shrink: 0; }
  .file-lines { color: #334155; font-size: 9px; flex-shrink: 0; }
  .file-more { color: #334155; font-size: 9px; padding: 4px 6px; font-style: italic; }

  /* ── Extra file sections ── */
  .extra-section {
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 12px;
    overflow: hidden;
  }
  .extra-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    font-size: 11px;
    font-family: monospace;
    font-weight: 700;
    letter-spacing: 0.08em;
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }
  .extra-files {
    padding: 8px;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .extra-file-chip {
    padding: 3px 8px;
    border-radius: 6px;
    font-size: 9px;
    font-family: monospace;
    background: rgba(255,255,255,0.05);
    color: #64748b;
    border: 1px solid rgba(255,255,255,0.06);
  }

  /* ── Code preview ── */
  .code-preview {
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.08);
  }
  .code-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 14px;
    background: rgba(255,255,255,0.05);
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .code-filename {
    font-family: monospace;
    font-size: 11px;
    color: #818cf8;
    font-weight: 600;
  }
  .code-lang {
    font-family: monospace;
    font-size: 9px;
    color: #475569;
    background: rgba(255,255,255,0.05);
    padding: 2px 8px;
    border-radius: 4px;
    text-transform: uppercase;
  }
  .code-body {
    background: rgba(0,0,0,0.5);
    padding: 14px;
    overflow-x: auto;
    font-size: 11px;
    font-family: 'Cascadia Code', 'Fira Code', monospace;
    line-height: 1.6;
    color: #94a3b8;
    max-height: 280px;
    overflow-y: auto;
  }
  .code-more {
    padding: 6px 14px;
    font-size: 9px;
    color: #334155;
    font-family: monospace;
    font-style: italic;
    background: rgba(0,0,0,0.3);
  }

  /* ── Footer ── */
  .footer {
    text-align: center;
    padding: 24px;
    font-size: 10px;
    font-family: monospace;
    color: #1e293b;
    border-top: 1px solid rgba(255,255,255,0.04);
    margin-top: 8px;
  }

  /* ── Scrollbar ── */
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
</style>
</head>
<body>

<!-- Hero -->
<div class="hero">
  <div class="hero-logo">
    <div class="hero-icon">N</div>
    <div>
      <div class="hero-title">NexusAI Preview</div>
      <div class="hero-subtitle">Generated by 15 AI Agents</div>
    </div>
  </div>

  <!-- Stats -->
  <div class="stats-row">
    <div class="stat-card">
      <div class="stat-value">${allFiles.length}</div>
      <div class="stat-label">Files</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${totalLines.toLocaleString()}</div>
      <div class="stat-label">Lines</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${Object.keys(langStats).length}</div>
      <div class="stat-label">Languages</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${Object.keys(byAgent).length}</div>
      <div class="stat-label">Agents</div>
    </div>
  </div>

  <!-- Language badges -->
  <div class="lang-row">${langBadges}</div>
</div>

<!-- Content -->
<div class="content">

  <!-- Agent sections -->
  <div>
    <div class="section-title">Agent Output</div>
    <div class="agents-grid">${agentSections}</div>
  </div>

  ${extraSections ? `<div>
    <div class="section-title">By Language</div>
    <div style="display:flex;flex-direction:column;gap:10px">${extraSections}</div>
  </div>` : ''}

  ${codePreviewSections ? `<div>
    <div class="section-title">Code Preview</div>
    <div style="display:flex;flex-direction:column;gap:12px">${codePreviewSections}</div>
  </div>` : ''}

</div>

<div class="footer">
  NexusAI Team v3.0 • ${allFiles.length} files • ${Object.keys(byAgent).length} agents •
  ${new Date().toLocaleString()}
</div>

</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: build a file-type section
// ─────────────────────────────────────────────────────────────────────────────

function buildFileSection(
  title: string,
  files: GeneratedFile[],
  color: string,
): string {
  const chips = files
    .map(
      (f) =>
        `<span class="extra-file-chip">${escapeHtml(f.filename.split('/').pop() ?? f.filename)}</span>`,
    )
    .join('');

  return `
    <div class="extra-section">
      <div class="extra-header" style="color:${color}">
        <span>${escapeHtml(title)}</span>
        <span style="font-size:9px;color:#475569;font-weight:400">${files.length} files</span>
      </div>
      <div class="extra-files">${chips}</div>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: escape HTML special chars
// ─────────────────────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ─────────────────────────────────────────────────────────────────────────────
// Main PreviewCanvas component
// ─────────────────────────────────────────────────────────────────────────────

export function PreviewCanvas({ onDownload }: PreviewCanvasProps) {
  const { isSynthesized, generatedFiles, progress } = useAppStore();

  const [activeFile,    setActiveFile]    = useState<number | null>(null);
  const [showPreview,   setShowPreview]   = useState(false);
  const [fullscreen,    setFullscreen]    = useState(false);
  const [previewKey,    setPreviewKey]    = useState(0);

  // Build the iframe HTML only when synthesis is done
  const previewHTML = useMemo(() => {
    if (!isSynthesized || generatedFiles.length === 0) return '';
    return buildPreviewHTML(generatedFiles);
  }, [isSynthesized, generatedFiles]);

  // Group files by agent for the file tree
  const byAgent = useMemo(
    () =>
      generatedFiles.reduce<Record<number, typeof generatedFiles>>((acc, f) => {
        (acc[f.agentId] ??= []).push(f);
        return acc;
      }, {}),
    [generatedFiles],
  );

  const refreshPreview = useCallback(() => setPreviewKey((k) => k + 1), []);

  // ─────────────────────────────────────────────────────────────────────────
  // Fullscreen modal
  // ─────────────────────────────────────────────────────────────────────────
  const FullscreenModal = fullscreen && previewHTML ? (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      {/* Fullscreen header */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-[#08091a] border-b border-white/10 flex-shrink-0">
        <MonitorPlay className="w-4 h-4 text-emerald-400" />
        <span className="text-xs font-mono text-slate-400">NexusAI Preview — Fullscreen</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={refreshPreview}
            className="p-1.5 text-slate-500 hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setFullscreen(false)}
            className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      {/* Fullscreen iframe */}
      <iframe
        key={`fs-${previewKey}`}
        srcDoc={previewHTML}
        sandbox="allow-scripts allow-same-origin"
        className="flex-1 w-full border-0"
        title="NexusAI Fullscreen Preview"
      />
    </div>
  ) : null;

  return (
    <>
      {/* Fullscreen modal rendered via portal-like pattern */}
      {FullscreenModal}

      <div className="relative flex flex-col w-full rounded-2xl border border-white/10 bg-slate-900/50 backdrop-blur-xl shadow-2xl overflow-hidden h-full">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-gradient-to-r from-slate-900/50 to-indigo-950/50 flex-shrink-0">
          <MonitorPlay className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-title tracking-widest text-white font-bold">LIVE BUILD</h2>

          <div className="ml-auto flex items-center gap-2">
            {isSynthesized && (
              <>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <Badge label="DONE" color="#4ade80" />
              </>
            )}

            {/* Toggle preview / file tree */}
            {isSynthesized && previewHTML && (
              <>
                <button
                  onClick={() => setShowPreview((s) => !s)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono border transition-all ${
                    showPreview
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  }`}
                  title={showPreview ? 'Show file tree' : 'Show preview'}
                >
                  {showPreview
                    ? <><EyeOff className="w-3 h-3" /> Files</>
                    : <><Eye className="w-3 h-3" /> Preview</>}
                </button>

                {showPreview && (
                  <button
                    onClick={() => setFullscreen(true)}
                    className="p-1.5 text-slate-500 hover:text-white transition-colors"
                    title="Fullscreen"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                )}

                {showPreview && (
                  <button
                    onClick={refreshPreview}
                    className="p-1.5 text-slate-500 hover:text-white transition-colors"
                    title="Refresh preview"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            )}

            {isSynthesized && (
              <Button variant="success" size="sm" onClick={onDownload}>
                <Download className="w-3.5 h-3.5" /> ZIP
              </Button>
            )}
          </div>
        </div>

        {/* ── Body ────────────────────────────────────────────────────────── */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <AnimatePresence mode="wait">

            {/* ── Building state ──────────────────────────────────────────── */}
            {!isSynthesized && (
              <motion.div
                key="waiting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-full gap-4 p-8 text-slate-500"
              >
                <div className="w-28 h-28 rounded-full border-2 border-dashed border-slate-700 flex items-center justify-center animate-spin-slow">
                  <MonitorPlay className="w-10 h-10 opacity-20" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-mono">Canvas compiles after generation</p>
                  <p className="text-xs text-indigo-400/50 mt-1">
                    {generatedFiles.length > 0
                      ? `${generatedFiles.length} files built… ${progress}%`
                      : 'Start building to see output'}
                  </p>
                </div>

                {/* Live file feed */}
                {generatedFiles.length > 0 && (
                  <div className="w-full max-w-xs space-y-1 mt-2">
                    {generatedFiles.slice(-8).map((f) => (
                      <motion.div
                        key={f.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2 text-[10px] font-mono text-slate-500"
                      >
                        <div
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ background: f.agentColor }}
                        />
                        <span className="truncate">{f.filename}</span>
                        <span className="ml-auto text-slate-700 flex-shrink-0">
                          {f.language}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Done: Preview iframe ─────────────────────────────────────── */}
            {isSynthesized && showPreview && previewHTML && (
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
                  style={{ minHeight: '100%' }}
                />
              </motion.div>
            )}

            {/* ── Done: File tree ──────────────────────────────────────────── */}
            {isSynthesized && !showPreview && (
              <motion.div
                key="filetree"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full overflow-y-auto hide-scrollbar p-4 space-y-3"
              >
                {/* Success banner */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-300">Build Complete!</p>
                    <p className="text-xs text-emerald-600">
                      {generatedFiles.length} files by 15 AI agents
                    </p>
                  </div>
                  <button
                    onClick={() => setShowPreview(true)}
                    className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-all"
                  >
                    <Eye className="w-3 h-3" /> Preview
                  </button>
                </div>

                {/* File tree by agent */}
                {Object.entries(byAgent).map(([agentId, files]) => (
                  <div key={agentId}>
                    <div
                      className="flex items-center gap-2 text-[10px] font-mono mb-1 cursor-pointer select-none hover:opacity-80 transition-opacity"
                      onClick={() =>
                        setActiveFile(
                          activeFile === Number(agentId) ? null : Number(agentId),
                        )
                      }
                    >
                      <FolderOpen
                        className="w-3 h-3"
                        style={{ color: files[0].agentColor }}
                      />
                      <span
                        className="font-bold tracking-widest"
                        style={{ color: files[0].agentColor }}
                      >
                        {files[0].agentName}
                      </span>
                      <span className="text-slate-600">({files.length} files)</span>
                      <span className="ml-auto text-slate-700">
                        {activeFile === Number(agentId) ? '▲' : '▼'}
                      </span>
                    </div>

                    <AnimatePresence>
                      {activeFile === Number(agentId) && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="pl-5 space-y-0.5 mb-2">
                            {files.map((f) => (
                              <div
                                key={f.id}
                                className="flex items-center gap-2 text-[10px] font-mono text-slate-500 py-0.5"
                              >
                                <Code2 className="w-3 h-3 text-slate-700 flex-shrink-0" />
                                <span className="truncate flex-1">{f.filename}</span>
                                <span className="text-slate-700 flex-shrink-0 text-[9px]">
                                  {f.language}
                                </span>
                                <span className="text-slate-700 flex-shrink-0">
                                  +{f.linesAdded}L
                                </span>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </>
  );
}