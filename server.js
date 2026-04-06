const express = require('express');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── ENV (set on Render dashboard, never committed) ──────────────────────────
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const GROQ_API_KEY       = process.env.GROQ_API_KEY       || '';
const MUX_PLAYBACK_ID    = process.env.MUX_PLAYBACK_ID    || 'GEpj38bbxKjkAo6Ij3qmxbYeNTQ011TTnl2eH9ftDTFM';

// ─── MODEL CACHE (refreshed every 60 seconds) ────────────────────────────────
let modelCache = { openrouter: [], groq: [], lastUpdated: 0 };

async function fetchModels() {
  try {
    // OpenRouter – filter free models (:free suffix or zero pricing)
    if (OPENROUTER_API_KEY) {
      const res  = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}` }
      });
      const json = await res.json();
      if (json.data) {
        modelCache.openrouter = json.data
          .filter(m =>
            m.id.includes(':free') ||
            (m.pricing && parseFloat(m.pricing.prompt) === 0 && parseFloat(m.pricing.completion) === 0)
          )
          .map(m => ({
            id:      m.id,
            name:    m.name || m.id,
            context: m.context_length || 4096
          }));
      }
    }

    // Groq – all chat models are free (rate-limited)
    if (GROQ_API_KEY) {
      const res  = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${GROQ_API_KEY}` }
      });
      const json = await res.json();
      if (json.data) {
        modelCache.groq = json.data.map(m => ({
          id:      m.id,
          name:    m.id,
          context: m.context_window || 8192
        }));
      }
    }

    modelCache.lastUpdated = Date.now();
    console.log(`[${new Date().toLocaleTimeString()}] Models: ${modelCache.openrouter.length} OpenRouter | ${modelCache.groq.length} Groq`);
  } catch (err) {
    console.error('Model fetch error:', err.message);
  }
}

// Initial fetch + auto-refresh every 60 s
fetchModels();
setInterval(fetchModels, 60_000);

// ─── ROUTES ──────────────────────────────────────────────────────────────────

// Config for frontend (never expose raw keys)
app.get('/api/config', (_req, res) => {
  res.json({ playbackId: MUX_PLAYBACK_ID });
});

// Current model list
app.get('/api/models', (_req, res) => {
  res.json(modelCache);
});

// Chat proxy (OpenRouter or Groq)
app.post('/api/chat', async (req, res) => {
  const { provider, model, messages, system } = req.body;
  if (!model)    return res.status(400).json({ error: 'model required' });
  if (!messages) return res.status(400).json({ error: 'messages required' });

  const allMessages = system
    ? [{ role: 'system', content: system }, ...messages]
    : messages;

  let url, headers;
  if (provider === 'groq') {
    url     = 'https://api.groq.com/openai/v1/chat/completions';
    headers = {
      Authorization:  `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    };
  } else {
    url     = 'https://openrouter.ai/api/v1/chat/completions';
    headers = {
      Authorization:  `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://nexusai-team.onrender.com',
      'X-Title':      'NexusAI Team'
    };
  }

  try {
    const upstream = await fetch(url, {
      method:  'POST',
      headers,
      body:    JSON.stringify({ model, messages: allMessages, max_tokens: 2048 })
    });
    const data = await upstream.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── SOURCE FILE BROWSER ─────────────────────────────────────────────────────
const ALLOWED_FILES = [
  'server.js', 'package.json', '.gitignore', 'README.md',
  'public/index.html', 'public/style.css', 'public/app.js'
];

app.get('/api/files', (_req, res) => {
  const files = ALLOWED_FILES.map(f => ({
    path: f,
    size: (() => { try { return fs.statSync(path.join(__dirname, f)).size; } catch { return 0; } })()
  }));
  res.json(files);
});

app.get('/api/file', (req, res) => {
  const filePath = req.query.path;
  if (!ALLOWED_FILES.includes(filePath)) return res.status(403).json({ error: 'Forbidden' });
  try {
    const content = fs.readFileSync(path.join(__dirname, filePath), 'utf8');
    res.json({ content });
  } catch {
    res.status(404).json({ error: 'Not found' });
  }
});

// ─── ZIP DOWNLOAD ─────────────────────────────────────────────────────────────
app.get('/api/download', (_req, res) => {
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="nexusai-team.zip"');

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', err => res.status(500).end(err.message));
  archive.pipe(res);

  // Add source files (no .env, no node_modules)
  archive.glob('**/*', {
    cwd: __dirname,
    ignore: ['node_modules/**', '.env', '*.zip', '.git/**', 'nexusai-team.zip']
  });

  archive.finalize();
});

// ─── START ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 NexusAI Team  →  http://localhost:${PORT}\n`);
});
