import { NextResponse } from 'next/server';
import { fetchOpenRouterFreeModels } from '@/lib/models/openrouter';
import { fetchGroqModels }           from '@/lib/models/groq';
import type { ModelInfo }            from '@/types';

export async function GET() {
  const models: ModelInfo[] = [];
  const errors: string[]    = [];

  const [orResult, gqResult] = await Promise.allSettled([
    fetchOpenRouterFreeModels(),
    fetchGroqModels(),
  ]);

  if (orResult.status === 'fulfilled') models.push(...orResult.value);
  else errors.push('OpenRouter: ' + (orResult.reason as Error).message);

  if (gqResult.status === 'fulfilled') models.push(...gqResult.value);
  else errors.push('Groq: ' + (gqResult.reason as Error).message);

  // Fallback demo models when no keys configured
  if (models.length === 0) {
    models.push(
      { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B (free)', provider: 'openrouter' },
      { id: 'meta-llama/llama-3.1-8b-instruct:free',  name: 'Llama 3.1 8B (free)',  provider: 'openrouter' },
      { id: 'llama3-8b-8192',   name: 'Llama3 8B',   provider: 'groq' },
      { id: 'llama3-70b-8192',  name: 'Llama3 70B',  provider: 'groq' },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', provider: 'groq' },
    );
  }

  return NextResponse.json({ models, count: models.length, errors, lastSync: Date.now() });
}
