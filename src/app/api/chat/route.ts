import { NextRequest, NextResponse } from 'next/server';
import { chatOpenRouter } from '@/lib/models/openrouter';

// ─────────────────────────────────────────────────────────────────────────────
// OpenRouter Key Pool — reads OPENROUTER_API_KEY_1 … OPENROUTER_API_KEY_10
// ─────────────────────────────────────────────────────────────────────────────

function getORKeys(): string[] {
  const keys: string[] = [];

  // Base key (optional)
  const base = process.env.OPENROUTER_API_KEY;
  if (base?.trim()) keys.push(base.trim());

  // Numbered keys 1–10
  for (let i = 1; i <= 10; i++) {
    const k = process.env[`OPENROUTER_API_KEY_${i}`]?.trim();
    if (k) keys.push(k);
  }

  // Deduplicate
  return [...new Set(keys)];
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-key state tracking
// ─────────────────────────────────────────────────────────────────────────────

interface KeyState {
  exhaustedAt:  number;
  failCount:    number;
  lastUsed:     number;
  successCount: number;
  totalCalls:   number;
}

const keyStates = new Map<string, KeyState>();

// Cooldown: 2s base, max 60s for repeatedly failing keys
const BASE_COOLDOWN_MS = 2_000;
const MAX_COOLDOWN_MS  = 60_000;

function getCooldown(failCount: number): number {
  // Exponential backoff: 2s, 4s, 8s … capped at 60s
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
    // Reset after cooldown
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

// Pick the best available key:
// 1. Prefer keys never used
// 2. Then keys with most successes
// 3. Then least recently used
function pickBestKey(keys: string[]): string | null {
  const available = keys.filter(isKeyAvailable);
  if (available.length === 0) return null;

  // Sort: never-used first, then by success rate, then by last used
  available.sort((a, b) => {
    const sa = keyStates.get(a);
    const sb = keyStates.get(b);

    // Never used — highest priority
    if (!sa && !sb) return 0;
    if (!sa) return -1;
    if (!sb) return 1;

    // More successes = better
    if (sb.successCount !== sa.successCount) {
      return sb.successCount - sa.successCount;
    }

    // Least recently used
    return sa.lastUsed - sb.lastUsed;
  });

  return available[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// Error classification
// ─────────────────────────────────────────────────────────────────────────────

function extractHttpStatus(msg: string): number | null {
  const match = msg.match(/\b([45]\d{2})\b/);
  return match ? Number(match[1]) : null;
}

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
    lower.includes('401')         ||
    lower.includes('403')         ||
    lower.includes('unauthorized')||
    lower.includes('forbidden')   ||
    lower.includes('invalid key') ||
    lower.includes('api key')
  );
}

function isServerError(msg: string): boolean {
  const status = extractHttpStatus(msg);
  return status !== null && status >= 500;
}

// ─────────────────────────────────────────────────────────────────────────────
// Delay helper
// ─────────────────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ─────────────────────────────────────────────────────────────────────────────
// Core key rotation engine
// ─────────────────────────────────────────────────────────────────────────────

async function callWithRotation(
  keys: string[],
  caller: (key: string) => Promise<unknown>,
  maxAttempts?: number,
): Promise<unknown> {
  if (keys.length === 0) {
    throw new Error(
      'No OpenRouter API keys configured. ' +
      'Add OPENROUTER_API_KEY_1 … OPENROUTER_API_KEY_10 in Render environment.',
    );
  }

  const attempts = maxAttempts ?? keys.length * 3;
  const triedKeys = new Set<string>();
  let lastError   = '';

  for (let attempt = 0; attempt < attempts; attempt++) {
    const key = pickBestKey(keys);

    if (!key) {
      // All keys on cooldown — wait for the shortest cooldown to expire
      console.warn(`[NexusAI] All ${keys.length} keys on cooldown. Waiting…`);
      await sleep(BASE_COOLDOWN_MS);

      // Force-reset all keys and retry once
      keyStates.clear();
      const fallback = keys[Math.floor(Math.random() * keys.length)];
      try {
        const result = await caller(fallback);
        markKeySuccess(fallback);
        return result;
      } catch (err) {
        throw new Error(
          `All OpenRouter keys exhausted. Last error: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    triedKeys.add(key);

    try {
      const result = await caller(key);
      markKeySuccess(key);
      return result;

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      lastError  = msg;

      if (isRateLimitError(msg)) {
        markKeyFailed(key);
        const state   = getOrCreateState(key);
        const waitMs  = Math.min(1000 * attempt + 500, 5_000);
        console.warn(
          `[NexusAI] Key #${[...triedKeys].length}/${keys.length} rate limited. ` +
          `Rotating in ${waitMs}ms… (fail #${state.failCount})`,
        );
        await sleep(waitMs);
        continue;
      }

      if (isAuthError(msg)) {
        markKeyFailed(key);
        console.warn(`[NexusAI] Key auth failed, skipping permanently.`);
        // Don't wait — immediately try next key
        continue;
      }

      if (isServerError(msg)) {
        // Server-side error — retry same key once, then rotate
        const waitMs = 1_500 + attempt * 500;
        console.warn(`[NexusAI] Server error, retrying in ${waitMs}ms…`);
        await sleep(waitMs);
        continue;
      }

      // Unknown error — propagate immediately
      throw err;
    }
  }

  throw new Error(
    `All ${keys.length} OpenRouter keys failed after ${attempts} attempts. ` +
    `Last error: ${lastError}`,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Request body schema
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
  // provider field accepted but ignored — always OpenRouter now
  provider?: string;
}

function parseBody(raw: unknown): { err: string } | { ok: ChatRequestBody } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { err: 'Request body must be a JSON object.' };
  }

  const b = raw as Record<string, unknown>;

  if (!b.model || typeof b.model !== 'string' || !b.model.trim()) {
    return { err: '`model` field is required and must be a non-empty string.' };
  }

  if (!Array.isArray(b.messages) || b.messages.length === 0) {
    return { err: '`messages` must be a non-empty array.' };
  }

  // Validate each message
  for (const [i, m] of (b.messages as unknown[]).entries()) {
    if (!m || typeof m !== 'object' || Array.isArray(m)) {
      return { err: `messages[${i}] must be an object.` };
    }
    const msg = m as Record<string, unknown>;
    if (!['user', 'assistant', 'system'].includes(msg.role as string)) {
      return { err: `messages[${i}].role must be user | assistant | system.` };
    }
    if (msg.content === undefined || msg.content === null) {
      return { err: `messages[${i}].content is required.` };
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
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// POST — main chat handler
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json().catch(() => null);
    const parsed  = parseBody(rawBody);

    if ('err' in parsed) {
      return NextResponse.json({ error: parsed.err }, { status: 400 });
    }

    const { model, messages, system, maxTokens } = parsed.ok;

    // Prepend system message if provided
    const allMessages: ChatMessage[] = system
      ? [{ role: 'system', content: system }, ...messages]
      : messages;

    const keys = getORKeys();

    if (keys.length === 0) {
      return NextResponse.json(
        {
          error:   'No OpenRouter API keys configured.',
          hint:    'Add OPENROUTER_API_KEY_1 through OPENROUTER_API_KEY_10 in your Render environment variables.',
          docsUrl: 'https://openrouter.ai/keys',
        },
        { status: 503 },
      );
    }

    // Small jitter to spread load across keys (0–800ms)
    await sleep(Math.random() * 800);

    const data = await callWithRotation(
      keys,
      (key) => chatOpenRouter(model, allMessages, maxTokens, key),
    );

    return NextResponse.json(data);

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown server error';
    console.error('[NexusAI Chat API]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET — health check + key pool status
// ─────────────────────────────────────────────────────────────────────────────

export async function GET() {
  const keys      = getORKeys();
  const available = keys.filter(isKeyAvailable).length;
  const exhausted = keys.length - available;

  const keyDetails = keys.map((k, i) => {
    const state = keyStates.get(k);
    const masked = `sk-or-...${k.slice(-6)}`;
    return {
      index:        i + 1,
      key:          masked,
      available:    isKeyAvailable(k),
      failCount:    state?.failCount    ?? 0,
      successCount: state?.successCount ?? 0,
      totalCalls:   state?.totalCalls   ?? 0,
      cooldownMs:   state?.failCount
                      ? getCooldown(state.failCount)
                      : 0,
    };
  });

  return NextResponse.json({
    status:          'ok',
    provider:        'openrouter-only',
    totalKeys:       keys.length,
    availableKeys:   available,
    exhaustedKeys:   exhausted,
    estimatedRpm:    keys.length * 20,
    keys:            keyDetails,
    timestamp:       new Date().toISOString(),
  });
}