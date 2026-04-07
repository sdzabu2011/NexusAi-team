import type { ModelInfo } from '@/types';

const BASE = 'https://openrouter.ai/api/v1';

export async function fetchOpenRouterFreeModels(): Promise<ModelInfo[]> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return [];
  const res = await fetch(`${BASE}/models`, {
    headers: { Authorization: `Bearer ${key}`, 'HTTP-Referer': 'https://nexusai-team.onrender.com', 'X-Title': 'NexusAI Team' },
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
  const { data } = await res.json() as { data: Array<{ id: string; name?: string; context_length?: number; pricing?: { prompt: string } }> };
  return data
    .filter((m) => m.id.includes(':free') || m.pricing?.prompt === '0')
    .map((m) => ({ id: m.id, name: m.name ?? m.id, provider: 'openrouter' as const, contextLength: m.context_length }));
}

export async function chatOpenRouter(model: string, messages: Array<{ role: string; content: string }>, maxTokens = 2048) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY not configured');
  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://nexusai-team.onrender.com', 'X-Title': 'NexusAI Team' },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
  });
  if (!res.ok) { const t = await res.text(); throw new Error(`OpenRouter ${res.status}: ${t.slice(0, 200)}`); }
  return res.json();
}
