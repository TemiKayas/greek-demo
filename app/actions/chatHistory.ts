'use server';

import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

type ChatConversationData = {
  id: string;
  userId: string;
  classId: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
  };
};

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Get all chat conversations for a class (teacher view)
 * Used by teachers to view student chat history and identify learning gaps
 */
export async function getClassChatHistory(
  classId: string
): Promise<ActionResult<ChatConversationData[]>> {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'TEACHER') {
      return { success: false, error: 'Not authorized' };
    }

    // Verify teacher owns the class
    const classData = await db.class.findUnique({
      where: { id: classId },
    });

    if (!classData || classData.teacherId !== session.user.id) {
      return { success: false, error: 'Not authorized' };
    }

    const conversations = await db.chatConversation.findMany({
      where: { classId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const parsedConversations = conversations.map(conv => ({
      ...conv,
      messages: conv.messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    }));

    return {
      success: true,
      data: parsedConversations as any,
    };
  } catch (error) {
    console.error('Error fetching class chat history:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch chat history',
    };
  }
}
