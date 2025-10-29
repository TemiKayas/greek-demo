import { NextRequest, NextResponse } from 'next/server';
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

    // Redirect to Vercel Blob URL (or fetch and return)
    // Option 1: Simple redirect
    return NextResponse.redirect(pdf.blobUrl);

    // Option 2: Fetch and proxy (use if you need auth checks)
    // const response = await fetch(pdf.blobUrl);
    // const blob = await response.blob();
    // return new NextResponse(blob, {
    //   headers: {
    //     'Content-Type': 'application/pdf',
    //     'Content-Disposition': `inline; filename="${pdf.filename}"`,
    //   },
    // });
  } catch (error) {
    console.error('Error serving PDF:', error);
    return NextResponse.json(
      { error: 'Failed to load PDF' },
      { status: 500 }
    );
  }
}
