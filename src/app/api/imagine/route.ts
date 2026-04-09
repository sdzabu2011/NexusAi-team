import { NextRequest, NextResponse } from 'next/server';

// Hugging Face — BEPUL rasm generatsiya
// Models: FLUX.1-schnell, SD-XL, Stable-Diffusion

const HF_MODELS = [
  'black-forest-labs/FLUX.1-schnell',
  'stabilityai/stable-diffusion-xl-base-1.0',
  'stabilityai/stable-diffusion-2-1',
  'runwayml/stable-diffusion-v1-5',
];

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function getHFKey(): string {
  return (
    process.env.HUGGINGFACE_API_KEY ??
    process.env.HF_API_KEY ??
    ''
  );
}

async function generateImage(
  model:  string,
  prompt: string,
  key:    string,
): Promise<Blob> {
  const res = await fetch(
    `https://api-inference.huggingface.co/models/${model}`,
    {
      method:  'POST',
      headers: {
        'Authorization': key ? `Bearer ${key}` : '',
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          num_inference_steps: 20,
          guidance_scale:      7.5,
          width:               512,
          height:              512,
        },
      }),
      signal: AbortSignal.timeout(60_000),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HF ${res.status}: ${err.slice(0, 200)}`);
  }

  // Check if model is loading
  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const json = await res.json() as { error?: string; estimated_time?: number };
    if (json.error?.includes('loading')) {
      throw new Error(`Model loading, retry in ${json.estimated_time ?? 20}s`);
    }
    throw new Error(json.error ?? 'Unknown HF error');
  }

  return res.blob();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      prompt:   string;
      negative?: string;
      model?:   string;
    };

    const { prompt, model } = body;

    if (!prompt?.trim()) {
      return NextResponse.json(
        { error: 'prompt kerak' },
        { status: 400 },
      );
    }

    const key    = getHFKey();
    const models = model ? [model, ...HF_MODELS] : HF_MODELS;

    let lastError = '';

    for (const m of models) {
      try {
        const blob       = await generateImage(m, prompt, key);
        const buffer     = await blob.arrayBuffer();
        const base64     = Buffer.from(buffer).toString('base64');
        const mimeType   = blob.type || 'image/png';
        const dataUrl    = `data:${mimeType};base64,${base64}`;

        return NextResponse.json({
          image:  dataUrl,
          model:  m,
          prompt,
        });

      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        console.warn(`[imagine] ${m} failed: ${lastError}`);

        // Model loading — wait and retry
        if (lastError.includes('loading')) {
          await sleep(5_000);
          try {
            const blob     = await generateImage(m, prompt, key);
            const buffer   = await blob.arrayBuffer();
            const base64   = Buffer.from(buffer).toString('base64');
            const mimeType = blob.type || 'image/png';
            return NextResponse.json({
              image:  `data:${mimeType};base64,${base64}`,
              model:  m,
              prompt,
            });
          } catch {
            continue;
          }
        }
        continue;
      }
    }

    return NextResponse.json(
      { error: `All models failed: ${lastError}` },
      { status: 500 },
    );

  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}