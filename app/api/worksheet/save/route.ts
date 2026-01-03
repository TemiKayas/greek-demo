import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { classId, title, filePath } = body;

    if (!classId || !title || !filePath) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify class ownership
    const classRecord = await db.class.findFirst({
      where: { id: classId, teacherId: session.user.id },
    });

    if (!classRecord) {
      return NextResponse.json({ error: 'Class not found or you are not the teacher' }, { status: 403 });
    }

    // Create worksheet record
    const worksheet = await db.worksheet.create({
      data: {
        classId,
        title,
        filePath,
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
