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
  lessonId?: string | null;
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
// First parameter can be either classId (if in class context) or pdfId (if in library)
export async function saveChatConversation(
  contextId: string, // Can be classId or pdfId
  messages: Message[],
  conversationId?: string,
  secondParam?: string // Additional context (pdfId when first is classId, or undefined)
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
      // Assume contextId is pdfId if no secondParam, otherwise it's classId
      const pdfId = secondParam || contextId;
      const classId = secondParam ? contextId : null;

      conversation = await db.chatConversation.create({
        data: {
          userId: session.user.id,
          classId: classId || null,
          pdfId: pdfId || null,
          materialId: null,
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
        classId: conversation.classId || '',
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

// Get all chat conversations for the current user for a specific PDF
export async function getChatHistory(
  pdfId: string
): Promise<ActionResult<ChatConversationData[]>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: 'Not authenticated' };
    }

    const conversations = await db.chatConversation.findMany({
      where: {
        userId: session.user.id,
        pdfId,
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
      firstPrompt: conv.title, // Add firstPrompt field for compatibility
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

// Save or update a student lesson chat conversation
export async function saveLessonChatConversation(
  classId: string,
  lessonId: string,
  messages: Message[],
  conversationId?: string
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
          lessonId,
          pdfId: null,
          materialId: null,
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
        classId: conversation.classId || '',
        lessonId: conversation.lessonId,
        messages: conversation.messages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      },
    };
  } catch (error) {
    console.error('Error saving lesson chat conversation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save conversation',
    };
  }
}

// Get all chat conversations for a specific lesson (teacher view)
export async function getLessonChatHistory(
  classId: string,
  lessonId: string
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
      where: {
        classId,
        lessonId,
      },
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
      orderBy: { updatedAt: 'desc' },
    });

    const parsedConversations = conversations.map(conv => ({
      ...conv,
      classId: conv.classId || '',
      lessonId: conv.lessonId,
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
    console.error('Error fetching lesson chat history:', error);
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
