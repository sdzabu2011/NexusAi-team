import type { ModelInfo } from '@/types';

const BASE = 'https://api.groq.com/openai/v1';

function getFirstKey(): string {
  return (
    process.env.GROQ_API_KEY_1 ??
    process.env.GROQ_API_KEY ??
    ''
  );
}

export async function fetchGroqModels(): Promise<ModelInfo[]> {
  const key = getFirstKey();
  if (!key) return [];

  const res = await fetch(`${BASE}/models`, {
    headers: { Authorization: `Bearer ${key}` },
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`Groq ${res.status}`);

  const { data } = await res.json() as {
    data: Array<{
      id: string;
      object: string;
      context_window?: number;
    }>;
  };

  return data
    .filter(m =>
      m.object === 'model' &&
      !m.id.includes('whisper') &&
      !m.id.includes('guard')
    )
    .map(m => ({
      id: m.id,
      name: m.id,
      provider: 'groq' as const,
      contextLength: m.context_window,
    }));
}

export async function chatGroq(
  model: string,
  messages: Array<{ role: string; content: string }>,
  maxTokens = 2048,
  apiKey?: string,
): Promise<unknown> {
  const key = apiKey ?? getFirstKey();
  if (!key) throw new Error('GROQ_API_KEY not configured');

  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Groq ${res.status}: ${t.slice(0, 200)}`);
  }

  return res.json();
}