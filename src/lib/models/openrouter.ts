import type { ModelInfo } from '@/types';

const BASE    = 'https://openrouter.ai/api/v1';
const REFERER = 'https://nexusai-team.onrender.com';
const TITLE   = 'NexusAI Team';

function getFirstKey(): string {
  return (
    process.env.OPENROUTER_API_KEY_1 ??
    process.env.OPENROUTER_API_KEY ??
    ''
  );
}

export async function fetchOpenRouterFreeModels(): Promise<ModelInfo[]> {
  const key = getFirstKey();
  if (!key) return [];

  const res = await fetch(`${BASE}/models`, {
    headers: {
      Authorization: `Bearer ${key}`,
      'HTTP-Referer': REFERER,
      'X-Title': TITLE,
    },
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}`);

  const { data } = await res.json() as {
    data: Array<{
      id: string;
      name?: string;
      context_length?: number;
      pricing?: { prompt: string };
    }>;
  };

  return data
    .filter(m =>
      m.id.includes(':free') ||
      m.pricing?.prompt === '0'
    )
    .map(m => ({
      id: m.id,
      name: m.name ?? m.id,
      provider: 'openrouter' as const,
      contextLength: m.context_length,
    }));
}

export async function chatOpenRouter(
  model: string,
  messages: Array<{ role: string; content: string }>,
  maxTokens = 2048,
  apiKey?: string,
): Promise<unknown> {
  const key = apiKey ?? getFirstKey();
  if (!key) throw new Error('OPENROUTER_API_KEY not configured');

  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': REFERER,
      'X-Title': TITLE,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${t.slice(0, 200)}`);
  }

  return res.json();
}