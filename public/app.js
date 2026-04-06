// ═══════════════════════════════════════════════════════════════
//  NexusAI Team — app.js
//  Canvas animation + model fetching + chat + modals
// ═══════════════════════════════════════════════════════════════

// ─── CONFIG ────────────────────────────────────────────────────
const MUX_PLAYBACK_ID = 'GEpj38bbxKjkAo6Ij3qmxbYeNTQ011TTnl2eH9ftDTFM';

const AGENT_DEFS = [
  {
    id: 'code',   name: 'CODE',   symbol: '</>',
    color: '#00ff88', desc: 'Code Writer AI',
    system: 'You are an expert software engineer. Write clean, efficient, well-commented code. Always explain what the code does after writing it.'
  },
  {
    id: 'img',    name: 'IMG',    symbol: '⬡',
    color: '#ff6b6b', desc: 'Image Prompt AI',
    system: 'You are an expert at generating detailed image prompts for AI tools like Midjourney, DALL-E 3, and Stable Diffusion. Output rich, vivid, technically precise prompts.'
  },
  {
    id: 'text',   name: 'TEXT',   symbol: '✦',
    color: '#4ecdc4', desc: 'Content Writer AI',
    system: 'You are an expert content writer. Create engaging, clear, and compelling content — blogs, copy, scripts, or articles. Match the tone the user needs.'
  },
  {
    id: 'trans',  name: 'TRANS',  symbol: '◈',
    color: '#45b7d1', desc: 'Translator AI',
    system: 'You are an expert translator fluent in all major languages. Translate accurately while preserving tone, nuance, and cultural meaning. State the source/target languages.'
  },
  {
    id: 'data',   name: 'DATA',   symbol: '▦',
    color: '#f7dc6f', desc: 'Data Analyst AI',
    system: 'You are an expert data analyst. Analyze data, identify patterns, and explain insights clearly. Use structured output. Suggest visualizations when relevant.'
  },
  {
    id: 'seo',    name: 'SEO',    symbol: '◉',
    color: '#bb8fce', desc: 'SEO Optimizer AI',
    system: 'You are an SEO expert. Optimize content for search rankings and UX. Provide meta tags, keyword suggestions, structure improvements, and content recommendations.'
  },
  {
    id: 'debug',  name: 'DEBUG',  symbol: '⚡',
    color: '#f0b27a', desc: 'Bug Fixer AI',
    system: 'You are an expert debugger. Analyze code carefully, identify bugs, explain why they occur, and provide corrected code with clear explanations.'
  },
  {
    id: 'test',   name: 'TEST',   symbol: '✓',
    color: '#82e0aa', desc: 'Test Writer AI',
    system: 'You are an expert at writing software tests. Create comprehensive unit, integration, and E2E tests. Use the framework the user specifies or suggest one.'
  },
  {
    id: 'summ',   name: 'SUMM',   symbol: '≡',
    color: '#f1948a', desc: 'Summarizer AI',
    system: 'You are an expert summarizer. Condense content accurately and concisely. Preserve all key information. Offer bullet-point or paragraph format as appropriate.'
  },
  {
    id: 'math',   name: 'MATH',   symbol: '∑',
    color: '#a9cce3', desc: 'Math Solver AI',
    system: 'You are an expert mathematician. Solve problems step-by-step with clear reasoning. Show all work. Explain concepts in plain language after solving.'
  },
  {
    id: 'design', name: 'DESIGN', symbol: '◬',
    color: '#d7bde2', desc: 'UI Design AI',
    system: 'You are a UI/UX design expert. Suggest layouts, color palettes, typography, and user flows. Provide CSS or design tokens when useful. Think in components.'
  },
  {
    id: 'chat',   name: 'CHAT',   symbol: '◌',
    color: '#7fb3d3', desc: 'General Assistant',
    system: 'You are a helpful, friendly, and knowledgeable assistant. Engage naturally, answer questions clearly, and be concise when possible, thorough when needed.'
  },
];

// ─── CANVAS SETUP ──────────────────────────────────────────────
const canvas = document.getElementById('agentCanvas');
const ctx    = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', () => { resizeCanvas(); positionAgents(); });

// ─── AGENTS STATE ──────────────────────────────────────────────
let agents = [];
const NODE_W = 88, NODE_H = 52;

function positionAgents() {
  const cx = canvas.width  / 2;
  const cy = canvas.height / 2;
  const r  = Math.min(canvas.width, canvas.height) * 0.36;
  agents = AGENT_DEFS.map((def, i) => {
    const angle = (i / AGENT_DEFS.length) * Math.PI * 2 - Math.PI / 2;
    return {
      ...def,
      x:      cx + Math.cos(angle) * r,
      y:      cy + Math.sin(angle) * r,
      angle,
      glow:   0,
      active: false,
      status: 'idle',
    };
  });
}
positionAgents();

// ─── MUX VIDEO BACKGROUND ──────────────────────────────────────
(function initVideo() {
  const video = document.getElementById('bgVideo');
  const src   = `https://stream.mux.com/${MUX_PLAYBACK_ID}.m3u8`;
  if (Hls.isSupported()) {
    const hls = new Hls({ lowLatencyMode: true });
    hls.loadSource(src);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = src;
    video.play().catch(() => {});
  }
})();

// ─── MODEL FETCHING ────────────────────────────────────────────
let modelCache   = { openrouter: [], groq: [], lastUpdated: 0 };
let timerSeconds = 60;

async function loadModels() {
  try {
    const res = await fetch('/api/models');
    modelCache = await res.json();
    const total = modelCache.openrouter.length + modelCache.groq.length;
    document.getElementById('modelCount').textContent = `${total} free models live`;
    timerSeconds = 60;
  } catch (err) {
    console.warn('Model load failed:', err.message);
  }
}
loadModels();
setInterval(loadModels, 60_000);
setInterval(() => {
  timerSeconds = Math.max(0, timerSeconds - 1);
  document.getElementById('updateTimer').textContent = `Refresh in ${timerSeconds}s`;
}, 1000);

// ─── DATA PACKETS ──────────────────────────────────────────────
let packets = [];

function spawnPacket(x1, y1, x2, y2, color, size = 5) {
  packets.push({ x1, y1, x2, y2, x: x1, y: y1, color, size,
    t: 0, speed: 0.006 + Math.random() * 0.006 });
}

function updatePackets() {
  packets = packets.filter(p => p.t < 1);
  packets.forEach(p => {
    p.t = Math.min(1, p.t + p.speed);
    const ease = p.t < 0.5 ? 2 * p.t * p.t : -1 + (4 - 2 * p.t) * p.t;
    p.x = p.x1 + (p.x2 - p.x1) * ease;
    p.y = p.y1 + (p.y2 - p.y1) * ease;
  });
}

// ─── ACTIVITY TRIGGERS ─────────────────────────────────────────
let activityAgentIdx = 0;

function triggerActivity() {
  if (!agents.length) return;
  const cx = canvas.width  / 2;
  const cy = canvas.height / 2;

  // Cycle through agents for deterministic but varied activity
  activityAgentIdx = (activityAgentIdx + Math.floor(Math.random() * 3) + 1) % agents.length;
  const a = agents[activityAgentIdx];

  a.active = true; a.glow = 1; a.status = 'processing';
  // Multiple packets toward center
  for (let i = 0; i < 3; i++) {
    setTimeout(() => spawnPacket(a.x, a.y, cx, cy, a.color), i * 180);
  }
  setTimeout(() => {
    a.active = false; a.status = 'idle';
    // Center responds to a random agent
    const bIdx = Math.floor(Math.random() * agents.length);
    const b = agents[bIdx];
    b.glow = 0.7; b.status = 'receiving';
    spawnPacket(cx, cy, b.x, b.y, '#ffffff');
    spawnPacket(cx, cy, b.x, b.y, b.color, 3);
    setTimeout(() => { b.glow = 0; b.status = 'idle'; }, 1200);
  }, 900);
}

setInterval(triggerActivity, 1600);

// ─── BACKGROUND PARTICLES ──────────────────────────────────────
const particles = Array.from({ length: 100 }, () => ({
  x: Math.random() * window.innerWidth,
  y: Math.random() * window.innerHeight,
  r: Math.random() * 1.5 + 0.3,
  vy: -(0.08 + Math.random() * 0.25),
  alpha: Math.random() * 0.4 + 0.05,
}));

// ─── HELPERS ───────────────────────────────────────────────────
function hexAlpha(hex, a) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ─── DRAW FUNCTIONS ────────────────────────────────────────────
function drawParticles() {
  particles.forEach(p => {
    p.y += p.vy;
    if (p.y < -5) { p.y = canvas.height + 5; p.x = Math.random() * canvas.width; }
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = '#4488ff';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function drawLines() {
  const cx = canvas.width  / 2;
  const cy = canvas.height / 2;
  agents.forEach(a => {
    ctx.save();
    ctx.globalAlpha = a.active ? 0.5 : 0.12;
    ctx.strokeStyle = a.color;
    ctx.lineWidth = 1;
    ctx.shadowBlur  = a.active ? 10 : 0;
    ctx.shadowColor = a.color;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(cx, cy); ctx.stroke();
    ctx.restore();
  });
}

function drawCenter() {
  const cx  = canvas.width  / 2;
  const cy  = canvas.height / 2;
  const t   = Date.now() / 1000;
  const pulse = Math.sin(t * 1.8) * 0.25 + 0.75;
  const rot   = t * 0.3;
  const sz    = 58;

  ctx.save();
  // Outer ring pulse
  ctx.globalAlpha = 0.15 * pulse;
  ctx.strokeStyle = '#00c8ff';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, sz + 20 + Math.sin(t * 2) * 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Rotating dashed ring
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(rot);
  ctx.setLineDash([6, 10]);
  ctx.strokeStyle = hexAlpha('#00c8ff', 0.35);
  ctx.lineWidth   = 1;
  ctx.beginPath(); ctx.arc(0, 0, sz + 8, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();

  // Hexagon body
  ctx.shadowBlur  = 30 * pulse;
  ctx.shadowColor = '#00c8ff';
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
    i === 0 ? ctx.moveTo(cx + Math.cos(a) * sz, cy + Math.sin(a) * sz)
            : ctx.lineTo(cx + Math.cos(a) * sz, cy + Math.sin(a) * sz);
  }
  ctx.closePath();
  const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, sz);
  grd.addColorStop(0, 'rgba(0,100,255,0.55)');
  grd.addColorStop(1, 'rgba(0,20,80,0.92)');
  ctx.fillStyle = grd;
  ctx.fill();
  ctx.strokeStyle = hexAlpha('#00c8ff', pulse);
  ctx.lineWidth   = 1.5;
  ctx.stroke();

  // Label
  ctx.shadowBlur = 0;
  ctx.fillStyle  = '#ffffff';
  ctx.font       = "bold 13px 'Orbitron', sans-serif";
  ctx.textAlign  = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('NEXUS', cx, cy - 9);
  ctx.font       = "8px 'JetBrains Mono', monospace";
  ctx.fillStyle  = '#00c8ff';
  ctx.letterSpacing = '2px';
  ctx.fillText('DASHBOARD', cx, cy + 8);

  ctx.restore();
}

function drawAgent(a) {
  const { x, y, name, symbol, color, active, glow, status } = a;
  const hw = NODE_W / 2, hh = NODE_H / 2;

  ctx.save();
  if (glow > 0) {
    ctx.shadowBlur  = 22 * glow;
    ctx.shadowColor = color;
  }

  // Background
  rrect(ctx, x - hw, y - hh, NODE_W, NODE_H, 8);
  const bg = ctx.createLinearGradient(x - hw, y - hh, x + hw, y + hh);
  bg.addColorStop(0, 'rgba(5,5,20,0.92)');
  bg.addColorStop(1, 'rgba(12,12,35,0.92)');
  ctx.fillStyle = bg;
  ctx.fill();

  // Border
  ctx.strokeStyle = active ? color : hexAlpha(color, 0.35);
  ctx.lineWidth   = active ? 1.5 : 1;
  ctx.stroke();

  // Symbol (top-left corner)
  ctx.shadowBlur = 0;
  ctx.fillStyle  = hexAlpha(color, 0.6);
  ctx.font       = '10px JetBrains Mono';
  ctx.textAlign  = 'left';
  ctx.fillText(symbol, x - hw + 7, y - 10);

  // Name
  ctx.fillStyle = active ? color : '#e0ecff';
  ctx.font      = `bold 11px 'Orbitron', sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(name, x, y + 2);

  // Status dot + text
  const dotColor = status === 'processing' ? '#ffff44'
                 : status === 'receiving'  ? '#44ffcc' : '#2a4060';
  ctx.fillStyle = dotColor;
  ctx.beginPath();
  ctx.arc(x - 20, y + 14, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = status !== 'idle' ? dotColor : '#2a4060';
  ctx.font      = '8px JetBrains Mono';
  ctx.textAlign = 'left';
  ctx.fillText(status, x - 13, y + 17);

  // Glow fade
  a.glow = Math.max(0, glow - 0.012);
  ctx.restore();
}

function drawPackets() {
  packets.forEach(p => {
    ctx.save();
    ctx.shadowBlur  = 14;
    ctx.shadowColor = p.color;
    ctx.fillStyle   = p.color;
    ctx.globalAlpha = 1 - p.t * 0.3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

// ─── MAIN RENDER LOOP ──────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  // Motion blur via translucent clear
  ctx.fillStyle = 'rgba(2, 2, 15, 0.28)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawParticles();
  drawLines();
  drawCenter();
  agents.forEach(drawAgent);
  updatePackets();
  drawPackets();
}
animate();

// ─── CANVAS HIT TESTING ────────────────────────────────────────
canvas.addEventListener('click', e => {
  const { left, top } = canvas.getBoundingClientRect();
  const mx = e.clientX - left;
  const my = e.clientY - top;
  const cx = canvas.width  / 2;
  const cy = canvas.height / 2;

  // Center click → dashboard
  if (Math.hypot(mx - cx, my - cy) < 64) {
    openDashboard(); return;
  }
  // Agent click
  const hit = agents.find(a =>
    mx >= a.x - NODE_W / 2 && mx <= a.x + NODE_W / 2 &&
    my >= a.y - NODE_H / 2 && my <= a.y + NODE_H / 2
  );
  if (hit) openAgentModal(hit);
});

canvas.addEventListener('mousemove', e => {
  const { left, top } = canvas.getBoundingClientRect();
  const mx = e.clientX - left;
  const my = e.clientY - top;
  const cx = canvas.width  / 2;
  const cy = canvas.height / 2;
  const overAgent = agents.some(a =>
    mx >= a.x - NODE_W / 2 && mx <= a.x + NODE_W / 2 &&
    my >= a.y - NODE_H / 2 && my <= a.y + NODE_H / 2
  );
  const overCenter = Math.hypot(mx - cx, my - cy) < 64;
  canvas.style.cursor = (overAgent || overCenter) ? 'pointer' : 'crosshair';
});

// ─── AGENT MODAL ───────────────────────────────────────────────
let chatHistory = [];
let currentAgent = null;

function openAgentModal(agent) {
  currentAgent = agent;
  chatHistory  = [];

  const modal = document.getElementById('agentModal');
  document.getElementById('modalTag').textContent   = agent.name;
  document.getElementById('modalTag').style.color   = agent.color;
  document.getElementById('modalTitle').textContent = agent.desc;

  // Populate model selector
  const sel = document.getElementById('modelSelect');
  sel.innerHTML = '<option value="">— Select model —</option>';
  modelCache.openrouter.forEach(m => {
    const o = document.createElement('option');
    o.value       = `openrouter:${m.id}`;
    o.textContent = `[OR] ${m.name || m.id}`;
    sel.appendChild(o);
  });
  modelCache.groq.forEach(m => {
    const o = document.createElement('option');
    o.value       = `groq:${m.id}`;
    o.textContent = `[GQ] ${m.id}`;
    sel.appendChild(o);
  });
  // Auto-select first available
  if (sel.options.length > 1) sel.selectedIndex = 1;

  document.getElementById('chatMessages').innerHTML = '';
  document.getElementById('agentModalInner').style.borderTopColor = agent.color;
  modal.classList.remove('hidden');
  document.getElementById('userInput').focus();
}

document.getElementById('closeModal').onclick = () =>
  document.getElementById('agentModal').classList.add('hidden');

// ─── CHAT LOGIC ────────────────────────────────────────────────
document.getElementById('sendBtn').onclick = sendMessage;
document.getElementById('userInput').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});

async function sendMessage() {
  const input = document.getElementById('userInput');
  const text  = input.value.trim();
  if (!text) return;

  const modelVal = document.getElementById('modelSelect').value;
  if (!modelVal) { addMessage('assistant', '⚠ Please select a model first.', true); return; }

  const [provider, ...rest] = modelVal.split(':');
  const model = rest.join(':');

  addMessage('user', text);
  input.value = '';
  chatHistory.push({ role: 'user', content: text });

  const loadId = addMessage('assistant', '● Processing…', false, true);

  // Visually activate agent on canvas
  if (currentAgent) {
    const a = agents.find(ag => ag.id === currentAgent.id);
    if (a) {
      a.active = true; a.glow = 1; a.status = 'processing';
      const cx = canvas.width / 2, cy = canvas.height / 2;
      spawnPacket(a.x, a.y, cx, cy, a.color);
    }
  }

  try {
    const res  = await fetch('/api/chat', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        provider, model,
        messages: chatHistory,
        system:   currentAgent?.system
      })
    });
    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content
               || data.error?.message
               || 'No response received.';
    updateMessage(loadId, reply);
    chatHistory.push({ role: 'assistant', content: reply });

    // Visual feedback
    if (currentAgent) {
      const a = agents.find(ag => ag.id === currentAgent.id);
      if (a) { a.active = false; a.status = 'idle'; }
    }
  } catch (err) {
    updateMessage(loadId, `Error: ${err.message}`);
  }
}

let _msgId = 0;
function addMessage(role, content, warn = false, loading = false) {
  const id  = `m${++_msgId}`;
  const box = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.id        = id;
  div.className = `chat-msg chat-${role}${loading ? ' loading' : ''}`;
  div.style.color = warn ? '#ff6b6b' : '';
  div.textContent = content;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
  return id;
}
function updateMessage(id, content) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = content;
  el.classList.remove('loading');
  el.closest('#chatMessages').scrollTop = 99999;
}

// ─── DASHBOARD MODAL ───────────────────────────────────────────
function openDashboard() {
  const total = modelCache.openrouter.length + modelCache.groq.length;
  const since = modelCache.lastUpdated
    ? new Date(modelCache.lastUpdated).toLocaleTimeString()
    : 'N/A';

  const content = document.getElementById('dashContent');
  content.innerHTML = `
    <div class="dash-card">
      <div class="dash-card-label">OPENROUTER FREE</div>
      <div class="dash-card-value">${modelCache.openrouter.length}</div>
      <div class="dash-card-sub">models available</div>
    </div>
    <div class="dash-card">
      <div class="dash-card-label">GROQ MODELS</div>
      <div class="dash-card-value">${modelCache.groq.length}</div>
      <div class="dash-card-sub">models available</div>
    </div>
    <div class="dash-card">
      <div class="dash-card-label">TOTAL AGENTS</div>
      <div class="dash-card-value">${AGENT_DEFS.length}</div>
      <div class="dash-card-sub">active in team</div>
    </div>
    <div class="dash-card">
      <div class="dash-card-label">LAST SYNC</div>
      <div class="dash-card-value" style="font-size:16px">${since}</div>
      <div class="dash-card-sub">auto-refreshes every 60s</div>
    </div>
    <div class="dash-card model-list">
      <div class="dash-card-label" style="margin-bottom:8px">LOADED MODELS</div>
      ${[...modelCache.openrouter.map(m => ({ ...m, p: 'OR' })),
         ...modelCache.groq.map(m => ({ ...m, p: 'GQ' }))]
        .map(m => `
          <div class="model-item">
            <span>${m.name || m.id}</span>
            <span class="provider-tag">${m.p}</span>
          </div>
        `).join('')}
    </div>
  `;
  document.getElementById('dashModal').classList.remove('hidden');
}
document.getElementById('closeDash').onclick = () =>
  document.getElementById('dashModal').classList.add('hidden');

// ─── CODE VIEWER ───────────────────────────────────────────────
document.getElementById('viewCodeBtn').onclick = openCodeViewer;
document.getElementById('closeCode').onclick = () =>
  document.getElementById('codeModal').classList.add('hidden');
document.getElementById('downloadCodeBtn').onclick = () => {
  window.location.href = '/api/download';
};

async function openCodeViewer() {
  document.getElementById('codeModal').classList.remove('hidden');
  const tree = document.getElementById('fileTree');
  tree.innerHTML = '<div style="padding:12px;font-size:11px;color:#4a6080">Loading…</div>';

  try {
    const res   = await fetch('/api/files');
    const files = await res.json();
    tree.innerHTML = '';
    files.forEach(f => {
      const item = document.createElement('div');
      item.className  = 'file-item';
      item.innerHTML  = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        ${f.path}
        <span class="file-size">${(f.size / 1024).toFixed(1)}k</span>
      `;
      item.onclick = () => {
        tree.querySelectorAll('.file-item').forEach(el => el.classList.remove('active'));
        item.classList.add('active');
        loadFile(f.path);
      };
      tree.appendChild(item);
    });
  } catch (err) {
    tree.innerHTML = `<div style="padding:12px;color:#ff6b6b;font-size:11px">Error: ${err.message}</div>`;
  }
}

async function loadFile(filePath) {
  const viewer = document.getElementById('codeViewer');
  viewer.innerHTML = '<div class="code-placeholder">Loading…</div>';
  try {
    const res  = await fetch(`/api/file?path=${encodeURIComponent(filePath)}`);
    const data = await res.json();
    const pre  = document.createElement('pre');
    pre.textContent = data.content;
    viewer.innerHTML = '';
    viewer.appendChild(pre);
  } catch (err) {
    viewer.innerHTML = `<div class="code-placeholder" style="color:#ff6b6b">Error: ${err.message}</div>`;
  }
}

// ─── DOWNLOAD ──────────────────────────────────────────────────
document.getElementById('downloadBtn').onclick = () => {
  window.location.href = '/api/download';
};

// ─── CLOSE MODALS ON BACKDROP CLICK ───────────────────────────
['agentModal','dashModal','codeModal'].forEach(id => {
  document.getElementById(id).addEventListener('click', e => {
    if (e.target.id === id) document.getElementById(id).classList.add('hidden');
  });
});
