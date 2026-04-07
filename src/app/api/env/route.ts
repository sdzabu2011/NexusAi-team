import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    muxPlaybackId: process.env.MUX_PLAYBACK_ID || 'GEpj38bbxKjkAo6Ij3qmxbYeNTQ011TTnl2eH9ftDTFM',
    hasOpenRouter: Boolean(process.env.OPENROUTER_API_KEY),
    hasGroq:       Boolean(process.env.GROQ_API_KEY),
  });
}
