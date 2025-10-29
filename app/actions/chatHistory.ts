'use server';

import { db } from '@/lib/db';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

type ChatConversationData = {
  id: string;
  pdfId: string;
  messages: Message[];
  firstPrompt: string;
  createdAt: Date;
  updatedAt: Date;
};

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// Save or update a chat conversation
export async function saveChatConversation(
  pdfId: string,
  messages: Message[],
  conversationId?: string
): Promise<ActionResult<ChatConversationData>> {
  try {
    if (messages.length === 0) {
      return { success: false, error: 'No messages to save' };
    }

    const firstPrompt = messages.find(m => m.role === 'user')?.content || 'Untitled conversation';

    let conversation;

    if (conversationId) {
      // Update existing conversation
      conversation = await db.chatConversation.update({
        where: { id: conversationId },
        data: {
          messages: JSON.stringify(messages),
        },
      });
    } else {
      // Create new conversation
      conversation = await db.chatConversation.create({
        data: {
          pdfId,
          messages: JSON.stringify(messages),
          firstPrompt: firstPrompt.substring(0, 200), // Limit length for display
        },
      });
    }

    return {
      success: true,
      data: {
        ...conversation,
        messages: JSON.parse(conversation.messages) as Message[],
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

// Get all chat conversations for a PDF
export async function getChatHistory(
  pdfId: string
): Promise<ActionResult<ChatConversationData[]>> {
  try {
    const conversations = await db.chatConversation.findMany({
      where: { pdfId },
      orderBy: { updatedAt: 'desc' },
    });

    const parsedConversations = conversations.map(conv => ({
      ...conv,
      messages: JSON.parse(conv.messages) as Message[],
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

// Delete a chat conversation
export async function deleteChatConversation(
  conversationId: string
): Promise<ActionResult<null>> {
  try {
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
