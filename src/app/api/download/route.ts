import { NextRequest, NextResponse } from 'next/server';

// This endpoint is a placeholder — actual ZIP download happens client-side via jszip
export async function GET(_req: NextRequest) {
  return NextResponse.json({
    message: 'Use the Download ZIP button in the UI to get the generated project.',
    tip: 'The ZIP is generated client-side from the generated files in your browser.',
  });
}
