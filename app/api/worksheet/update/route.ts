import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { put } from '@vercel/blob';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { worksheetId, title, worksheetData } = body;

    if (!worksheetId) {
      return NextResponse.json({ error: 'Missing worksheetId' }, { status: 400 });
    }

    // Verify worksheet ownership
    const worksheet = await db.worksheet.findUnique({
      where: { id: worksheetId },
    });

    if (!worksheet || worksheet.createdBy !== session.user.id) {
      return NextResponse.json({ error: 'Worksheet not found or you are not the creator' }, { status: 403 });
    }

    // If worksheetData is provided, update the blob
    if (worksheetData) {
      // Extract filename from existing filePath
      const fileName = worksheet.filePath.split('/').slice(-2).join('/');

      // Re-upload to blob storage (overwrites existing)
      await put(fileName, JSON.stringify(worksheetData), {
        access: 'public',
        addRandomSuffix: false,
      });
    }

    // Update database if title changed
    const updateData: { title?: string } = {};
    if (title && title !== worksheet.title) {
      updateData.title = title;
    }

    let updatedWorksheet = worksheet;
    if (Object.keys(updateData).length > 0) {
      updatedWorksheet = await db.worksheet.update({
        where: { id: worksheetId },
        data: updateData,
      });
    }

    return NextResponse.json({ success: true, worksheet: updatedWorksheet });

  } catch (error) {
    console.error('Error updating worksheet:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
