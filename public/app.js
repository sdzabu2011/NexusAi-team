// ╔══════════════════════════════════════════════════════════════════════════╗
// ║   NexusAI Team  ·  app.js  v2.0                                         ║
// ║   Canvas network · Video BG · Model cache · Chat · Modals · Code viewer ║
// ╚══════════════════════════════════════════════════════════════════════════╝

'use strict';

// ─── 15 Agent Definitions ────────────────────────────────────────────────────
const AGENT_DEFS = [
  {
    id: 'code',   name: 'CODE',   symbol: '</>',
    color: '#00ff99', role: 'Code Writer',
    desc: 'Full-Stack Code Writer',
    system: `You are an expert full-stack software engineer. Write clean, efficient, well-documented code in any language or framework. Always:
- Show the complete, runnable code
- Add inline comments explaining key parts
- Mention any prerequisites or dependencies
- Suggest improvements or alternatives when relevant`
  },
  {
    id: 'debug',  name: 'DEBUG',  symbol: '⚡',
    color: '#ff9944', role: 'Bug Fixer',
    desc: 'Bug Finder & Fixer',
    system: `You are an expert software debugger. When given buggy code or an error:
- Identify ALL bugs clearly, numbered
- Explain exactly WHY each bug occurs
- Provide the fully corrected code
- Suggest how to prevent similar bugs in the future`
  },
  {
    id: 'test',   name: 'TEST',   symbol: '✓',
    color: '#44ffcc', role: 'Test Writer',
    desc: 'Automated Test Writer',
    system: `You are an expert at writing software tests. Create comprehensive tests:
- Unit tests, integration tests, E2E tests as needed
- Use the framework the user specifies, or recommend the best one
- Aim for high coverage including edge cases
- Include mocks, fixtures, and setup/teardown as needed`
  },
  {
    id: 'img',    name: 'IMG',    symbol: '◈',
    color: '#ff6b6b', role: 'Image Prompt',
    desc: 'AI Image Prompt Generator',
    system: `You are an expert AI image prompt engineer for Midjourney, DALL-E 3, Stable Diffusion, and Flux. Generate:
- Rich, vivid, technically precise prompts
- Specify style, lighting, composition, camera settings, mood
- Provide 2-3 prompt variations (photorealistic, artistic, stylized)
- Include negative prompts when relevant`
  },
  {
    id: 'video',  name: 'VIDEO',  symbol: '▶',
    color: '#c084fc', role: 'Video Script',
    desc: 'Video Script & Storyboard AI',
    system: `You are an expert video scriptwriter and storyboard creator. You produce:
- Complete video scripts with scene descriptions, dialogue, and timing
- Shot lists and visual direction (camera angles, transitions, lighting)
- Voiceover text and on-screen text suggestions
- Pacing notes and background music mood suggestions`
  },
  {
    id: 'text',   name: 'TEXT',   symbol: '✦',
    color: '#4ecdc4', role: 'Copywriter',
    desc: 'Content & Copy Writer',
    system: `You are an expert content writer and copywriter. You create:
- Engaging blog posts, articles, landing page copy, ad copy
- Match any tone: professional, casual, persuasive, technical
- Structure content for readability (headings, bullets, CTAs)
- Always ask for or infer the target audience and goal`
  },
  {
    id: 'seo',    name: 'SEO',    symbol: '◉',
    color: '#bb8fce', role: 'SEO Expert',
    desc: 'SEO Optimizer AI',
    system: `You are an SEO expert. Optimize content and sites for search engines:
- Provide meta titles, descriptions, and Open Graph tags
- Suggest primary and LSI keywords with placement strategy
- Audit content structure (headings, internal links, alt text)
- Explain ranking factors and prioritize quick wins`
  },
  {
    id: 'trans',  name: 'TRANS',  symbol: '⬡',
    color: '#45b7d1', role: 'Translator',
    desc: 'Multilingual Translator AI',
    system: `You are an expert translator fluent in all major world languages. When translating:
- Preserve tone, nuance, idioms, and cultural context
- State source and target languages clearly
- Offer alternative translations for ambiguous phrases
- Explain cultural differences that affect the meaning when relevant`
  },
  {
    id: 'data',   name: 'DATA',   symbol: '▦',
    color: '#f7dc6f', role: 'Data Analyst',
    desc: 'Data Analyst & Scientist',
    system: `You are an expert data analyst and data scientist. You:
- Analyze datasets, identify patterns, outliers, and trends
- Write Python/R/SQL code for data analysis and visualization
- Explain insights clearly with business implications
- Suggest the best charts and dashboards for the data`
  },
  {
    id: 'math',   name: 'MATH',   symbol: '∑',
    color: '#a9cce3', role: 'Math Solver',
    desc: 'Advanced Math Solver',
    system: `You are an expert mathematician covering all areas: calculus, linear algebra, statistics, combinatorics, etc.
- Solve problems step-by-step with clear reasoning
- Show ALL intermediate steps — never skip
- Explain concepts in plain language after solving
- Provide verification or alternative solution methods when possible`
  },
  {
    id: 'design', name: 'DESIGN', symbol: '◬',
    color: '#f0a0c0', role: 'UI Designer',
    desc: 'UI/UX Design Expert',
    system: `You are a senior UI/UX designer and frontend designer. You provide:
- Layout suggestions with wireframe-style descriptions or ASCII mockups
- Color palettes with hex codes, typography pairings, spacing systems
- CSS code for components, animations, and design tokens
- UX feedback: accessibility, user flows, interaction patterns`
  },
  {
    id: 'sql',    name: 'SQL',    symbol: '⊞',
    color: '#5dade2', role: 'SQL Expert',
    desc: 'Database & SQL Expert',
    system: `You are an expert in SQL and database design (PostgreSQL, MySQL, SQLite, MongoDB, etc.). You:
- Write optimized, readable SQL queries with CTEs and window functions
- Design normalized database schemas with ERD descriptions
- Analyze query performance and suggest indexes
- Convert between SQL dialects and suggest NoSQL alternatives when relevant`
  },
  {
    id: 'api',    name: 'API',    symbol: '⟳',
    color: '#52be80', role: 'API Designer',
    desc: 'REST & GraphQL API Designer',
    system: `You are an expert API designer and backend architect. You:
- Design RESTful APIs with clear endpoint naming, HTTP verbs, and status codes
- Write OpenAPI/Swagger specs and GraphQL schemas
- Handle authentication patterns (JWT, OAuth2, API keys)
- Advise on rate limiting, versioning, error handling, and documentation`
  },
  {
    id: 'summ',   name: 'SUMM',   symbol: '≡',
    color: '#f1948a', role: 'Summarizer',
    desc: 'Document Summarizer AI',
    system: `You are an expert summarizer and information distiller. You:
- Condense any text to its essential points without losing key information
- Offer bullet-point summaries AND paragraph form
- Extract action items, decisions, and key quotes
- Adjust summary depth based on user request (TL;DR vs. detailed)`
  },
  {
    id: 'chat',   name: 'CHAT',   symbol: '◌',
    color: '#7fb3d3', role: 'Assistant',
    desc: 'General-Purpose Assistant',
    system: `You are a highly capable, friendly, and knowledgeable AI assistant. You:
- Answer any question clearly and accurately
- Adjust your depth and tone to the user's expertise level
- Admit uncertainty and suggest sources when unsure
- Help with brainstorming, planning, research, and everyday tasks`
  },
];

// ─── Canvas & State ───────────────────────────────────────────────────────────
const canvas = document.getElementById('agentCanvas');
const ctx    = canvas.getContext('2d');
let agents   = [];
let packets  = [];
let particles = [];
const NODE_W = 92, NODE_H = 54;

// ─── Resize ───────────────────────────────────────────────────────────────────
function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', () => { resizeCanvas(); positionAgents(); initParticles(); });

// ─── Position agents in a circle ─────────────────────────────────────────────
function positionAgents() {
  const cx = canvas.width  / 2;
  const cy = canvas.height / 2;
  const r  = Math.min(canvas.width * 0.38, canvas.height * 0.38, 340);
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

// ─── Particles ────────────────────────────────────────────────────────────────
function initParticles() {
  particles = Array.from({ length: 120 }, () => ({
    x:     Math.random() * canvas.width,
    y:     Math.random() * canvas.height,
    r:     Math.random() * 1.4 + 0.2,
    vy:    -(0.06 + Math.random() * 0.22),
    vx:    (Math.random() - 0.5) * 0.08,
    alpha: Math.random() * 0.35 + 0.04,
  }));
}
initParticles();

// ─── Video Background ─────────────────────────────────────────────────────────
(async function initVideo() {
  try {
    const cfgRes = await fetch('/api/config');
    const cfg    = await cfgRes.json();
    const playbackId = cfg.playbackId || 'GEpj38bbxKjkAo6Ij3qmxbYeNTQ011TTnl2eH9ftDTFM';
    const video  = document.getElementById('bgVideo');
    const src    = `https://stream.mux.com/${playbackId}.m3u8`;

    const play = () => {
      video.muted = true;
      video.play().catch(() => {});
      video.classList.add('loaded');
    };

    if (typeof Hls !== 'undefined' && Hls.isSupported()) {
      const hls = new Hls({ lowLatencyMode: true, maxBufferLength: 30 });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, play);
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) {
          console.warn('HLS fatal error, type:', data.type);
          hls.destroy();
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      video.addEventListener('loadedmetadata', play, { once: true });
    }
  } catch (err) {
    console.warn('Video init failed:', err.message);
  }
})();

// ─── Model Cache & Timer ──────────────────────────────────────────────────────
let modelCache   = { openrouter: [], groq: [], lastUpdated: 0, fetchCount: 0 };
let timerSeconds = 60;

async function loadModels() {
  try {
    const res = await fetch('/api/models');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    modelCache = await res.json();
    const total = modelCache.openrouter.length + modelCache.groq.length;
    document.getElementById('modelCount').textContent =
      total > 0 ? `${total} free models live` : 'Waiting for API keys…';
    document.getElementById('statusDot').className =
      total > 0 ? 'pulse-dot' : 'pulse-dot error';
    timerSeconds = 60;
  } catch (err) {
    console.warn('Model load failed:', err.message);
    document.getElementById('modelCount').textContent = 'Connection error';
    document.getElementById('statusDot').className = 'pulse-dot error';
  }
}
loadModels();
setInterval(loadModels, 60_000);
setInterval(() => {
  timerSeconds = Math.max(0, timerSeconds - 1);
  document.getElementById('updateTimer').textContent = `${timerSeconds}s`;
}, 1_000);

// ─── Data Packets ─────────────────────────────────────────────────────────────
function spawnPacket(x1, y1, x2, y2, color, size = 4.5) {
  packets.push({
    x1, y1, x2, y2,
    x: x1, y: y1,
    color, size,
    t: 0,
    speed: 0.007 + Math.random() * 0.005,
    trail: [],
  });
}

function updatePackets() {
  packets = packets.filter(p => p.t < 1);
  for (const p of packets) {
    p.trail.push({ x: p.x, y: p.y, alpha: 1 });
    if (p.trail.length > 8) p.trail.shift();
    p.trail.forEach((pt, i) => { pt.alpha = (i / p.trail.length) * 0.5; });

    p.t = Math.min(1, p.t + p.speed);
    const e = p.t < 0.5
      ? 2 * p.t * p.t
      : -1 + (4 - 2 * p.t) * p.t;
    p.x = p.x1 + (p.x2 - p.x1) * e;
    p.y = p.y1 + (p.y2 - p.y1) * e;
  }
}

// ─── Activity Simulation ──────────────────────────────────────────────────────
let actIdx = 0;

function triggerActivity() {
  if (!agents.length) return;
  const cx = canvas.width  / 2;
  const cy = canvas.height / 2;
  actIdx = (actIdx + Math.floor(Math.random() * 4) + 1) % agents.length;
  const a = agents[actIdx];

  a.active = true; a.glow = 1; a.status = 'processing';
  for (let i = 0; i < 4; i++) {
    setTimeout(() => spawnPacket(a.x, a.y, cx, cy, a.color, 4 + Math.random() * 2), i * 140);
  }

  setTimeout(() => {
    a.active = false; a.status = 'idle';
    const bIdx = (actIdx + Math.floor(Math.random() * (agents.length - 1)) + 1) % agents.length;
    const b = agents[bIdx];
    b.glow = 0.8; b.status = 'receiving';
    for (let i = 0; i < 3; i++) {
      setTimeout(() => spawnPacket(cx, cy, b.x, b.y, '#ffffff', 3), i * 120);
    }
    setTimeout(() => spawnPacket(cx, cy, b.x, b.y, b.color, 5), 100);
    setTimeout(() => { b.glow = 0; b.status = 'idle'; }, 1400);
  }, 1000);
}
setInterval(triggerActivity, 1500);

// ─── Helper: hex + alpha ──────────────────────────────────────────────────────
function hexA(hex, a) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

// ─── Helper: rounded rect ─────────────────────────────────────────────────────
function rrect(cx, x, y, w, h, r) {
  cx.beginPath();
  cx.moveTo(x + r, y);
  cx.lineTo(x + w - r, y);
  cx.quadraticCurveTo(x + w, y, x + w, y + r);
  cx.lineTo(x + w, y + h - r);
  cx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  cx.lineTo(x + r, y + h);
  cx.quadraticCurveTo(x, y + h, x, y + h - r);
  cx.lineTo(x, y + r);
  cx.quadraticCurveTo(x, y, x + r, y);
  cx.closePath();
}

// ─── Draw: Particles ──────────────────────────────────────────────────────────
function drawParticles() {
  for (const p of particles) {
    p.y += p.vy; p.x += p.vx;
    if (p.y < -4) { p.y = canvas.height + 4; p.x = Math.random() * canvas.width; }
    if (p.x < -4) p.x = canvas.width + 4;
    if (p.x > canvas.width + 4) p.x = -4;
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = '#3366cc';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ─── Draw: Connection lines ───────────────────────────────────────────────────
function drawLines() {
  const cx = canvas.width  / 2;
  const cy = canvas.height / 2;
  for (const a of agents) {
    ctx.save();
    ctx.strokeStyle = a.color;
    ctx.lineWidth   = a.active ? 1.2 : 0.6;
    ctx.globalAlpha = a.active ? 0.5 : 0.1;
    if (a.active) {
      ctx.shadowBlur  = 12;
      ctx.shadowColor = a.color;
    }
    ctx.setLineDash(a.active ? [] : [4, 12]);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(cx, cy); ctx.stroke();
    ctx.restore();
  }
  // Faint ring connecting all agents
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.strokeStyle = '#004488';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  const r0 = Math.min(canvas.width * 0.38, canvas.height * 0.38, 340);
  ctx.arc(cx, cy, r0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// ─── Draw: Center hexagon ─────────────────────────────────────────────────────
function drawCenter() {
  const cx  = canvas.width  / 2;
  const cy  = canvas.height / 2;
  const t   = Date.now() / 1000;
  const pulse = Math.sin(t * 1.8) * 0.22 + 0.78;
  const sz  = 62;

  ctx.save();

  // Outer glow rings
  for (let i = 3; i >= 1; i--) {
    ctx.globalAlpha = 0.06 * pulse / i;
    ctx.strokeStyle = '#00aaff';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, sz + 14 + i * 14 + Math.sin(t * 1.2 + i) * 4, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Rotating dashed ring
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(t * 0.28);
  ctx.setLineDash([5, 9]);
  ctx.strokeStyle = hexA('#00ccff', 0.3);
  ctx.lineWidth   = 1.2;
  ctx.beginPath(); ctx.arc(0, 0, sz + 10, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();

  // Counter-rotating dashed ring
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-t * 0.18);
  ctx.setLineDash([3, 16]);
  ctx.strokeStyle = hexA('#0055ff', 0.2);
  ctx.lineWidth   = 0.8;
  ctx.beginPath(); ctx.arc(0, 0, sz + 18, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();

  // Hexagon body
  ctx.shadowBlur  = 32 * pulse;
  ctx.shadowColor = '#0066ff';
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
    const method = i === 0 ? 'moveTo' : 'lineTo';
    ctx[method](cx + Math.cos(a) * sz, cy + Math.sin(a) * sz);
  }
  ctx.closePath();
  const grd = ctx.createRadialGradient(cx, cy - 10, 0, cx, cy, sz);
  grd.addColorStop(0, 'rgba(0, 80, 220, 0.65)');
  grd.addColorStop(0.5, 'rgba(0, 30, 120, 0.75)');
  grd.addColorStop(1, 'rgba(0, 10, 50, 0.92)');
  ctx.fillStyle = grd;
  ctx.fill();
  ctx.strokeStyle = hexA('#00ccff', 0.7 * pulse);
  ctx.lineWidth   = 1.5;
  ctx.stroke();

  // Labels
  ctx.shadowBlur = 0;
  ctx.fillStyle  = '#ffffff';
  ctx.font       = "bold 14px 'Orbitron', sans-serif";
  ctx.textAlign  = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('NEXUS', cx, cy - 10);
  ctx.font       = "700 7.5px 'JetBrains Mono', monospace";
  ctx.fillStyle  = hexA('#00ccff', 0.9);
  ctx.fillText('DASHBOARD', cx, cy + 7);
  ctx.font       = "400 7px 'JetBrains Mono', monospace";
  ctx.fillStyle  = hexA('#4488ff', 0.5);
  ctx.fillText(`${modelCache.openrouter.length + modelCache.groq.length} models`, cx, cy + 20);

  ctx.restore();
}

// ─── Draw: Agent node ─────────────────────────────────────────────────────────
function drawAgent(a) {
  const { x, y, name, symbol, color, active, glow, status } = a;
  const hw = NODE_W / 2, hh = NODE_H / 2;

  ctx.save();
  if (glow > 0) {
    ctx.shadowBlur  = 24 * glow;
    ctx.shadowColor = color;
  }

  // Card body
  rrect(ctx, x - hw, y - hh, NODE_W, NODE_H, 9);
  const bg = ctx.createLinearGradient(x, y - hh, x, y + hh);
  bg.addColorStop(0, 'rgba(4, 8, 28, 0.95)');
  bg.addColorStop(1, 'rgba(2, 4, 18, 0.98)');
  ctx.fillStyle = bg;
  ctx.fill();

  // Border
  ctx.strokeStyle = active ? color : hexA(color, 0.28);
  ctx.lineWidth   = active ? 1.8 : 1;
  ctx.stroke();

  // Top color strip
  rrect(ctx, x - hw, y - hh, NODE_W, 3, 2);
  ctx.fillStyle = active ? hexA(color, 0.9) : hexA(color, 0.25);
  ctx.fill();

  // Symbol top-left
  ctx.shadowBlur = 0;
  ctx.fillStyle  = hexA(color, 0.55);
  ctx.font       = '9px JetBrains Mono';
  ctx.textAlign  = 'left';
  ctx.fillText(symbol, x - hw + 7, y - 8);

  // Agent name (center)
  ctx.fillStyle  = active ? color : '#d0e4ff';
  ctx.font       = `bold 11px 'Orbitron', sans-serif`;
  ctx.textAlign  = 'center';
  ctx.textBaseline = 'middle';
  if (active) {
    ctx.shadowBlur  = 8;
    ctx.shadowColor = color;
  }
  ctx.fillText(name, x, y + 2);
  ctx.shadowBlur = 0;

  // Status indicator
  const statusColor = status === 'processing' ? '#ffdd44'
                    : status === 'receiving'  ? '#44ffcc'
                    : hexA(color, 0.2);
  ctx.fillStyle = statusColor;
  ctx.beginPath();
  ctx.arc(x - 18, y + 16, 3, 0, Math.PI * 2);
  ctx.fill();

  if (status !== 'idle') {
    ctx.fillStyle = statusColor;
    ctx.font      = '7.5px JetBrains Mono';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(status.toUpperCase(), x - 11, y + 16);
  }

  a.glow = Math.max(0, glow - 0.011);
  ctx.restore();
}

// ─── Draw: Data packets + trails ──────────────────────────────────────────────
function drawPackets() {
  for (const p of packets) {
    // Trail
    for (const pt of p.trail) {
      ctx.save();
      ctx.globalAlpha = pt.alpha * (1 - p.t * 0.4);
      ctx.fillStyle   = p.color;
      ctx.shadowBlur  = 6;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, p.size * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // Head
    ctx.save();
    ctx.globalAlpha = 1 - p.t * 0.25;
    ctx.shadowBlur  = 18;
    ctx.shadowColor = p.color;
    ctx.fillStyle   = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    // White core
    ctx.globalAlpha = 0.7 * (1 - p.t * 0.3);
    ctx.shadowBlur  = 0;
    ctx.fillStyle   = '#ffffff';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ─── Render Loop ──────────────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  // Motion blur — semi-transparent fill
  ctx.fillStyle = 'rgba(2, 2, 14, 0.3)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawParticles();
  drawLines();
  drawCenter();
  for (const a of agents) drawAgent(a);
  updatePackets();
  drawPackets();
}
animate();

// ─── Canvas Hit Testing ───────────────────────────────────────────────────────
canvas.addEventListener('click', e => {
  const { left, top } = canvas.getBoundingClientRect();
  const mx = e.clientX - left;
  const my = e.clientY - top;
  const cx = canvas.width  / 2;
  const cy = canvas.height / 2;

  if (Math.hypot(mx - cx, my - cy) < 68) { openDashboard(); return; }

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
  const overAgent  = agents.some(a =>
    mx >= a.x - NODE_W / 2 && mx <= a.x + NODE_W / 2 &&
    my >= a.y - NODE_H / 2 && my <= a.y + NODE_H / 2
  );
  const overCenter = Math.hypot(mx - cx, my - cy) < 68;
  canvas.style.cursor = (overAgent || overCenter) ? 'pointer' : 'crosshair';
});

// ─── Agent Modal ──────────────────────────────────────────────────────────────
let chatHistory  = [];
let currentAgent = null;

function populateModelSelect(sel, agentColor) {
  sel.innerHTML = '<option value="">— Choose a model —</option>';

  if (modelCache.openrouter.length > 0) {
    const og = document.createElement('optgroup');
    og.label = '⬡ OpenRouter (Free)';
    for (const m of modelCache.openrouter) {
      const o = document.createElement('option');
      o.value       = `openrouter:${m.id}`;
      o.textContent = m.name || m.id;
      og.appendChild(o);
    }
    sel.appendChild(og);
  }

  if (modelCache.groq.length > 0) {
    const gg = document.createElement('optgroup');
    gg.label = '⚡ Groq (Fast)';
    for (const m of modelCache.groq) {
      const o = document.createElement('option');
      o.value       = `groq:${m.id}`;
      o.textContent = m.id;
      gg.appendChild(o);
    }
    sel.appendChild(gg);
  }

  if (sel.options.length > 1) sel.selectedIndex = 1;
}

function openAgentModal(agent) {
  currentAgent = agent;
  chatHistory  = [];

  document.getElementById('modalBadge').textContent  = agent.name;
  document.getElementById('modalBadge').style.color  = agent.color;
  document.getElementById('modalBadge').style.borderColor = agent.color + '55';
  document.getElementById('modalTitle').textContent  = agent.desc;
  document.getElementById('modalSubtitle').textContent = `${agent.role} · powered by OpenRouter & Groq`;
  document.getElementById('agentModalInner').style.borderTop = `2px solid ${agent.color}55`;
  document.getElementById('chatEmptyIcon').textContent = agent.symbol;
  document.getElementById('chatEmptyIcon').style.color = agent.color;

  populateModelSelect(document.getElementById('modelSelect'), agent.color);

  const msgs = document.getElementById('chatMessages');
  msgs.innerHTML = '';
  msgs.appendChild(document.getElementById('chatEmpty'));
  document.getElementById('chatEmpty').style.display = '';

  document.getElementById('historyCount').textContent = '0 messages';
  document.getElementById('charCount').textContent = '0 / 4000';
  document.getElementById('userInput').value = '';

  document.getElementById('agentModal').classList.remove('hidden');
  setTimeout(() => document.getElementById('userInput').focus(), 100);
}

document.getElementById('closeModal').onclick    = () => closeModal('agentModal');
document.getElementById('clearChatBtn').onclick  = () => {
  chatHistory = [];
  const msgs = document.getElementById('chatMessages');
  msgs.innerHTML = '';
  msgs.appendChild(document.getElementById('chatEmpty'));
  document.getElementById('chatEmpty').style.display = '';
  document.getElementById('historyCount').textContent = '0 messages';
};

// ─── Chat Logic ───────────────────────────────────────────────────────────────
document.getElementById('sendBtn').onclick = sendMessage;
document.getElementById('userInput').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});
document.getElementById('userInput').addEventListener('input', e => {
  const len = e.target.value.length;
  document.getElementById('charCount').textContent = `${len} / 4000`;
});

async function sendMessage() {
  const input    = document.getElementById('userInput');
  const text     = input.value.trim();
  if (!text || text.length === 0) return;

  const modelVal = document.getElementById('modelSelect').value;
  if (!modelVal) {
    showToast('⚠ Please select a model first', 'error'); return;
  }

  const colonIdx = modelVal.indexOf(':');
  const provider = modelVal.slice(0, colonIdx);
  const model    = modelVal.slice(colonIdx + 1);

  document.getElementById('chatEmpty').style.display = 'none';
  addMessage('user', text);
  input.value = '';
  document.getElementById('charCount').textContent = '0 / 4000';
  chatHistory.push({ role: 'user', content: text });
  document.getElementById('historyCount').textContent = `${chatHistory.length} messages`;

  const loadId = addMessage('assistant', '● Thinking…', false, true);

  // Visual: activate agent on canvas
  if (currentAgent) {
    const ca = agents.find(a => a.id === currentAgent.id);
    if (ca) {
      ca.active = true; ca.glow = 1; ca.status = 'processing';
      const cx = canvas.width / 2, cy = canvas.height / 2;
      for (let i = 0; i < 5; i++)
        setTimeout(() => spawnPacket(ca.x, ca.y, cx, cy, ca.color, 4 + Math.random() * 2), i * 120);
    }
  }

  try {
    const res = await fetch('/api/chat', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider, model,
        messages: chatHistory,
        system:   currentAgent?.system,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(errData.error || `HTTP ${res.status}`);
    }

    const data  = await res.json();
    const reply = data.choices?.[0]?.message?.content
               || data.error?.message
               || 'No response received.';

    updateMessage(loadId, reply);
    chatHistory.push({ role: 'assistant', content: reply });
    document.getElementById('historyCount').textContent = `${chatHistory.length} messages`;

    if (currentAgent) {
      const ca = agents.find(a => a.id === currentAgent.id);
      if (ca) { ca.active = false; ca.status = 'idle'; ca.glow = 0.3; }
    }
  } catch (err) {
    updateMessage(loadId, `⚠ Error: ${err.message}`, true);
    if (currentAgent) {
      const ca = agents.find(a => a.id === currentAgent.id);
      if (ca) { ca.active = false; ca.status = 'idle'; }
    }
  }
}

let _msgId = 0;
function addMessage(role, content, isError = false, isLoading = false) {
  const id  = `msg-${++_msgId}`;
  const box = document.getElementById('chatMessages');
  const el  = document.createElement('div');
  el.id        = id;
  el.className = `chat-msg chat-${isError ? 'error' : role}${isLoading ? ' loading' : ''}`;
  el.textContent = content;
  box.appendChild(el);
  box.scrollTop = box.scrollHeight;
  return id;
}
function updateMessage(id, content, isError = false) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = content;
  el.classList.remove('loading');
  if (isError) el.className = 'chat-msg chat-error';
  el.closest('#chatMessages').scrollTop = 99999;
}

// ─── Dashboard Modal ──────────────────────────────────────────────────────────
function openDashboard() {
  const total = modelCache.openrouter.length + modelCache.groq.length;
  const since = modelCache.lastUpdated
    ? `Last sync: ${new Date(modelCache.lastUpdated).toLocaleTimeString()}`
    : 'Not yet synced';
  document.getElementById('dashSyncInfo').textContent = since;

  const content = document.getElementById('dashContent');
  content.innerHTML = `
    <!-- Stats row -->
    <div class="dash-card">
      <div class="dash-card-label">OpenRouter Free</div>
      <div class="dash-card-value">${modelCache.openrouter.length}</div>
      <div class="dash-card-sub">models available</div>
    </div>
    <div class="dash-card">
      <div class="dash-card-label">Groq Models</div>
      <div class="dash-card-value">${modelCache.groq.length}</div>
      <div class="dash-card-sub">models available</div>
    </div>
    <div class="dash-card">
      <div class="dash-card-label">Total Models</div>
      <div class="dash-card-value">${total}</div>
      <div class="dash-card-sub">auto-refresh every 60s</div>
    </div>
    <div class="dash-card">
      <div class="dash-card-label">AI Agents</div>
      <div class="dash-card-value">${AGENT_DEFS.length}</div>
      <div class="dash-card-sub">active in team</div>
    </div>

    <!-- Agent grid -->
    <div class="dash-agents-grid">
      ${AGENT_DEFS.map(a => `
        <div class="dash-agent-card" style="border-color:${a.color}22">
          <div class="dash-agent-dot" style="background:${a.color};box-shadow:0 0 6px ${a.color}"></div>
          <div>
            <div class="dash-agent-name" style="color:${a.color}">${a.name}</div>
            <div class="dash-agent-role">${a.role}</div>
          </div>
        </div>
      `).join('')}
    </div>

    <!-- Model list -->
    <div class="dash-card model-list">
      <div class="dash-card-label" style="margin-bottom:10px">Loaded Models</div>
      ${modelCache.openrouter.length === 0 && modelCache.groq.length === 0
        ? '<div style="font-family:var(--font-mono);font-size:12px;color:var(--text-dim);padding:20px 0;text-align:center">No models loaded — check API keys in Render env vars</div>'
        : [...modelCache.openrouter.map(m => ({ ...m, p: 'OR', cls: '' })),
           ...modelCache.groq.map(m => ({ ...m, p: 'GQ', cls: 'groq' }))]
            .map(m => `
              <div class="model-item">
                <span title="${m.id}">${m.name || m.id}</span>
                <span class="provider-tag ${m.cls}">${m.p}</span>
              </div>
            `).join('')
      }
    </div>
  `;

  document.getElementById('dashModal').classList.remove('hidden');
}
document.getElementById('closeDash').onclick = () => closeModal('dashModal');

// ─── Code Viewer ──────────────────────────────────────────────────────────────
document.getElementById('viewCodeBtn').onclick = openCodeViewer;
document.getElementById('closeCode').onclick   = () => closeModal('codeModal');
document.getElementById('downloadCodeBtn').onclick = () => {
  window.location.href = '/api/download';
};
document.getElementById('downloadBtn').onclick = () => {
  window.location.href = '/api/download';
};

// Copy button
let currentFileContent = '';
document.getElementById('copyCodeBtn').addEventListener('click', () => {
  if (!currentFileContent) return;
  navigator.clipboard.writeText(currentFileContent).then(() => {
    const btn = document.getElementById('copyCodeBtn');
    btn.classList.add('copied');
    btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Copied!`;
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy`;
    }, 2000);
  }).catch(() => showToast('Copy failed', 'error'));
});

async function openCodeViewer() {
  document.getElementById('codeModal').classList.remove('hidden');
  const tree = document.getElementById('fileTree');
  tree.innerHTML = '<div class="tree-loading">Loading files…</div>';

  try {
    const res   = await fetch('/api/files');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const files = await res.json();
    tree.innerHTML = '';

    // Group by folder
    const rootFiles   = files.filter(f => !f.path.includes('/'));
    const publicFiles = files.filter(f => f.path.startsWith('public/'));

    if (rootFiles.length) {
      const lbl = document.createElement('div');
      lbl.style.cssText = 'padding:10px 10px 4px;font-family:var(--font-mono);font-size:9px;color:var(--text-muted);letter-spacing:2px;text-transform:uppercase';
      lbl.textContent = 'Root';
      tree.appendChild(lbl);
      rootFiles.forEach(f => tree.appendChild(makeFileItem(f)));
    }
    if (publicFiles.length) {
      const lbl = document.createElement('div');
      lbl.style.cssText = 'padding:14px 10px 4px;font-family:var(--font-mono);font-size:9px;color:var(--text-muted);letter-spacing:2px;text-transform:uppercase';
      lbl.textContent = 'Public';
      tree.appendChild(lbl);
      publicFiles.forEach(f => tree.appendChild(makeFileItem(f)));
    }
  } catch (err) {
    tree.innerHTML = `<div class="tree-loading" style="color:#ff4e6a">Error: ${err.message}</div>`;
  }
}

function makeFileItem(f) {
  const item = document.createElement('div');
  item.className = 'file-item';
  const shortName = f.path.includes('/') ? f.path.split('/').pop() : f.path;
  const ext = shortName.split('.').pop();
  const iconColor = { js: '#f7dc6f', css: '#45b7d1', html: '#ff9944', json: '#7fb3d3', md: '#bb8fce' }[ext] || '#4a6a9a';
  item.innerHTML = `
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
    <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${shortName}</span>
    <span class="file-size">${(f.size / 1024).toFixed(1)}k</span>
  `;
  item.onclick = () => {
    document.querySelectorAll('#fileTree .file-item').forEach(el => el.classList.remove('active'));
    item.classList.add('active');
    loadFile(f.path);
  };
  return item;
}

async function loadFile(filePath) {
  const viewer  = document.getElementById('codeViewer');
  const copyBtn = document.getElementById('copyCodeBtn');
  document.getElementById('codeFilename').textContent = filePath;
  copyBtn.style.display = 'none';
  viewer.innerHTML = '<div class="code-placeholder"><span>Loading…</span></div>';
  currentFileContent = '';

  try {
    const res  = await fetch(`/api/file?path=${encodeURIComponent(filePath)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    currentFileContent = data.content;

    const pre  = document.createElement('pre');
    pre.textContent = data.content;
    viewer.innerHTML = '';
    viewer.appendChild(pre);
    copyBtn.style.display = 'flex';
  } catch (err) {
    viewer.innerHTML = `<div class="code-placeholder" style="color:#ff4e6a">Error: ${err.message}</div>`;
  }
}

// ─── Modal close helpers ──────────────────────────────────────────────────────
function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

// Backdrop clicks
['agentModal', 'dashModal', 'codeModal'].forEach(id => {
  document.getElementById(id).addEventListener('click', e => {
    if (e.target.classList.contains('modal-backdrop') || e.target.id === id) {
      closeModal(id);
    }
  });
});

// Escape key
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    ['agentModal', 'dashModal', 'codeModal'].forEach(id => {
      if (!document.getElementById(id).classList.contains('hidden')) closeModal(id);
    });
  }
});

// ─── Toast ────────────────────────────────────────────────────────────────────
let toastTimer = null;
function showToast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className   = `toast${type ? ' ' + type : ''}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 2800);
}

// ─── Init: Greet ──────────────────────────────────────────────────────────────
setTimeout(() => {
  const total = modelCache.openrouter.length + modelCache.groq.length;
  if (total > 0) showToast(`✓ ${total} free models loaded`, 'success');
}, 3000);
