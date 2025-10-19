import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { db } from '@/lib/db';

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

    // Read the file from local filesystem
    const fileBuffer = await readFile(pdf.filePath);

    // Return the PDF file (convert Buffer to Uint8Array for proper typing)
    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${pdf.filename}"`,
      },
    });
  } catch (error) {
    console.error('Error serving PDF:', error);
    return NextResponse.json(
      { error: 'Failed to load PDF' },
      { status: 500 }
    );
  }
}
