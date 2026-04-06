// ═══════════════════════════════════════════════════════════════════════
//  NexusAI Team — server.js  v2.0
//  Express · Model cache (60s) · Chat proxy · Stats · File browser · ZIP
// ═══════════════════════════════════════════════════════════════════════
'use strict';

const express  = require('express');
const path     = require('path');
const fs       = require('fs');
const archiver = require('archiver');

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── ENV (set in Render dashboard — never commit) ────────────────────────
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const GROQ_API_KEY       = process.env.GROQ_API_KEY       || '';
const MUX_PLAYBACK_ID    = process.env.MUX_PLAYBACK_ID    || 'GEpj38bbxKjkAo6Ij3qmxbYeNTQ011TTnl2eH9ftDTFM';
const START_TIME         = Date.now();

// ── RUNTIME STATS ──────────────────────────────────────────────────────
const serverStats = {
  chatRequests:   0,
  errors:         0,
  modelRefreshes: 0,
  agentActivity:  {},
  recentActivity: [],
};

function addLog(type, msg, agentId) {
  const entry = { ts: Date.now(), type, msg, agentId: agentId || null };
  serverStats.recentActivity.unshift(entry);
  if (serverStats.recentActivity.length > 60) serverStats.recentActivity.pop();
  console.log(`[${new Date().toLocaleTimeString()}] [${type}] ${msg}`);
}

// ── MODEL CACHE ────────────────────────────────────────────────────────
let modelCache = { openrouter: [], groq: [], lastUpdated: 0, refreshCount: 0 };

const PRIORITY_IDS = [
  'deepseek/deepseek-r1:free',
  'deepseek/deepseek-chat:free',
  'google/gemini-2.0-flash-exp:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'qwen/qwq-32b:free',
  'microsoft/phi-4-reasoning:free',
  'mistralai/mistral-7b-instruct:free',
  'google/gemma-3-27b-it:free',
];

async function fetchModels() {
  // OpenRouter
  if (OPENROUTER_API_KEY) {
    try {
      const res  = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}` },
        signal:  AbortSignal.timeout(15000),
      });
      const json = await res.json();
      if (json.data) {
        const free = json.data.filter(m =>
          m.id.includes(':free') ||
          (m.pricing && parseFloat(m.pricing.prompt || '1') === 0 &&
                        parseFloat(m.pricing.completion || '1') === 0)
        );
        free.sort((a, b) => {
          const ia = PRIORITY_IDS.indexOf(a.id), ib = PRIORITY_IDS.indexOf(b.id);
          if (ia !== -1 && ib !== -1) return ia - ib;
          if (ia !== -1) return -1; if (ib !== -1) return 1;
          return (a.name || a.id).localeCompare(b.name || b.id);
        });
        modelCache.openrouter = free.map(m => ({
          id:      m.id,
          name:    m.name || m.id,
          context: m.context_length || 4096,
          pinned:  PRIORITY_IDS.includes(m.id),
        }));
      }
    } catch (e) {
      serverStats.errors++;
      addLog('ERROR', `OpenRouter: ${e.message}`);
    }
  }

  // Groq
  if (GROQ_API_KEY) {
    try {
      const res  = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
        signal:  AbortSignal.timeout(15000),
      });
      const json = await res.json();
      if (json.data) {
        modelCache.groq = json.data
          .filter(m => !m.id.includes('whisper'))
          .map(m => ({
            id:      m.id,
            name:    m.id,
            context: m.context_window || 8192,
            pinned:  false,
          }));
      }
    } catch (e) {
      serverStats.errors++;
      addLog('ERROR', `Groq: ${e.message}`);
    }
  }

  modelCache.lastUpdated = Date.now();
  modelCache.refreshCount++;
  serverStats.modelRefreshes++;
  addLog('SYNC', `Models: ${modelCache.openrouter.length} OpenRouter + ${modelCache.groq.length} Groq`);
}

fetchModels();
setInterval(fetchModels, 60_000);

// ── ROUTES ─────────────────────────────────────────────────────────────
app.get('/health', (_q, r) => r.json({ ok: true, uptime: Date.now() - START_TIME }));

app.get('/api/config', (_q, r) => r.json({ playbackId: MUX_PLAYBACK_ID }));

app.get('/api/models', (_q, r) => r.json(modelCache));

app.get('/api/stats', (_q, r) => r.json({
  uptime:         Date.now() - START_TIME,
  chatRequests:   serverStats.chatRequests,
  errors:         serverStats.errors,
  modelRefreshes: serverStats.modelRefreshes,
  agentActivity:  serverStats.agentActivity,
  recentActivity: serverStats.recentActivity.slice(0, 25),
  modelsLoaded:   modelCache.openrouter.length + modelCache.groq.length,
  lastSync:       modelCache.lastUpdated,
}));

// Chat proxy
app.post('/api/chat', async (req, res) => {
  const { provider, model, messages, system, agentId } = req.body;
  if (!model)                        return res.status(400).json({ error: 'model required' });
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'messages[] required' });

  serverStats.chatRequests++;
  if (agentId) serverStats.agentActivity[agentId] = (serverStats.agentActivity[agentId] || 0) + 1;
  addLog('CHAT', `[${agentId || '?'}] ${model}`, agentId);

  const allMessages = [
    ...(system ? [{ role: 'system', content: system }] : []),
    ...messages,
  ];

  let url, headers;
  if (provider === 'groq') {
    if (!GROQ_API_KEY) return res.status(400).json({ error: 'GROQ_API_KEY not set on server' });
    url     = 'https://api.groq.com/openai/v1/chat/completions';
    headers = { Authorization: `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' };
  } else {
    if (!OPENROUTER_API_KEY) return res.status(400).json({ error: 'OPENROUTER_API_KEY not set on server' });
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
      body:    JSON.stringify({ model, messages: allMessages, max_tokens: 2048, temperature: 0.7 }),
      signal:  AbortSignal.timeout(60000),
    });
    const data = await upstream.json();
    if (data.error) {
      serverStats.errors++;
      addLog('ERROR', `Chat: ${JSON.stringify(data.error).slice(0, 120)}`);
    }
    res.json(data);
  } catch (e) {
    serverStats.errors++;
    addLog('ERROR', `Chat proxy: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

// File browser
const SAFE_FILES = [
  'server.js', 'package.json', '.gitignore', 'README.md',
  'public/index.html', 'public/style.css', 'public/app.js',
];
app.get('/api/files', (_q, r) => {
  r.json(SAFE_FILES.map(f => {
    let size = 0, lines = 0;
    try { const c = fs.readFileSync(path.join(__dirname, f), 'utf8'); size = c.length; lines = c.split('\n').length; } catch {}
    return { path: f, size, lines, ext: f.split('.').pop() };
  }));
});
app.get('/api/file', (req, res) => {
  const fp = req.query.path;
  if (!SAFE_FILES.includes(fp)) return res.status(403).json({ error: 'Forbidden' });
  try {
    const content = fs.readFileSync(path.join(__dirname, fp), 'utf8');
    res.json({ content, lines: content.split('\n').length });
  } catch { res.status(404).json({ error: 'Not found' }); }
});

// ZIP download
app.get('/api/download', (_q, res) => {
  addLog('DOWNLOAD', 'ZIP export requested');
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="nexusai-team.zip"');
  const arc = archiver('zip', { zlib: { level: 9 } });
  arc.on('error', e => res.status(500).end(e.message));
  arc.pipe(res);
  arc.glob('**/*', { cwd: __dirname, ignore: ['node_modules/**', '.env', '*.zip', '.git/**'] });
  arc.finalize();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  const or = OPENROUTER_API_KEY ? '✅' : '❌ MISSING';
  const gq = GROQ_API_KEY       ? '✅' : '❌ MISSING';
  console.log(`\n🤖  NexusAI Team v2.0  →  http://localhost:${PORT}`);
  console.log(`    OPENROUTER_API_KEY: ${or}`);
  console.log(`    GROQ_API_KEY:       ${gq}\n`);
});
