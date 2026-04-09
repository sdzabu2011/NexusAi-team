import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    muxPlaybackId: process.env.MUX_PLAYBACK_ID
      ?? 'GEpj38bbxKjkAo6Ij3qmxbYeNTQ011TTnl2eH9ftDTFM',
    hasOpenRouter: Boolean(
      process.env.OPENROUTER_API_KEY   ||
      process.env.OPENROUTER_API_KEY_1 ||
      process.env.OPENROUTER_API_KEY_2,
    ),
    keyCount: [
      process.env.OPENROUTER_API_KEY,
      ...Array.from({ length: 10 }, (_, i) =>
        process.env[`OPENROUTER_API_KEY_${i + 1}`],
      ),
    ].filter(Boolean).length,
  });
}