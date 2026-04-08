import { NextRequest, NextResponse } from 'next/server';
import { chatOpenRouter } from '@/lib/models/openrouter';
import { chatGroq } from '@/lib/models/groq';

// ─────────────────────────────────────────────────────────────────────────────
// API Key Pool Management
// ─────────────────────────────────────────────────────────────────────────────

function getGroqKeys(): string[] {
  const keys: string[] = [];
  if (process.env.GROQ_API_KEY) keys.push(process.env.GROQ_API_KEY);
  for (let i = 1; i <= 10; i++) {
    const k = process.env[`GROQ_API_KEY_${i}`];
    if (k) keys.push(k);
  }
  return keys.filter((k, idx) => keys.indexOf(k) === idx);
}

function getORKeys(): string[] {
  const keys: string[] = [];
  if (process.env.OPENROUTER_API_KEY) keys.push(process.env.OPENROUTER_API_KEY);
  for (let i = 1; i <= 10; i++) {
    const k = process.env[`OPENROUTER_API_KEY_${i}`];
    if (k) keys.push(k);
  }
  return keys.filter((k, idx) => keys.indexOf(k) === idx);
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-key rate limit tracker
// ─────────────────────────────────────────────────────────────────────────────

interface KeyState {
  exhaustedAt: number;
  failCount: number;
}

const keyStates = new Map<string, KeyState>();

const BASE_COOLDOWN_MS = 2000;
const MAX_COOLDOWN_MS  = 3000;

function getRandomCooldown(): number {
  return BASE_COOLDOWN_MS + Math.random() * (MAX_COOLDOWN_MS - BASE_COOLDOWN_MS);
}

function isKeyExhausted(key: string): boolean {
  const state = keyStates.get(key);
  if (!state) return false;
  const elapsed  = Date.now() - state.exhaustedAt;
  const cooldown = Math.min(state.failCount * BASE_COOLDOWN_MS, 30_000);
  if (elapsed > cooldown) {
    keyStates.delete(key);
    return false;
  }
  return true;
}

function markKeyExhausted(key: string): void {
  const prev = keyStates.get(key);
  keyStates.set(key, {
    exhaustedAt: Date.now(),
    failCount: (prev?.failCount ?? 0) + 1,
  });
}

function markKeySuccess(key: string): void {
  keyStates.delete(key);
}

function pickBestKey(keys: string[]): string | null {
  const fresh = keys.find((k) => !keyStates.has(k));
  if (fresh) return fresh;
  return keys.find((k) => !isKeyExhausted(k)) ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Delay helper
// ─────────────────────────────────────────────────────────────────────────────

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ─────────────────────────────────────────────────────────────────────────────
// Key rotation loop
// ─────────────────────────────────────────────────────────────────────────────

function extractStatus(msg: string): number | null {
  const match = msg.match(/\b(4\d{2}|5\d{2})\b/);
  return match ? Number(match[1]) : null;
}

function isRateLimitError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return (
    lower.includes('rate')      ||
    lower.includes('limit')     ||
    lower.includes('quota')     ||
    lower.includes('too many')  ||
    lower.includes('throttl')
  );
}

async function tryWithKeyRotation(
  keys: string[],
  caller: (key: string) => Promise<unknown>,
): Promise<unknown> {
  if (keys.length === 0) {
    throw new Error('No API keys configured.');
  }

  const tried = new Set<string>();

  for (let attempt = 0; attempt < keys.length * 2; attempt++) {
    const available = keys.filter((k) => !tried.has(k));
    const key = pickBestKey(available);

    if (!key) {
      keyStates.clear();
      await delay(BASE_COOLDOWN_MS);
      const fallback = keys[0];
      const result = await caller(fallback);
      markKeySuccess(fallback);
      return result;
    }

    tried.add(key);

    try {
      const result = await caller(key);
      markKeySuccess(key);
      return result;
    } catch (err) {
      const msg    = err instanceof Error ? err.message : String(err);
      const status = extractStatus(msg);

      if (status === 429 || isRateLimitError(msg)) {
        markKeyExhausted(key);
        console.warn(`[NexusAI] Rate limited, rotating… (${tried.size}/${keys.length})`);
        await delay(getRandomCooldown());
        continue;
      }

      if (status === 401 || status === 403) {
        markKeyExhausted(key);
        console.warn(`[NexusAI] Auth failed, rotating…`);
        continue;
      }

      if (status !== null && status >= 500) {
        console.warn(`[NexusAI] Server error ${status}, retrying…`);
        await delay(getRandomCooldown());
        continue;
      }

      throw err;
    }
  }

  throw new Error('All API keys exhausted. Please try again later.');
}

// ─────────────────────────────────────────────────────────────────────────────
// Request body type
// ─────────────────────────────────────────────────────────────────────────────

interface ChatRequestBody {
  provider:  string;
  model:     string;
  messages:  Array<{ role: string; content: string }>;
  system?:   string;
  maxTokens: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Validate and parse — returns error string OR parsed body
// ─────────────────────────────────────────────────────────────────────────────

function parseBody(raw: unknown): { err: string } | { ok: ChatRequestBody } {
  if (!raw || typeof raw !== 'object') {
    return { err: 'Request body must be a JSON object' };
  }

  const b = raw as Record<string, unknown>;

  if (!b.model || typeof b.model !== 'string') {
    return { err: '`model` is required' };
  }

  if (!Array.isArray(b.messages) || b.messages.length === 0) {
    return { err: '`messages` must be a non-empty array' };
  }

  return {
    ok: {
      provider:  typeof b.provider  === 'string' ? b.provider  : 'openrouter',
      model:     b.model,
      messages:  b.messages as Array<{ role: string; content: string }>,
      system:    typeof b.system    === 'string' ? b.system    : undefined,
      maxTokens: typeof b.maxTokens === 'number' ? b.maxTokens : 2048,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// POST handler
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const rawBody  = await req.json().catch(() => null);
    const parsed   = parseBody(rawBody);

    // 'err' key mavjud bo'lsa — validation xatosi
    if ('err' in parsed) {
      return NextResponse.json({ error: parsed.err }, { status: 400 });
    }

    // 'ok' key mavjud — to'g'ri body
    const { provider, model, messages, system, maxTokens } = parsed.ok;

    const allMessages = system
      ? [{ role: 'system' as const, content: system }, ...messages]
      : messages;

    // 2-3 sekund cooldown
    await delay(getRandomCooldown());

    if (provider === 'groq') {
      const keys = getGroqKeys();
      if (keys.length === 0) {
        return NextResponse.json(
          { error: 'No Groq API keys configured.' },
          { status: 503 },
        );
      }
      const data = await tryWithKeyRotation(keys, (key) =>
        chatGroq(model, allMessages, maxTokens, key),
      );
      return NextResponse.json(data);
    }

    // Default: OpenRouter
    const keys = getORKeys();
    if (keys.length === 0) {
      return NextResponse.json(
        { error: 'No OpenRouter API keys configured.' },
        { status: 503 },
      );
    }
    const data = await tryWithKeyRotation(keys, (key) =>
      chatOpenRouter(model, allMessages, maxTokens, key),
    );
    return NextResponse.json(data);

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown server error';
    console.error('[NexusAI API]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET — health check
// ─────────────────────────────────────────────────────────────────────────────

export async function GET() {
  const groqCount = getGroqKeys().length;
  const orCount   = getORKeys().length;
  return NextResponse.json({
    status:        'ok',
    keys:          { groq: groqCount, openrouter: orCount },
    totalCapacity: `~${(groqCount + orCount) * 25} req/min`,
    cooldownMs:    `${BASE_COOLDOWN_MS}-${MAX_COOLDOWN_MS}ms`,
  });
}