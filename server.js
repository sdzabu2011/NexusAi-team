// ╔══════════════════════════════════════════════════════════════════════════╗
// ║   NexusAI Team  ·  server.js                                            ║
// ║   Express backend — model proxy, file browser, zip download             ║
// ║   ENV vars (set on Render — never committed):                           ║
// ║     OPENROUTER_API_KEY   GROQ_API_KEY   MUX_PLAYBACK_ID  PORT           ║
// ╚══════════════════════════════════════════════════════════════════════════╝

'use strict';

const express  = require('express');
const path     = require('path');
const fs       = require('fs');
const archiver = require('archiver');

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── ENV ──────────────────────────────────────────────────────────────────────
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const GROQ_API_KEY       = process.env.GROQ_API_KEY       || '';
const MUX_PLAYBACK_ID    = process.env.MUX_PLAYBACK_ID    || 'GEpj38bbxKjkAo6Ij3qmxbYeNTQ011TTnl2eH9ftDTFM';

// ─── MODEL CACHE ──────────────────────────────────────────────────────────────
let modelCache = { openrouter: [], groq: [], lastUpdated: 0, fetchCount: 0 };

async function fetchModels() {
  const errors = [];

  // ── OpenRouter free models ─────────────────────────────────────────────────
  if (OPENROUTER_API_KEY) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://nexusai-team.onrender.com',
          'X-Title': 'NexusAI Team',
        },
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${res.statusText}`);
      const json = await res.json();
      if (Array.isArray(json.data)) {
        modelCache.openrouter = json.data
          .filter(m =>
            m.id.includes(':free') ||
            (m.pricing &&
              (parseFloat(m.pricing.prompt) === 0 || m.pricing.prompt === '0') &&
              (parseFloat(m.pricing.completion) === 0 || m.pricing.completion === '0'))
          )
          .map(m => ({
            id:      m.id,
            name:    m.name || m.id,
            context: m.context_length || 4096,
          }));
      }
    } catch (err) {
      errors.push(`OpenRouter: ${err.message}`);
    }
  }

  // ── Groq models ───────────────────────────────────────────────────────────
  if (GROQ_API_KEY) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) throw new Error(`Groq ${res.status}: ${res.statusText}`);
      const json = await res.json();
      if (Array.isArray(json.data)) {
        modelCache.groq = json.data
          .filter(m => m.object === 'model' && !m.id.includes('whisper'))
          .map(m => ({
            id:      m.id,
            name:    m.id,
            context: m.context_window || 8192,
          }));
      }
    } catch (err) {
      errors.push(`Groq: ${err.message}`);
    }
  }

  modelCache.lastUpdated = Date.now();
  modelCache.fetchCount += 1;
  const total = modelCache.openrouter.length + modelCache.groq.length;
  console.log(
    `[${new Date().toLocaleTimeString()}] #${modelCache.fetchCount} Models refreshed` +
    ` — OR:${modelCache.openrouter.length} GQ:${modelCache.groq.length} Total:${total}` +
    (errors.length ? `  ⚠ ${errors.join(' | ')}` : '')
  );
}

// Initial fetch + auto-refresh every 60 s
fetchModels();
setInterval(fetchModels, 60_000);

// ─── API: Config (safe — no raw keys) ─────────────────────────────────────────
app.get('/api/config', (_req, res) => {
  res.json({
    playbackId:    MUX_PLAYBACK_ID,
    hasOpenRouter: Boolean(OPENROUTER_API_KEY),
    hasGroq:       Boolean(GROQ_API_KEY),
    version:       '2.0.0',
  });
});

// ─── API: Models ──────────────────────────────────────────────────────────────
app.get('/api/models', (_req, res) => {
  res.json(modelCache);
});

// ─── API: Chat proxy ──────────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { provider, model, messages, system } = req.body;

  if (!model)               return res.status(400).json({ error: 'model is required' });
  if (!Array.isArray(messages) || messages.length === 0)
                            return res.status(400).json({ error: 'messages array is required' });

  const allMessages = system
    ? [{ role: 'system', content: system }, ...messages]
    : messages;

  let url, headers;
  if (provider === 'groq') {
    if (!GROQ_API_KEY) return res.status(503).json({ error: 'Groq API key not configured on server' });
    url     = 'https://api.groq.com/openai/v1/chat/completions';
    headers = {
      Authorization:  `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    };
  } else {
    if (!OPENROUTER_API_KEY) return res.status(503).json({ error: 'OpenRouter API key not configured on server' });
    url     = 'https://openrouter.ai/api/v1/chat/completions';
    headers = {
      Authorization:  `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://nexusai-team.onrender.com',
      'X-Title':      'NexusAI Team',
    };
  }

  try {
    const upstream = await fetch(url, {
      method:  'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: allMessages,
        max_tokens: 2048,
        temperature: 0.75,
      }),
      signal: AbortSignal.timeout(60_000),
    });

    const contentType = upstream.headers.get('content-type') || '';
    if (!upstream.ok) {
      const errText = contentType.includes('json')
        ? JSON.stringify(await upstream.json())
        : await upstream.text();
      return res.status(upstream.status).json({ error: `Upstream ${upstream.status}: ${errText}` });
    }

    const data = await upstream.json();
    res.json(data);
  } catch (err) {
    const status = err.name === 'TimeoutError' ? 504 : 500;
    res.status(status).json({ error: err.message });
  }
});

// ─── API: File browser ────────────────────────────────────────────────────────
const ALLOWED_FILES = [
  'server.js',
  'package.json',
  '.gitignore',
  'README.md',
  'public/index.html',
  'public/style.css',
  'public/app.js',
];

app.get('/api/files', (_req, res) => {
  const files = ALLOWED_FILES.map(f => {
    let size = 0;
    try { size = fs.statSync(path.join(__dirname, f)).size; } catch { /**/ }
    return { path: f, size };
  });
  res.json(files);
});

app.get('/api/file', (req, res) => {
  const filePath = req.query.path;
  if (!filePath || !ALLOWED_FILES.includes(filePath))
    return res.status(403).json({ error: 'Forbidden' });
  try {
    const content = fs.readFileSync(path.join(__dirname, filePath), 'utf8');
    res.json({ content, path: filePath });
  } catch (err) {
    res.status(404).json({ error: 'File not found: ' + err.message });
  }
});

// ─── API: ZIP download ────────────────────────────────────────────────────────
app.get('/api/download', (_req, res) => {
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="nexusai-team.zip"');

  const archive = archiver('zip', { zlib: { level: 9 } });

  archive.on('error', err => {
    console.error('Archive error:', err);
    if (!res.headersSent) res.status(500).end(err.message);
  });

  archive.pipe(res);
  archive.glob('**/*', {
    cwd: __dirname,
    ignore: ['node_modules/**', '.env', '*.zip', '.git/**'],
  });
  archive.finalize();
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status:  'ok',
    uptime:  process.uptime(),
    models:  modelCache.openrouter.length + modelCache.groq.length,
    fetches: modelCache.fetchCount,
  });
});

// ─── 404 fallback → SPA ───────────────────────────────────────────────────────
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀  NexusAI Team  →  http://localhost:${PORT}`);
  console.log(`   OpenRouter key : ${OPENROUTER_API_KEY ? '✓ set' : '✗ missing'}`);
  console.log(`   Groq key       : ${GROQ_API_KEY       ? '✓ set' : '✗ missing'}`);
  console.log(`   Mux playback   : ${MUX_PLAYBACK_ID}\n`);
});
