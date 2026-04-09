import { NextRequest, NextResponse } from 'next/server';
import { getAllORKeys } from '@/lib/models/openrouter';

// Vision — rasm + fayl tahlil
// Ishlatiladi: llama-3.2-11b-vision-instruct:free

const VISION_MODELS = [
  'meta-llama/llama-3.2-11b-vision-instruct:free',
  'meta-llama/llama-3.2-90b-vision-instruct:free',
  'qwen/qwen2.5-vl-72b-instruct:free',
  'google/gemma-3-27b-it:free',
];

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function tryVision(
  key:      string,
  model:    string,
  messages: unknown[],
): Promise<unknown> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type':  'application/json',
      'HTTP-Referer':  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nexusai-team.onrender.com',
      'X-Title':       'NexusAI Team',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 2048,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${res.status}: ${err.slice(0, 200)}`);
  }

  return res.json();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      image?:   string;  // base64 data URL
      text?:    string;  // fayl matni (kod, pdf text)
      prompt?:  string;  // user so'rovi
      type?:    'image' | 'code' | 'zip' | 'text';
    };

    const { image, text, prompt = 'Analyze this', type = 'image' } = body;

    if (!image && !text) {
      return NextResponse.json(
        { error: 'image yoki text kerak' },
        { status: 400 },
      );
    }

    const keys = getAllORKeys();
    if (keys.length === 0) {
      return NextResponse.json(
        { error: 'No API keys configured' },
        { status: 503 },
      );
    }

    // Build messages
    let messages: unknown[];

    if (image) {
      // Vision — rasm tahlil
      messages = [{
        role:    'user',
        content: [
          {
            type:      'image_url',
            image_url: { url: image },
          },
          {
            type: 'text',
            text: prompt,
          },
        ],
      }];
    } else {
      // Text/code tahlil
      const systemPrompt = type === 'code'
        ? 'You are an expert code reviewer. Analyze the code, find bugs, suggest improvements.'
        : type === 'zip'
        ? 'You are analyzing extracted ZIP file contents. Summarize the project structure.'
        : 'Analyze the provided content thoroughly.';

      messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: `${prompt}\n\n\`\`\`\n${text}\n\`\`\`` },
      ];
    }

    // Try vision models with key rotation
    let lastError = '';

    for (const model of VISION_MODELS) {
      for (const key of keys) {
        try {
          await sleep(Math.random() * 500);
          const data = await tryVision(key, model, messages);
          return NextResponse.json({ ...data as object, usedModel: model });
        } catch (err) {
          lastError = err instanceof Error ? err.message : String(err);
          // 400 = model supports no vision, try next
          if (lastError.includes('400') || lastError.includes('vision')) continue;
          // 429 = rate limit, wait
          if (lastError.includes('429')) await sleep(2000);
          continue;
        }
      }
    }

    return NextResponse.json(
      { error: `All vision models failed: ${lastError}` },
      { status: 500 },
    );

  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}