import { NextResponse } from 'next/server';
import type { ModelInfo } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// OpenRouter free model fetcher — NO Groq
// ─────────────────────────────────────────────────────────────────────────────

function getORKeys(): string[] {
  const keys: string[] = [];
  const base = process.env.OPENROUTER_API_KEY?.trim();
  if (base) keys.push(base);
  for (let i = 1; i <= 10; i++) {
    const k = process.env[`OPENROUTER_API_KEY_${i}`]?.trim();
    if (k) keys.push(k);
  }
  return [...new Set(keys)];
}

// ─────────────────────────────────────────────────────────────────────────────
// Hardcoded fallback free models (used when API unreachable)
// ─────────────────────────────────────────────────────────────────────────────

const FALLBACK_FREE_MODELS: ModelInfo[] = [
  { id: 'meta-llama/llama-3.3-70b-instruct:free',         name: 'Llama 3.3 70B',          provider: 'openrouter', contextLength: 131072 },
  { id: 'meta-llama/llama-3.1-8b-instruct:free',          name: 'Llama 3.1 8B',           provider: 'openrouter', contextLength: 131072 },
  { id: 'meta-llama/llama-3.2-11b-vision-instruct:free',  name: 'Llama 3.2 11B Vision',   provider: 'openrouter', contextLength: 131072 },
  { id: 'meta-llama/llama-3.2-3b-instruct:free',          name: 'Llama 3.2 3B',           provider: 'openrouter', contextLength: 131072 },
  { id: 'meta-llama/llama-3.2-1b-instruct:free',          name: 'Llama 3.2 1B',           provider: 'openrouter', contextLength: 131072 },
  { id: 'google/gemma-3-27b-it:free',                     name: 'Gemma 3 27B',            provider: 'openrouter', contextLength: 131072 },
  { id: 'google/gemma-3-12b-it:free',                     name: 'Gemma 3 12B',            provider: 'openrouter', contextLength: 131072 },
  { id: 'google/gemma-3-4b-it:free',                      name: 'Gemma 3 4B',             provider: 'openrouter', contextLength: 131072 },
  { id: 'google/gemma-2-9b-it:free',                      name: 'Gemma 2 9B',             provider: 'openrouter', contextLength: 8192   },
  { id: 'mistralai/mistral-7b-instruct:free',             name: 'Mistral 7B',             provider: 'openrouter', contextLength: 32768  },
  { id: 'mistralai/mistral-nemo:free',                    name: 'Mistral Nemo',           provider: 'openrouter', contextLength: 131072 },
  { id: 'qwen/qwen-2.5-72b-instruct:free',                name: 'Qwen 2.5 72B',           provider: 'openrouter', contextLength: 131072 },
  { id: 'qwen/qwen-2.5-7b-instruct:free',                 name: 'Qwen 2.5 7B',            provider: 'openrouter', contextLength: 131072 },
  { id: 'qwen/qwen-2.5-coder-32b-instruct:free',         name: 'Qwen 2.5 Coder 32B',    provider: 'openrouter', contextLength: 131072 },
  { id: 'qwen/qwen3-8b:free',                             name: 'Qwen3 8B',               provider: 'openrouter', contextLength: 40960  },
  { id: 'qwen/qwen3-14b:free',                            name: 'Qwen3 14B',              provider: 'openrouter', contextLength: 40960  },
  { id: 'qwen/qwen3-32b:free',                            name: 'Qwen3 32B',              provider: 'openrouter', contextLength: 40960  },
  { id: 'deepseek/deepseek-r1:free',                      name: 'DeepSeek R1',            provider: 'openrouter', contextLength: 163840 },
  { id: 'deepseek/deepseek-r1-distill-llama-70b:free',   name: 'DeepSeek R1 Llama 70B', provider: 'openrouter', contextLength: 131072 },
  { id: 'deepseek/deepseek-chat-v3-0324:free',            name: 'DeepSeek V3',            provider: 'openrouter', contextLength: 163840 },
  { id: 'deepseek/deepseek-v3-base:free',                 name: 'DeepSeek V3 Base',       provider: 'openrouter', contextLength: 163840 },
  { id: 'microsoft/phi-4:free',                           name: 'Phi-4',                  provider: 'openrouter', contextLength: 16384  },
  { id: 'microsoft/phi-4-reasoning:free',                 name: 'Phi-4 Reasoning',        provider: 'openrouter', contextLength: 16384  },
  { id: 'microsoft/phi-4-mini-reasoning:free',            name: 'Phi-4 Mini Reasoning',   provider: 'openrouter', contextLength: 131072 },
  { id: 'microsoft/mai-ds-r1:free',                       name: 'MAI DS R1',              provider: 'openrouter', contextLength: 163840 },
  { id: 'nvidia/llama-3.1-nemotron-70b-instruct:free',   name: 'Nemotron 70B',           provider: 'openrouter', contextLength: 131072 },
  { id: 'nvidia/llama-3.3-nemotron-super-49b-v1:free',   name: 'Nemotron Super 49B',     provider: 'openrouter', contextLength: 131072 },
  { id: 'thudm/glm-4-9b-chat:free',                       name: 'GLM-4 9B',               provider: 'openrouter', contextLength: 131072 },
  { id: 'tngtech/deepseek-r1t-chimera:free',              name: 'DeepSeek R1T Chimera',   provider: 'openrouter', contextLength: 163840 },
  { id: 'moonshotai/moonlight-16a-a3b-instruct:free',    name: 'Moonlight 16A',          provider: 'openrouter', contextLength: 131072 },
  { id: 'sarvamai/sarvam-m:free',                         name: 'Sarvam M',               provider: 'openrouter', contextLength: 32768  },
  { id: 'featherless/qwerky-72b:free',                    name: 'Qwerky 72B',             provider: 'openrouter', contextLength: 32768  },
  { id: 'openchat/openchat-7b:free',                      name: 'OpenChat 7B',            provider: 'openrouter', contextLength: 8192   },
  { id: 'huggingfaceh4/zephyr-7b-beta:free',              name: 'Zephyr 7B',              provider: 'openrouter', contextLength: 4096   },
  { id: 'sophosympatheia/midnight-rose-70b:free',         name: 'Midnight Rose 70B',      provider: 'openrouter', contextLength: 4096   },
];

// ─────────────────────────────────────────────────────────────────────────────
// Cache — 60 second TTL
// ─────────────────────────────────────────────────────────────────────────────

interface ModelsCache {
  models:    ModelInfo[];
  fetchedAt: number;
  source:    'api' | 'fallback';
  count:     number;
}

let cache: ModelsCache | null = null;
const CACHE_TTL_MS = 60_000; // 1 minute

// ─────────────────────────────────────────────────────────────────────────────
// Fetch free models from OpenRouter API
// ─────────────────────────────────────────────────────────────────────────────

interface ORModelRaw {
  id:      string;
  name:    string;
  pricing?: { prompt?: string; completion?: string };
  context_length?: number;
}

async function fetchFreeModelsFromAPI(apiKey: string): Promise<ModelInfo[]> {
  const res = await fetch('https://openrouter.ai/api/v1/models', {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer':  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nexusai-team.onrender.com',
      'X-Title':       'NexusAI Team',
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    throw new Error(`OpenRouter models API: HTTP ${res.status}`);
  }

  const json = await res.json() as { data: ORModelRaw[] };

  return json.data
    .filter((m) => {
      // Include only :free models
      if (m.id.endsWith(':free')) return true;
      // Or models with $0 pricing
      const prompt     = parseFloat(m.pricing?.prompt     ?? '1');
      const completion = parseFloat(m.pricing?.completion ?? '1');
      return prompt === 0 && completion === 0;
    })
    .map((m) => ({
      id:            m.id,
      name:          m.name,
      provider:      'openrouter' as const,
      contextLength: m.context_length,
    }))
    .sort((a, b) => {
      // Larger context first
      return (b.contextLength ?? 0) - (a.contextLength ?? 0);
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET handler
// ─────────────────────────────────────────────────────────────────────────────

export async function GET() {
  // Serve cache if fresh
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return NextResponse.json({
      models:    cache.models,
      count:     cache.count,
      source:    cache.source,
      cached:    true,
      fetchedAt: cache.fetchedAt,
      nextSync:  cache.fetchedAt + CACHE_TTL_MS,
    });
  }

  const keys = getORKeys();

  // No keys — return fallback immediately
  if (keys.length === 0) {
    cache = {
      models:    FALLBACK_FREE_MODELS,
      fetchedAt: Date.now(),
      source:    'fallback',
      count:     FALLBACK_FREE_MODELS.length,
    };
    return NextResponse.json({
      models:    FALLBACK_FREE_MODELS,
      count:     FALLBACK_FREE_MODELS.length,
      source:    'fallback',
      cached:    false,
      warning:   'No API keys configured — using built-in model list.',
      fetchedAt: cache.fetchedAt,
      nextSync:  cache.fetchedAt + CACHE_TTL_MS,
    });
  }

  // Try each key until one works
  let lastError = '';
  for (const key of keys) {
    try {
      const models = await fetchFreeModelsFromAPI(key);

      if (models.length === 0) {
        // API returned nothing — merge with fallback
        const merged = deduplicateModels([...models, ...FALLBACK_FREE_MODELS]);
        cache = { models: merged, fetchedAt: Date.now(), source: 'api', count: merged.length };
      } else {
        cache = { models, fetchedAt: Date.now(), source: 'api', count: models.length };
      }

      return NextResponse.json({
        models:    cache.models,
        count:     cache.count,
        source:    cache.source,
        cached:    false,
        fetchedAt: cache.fetchedAt,
        nextSync:  cache.fetchedAt + CACHE_TTL_MS,
      });

    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.warn(`[NexusAI Models] Key failed: ${lastError}`);
      continue;
    }
  }

  // All keys failed — use fallback
  console.error(`[NexusAI Models] All keys failed. Using fallback. Last: ${lastError}`);
  cache = {
    models:    FALLBACK_FREE_MODELS,
    fetchedAt: Date.now(),
    source:    'fallback',
    count:     FALLBACK_FREE_MODELS.length,
  };

  return NextResponse.json({
    models:    FALLBACK_FREE_MODELS,
    count:     FALLBACK_FREE_MODELS.length,
    source:    'fallback',
    cached:    false,
    error:     lastError,
    fetchedAt: cache.fetchedAt,
    nextSync:  cache.fetchedAt + CACHE_TTL_MS,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Deduplicate by model ID
// ─────────────────────────────────────────────────────────────────────────────

function deduplicateModels(models: ModelInfo[]): ModelInfo[] {
  const seen = new Set<string>();
  return models.filter((m) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
}