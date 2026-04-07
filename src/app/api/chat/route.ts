import { NextRequest, NextResponse } from 'next/server';
import { chatOpenRouter } from '@/lib/models/openrouter';
import { chatGroq }       from '@/lib/models/groq';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { provider, model, messages, system, maxTokens } = body;

    if (!model)    return NextResponse.json({ error: 'model is required' },    { status: 400 });
    if (!messages) return NextResponse.json({ error: 'messages is required' }, { status: 400 });

    const allMessages = system
      ? [{ role: 'system', content: system }, ...messages]
      : messages;

    let data;
    if (provider === 'groq') {
      data = await chatGroq(model, allMessages, maxTokens ?? 2048);
    } else {
      data = await chatOpenRouter(model, allMessages, maxTokens ?? 2048);
    }

    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
