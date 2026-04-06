// ═══════════════════════════════════════════════════════════════════════════
//  NexusAI Team v2.0 — app.js
//  Canvas engine · Model loader · Chat · Dashboard · Code viewer · Toast
// ═══════════════════════════════════════════════════════════════════════════
'use strict';

/* ══ CONSTANTS ══════════════════════════════════════════════════════════════ */
const MUX_PLAYBACK_ID = 'GEpj38bbxKjkAo6Ij3qmxbYeNTQ011TTnl2eH9ftDTFM';

const AGENT_DEFS = [
  { id:'code',   tag:'CODE',   label:'Code Writer',       icon:'</>',  color:'#00ff88',
    system:'You are an expert software engineer. Write clean, efficient, well-commented code in any language. After code, briefly explain what it does.' },
  { id:'img',    tag:'IMG',    label:'Image Prompt AI',   icon:'⬡',    color:'#ff6b6b',
    system:'You are an expert at generating detailed image prompts for Midjourney, DALL-E 3, and Stable Diffusion. Output rich, vivid, technically precise prompts with style, lighting, and composition details.' },
  { id:'text',   tag:'TEXT',   label:'Content Writer',    icon:'✦',    color:'#4ecdc4',
    system:'You are an expert content writer. Create engaging, clear, compelling content — blogs, copy, scripts, or articles. Match the tone and style the user needs.' },
  { id:'trans',  tag:'TRANS',  label:'AI Translator',     icon:'◈',    color:'#45b7d1',
    system:'You are a professional translator fluent in all major languages. Translate accurately while preserving tone, nuance, and cultural context. Always state the source and target language.' },
  { id:'data',   tag:'DATA',   label:'Data Analyst',      icon:'▦',    color:'#f7dc6f',
    system:'You are an expert data analyst. Analyze data, identify patterns and insights, and explain findings clearly. Use structured output with tables when helpful. Suggest chart types when relevant.' },
  { id:'seo',    tag:'SEO',    label:'SEO Expert',        icon:'◉',    color:'#bb8fce',
    system:'You are an SEO expert. Optimize content for search rankings. Provide meta tags, keyword strategies, content structure improvements, and actionable recommendations.' },
  { id:'debug',  tag:'DEBUG',  label:'Bug Fixer',         icon:'⚡',   color:'#f0b27a',
    system:'You are an expert debugger. Carefully analyze code, identify all bugs and their root causes, explain why each occurs, then provide corrected working code.' },
  { id:'test',   tag:'TEST',   label:'Test Writer',       icon:'✓',    color:'#82e0aa',
    system:'You are an expert at writing automated tests. Create comprehensive unit, integration, and E2E tests. Use the framework specified, or recommend the best one for the context.' },
  { id:'summ',   tag:'SUMM',   label:'Summarizer',        icon:'≡',    color:'#f1948a',
    system:'You are an expert summarizer. Condense any content accurately and concisely while preserving all key information. Offer bullet-point or paragraph format based on the content type.' },
  { id:'math',   tag:'MATH',   label:'Math Solver',       icon:'∑',    color:'#a9cce3',
    system:'You are a mathematics expert. Solve problems step-by-step with clear reasoning. Show all work. Explain concepts in plain language after solving. Use LaTeX notation when helpful.' },
  { id:'design', tag:'DESIGN', label:'UI/UX Designer',    icon:'◬',    color:'#d7bde2',
    system:'You are a senior UI/UX designer. Suggest layouts, color palettes, typography, and user flows. Provide HTML/CSS snippets, Tailwind classes, or design tokens when useful.' },
  { id:'chat',   tag:'CHAT',   label:'General Assistant', icon:'◌',    color:'#7fb3d3',
    system:'You are a helpful, knowledgeable assistant. Engage naturally, answer questions clearly, be concise when possible and thorough when needed. Use markdown for structured answers.' },
];

/* ══ CANVAS SETUP ════════════════════════════════════════════════════════════ */
const canvas = document.getElementById('agentCanvas');
const ctx    = canvas.getContext('2d');
let W = 0, H = 0;

function resize() {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
  layoutAgents();
}
window.addEventListener('resize', resize);

/* ══ AGENT LAYOUT ════════════════════════════════════════════════════════════ */
let agents = [];
const NODE_W = 92, NODE_H = 54;

function layoutAgents() {
  const cx = W / 2, cy = H / 2;
  const r  = Math.min(W, H) * 0.35;
  agents = AGENT_DEFS.map((def, i) => {
    const ang = (i / AGENT_DEFS.length) * Math.PI * 2 - Math.PI / 2;
    return { ...def, x: cx + Math.cos(ang) * r, y: cy + Math.sin(ang) * r,
             glow: 0, pulse: 0, status: 'idle', chatCount: 0 };
  });
}

/* ══ MUX VIDEO ════════════════════════════════════════════════════════════════ */
(function initMux() {
  const video = document.getElementById('bgVideo');
  const src   = `https://stream.mux.com/${MUX_PLAYBACK_ID}.m3u8`;
  if (Hls && Hls.isSupported()) {
    const hls = new Hls({ lowLatencyMode: true, maxBufferLength: 10 });
    hls.loadSource(src);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
    hls.on(Hls.Events.ERROR, (_, d) => { if (d.fatal) video.src = `https://stream.mux.com/${MUX_PLAYBACK_ID}/low.mp4`; });
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = src;
    video.play().catch(() => {});
  }
})();

/* ══ MODEL CACHE ═════════════════════════════════════════════════════════════ */
let modelCache   = { openrouter: [], groq: [], lastUpdated: 0 };
let refreshTimer = 60;
let totalChats   = 0;

async function loadModels() {
  try {
    const res = await fetch('/api/models');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    modelCache = await res.json();
    const total = modelCache.openrouter.length + modelCache.groq.length;
    document.getElementById('modelCount').textContent = `${total} free models`;
    refreshTimer = 60;
    toast(`Models refreshed: ${total} available`, 'success');
    populateModelSelect();
  } catch (e) {
    document.getElementById('modelCount').textContent = 'Model fetch failed';
    console.error('loadModels:', e.message);
  }
}

// Countdown
setInterval(() => {
  refreshTimer = Math.max(0, refreshTimer - 1);
  document.getElementById('updateTimer').textContent = `${refreshTimer}s`;
  if (refreshTimer === 0) loadModels();
}, 1000);

loadModels();

/* ══ DATA PACKETS ════════════════════════════════════════════════════════════ */
let packets = [];

function spawnPacket(x1, y1, x2, y2, color, size = 4, trail = false) {
  packets.push({ x1, y1, x2, y2, x: x1, y: y1, color, size, t: 0,
    speed: 0.005 + Math.random() * 0.007, trail,
    history: [] });
}

function updatePackets() {
  packets = packets.filter(p => p.t < 1);
  packets.forEach(p => {
    if (p.trail) p.history.push({ x: p.x, y: p.y });
    if (p.history.length > 12) p.history.shift();
    p.t = Math.min(1, p.t + p.speed);
    const e = ease(p.t);
    p.x = p.x1 + (p.x2 - p.x1) * e;
    p.y = p.y1 + (p.y2 - p.y1) * e;
  });
}

function ease(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

/* ══ BACKGROUND PARTICLES ════════════════════════════════════════════════════ */
const PARTICLE_COUNT = 130;
const particles = Array.from({ length: PARTICLE_COUNT }, () => mkParticle(true));

function mkParticle(randomY = false) {
  return {
    x:     Math.random() * window.innerWidth,
    y:     randomY ? Math.random() * window.innerHeight : window.innerHeight + 5,
    r:     Math.random() * 1.4 + 0.2,
    vy:    -(0.06 + Math.random() * 0.22),
    alpha: Math.random() * 0.35 + 0.05,
    hue:   180 + Math.random() * 60,
  };
}

/* ══ STAR FIELD ══════════════════════════════════════════════════════════════ */
const stars = Array.from({ length: 60 }, () => ({
  x: Math.random() * window.innerWidth,
  y: Math.random() * window.innerHeight,
  r: Math.random() * 1.2 + 0.1,
  alpha: Math.random() * 0.5 + 0.1,
  twinkle: Math.random() * Math.PI * 2,
}));

/* ══ HELPER UTILITIES ════════════════════════════════════════════════════════ */
function hexA(hex, a) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function rrect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y,     x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x,     y + h, x,     y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x,     y,     x + r, y);
  ctx.closePath();
}

/* ══ DRAW: STARS ══════════════════════════════════════════════════════════════ */
function drawStars() {
  const t = Date.now() / 1000;
  stars.forEach(s => {
    const alpha = s.alpha * (0.6 + 0.4 * Math.sin(t * 0.8 + s.twinkle));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#aaccff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

/* ══ DRAW: PARTICLES ═════════════════════════════════════════════════════════ */
function drawParticles() {
  particles.forEach(p => {
    p.y += p.vy;
    if (p.y < -5) { Object.assign(p, mkParticle()); }
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = `hsl(${p.hue},100%,70%)`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

/* ══ DRAW: CONNECTION LINES ══════════════════════════════════════════════════ */
function drawLines() {
  const cx = W / 2, cy = H / 2;
  agents.forEach(a => {
    const busy = a.status !== 'idle';
    ctx.save();
    ctx.globalAlpha = busy ? 0.55 : 0.1;
    // Dashed line
    ctx.setLineDash(busy ? [4, 6] : [2, 12]);
    ctx.lineDashOffset = -(Date.now() / 40) % 30;
    ctx.strokeStyle = a.color;
    ctx.lineWidth   = busy ? 1.2 : 0.8;
    ctx.shadowBlur  = busy ? 12 : 0;
    ctx.shadowColor = a.color;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(cx, cy); ctx.stroke();
    ctx.restore();
  });
}

/* ══ DRAW: CENTER HUB ════════════════════════════════════════════════════════ */
function drawHub() {
  const cx = W / 2, cy = H / 2;
  const t  = Date.now() / 1000;
  const p  = 0.75 + Math.sin(t * 1.6) * 0.25;
  const sz = 60;

  ctx.save();

  // Outer pulse rings
  for (let ri = 0; ri < 3; ri++) {
    const rr = sz + 22 + ri * 18 + Math.sin(t * 1.2 + ri) * 5;
    ctx.globalAlpha = (0.08 - ri * 0.025) * p;
    ctx.strokeStyle = '#00c8ff';
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Rotating dashed ring
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(t * 0.25);
  ctx.setLineDash([5, 8]);
  ctx.strokeStyle = hexA('#00c8ff', 0.3);
  ctx.lineWidth   = 1;
  ctx.beginPath(); ctx.arc(0, 0, sz + 10, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();

  // Counter-rotating ring
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(-t * 0.15);
  ctx.setLineDash([3, 14]);
  ctx.strokeStyle = hexA('#00ff88', 0.2);
  ctx.lineWidth   = 1;
  ctx.beginPath(); ctx.arc(0, 0, sz + 18, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();

  // Hexagon
  ctx.shadowBlur  = 40 * p;
  ctx.shadowColor = '#00c8ff';
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
    i === 0 ? ctx.moveTo(cx + Math.cos(a) * sz, cy + Math.sin(a) * sz)
            : ctx.lineTo(cx + Math.cos(a) * sz, cy + Math.sin(a) * sz);
  }
  ctx.closePath();
  const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, sz);
  grd.addColorStop(0, 'rgba(0,80,200,0.7)');
  grd.addColorStop(1, 'rgba(0,10,40,0.95)');
  ctx.fillStyle = grd;
  ctx.fill();
  ctx.strokeStyle = hexA('#00c8ff', p * 0.9);
  ctx.lineWidth   = 1.5; ctx.setLineDash([]);
  ctx.stroke();

  // Text
  ctx.shadowBlur = 0;
  ctx.textAlign  = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle  = '#fff';
  ctx.font       = `bold 14px 'Orbitron', sans-serif`;
  ctx.fillText('NEXUS', cx, cy - 10);
  ctx.font       = `7px 'JetBrains Mono', monospace`;
  ctx.fillStyle  = '#00c8ff';
  ctx.fillText('DASHBOARD', cx, cy + 6);
  ctx.font       = `6px 'JetBrains Mono', monospace`;
  ctx.fillStyle  = hexA('#00ff88', 0.7);
  ctx.fillText(`${modelCache.openrouter.length + modelCache.groq.length} models`, cx, cy + 18);

  ctx.restore();
}

/* ══ DRAW: AGENT NODES ═══════════════════════════════════════════════════════ */
function drawAgents() {
  agents.forEach(a => {
    const hw = NODE_W / 2, hh = NODE_H / 2;
    const busy = a.status !== 'idle';

    ctx.save();
    if (a.glow > 0.01) {
      ctx.shadowBlur  = 24 * a.glow;
      ctx.shadowColor = a.color;
    }

    // Background
    rrect(a.x - hw, a.y - hh, NODE_W, NODE_H, 9);
    const bg = ctx.createLinearGradient(a.x - hw, a.y - hh, a.x + hw, a.y + hh);
    bg.addColorStop(0, 'rgba(4,4,18,0.95)');
    bg.addColorStop(1, 'rgba(10,10,32,0.95)');
    ctx.fillStyle = bg;
    ctx.fill();

    // Top accent line
    ctx.fillStyle = hexA(a.color, busy ? 0.9 : 0.5);
    ctx.fillRect(a.x - hw + 9, a.y - hh, NODE_W - 18, 2);

    // Border
    rrect(a.x - hw, a.y - hh, NODE_W, NODE_H, 9);
    ctx.strokeStyle = busy ? a.color : hexA(a.color, 0.3);
    ctx.lineWidth   = busy ? 1.5 : 0.8;
    ctx.stroke();

    // Icon (top-left)
    ctx.shadowBlur = 0;
    ctx.fillStyle  = hexA(a.color, 0.55);
    ctx.font       = `10px 'JetBrains Mono', monospace`;
    ctx.textAlign  = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(a.icon, a.x - hw + 7, a.y - hh + 7);

    // Chat count (top-right)
    if (a.chatCount > 0) {
      ctx.fillStyle = hexA(a.color, 0.5);
      ctx.font      = `9px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'right';
      ctx.fillText(`×${a.chatCount}`, a.x + hw - 7, a.y - hh + 8);
    }

    // Name
    ctx.fillStyle    = busy ? a.color : '#ddeeff';
    ctx.font         = `bold 11px 'Orbitron', sans-serif`;
    ctx.textAlign    = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(a.tag, a.x, a.y + 1);

    // Status row
    const dotColor = a.status === 'processing' ? '#ffee44'
                   : a.status === 'receiving'  ? '#44ffaa'
                   : hexA(a.color, 0.2);
    ctx.fillStyle = dotColor;
    ctx.beginPath();
    ctx.arc(a.x - 18, a.y + 16, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle    = a.status !== 'idle' ? dotColor : hexA('#8ab', 0.4);
    ctx.font         = `7px 'JetBrains Mono', monospace`;
    ctx.textAlign    = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(a.status, a.x - 12, a.y + 16);

    a.glow = Math.max(0, a.glow - 0.014);
    ctx.restore();
  });
}

/* ══ DRAW: PACKETS ═══════════════════════════════════════════════════════════ */
function drawPackets() {
  packets.forEach(p => {
    // Trail
    if (p.trail) {
      p.history.forEach((h, i) => {
        const alpha = (i / p.history.length) * 0.5 * (1 - p.t * 0.3);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle   = p.color;
        ctx.beginPath();
        ctx.arc(h.x, h.y, p.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }
    // Main dot
    ctx.save();
    ctx.shadowBlur  = 16;
    ctx.shadowColor = p.color;
    ctx.fillStyle   = p.color;
    ctx.globalAlpha = 1 - p.t * 0.2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

/* ══ AUTO ACTIVITY ═══════════════════════════════════════════════════════════ */
let autoIdx = 0;

function triggerAutoActivity() {
  if (!agents.length) return;
  const cx = W / 2, cy = H / 2;
  autoIdx = (autoIdx + Math.floor(Math.random() * 4) + 1) % agents.length;
  const a = agents[autoIdx];
  a.glow = 1; a.status = 'processing';

  // 3 packets toward hub
  for (let i = 0; i < 3; i++) {
    setTimeout(() => spawnPacket(a.x, a.y, cx, cy, a.color, 4, i === 0), i * 200);
  }
  setTimeout(() => {
    a.status = 'idle';
    // Hub replies to another agent
    const bIdx = Math.floor(Math.random() * agents.length);
    const b    = agents[bIdx];
    b.glow = 0.8; b.status = 'receiving';
    spawnPacket(cx, cy, b.x, b.y, '#ffffff', 3, true);
    spawnPacket(cx, cy, b.x, b.y, b.color, 4, false);
    setTimeout(() => { b.glow = 0; b.status = 'idle'; }, 1400);
  }, 1000);
}

setInterval(triggerAutoActivity, 1800);

/* ══ MAIN RENDER LOOP ════════════════════════════════════════════════════════ */
function render() {
  requestAnimationFrame(render);
  // Translucent wipe (motion blur effect)
  ctx.fillStyle = 'rgba(3,3,15,0.22)';
  ctx.fillRect(0, 0, W, H);

  drawStars();
  drawParticles();
  drawLines();
  drawHub();
  drawAgents();
  updatePackets();
  drawPackets();
}

resize();
render();

/* ══ HIT TESTING ══════════════════════════════════════════════════════════════ */
canvas.addEventListener('click', e => {
  const r  = canvas.getBoundingClientRect();
  const mx = e.clientX - r.left, my = e.clientY - r.top;
  const cx = W / 2, cy = H / 2;

  // Center hub → dashboard
  if (Math.hypot(mx - cx, my - cy) < 68) { openDashboard(); return; }

  // Agent node
  const hit = agents.find(a =>
    mx >= a.x - NODE_W / 2 && mx <= a.x + NODE_W / 2 &&
    my >= a.y - NODE_H / 2 && my <= a.y + NODE_H / 2
  );
  if (hit) openAgentChat(hit);
});

canvas.addEventListener('mousemove', e => {
  const r  = canvas.getBoundingClientRect();
  const mx = e.clientX - r.left, my = e.clientY - r.top;
  const cx = W / 2, cy = H / 2;
  const onAgent  = agents.some(a => mx >= a.x - NODE_W/2 && mx <= a.x + NODE_W/2 && my >= a.y - NODE_H/2 && my <= a.y + NODE_H/2);
  const onCenter = Math.hypot(mx - cx, my - cy) < 68;
  canvas.style.cursor = (onAgent || onCenter) ? 'pointer' : 'crosshair';
});

/* ══ POPULATE MODEL SELECT ════════════════════════════════════════════════════ */
function populateModelSelect(agentColor) {
  const sel = document.getElementById('modelSelect');
  sel.innerHTML = '<option value="">— Select model —</option>';

  if (modelCache.openrouter.length) {
    const grp = document.createElement('optgroup');
    grp.label = `⭐ OpenRouter Free (${modelCache.openrouter.length})`;
    modelCache.openrouter.forEach(m => {
      const o  = document.createElement('option');
      o.value  = `openrouter:${m.id}`;
      o.text   = (m.pinned ? '★ ' : '') + (m.name || m.id).replace(/:free$/, '');
      grp.appendChild(o);
    });
    sel.appendChild(grp);
  }

  if (modelCache.groq.length) {
    const grp = document.createElement('optgroup');
    grp.label = `⚡ Groq Free (${modelCache.groq.length})`;
    modelCache.groq.forEach(m => {
      const o  = document.createElement('option');
      o.value  = `groq:${m.id}`;
      o.text   = m.id;
      grp.appendChild(o);
    });
    sel.appendChild(grp);
  }

  // Auto-pick first pinned model
  const firstPinned = [...sel.options].find(o => o.text.startsWith('★'));
  if (firstPinned) firstPinned.selected = true;
  else if (sel.options.length > 1) sel.selectedIndex = 1;

  updateModelLabel();
}

document.getElementById('modelSelect').addEventListener('change', updateModelLabel);
function updateModelLabel() {
  const sel  = document.getElementById('modelSelect');
  const val  = sel.value;
  const text = sel.options[sel.selectedIndex]?.text || '—';
  document.getElementById('chatModelLabel').textContent = val ? text.replace('★ ', '') : 'No model selected';
}

/* ══ AGENT CHAT MODAL ════════════════════════════════════════════════════════ */
let currentAgent  = null;
let chatHistory   = [];
let msgIdCounter  = 0;

function openAgentChat(agent) {
  currentAgent = agent;
  chatHistory  = [];

  // Glow on canvas
  const ca = agents.find(a => a.id === agent.id);
  if (ca) { ca.glow = 1.2; }

  // Populate header
  document.getElementById('modalTag').textContent   = agent.tag;
  document.getElementById('modalTag').style.color   = agent.color;
  document.getElementById('modalTitle').textContent = agent.label;
  document.getElementById('modalSubtitle').textContent = 'Ready to help';
  document.getElementById('modalBadge').textContent = agent.tag;
  document.getElementById('modalBadge').style.borderColor = agent.color;
  document.getElementById('modalBadge').style.color = agent.color;
  document.getElementById('agentModalInner').style.borderTopColor = agent.color;

  // Welcome
  document.getElementById('welcomeIcon').textContent = agent.icon;
  document.getElementById('welcomeText').textContent = `${agent.label} — ${agent.system.slice(0, 60)}…`;

  const box = document.getElementById('chatMessages');
  box.innerHTML = '';
  box.appendChild(document.getElementById('chatWelcome'));
  document.getElementById('chatWelcome').classList.remove('hidden');

  document.getElementById('chatMsgCount').textContent = '0 messages';
  populateModelSelect(agent.color);
  document.getElementById('agentModal').classList.remove('hidden');
  document.getElementById('userInput').focus();
}

document.getElementById('closeModal').onclick = () => {
  document.getElementById('agentModal').classList.add('hidden');
};
document.getElementById('clearChatBtn').onclick = () => {
  chatHistory = [];
  const box = document.getElementById('chatMessages');
  box.innerHTML = '';
  box.appendChild(document.getElementById('chatWelcome'));
  document.getElementById('chatMsgCount').textContent = '0 messages';
  toast('Conversation cleared', 'info');
};

// Char counter
document.getElementById('userInput').addEventListener('input', function () {
  document.getElementById('charCount').textContent = this.value.length;
});

// Send on Enter (not Shift+Enter)
document.getElementById('userInput').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});
document.getElementById('sendBtn').onclick = sendMessage;

async function sendMessage() {
  const input = document.getElementById('userInput');
  const text  = input.value.trim();
  if (!text || !currentAgent) return;

  const modelVal = document.getElementById('modelSelect').value;
  if (!modelVal) { toast('Please select a model first', 'error'); return; }

  const [provider, ...rest] = modelVal.split(':');
  const model = rest.join(':');

  // Hide welcome
  document.getElementById('chatWelcome').classList.add('hidden');

  appendUserMsg(text);
  input.value = '';
  document.getElementById('charCount').textContent = '0';
  chatHistory.push({ role: 'user', content: text });
  document.getElementById('chatMsgCount').textContent = `${chatHistory.length} messages`;

  // Typing indicator
  document.getElementById('typingIndicator').classList.remove('hidden');
  document.getElementById('sendBtn').disabled = true;
  document.getElementById('modalSubtitle').textContent = 'Thinking…';

  // Animate agent on canvas
  const ca = agents.find(a => a.id === currentAgent.id);
  if (ca) { ca.glow = 1; ca.status = 'processing'; }
  spawnPacket(ca?.x || W/2, ca?.y || H/2, W/2, H/2, currentAgent.color, 5, true);

  try {
    const res  = await fetch('/api/chat', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        provider, model,
        messages: chatHistory,
        system:   currentAgent.system,
        agentId:  currentAgent.id,
      }),
    });

    if (!res.ok) { const t = await res.text(); throw new Error(`Server: ${t.slice(0, 100)}`); }

    const data  = await res.json();
    const reply = data.choices?.[0]?.message?.content
                || data.error?.message
                || 'No response.';

    document.getElementById('typingIndicator').classList.add('hidden');
    appendAssistantMsg(reply);
    chatHistory.push({ role: 'assistant', content: reply });
    document.getElementById('chatMsgCount').textContent = `${chatHistory.length} messages`;
    document.getElementById('modalSubtitle').textContent = 'Ready';
    totalChats++;
    document.getElementById('reqCount').textContent = `${totalChats} chats`;

    if (ca) { ca.status = 'idle'; ca.chatCount++; }
    // Return packet
    spawnPacket(W/2, H/2, ca?.x || W/2, ca?.y || H/2, '#ffffff', 3, true);

    if (data.error) toast(`API error: ${data.error.message || JSON.stringify(data.error).slice(0,80)}`, 'error');

  } catch (err) {
    document.getElementById('typingIndicator').classList.add('hidden');
    appendAssistantMsg(`⚠ Error: ${err.message}`, true);
    document.getElementById('modalSubtitle').textContent = 'Error occurred';
    toast(err.message, 'error');
    if (ca) ca.status = 'idle';
  }

  document.getElementById('sendBtn').disabled = false;
  document.getElementById('userInput').focus();
}

function appendUserMsg(text) {
  const box = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className   = 'chat-msg chat-user';
  div.textContent = text;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

function appendAssistantMsg(md, isError = false) {
  const box = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = 'chat-msg chat-assistant';
  if (isError) { div.style.borderColor = '#ff4466'; div.style.color = '#ff8899'; div.textContent = md; }
  else {
    // Render markdown
    try { div.innerHTML = marked.parse(md); }
    catch { div.textContent = md; }
    // Add syntax highlight to code blocks
    div.querySelectorAll('pre code').forEach(el => hljs.highlightElement(el));
    // Copy button
    const btn = document.createElement('button');
    btn.className   = 'copy-btn';
    btn.textContent = 'Copy';
    btn.onclick     = () => { navigator.clipboard.writeText(md); toast('Copied!', 'success'); };
    div.appendChild(btn);
  }
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

/* ══ DASHBOARD ════════════════════════════════════════════════════════════════ */
document.getElementById('dashBtn').onclick    = openDashboard;
document.getElementById('closeDash').onclick  = () => document.getElementById('dashModal').classList.add('hidden');

// Tab switching
document.querySelectorAll('.dash-tab').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.dash-tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.dash-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    if (btn.dataset.tab === 'models')  renderModelsTab();
    if (btn.dataset.tab === 'agents')  renderAgentsTab();
    if (btn.dataset.tab === 'log')     renderLogTab();
  };
});

async function openDashboard() {
  document.getElementById('dashModal').classList.remove('hidden');
  // Activate overview tab
  document.querySelectorAll('.dash-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.dash-panel').forEach(p => p.classList.remove('active'));
  document.querySelector('.dash-tab[data-tab="overview"]').classList.add('active');
  document.getElementById('tab-overview').classList.add('active');
  await renderOverviewTab();
}

async function renderOverviewTab() {
  try {
    const res   = await fetch('/api/stats');
    const stats = await res.json();
    const upSec = Math.floor(stats.uptime / 1000);
    const upStr = `${Math.floor(upSec / 3600)}h ${Math.floor((upSec % 3600) / 60)}m ${upSec % 60}s`;

    document.getElementById('statsGrid').innerHTML = `
      <div class="stat-card">
        <div class="stat-label">Total Models</div>
        <div class="stat-value">${stats.modelsLoaded}</div>
        <div class="stat-sub">OpenRouter + Groq free</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Chat Requests</div>
        <div class="stat-value">${stats.chatRequests}</div>
        <div class="stat-sub">since server start</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Model Refreshes</div>
        <div class="stat-value">${stats.modelRefreshes}</div>
        <div class="stat-sub">auto every 60s</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Server Errors</div>
        <div class="stat-value" style="color:${stats.errors ? 'var(--red)' : 'var(--green)'}">${stats.errors}</div>
        <div class="stat-sub">${stats.errors ? 'check log tab' : 'all clear ✓'}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">OpenRouter Models</div>
        <div class="stat-value">${modelCache.openrouter.length}</div>
        <div class="stat-sub">free tier only</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Groq Models</div>
        <div class="stat-value">${modelCache.groq.length}</div>
        <div class="stat-sub">rate-limited free</div>
      </div>
    `;

    // Uptime bar (max 24h)
    const pct = Math.min(100, (upSec / 86400) * 100);
    document.getElementById('uptimeFill').style.width = `${pct}%`;
    document.getElementById('uptimeLabel').textContent = upStr;

  } catch (e) {
    document.getElementById('statsGrid').innerHTML = `<div style="color:var(--red);font-size:12px">Failed to load stats: ${e.message}</div>`;
  }
}

function renderModelsTab() {
  const body    = document.getElementById('modelTableBody');
  const all     = [
    ...modelCache.openrouter.map(m => ({ ...m, prov: 'openrouter' })),
    ...modelCache.groq.map(m => ({ ...m, prov: 'groq' })),
  ];
  let filtered  = all;
  let activeProv = 'all';

  function render() {
    const q = document.getElementById('modelSearch').value.toLowerCase();
    const rows = filtered
      .filter(m => activeProv === 'all' || m.prov === activeProv)
      .filter(m => !q || m.id.toLowerCase().includes(q) || (m.name || '').toLowerCase().includes(q));

    body.innerHTML = rows.map(m => `
      <tr>
        <td class="model-name">
          ${m.pinned ? '<span class="pinned-star" title="Top model">★</span>' : ''}
          ${(m.name || m.id).replace(/:free$/, '')}
          <small>${m.id}</small>
        </td>
        <td><span class="provider-badge ${m.prov === 'openrouter' ? 'prov-or' : 'prov-gq'}">${m.prov === 'openrouter' ? 'OR' : 'GQ'}</span></td>
        <td class="ctx-badge">${(m.context / 1000).toFixed(0)}k</td>
      </tr>
    `).join('');
    if (!rows.length) body.innerHTML = '<tr><td colspan="3" style="color:var(--text-2);text-align:center;padding:20px">No models found</td></tr>';
  }

  document.getElementById('modelSearch').oninput = render;
  document.querySelectorAll('.ptab').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.ptab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeProv = btn.dataset.p;
      render();
    };
  });
  render();
}

function renderAgentsTab() {
  const grid = document.getElementById('agentStatsGrid');
  grid.innerHTML = AGENT_DEFS.map(def => {
    const ca = agents.find(a => a.id === def.id);
    return `
      <div class="agent-stat-card">
        <div class="ast-badge" style="color:${def.color}">${def.tag}</div>
        <div style="font-size:11px;color:var(--text-2);margin-bottom:8px">${def.label}</div>
        <div class="ast-count">${ca?.chatCount || 0}</div>
        <div class="ast-label">conversations</div>
        <div style="margin-top:8px;font-size:9px;padding:2px 8px;border-radius:3px;border:1px solid var(--border);color:${def.color};display:inline-block">${ca?.status || 'idle'}</div>
      </div>
    `;
  }).join('');
}

async function renderLogTab() {
  try {
    const res   = await fetch('/api/stats');
    const stats = await res.json();
    const list  = document.getElementById('logList');
    list.innerHTML = (stats.recentActivity || []).map(e => {
      const d = new Date(e.ts);
      const t = `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}`;
      return `
        <div class="log-entry ${e.type}">
          <span class="log-ts">${t}</span>
          <span class="log-type">${e.type}</span>
          <span class="log-msg">${e.msg}</span>
        </div>
      `;
    }).join('') || '<div style="color:var(--text-2);padding:20px;font-size:12px">No activity yet</div>';
  } catch { document.getElementById('logList').innerHTML = '<div style="color:var(--red);font-size:12px;padding:12px">Failed to load log</div>'; }
}

/* ══ CODE VIEWER ═════════════════════════════════════════════════════════════ */
document.getElementById('viewCodeBtn').onclick = openCodeViewer;
document.getElementById('closeCode').onclick   = () => document.getElementById('codeModal').classList.add('hidden');
document.getElementById('dlZipBtn').onclick    = () => { window.location.href = '/api/download'; };
document.getElementById('downloadBtn').onclick = () => { window.location.href = '/api/download'; toast('Downloading ZIP…', 'info'); };

let currentFileContent = '';
document.getElementById('copyFileBtn').onclick = () => {
  if (!currentFileContent) { toast('No file selected', 'error'); return; }
  navigator.clipboard.writeText(currentFileContent).then(() => toast('Copied to clipboard', 'success'));
};

async function openCodeViewer() {
  document.getElementById('codeModal').classList.remove('hidden');
  const sidebar = document.getElementById('fileSidebar');
  sidebar.innerHTML = '<div style="padding:14px;font-size:11px;color:var(--text-2)">Loading…</div>';

  try {
    const res   = await fetch('/api/files');
    const files = await res.json();
    sidebar.innerHTML = '';

    files.forEach(f => {
      const item = document.createElement('div');
      item.className = 'file-item';
      const extColor = { js:'#f7dc6f', css:'#4ecdc4', html:'#f0b27a', md:'#82e0aa', json:'#bb8fce' }[f.ext] || '#8ab';
      item.innerHTML = `
        <span class="file-ext-badge" style="color:${extColor};border-color:${extColor}44">${f.ext}</span>
        <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${f.path}</span>
        <div class="file-info">
          <span class="file-size">${(f.size / 1024).toFixed(1)}k</span>
          <span class="file-lines">${f.lines}L</span>
        </div>
      `;
      item.onclick = () => {
        sidebar.querySelectorAll('.file-item').forEach(el => el.classList.remove('active'));
        item.classList.add('active');
        loadFileContent(f.path, f.ext);
      };
      sidebar.appendChild(item);
    });

    // Auto-load first file
    if (files.length) sidebar.querySelector('.file-item').click();

  } catch (err) {
    sidebar.innerHTML = `<div style="padding:14px;color:var(--red);font-size:11px">Error: ${err.message}</div>`;
  }
}

async function loadFileContent(filePath, ext) {
  const area = document.getElementById('codeArea');
  area.innerHTML = '<div class="code-placeholder">Loading…</div>';
  try {
    const res  = await fetch(`/api/file?path=${encodeURIComponent(filePath)}`);
    const data = await res.json();
    currentFileContent = data.content;

    const langMap = { js: 'javascript', css: 'css', html: 'html', json: 'json', md: 'markdown' };
    const lang    = langMap[ext] || 'plaintext';

    const pre  = document.createElement('pre');
    const code = document.createElement('code');
    code.className  = `language-${lang}`;
    code.textContent = data.content;
    pre.appendChild(code);
    area.innerHTML = '';
    area.appendChild(pre);
    hljs.highlightElement(code);

  } catch (e) {
    area.innerHTML = `<div class="code-placeholder" style="color:var(--red)">Error: ${e.message}</div>`;
  }
}

/* ══ TOAST ════════════════════════════════════════════════════════════════════ */
function toast(msg, type = 'info') {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

/* ══ MODAL BACKDROP CLOSE ════════════════════════════════════════════════════ */
['agentModal', 'dashModal', 'codeModal'].forEach(id => {
  document.getElementById(id).addEventListener('click', e => {
    if (e.target.id === id) document.getElementById(id).classList.add('hidden');
  });
});

/* ══ STATS POLLING ════════════════════════════════════════════════════════════ */
// Poll server stats every 5s to update req count in header
setInterval(async () => {
  try {
    const r = await fetch('/api/stats');
    const s = await r.json();
    document.getElementById('reqCount').textContent = `${s.chatRequests} chats`;
  } catch { /* silent */ }
}, 5000);
