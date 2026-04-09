import type { ModelInfo } from '@/types';

const BASE_URL = 'https://openrouter.ai/api/v1';
const REFERER  = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nexusai-team.onrender.com';
const TITLE    = 'NexusAI Team';

// ─────────────────────────────────────────────────────────────────────────────
// Key Pool
// ─────────────────────────────────────────────────────────────────────────────

export function getAllORKeys(): string[] {
  const keys: string[] = [];

  const base = process.env.OPENROUTER_API_KEY?.trim();
  if (base) keys.push(base);

  for (let i = 1; i <= 10; i++) {
    const k = process.env[`OPENROUTER_API_KEY_${i}`]?.trim();
    if (k) keys.push(k);
  }

  return Array.from(new Set(keys));
}

export function getFirstORKey(): string {
  const keys = getAllORKeys();
  if (keys.length === 0) throw new Error('No OpenRouter API key configured');
  return keys[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ContentPart {
  type:       string;        // ← string (literal emas — type conflict yo'q)
  text?:      string;
  image_url?: { url: string };
}

export interface ChatMessage {
  role:    'user' | 'assistant' | 'system';
  content: string | ContentPart[];
}

export interface ORChatResponse {
  id:      string;
  model:   string;
  choices: Array<{
    message: {
      role:    string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens:     number;
    completion_tokens: number;
    total_tokens:      number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Chat Completion
// ─────────────────────────────────────────────────────────────────────────────

export async function chatOpenRouter(
  model:     string,
  messages:  ChatMessage[],
  maxTokens: number = 2048,
  apiKey?:   string,
): Promise<ORChatResponse> {
  const key = apiKey ?? getFirstORKey();

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type':  'application/json',
      'HTTP-Referer':  REFERER,
      'X-Title':       TITLE,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens:  maxTokens,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`OpenRouter ${res.status}: ${errText.slice(0, 300)}`);
  }

  return res.json() as Promise<ORChatResponse>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Streaming Chat
// ─────────────────────────────────────────────────────────────────────────────

export async function chatOpenRouterStream(
  model:     string,
  messages:  ChatMessage[],
  maxTokens: number = 2048,
  apiKey?:   string,
): Promise<ReadableStream<Uint8Array>> {
  const key = apiKey ?? getFirstORKey();

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type':  'application/json',
      'HTTP-Referer':  REFERER,
      'X-Title':       TITLE,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens:  maxTokens,
      temperature: 0.7,
      stream:      true,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`OpenRouter stream ${res.status}: ${errText.slice(0, 300)}`);
  }

  if (!res.body) {
    throw new Error('OpenRouter: empty response body');
  }

  return res.body;
}

// ─────────────────────────────────────────────────────────────────────────────
// Free Models Fetch
// ─────────────────────────────────────────────────────────────────────────────

interface ORModelRaw {
  id:              string;
  name?:           string;
  context_length?: number;
  pricing?: {
    prompt?:     string;
    completion?: string;
  };
}

export async function fetchOpenRouterFreeModels(): Promise<ModelInfo[]> {
  const keys = getAllORKeys();
  if (keys.length === 0) return [];

  let lastError = '';

  for (const key of keys) {
    try {
      const res = await fetch(`${BASE_URL}/models`, {
        headers: {
          'Authorization': `Bearer ${key}`,
          'HTTP-Referer':  REFERER,
          'X-Title':       TITLE,
        },
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) {
        lastError = `HTTP ${res.status}`;
        continue;
      }

      const json = await res.json() as { data: ORModelRaw[] };

      const models = json.data
        .filter((m) => {
          if (m.id.endsWith(':free')) return true;
          const prompt     = parseFloat(m.pricing?.prompt     ?? '999');
          const completion = parseFloat(m.pricing?.completion ?? '999');
          return prompt === 0 && completion === 0;
        })
        .map((m): ModelInfo => ({
          id:            m.id,
          name:          m.name ?? m.id,
          provider:      'openrouter',
          contextLength: m.context_length,
        }))
        .sort((a, b) => (b.contextLength ?? 0) - (a.contextLength ?? 0));

      return models;

    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.warn(`[openrouter] key failed for models fetch: ${lastError}`);
      continue;
    }
  }

  console.error(`[openrouter] All keys failed: ${lastError}`);
  return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Extract text content from response
// ─────────────────────────────────────────────────────────────────────────────

export function extractContent(response: ORChatResponse): string {
  return response.choices?.[0]?.message?.content ?? '';
}

// ─────────────────────────────────────────────────────────────────────────────
// Parse SSE stream → text chunks
// ─────────────────────────────────────────────────────────────────────────────

export async function* parseSSEStream(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<string> {
  const reader  = stream.getReader();
  const decoder = new TextDecoder();
  let   buffer  = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;

        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') return;

        try {
          const parsed = JSON.parse(data) as {
            choices?: Array<{
              delta?: { content?: string };
            }>;
          };
          const chunk = parsed.choices?.[0]?.delta?.content;
          if (chunk) yield chunk;
        } catch {
          // Skip malformed SSE lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}