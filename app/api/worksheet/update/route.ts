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
    const { worksheetId, title } = body;

    if (!worksheetId || !title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify worksheet ownership
    const worksheet = await db.worksheet.findUnique({
      where: { id: worksheetId },
    });

    if (!worksheet || worksheet.createdBy !== session.user.id) {
      return NextResponse.json({ error: 'Worksheet not found or you are not the creator' }, { status: 403 });
    }

    // Update worksheet
    const updatedWorksheet = await db.worksheet.update({
      where: { id: worksheetId },
      data: { title },
    });

    return NextResponse.json({ success: true, worksheet: updatedWorksheet });

  } catch (error) {
    console.error('Error updating worksheet:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
