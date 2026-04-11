import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { prompt: string; model?: string };
    const { prompt } = body;

    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'prompt kerak' }, { status: 400 });
    }

    const encoded = encodeURIComponent(prompt);
    const url = `https://image.pollinations.ai/prompt/${encoded}?width=512&height=512&nologo=true`;

    const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });

    if (!res.ok) throw new Error(`Pollinations ${res.status}`);

    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    return NextResponse.json({
      image: `data:image/jpeg;base64,${base64}`,
      model: 'pollinations/flux',
      prompt,
    });

  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Xato' },
      { status: 500 },
    );
  }
}