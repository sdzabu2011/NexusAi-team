import { NextRequest, NextResponse } from 'next/server';
import { chatOpenRouter } from '@/lib/models/openrouter';
import { chatGroq }       from '@/lib/models/groq';

// ─── Key pools ────────────────────────────────────────────
function getGroqKeys(): string[] {
  const keys: string[] = [];
  if (process.env.GROQ_API_KEY) keys.push(process.env.GROQ_API_KEY);
  for (let i = 1; i <= 10; i++) {
    const k = process.env[`GROQ_API_KEY_${i}`];
    if (k) keys.push(k);
  }
  return [...new Set(keys)];
}

function getORKeys(): string[] {
  const keys: string[] = [];
  if (process.env.OPENROUTER_API_KEY) keys.push(process.env.OPENROUTER_API_KEY);
  for (let i = 1; i <= 10; i++) {
    const k = process.env[`OPENROUTER_API_KEY_${i}`];
    if (k) keys.push(k);
  }
  return [...new Set(keys)];
}

// ─── Rate limit tracker ───────────────────────────────────
const exhausted = new Map<string, number>();
const COOLDOWN_MS = 60_000;

function isExhausted(key: string): boolean {
  const t = exhausted.get(key);
  if (!t) return false;
  if (Date.now() - t > COOLDOWN_MS) {
    exhausted.delete(key);
    return false;
  }
  return true;
}

function markExhausted(key: string): void {
  exhausted.set(key, Date.now());
}

function pickKey(keys: string[]): string | null {
  return keys.find(k => !isExhausted(k)) ?? null;
}

// ─── Delay ───────────────────────────────────────────────
const delay = (ms: number) =>
  new Promise<void>(resolve => setTimeout(resolve, ms));

// ─── Try keys loop ────────────────────────────────────────
async function tryKeys(
  keys: string[],
  caller: (key: string) => Promise<unknown>,
): Promise<unknown> {
  if (keys.length === 0) throw new Error('No API keys configured');

  for (let i = 0; i < keys.length; i++) {
    const key = pickKey(keys);

    // Hammasi exhausted → reset va birinchisini ishlatish
    if (!key) {
      exhausted.clear();
      return caller(keys[0]);
    }

    try {
      return await caller(key);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      const isLimit =
        msg.includes('429') ||
        msg.toLowerCase().includes('rate') ||
        msg.toLowerCase().includes('limit');

      if (isLimit) {
        markExhausted(key);
        await delay(2000);
        continue;
      }
      throw err;
    }
  }

  // Barcha urinishlar tugadi → reset
  exhausted.clear();
  return caller(keys[0]);
}

// ─── Main handler ─────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { provider, model, messages, system, maxTokens } = body;

    if (!model) {
      return NextResponse.json({ error: 'model required' }, { status: 400 });
    }
    if (!messages) {
      return NextResponse.json({ error: 'messages required' }, { status: 400 });
    }

    const allMessages = system
      ? [{ role: 'system', content: system }, ...messages]
      : messages;

    const tokens = maxTokens ?? 2048;

    // 10-15 sekund cooldown
    await delay(Math.floor(Math.random() * 5000) + 10000);

    if (provider === 'groq') {
      const keys = getGroqKeys();
      const data = await tryKeys(keys, (key) =>
        chatGroq(model, allMessages, tokens, key)
      );
      return NextResponse.json(data);
    }

    // OpenRouter (default)
    const keys = getORKeys();
    const data = await tryKeys(keys, (key) =>
      chatOpenRouter(model, allMessages, tokens, key)
    );
    return NextResponse.json(data);

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}