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
    const { classId, title, filePath, worksheetData } = body;

    // Check if this is a new worksheet (with data) or existing (with filePath)
    if (!classId || !title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify class ownership
    const classRecord = await db.class.findFirst({
      where: { id: classId, teacherId: session.user.id },
    });

    if (!classRecord) {
      return NextResponse.json({ error: 'Class not found or you are not the teacher' }, { status: 403 });
    }

    let finalFilePath = filePath;

    // If worksheetData is provided, upload to blob storage first
    if (worksheetData) {
      const uniqueId = crypto.randomUUID();
      const fileName = `worksheets/${classId}/${uniqueId}.json`;

      const blob = await put(fileName, JSON.stringify(worksheetData), {
        access: 'public',
        addRandomSuffix: false,
      });

      finalFilePath = blob.url;
    }

    if (!finalFilePath) {
      return NextResponse.json({ error: 'No file path or worksheet data provided' }, { status: 400 });
    }

    // Create worksheet record
    const worksheet = await db.worksheet.create({
      data: {
        classId,
        title,
        filePath: finalFilePath,
        createdBy: session.user.id,
      },
    });

    return NextResponse.json({ success: true, worksheet });

  } catch (error) {
    console.error('Error saving worksheet:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
