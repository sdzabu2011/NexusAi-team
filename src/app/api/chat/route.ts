import { NextRequest, NextResponse } from 'next/server';
import { chatOpenRouter } from '@/lib/models/openrouter';

// ─────────────────────────────────────────────────────────────────────────────
//  KEY POOL — OPENROUTER_API_KEY_1 … OPENROUTER_API_KEY_10
// ─────────────────────────────────────────────────────────────────────────────

function getORKeys(): string[] {
  const keys: string[] = [];
  const base = process.env.OPENROUTER_API_KEY;
  if (base?.trim()) keys.push(base.trim());
  for (let i = 1; i <= 10; i++) {
    const k = process.env[`OPENROUTER_API_KEY_${i}`]?.trim();
    if (k && k !== 'ollama-local') keys.push(k);
  }
  return [...new Set(keys)];
}

// ─────────────────────────────────────────────────────────────────────────────
//  PER-KEY STATE
//  Har bir key uchun: calls, muvaffaqiyatlar, xatolar, cooldown
// ─────────────────────────────────────────────────────────────────────────────

interface KeyState {
  exhaustedAt:  number;
  failCount:    number;
  lastUsed:     number;
  successCount: number;
  totalCalls:   number;
}

const keyStates = new Map<string, KeyState>();

const BASE_COOLDOWN_MS = 2_000;
const MAX_COOLDOWN_MS  = 60_000;

function getCooldown(failCount: number): number {
  return Math.min(BASE_COOLDOWN_MS * Math.pow(2, failCount - 1), MAX_COOLDOWN_MS);
}

function getOrCreateState(key: string): KeyState {
  if (!keyStates.has(key)) {
    keyStates.set(key, {
      exhaustedAt:  0,
      failCount:    0,
      lastUsed:     0,
      successCount: 0,
      totalCalls:   0,
    });
  }
  return keyStates.get(key)!;
}

function isKeyAvailable(key: string): boolean {
  const state = keyStates.get(key);
  if (!state || state.failCount === 0) return true;
  const elapsed  = Date.now() - state.exhaustedAt;
  const cooldown = getCooldown(state.failCount);
  if (elapsed > cooldown) {
    state.failCount   = 0;
    state.exhaustedAt = 0;
    return true;
  }
  return false;
}

function markKeyFailed(key: string): void {
  const state = getOrCreateState(key);
  state.failCount   += 1;
  state.exhaustedAt  = Date.now();
  state.totalCalls  += 1;
}

function markKeySuccess(key: string): void {
  const state = getOrCreateState(key);
  state.failCount    = 0;
  state.exhaustedAt  = 0;
  state.lastUsed     = Date.now();
  state.successCount += 1;
  state.totalCalls   += 1;
}

// ─────────────────────────────────────────────────────────────────────────────
//  PER-AGENT KEY ASSIGNMENT
//
//  15 agent × 10 key:
//    Agent  1 → Key index 0  (key 1)
//    Agent  2 → Key index 1  (key 2)
//    ...
//    Agent 10 → Key index 9  (key 10)
//    Agent 11 → Key index 0  (key 1)   ← siklik
//    Agent 12 → Key index 1  (key 2)
//    Agent 13 → Key index 2  (key 3)
//    Agent 14 → Key index 3  (key 4)
//    Agent 15 → Key index 4  (key 5)
//
//  Foyda: Har bir agent o'zining doimiy keyi bilan ishlaydi.
//  Rate limit: faqat shu agent ko'p fayl yaratganda.
//  10 ta key = parallel 10 agent = hech qachon bir-birini bloklamas.
// ─────────────────────────────────────────────────────────────────────────────

function pickKeyForAgent(agentId: number | null | undefined, keys: string[]): string | null {
  if (keys.length === 0) return null;

  // agentId mavjud bo'lsa — deterministic mapping
  if (agentId != null && agentId >= 1) {
    const idx = (agentId - 1) % keys.length;
    const assignedKey = keys[idx];

    // Assigned key available bo'lsa — ishlatamiz
    if (isKeyAvailable(assignedKey)) {
      return assignedKey;
    }

    // Assigned key rate-limited → eng yaqin available keyni topamiz
    // (assigned keydan boshlab siklik qidiruv)
    for (let offset = 1; offset < keys.length; offset++) {
      const fallbackIdx = (idx + offset) % keys.length;
      if (isKeyAvailable(keys[fallbackIdx])) {
        console.warn(
          `[NexusAI] Agent ${agentId}: assigned key (idx ${idx}) rate-limited, ` +
          `falling back to key idx ${fallbackIdx}`,
        );
        return keys[fallbackIdx];
      }
    }

    // Hamma keylar rate-limited → assigned keyni force-use (cooldown o'tib ketadi)
    console.warn(`[NexusAI] Agent ${agentId}: all keys rate-limited, force-using assigned key`);
    return assignedKey;
  }

  // agentId yo'q (ChatModal va boshqa to'g'ridan-to'g'ri chaqiruvlar)
  // → eng kam ishlangan keyni tanlaymiz
  const available = keys.filter(isKeyAvailable);
  if (available.length > 0) {
    available.sort((a, b) => {
      const sa = keyStates.get(a);
      const sb = keyStates.get(b);
      if (!sa && !sb) return 0;
      if (!sa) return -1;
      if (!sb) return 1;
      return sa.lastUsed - sb.lastUsed; // eng eski ishlatilganini tanlash
    });
    return available[0];
  }

  // Hammasi band → birinchisi
  return keys[0];
}

// ─────────────────────────────────────────────────────────────────────────────
//  ERROR CLASSIFICATION
// ─────────────────────────────────────────────────────────────────────────────

function isRateLimitError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return (
    lower.includes('rate limit')  ||
    lower.includes('too many')    ||
    lower.includes('quota')       ||
    lower.includes('throttl')     ||
    lower.includes('429')         ||
    lower.includes('overloaded')  ||
    lower.includes('capacity')
  );
}

function isAuthError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return (
    lower.includes('401')          ||
    lower.includes('403')          ||
    lower.includes('unauthorized') ||
    lower.includes('forbidden')    ||
    lower.includes('invalid key')  ||
    lower.includes('api key')
  );
}

function isServerError(msg: string): boolean {
  const match = msg.match(/\b([45]\d{2})\b/);
  const status = match ? Number(match[1]) : null;
  return status !== null && status >= 500;
}

// ─────────────────────────────────────────────────────────────────────────────
//  SMART CALLER — Retry + Fallback
//  1. Agent uchun tanlangan key bilan urinamiz
//  2. Rate-limit → key mark, fallback key bilan urinamiz
//  3. Auth error → bu keyni skip, boshqasini olamiz
//  4. Server error → bir marta retry, keyin fallback
// ─────────────────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function callWithAgentKey(
  agentId: number | null | undefined,
  keys: string[],
  caller: (key: string) => Promise<unknown>,
): Promise<unknown> {
  if (keys.length === 0) {
    throw new Error(
      'OpenRouter API key yo\'q. ' +
      'OPENROUTER_API_KEY_1 … OPENROUTER_API_KEY_10 ni .env.local ga qo\'shing.',
    );
  }

  // Urinishlar: agentId + fallbacklar uchun
  const maxAttempts = Math.min(keys.length * 2, 6);
  let lastError = '';
  let attemptedKeys = new Set<string>();

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const key = pickKeyForAgent(
      attempt === 0 ? agentId : null, // 1-urinishda agentga specific, keyin random
      keys,
    );

    if (!key) {
      await sleep(BASE_COOLDOWN_MS);
      keyStates.clear();
      continue;
    }

    // Bir keyni ikki marta urinmaslik (auth error bo'lsa)
    const keyAttemptCount = [...attemptedKeys].filter(k => k === key).length;
    if (keyAttemptCount >= 2) continue;
    attemptedKeys.add(key);

    try {
      const result = await caller(key);
      markKeySuccess(key);
      return result;

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      lastError = msg;

      if (isRateLimitError(msg)) {
        markKeyFailed(key);
        const waitMs = Math.min(1000 * (attempt + 1), 5_000);
        console.warn(
          `[NexusAI] Key ...${key.slice(-6)} rate-limited (agent ${agentId ?? 'N/A'}). ` +
          `Rotating in ${waitMs}ms…`,
        );
        await sleep(waitMs);
        continue;
      }

      if (isAuthError(msg)) {
        markKeyFailed(key);
        console.warn(`[NexusAI] Key ...${key.slice(-6)} auth failed, skipping.`);
        continue;
      }

      if (isServerError(msg)) {
        const waitMs = 1_500 + attempt * 500;
        console.warn(`[NexusAI] Server error, retrying in ${waitMs}ms…`);
        await sleep(waitMs);
        continue;
      }

      // Noma'lum xato — darhol qaytarish
      throw err;
    }
  }

  throw new Error(
    `Agent ${agentId ?? 'N/A'}: barcha keylar ${maxAttempts} urinishdan keyin ishlamadi. ` +
    `Oxirgi xato: ${lastError}`,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  REQUEST BODY SCHEMA
// ─────────────────────────────────────────────────────────────────────────────

interface ChatMessage {
  role:    'user' | 'assistant' | 'system';
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

interface ChatRequestBody {
  model:     string;
  messages:  ChatMessage[];
  system?:   string;
  maxTokens: number;
  agentId?:  number;   // ← YANGI: qaysi agent so'rov yuborayapti
  provider?: string;
}

function parseBody(raw: unknown): { err: string } | { ok: ChatRequestBody } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { err: 'Request body JSON object bo\'lishi kerak.' };
  }

  const b = raw as Record<string, unknown>;

  if (!b.model || typeof b.model !== 'string' || !b.model.trim()) {
    return { err: '`model` maydoni bo\'sh bo\'lmasligi kerak.' };
  }

  if (!Array.isArray(b.messages) || b.messages.length === 0) {
    return { err: '`messages` bo\'sh bo\'lmasligi kerak.' };
  }

  for (const [i, m] of (b.messages as unknown[]).entries()) {
    if (!m || typeof m !== 'object' || Array.isArray(m)) {
      return { err: `messages[${i}] object bo\'lishi kerak.` };
    }
    const msg = m as Record<string, unknown>;
    if (!['user', 'assistant', 'system'].includes(msg.role as string)) {
      return { err: `messages[${i}].role: user | assistant | system bo\'lishi kerak.` };
    }
    if (msg.content === undefined || msg.content === null) {
      return { err: `messages[${i}].content majburiy.` };
    }
  }

  return {
    ok: {
      model:     b.model.trim(),
      messages:  b.messages as ChatMessage[],
      system:    typeof b.system    === 'string' ? b.system.trim() || undefined : undefined,
      maxTokens: typeof b.maxTokens === 'number' && b.maxTokens > 0
                   ? Math.min(b.maxTokens, 8192)
                   : 2048,
      agentId:   typeof b.agentId === 'number' ? b.agentId : undefined,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  POST — asosiy chat handler
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json().catch(() => null);
    const parsed  = parseBody(rawBody);

    if ('err' in parsed) {
      return NextResponse.json({ error: parsed.err }, { status: 400 });
    }

    const { model, messages, system, maxTokens, agentId } = parsed.ok;

    // System message prepend
    const allMessages: ChatMessage[] = system
      ? [{ role: 'system', content: system }, ...messages]
      : messages;

    const keys = getORKeys();

    if (keys.length === 0) {
      return NextResponse.json(
        {
          error:   'OpenRouter API key topilmadi.',
          hint:    '.env.local ga OPENROUTER_API_KEY_1 … OPENROUTER_API_KEY_10 qo\'shing.',
          docsUrl: 'https://openrouter.ai/keys',
        },
        { status: 503 },
      );
    }

    // ── Agent-specific logging ──────────────────────────────────────────────
    if (agentId) {
      const assignedIdx = (agentId - 1) % keys.length;
      console.log(
        `[NexusAI] Agent ${agentId} → Key idx ${assignedIdx} ` +
        `(...${keys[assignedIdx].slice(-6)}) | Model: ${model.slice(-20)}`,
      );
    }

    // ── Call with per-agent key ─────────────────────────────────────────────
    const data = await callWithAgentKey(
      agentId,
      keys,
      (key) => chatOpenRouter(model, allMessages, maxTokens, key),
    );

    return NextResponse.json(data);

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Noma\'lum server xatosi';
    console.error('[NexusAI Chat API]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  GET — health check + key pool status
// ─────────────────────────────────────────────────────────────────────────────

export async function GET() {
  const keys      = getORKeys();
  const available = keys.filter(isKeyAvailable).length;
  const exhausted = keys.length - available;

  // Agent → key mapping ni ham ko'rsatamiz
  const agentKeyMap: Record<number, string> = {};
  for (let agentId = 1; agentId <= 15; agentId++) {
    if (keys.length > 0) {
      const idx = (agentId - 1) % keys.length;
      agentKeyMap[agentId] = `...${keys[idx].slice(-6)}`;
    }
  }

  const keyDetails = keys.map((k, i) => {
    const state = keyStates.get(k);
    const masked = `sk-or-...${k.slice(-6)}`;
    const assignedAgents = Array.from({ length: 15 }, (_, j) => j + 1)
      .filter(agentId => (agentId - 1) % keys.length === i);
    return {
      index:          i + 1,
      key:            masked,
      available:      isKeyAvailable(k),
      failCount:      state?.failCount    ?? 0,
      successCount:   state?.successCount ?? 0,
      totalCalls:     state?.totalCalls   ?? 0,
      cooldownMs:     state?.failCount ? getCooldown(state.failCount) : 0,
      assignedAgents, // Bu keyga tayinlangan agentlar
    };
  });

  return NextResponse.json({
    status:          'ok',
    provider:        'openrouter-per-agent',
    totalKeys:       keys.length,
    availableKeys:   available,
    exhaustedKeys:   exhausted,
    // 15 agent × 10 key: parallel ishlash mumkin
    maxParallelAgents: keys.length,
    agentKeyMap,       // { 1: '...abc123', 2: '...def456', ... }
    keys:            keyDetails,
    timestamp:       new Date().toISOString(),
    strategy: keys.length >= 10
      ? '✅ 10+ key: har bir agent o\'z keyiga ega, rate-limit yo\'q'
      : keys.length >= 5
        ? '⚠️  5-9 key: ba\'zi agentlar key ulashadi'
        : keys.length >= 1
          ? '⚠️  1-4 key: agentlar key ulashadi, rate-limit ehtimoli bor'
          : '❌ Key yo\'q — faqat Ollama (offline)',
  });
}