import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get PDF record from database
    const pdf = await db.pDF.findUnique({
      where: { id },
    });

    if (!pdf) {
      return NextResponse.json({ error: 'PDF not found' }, { status: 404 });
    }

    // Check if it's a Vercel Blob URL (starts with https://)
    if (pdf.blobUrl.startsWith('http://') || pdf.blobUrl.startsWith('https://')) {
      // Vercel Blob URL - redirect
      return NextResponse.redirect(pdf.blobUrl);
    }

    // Local file path - serve from filesystem
    try {
      const filePath = join(process.cwd(), pdf.blobUrl);
      const fileBuffer = await readFile(filePath);

      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${pdf.fileName}"`,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    } catch (fileError) {
      console.error('Error reading local file:', fileError);
      return NextResponse.json(
        { error: 'PDF file not found on disk' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error serving PDF:', error);
    return NextResponse.json(
      { error: 'Failed to load PDF' },
      { status: 500 }
    );
  }
}
