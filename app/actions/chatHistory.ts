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
  pdfId: string | null;
  materialId: string | null;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
};

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// Save or update a chat conversation
export async function saveChatConversation(
  classId: string,
  messages: Message[],
  conversationId?: string,
  pdfId?: string,
  materialId?: string
): Promise<ActionResult<ChatConversationData>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: 'Not authenticated' };
    }

    if (messages.length === 0) {
      return { success: false, error: 'No messages to save' };
    }

    const title = messages.find(m => m.role === 'user')?.content.substring(0, 100) || 'Untitled conversation';

    let conversation;

    if (conversationId) {
      // Update existing conversation - add new messages
      const existingConversation = await db.chatConversation.findUnique({
        where: { id: conversationId },
        include: { messages: true },
      });

      if (!existingConversation) {
        return { success: false, error: 'Conversation not found' };
      }

      // Add new messages
      const newMessages = messages.slice(existingConversation.messages.length);

      await db.chatMessage.createMany({
        data: newMessages.map(msg => ({
          conversationId,
          role: msg.role,
          content: msg.content,
        })),
      });

      conversation = await db.chatConversation.findUnique({
        where: { id: conversationId },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });
    } else {
      // Create new conversation with messages
      conversation = await db.chatConversation.create({
        data: {
          userId: session.user.id,
          classId,
          pdfId: pdfId || null,
          materialId: materialId || null,
          title,
          messages: {
            create: messages.map(msg => ({
              role: msg.role,
              content: msg.content,
            })),
          },
        },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });
    }

    if (!conversation) {
      return { success: false, error: 'Failed to save conversation' };
    }

    return {
      success: true,
      data: {
        ...conversation,
        messages: conversation.messages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      },
    };
  } catch (error) {
    console.error('Error saving chat conversation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save conversation',
    };
  }
}

// Get all chat conversations for the current user in a specific class
export async function getChatHistory(
  classId: string
): Promise<ActionResult<ChatConversationData[]>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: 'Not authenticated' };
    }

    const conversations = await db.chatConversation.findMany({
      where: {
        userId: session.user.id,
        classId,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
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
      data: parsedConversations,
    };
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch chat history',
    };
  }
}

// Get all chat conversations for a class (teacher view)
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

// Delete a chat conversation
export async function deleteChatConversation(
  conversationId: string
): Promise<ActionResult<null>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify ownership
    const conversation = await db.chatConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation || conversation.userId !== session.user.id) {
      return { success: false, error: 'Not authorized' };
    }

    await db.chatConversation.delete({
      where: { id: conversationId },
    });

    return { success: true, data: null };
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete conversation',
    };
  }
}
