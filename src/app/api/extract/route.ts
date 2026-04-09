import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';

// ─── Route Segment Config (Next.js 14+) ──────────────────────────────────────
export const dynamic    = 'force-dynamic';
export const runtime    = 'nodejs';
export const maxDuration = 60;

// ZIP extract — fayllarni ko'rsatish + AI tahlil

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file     = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'file kerak' },
        { status: 400 },
      );
    }

    // Check file type
    const name = file.name.toLowerCase();

    // ── ZIP ──────────────────────────────────────────────────────────────────
    if (name.endsWith('.zip')) {
      const buffer = await file.arrayBuffer();
      const zip    = await JSZip.loadAsync(buffer);

      const files: Array<{
        filename: string;
        content:  string;
        size:     number;
        language: string;
      }> = [];

      const promises = Object.entries(zip.files)
        .filter(([, f]) => !f.dir)
        .slice(0, 100) // max 100 fayl
        .map(async ([filename, zipFile]) => {
          try {
            const content = await zipFile.async('text');
            const ext     = filename.split('.').pop()?.toLowerCase() ?? 'txt';
            files.push({
              filename,
              content: content.slice(0, 5000), // max 5000 char
              size:    content.length,
              language: ext,
            });
          } catch {
            // Binary file — skip
          }
        });

      await Promise.all(promises);

      // Sort by filename
      files.sort((a, b) => a.filename.localeCompare(b.filename));

      return NextResponse.json({
        type:    'zip',
        name:    file.name,
        count:   files.length,
        files,
        summary: {
          totalFiles: files.length,
          languages:  [...new Set(files.map((f) => f.language))],
          totalSize:  files.reduce((s, f) => s + f.size, 0),
        },
      });
    }

    // ── Code / Text file ─────────────────────────────────────────────────────
    if (
      name.match(/\.(ts|tsx|js|jsx|py|rs|go|java|cs|cpp|c|rb|php|lua|luau|sql|yaml|yml|json|toml|md|txt|sh|dockerfile|prisma|graphql|html|css|scss)$/)
    ) {
      const content = await file.text();
      const ext     = name.split('.').pop()?.toLowerCase() ?? 'txt';

      return NextResponse.json({
        type:     'code',
        name:     file.name,
        content:  content.slice(0, 10000),
        language: ext,
        lines:    content.split('\n').length,
        size:     content.length,
      });
    }

    // ── Image ────────────────────────────────────────────────────────────────
    if (name.match(/\.(png|jpg|jpeg|gif|webp|svg|bmp)$/)) {
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const mime   = file.type || 'image/png';

      return NextResponse.json({
        type:    'image',
        name:    file.name,
        dataUrl: `data:${mime};base64,${base64}`,
        size:    buffer.byteLength,
        mime,
      });
    }

    return NextResponse.json(
      { error: `Qo'llab-quvvatlanmagan fayl turi: ${name}` },
      { status: 400 },
    );

  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}