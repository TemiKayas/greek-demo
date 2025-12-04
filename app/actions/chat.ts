'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { ragSearch } from '@/lib/vectorSearch';
import { chatWithContext } from '@/lib/openai';
import { revalidatePath } from 'next/cache';
import type { ChatMessage } from '@prisma/client';

// Types
type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

interface MessageWithSources {
  id: string;
  role: string;
  content: string;
  createdAt: Date;
  sources?: {
    fileName: string;
    fileId: string;
    similarity: number;
    pageNumber?: number;
    section?: string;
  }[];
}

interface ConversationWithDetails {
  id: string;
  userId: string;
  classId: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
  class: {
    id: string;
    name: string;
  };
  messages: ChatMessage[];
  _count: {
    messages: number;
  };
}

// Configuration for RAG 2.0
const RAG_CONFIG = {
  initialK: 30, // Initial retrieval from hybrid search (cast wide net)
  finalK: 5, // Final number of results after reranking (best quality)
  vectorWeight: 0.7, // Weight for vector similarity (semantic understanding)
  bm25Weight: 0.3, // Weight for BM25 (keyword matching)
  useReranking: true, // Enable cross-encoder reranking for better precision
  conversationHistoryLimit: 10, // Keep last 10 messages
};

/**
 * Get or create a conversation for a student in a class
 * Students have one ongoing conversation per class
 * @param classId - Class ID
 * @returns Conversation ID
 */
export async function getOrCreateConversation(
  classId: string
): Promise<ActionResult<{ conversationId: string }>> {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'STUDENT') {
      return { success: false, error: 'Only students can chat' };
    }

    // Verify student is a member of this class
    const membership = await db.classMembership.findUnique({
      where: {
        classId_userId: {
          classId,
          userId: session.user.id,
        },
      },
    });

    if (!membership) {
      return { success: false, error: 'Not a member of this class' };
    }

    // Check if conversation already exists
    let conversation = await db.chatConversation.findFirst({
      where: {
        userId: session.user.id,
        classId,
      },
    });

    // Create new conversation if none exists
    if (!conversation) {
      const classInfo = await db.class.findUnique({
        where: { id: classId },
        select: { name: true },
      });

      conversation = await db.chatConversation.create({
        data: {
          userId: session.user.id,
          classId,
          title: `${classInfo?.name || 'Class'} Chat`,
        },
      });
    }

    return {
      success: true,
      data: { conversationId: conversation.id },
    };
  } catch (error) {
    console.error('Get/create conversation error:', error);
    return {
      success: false,
      error: 'Failed to create conversation',
    };
  }
}

/**
 * Send a message and get AI response using RAG
 * @param conversationId - Conversation ID
 * @param message - User's message
 * @returns AI response with sources
 */
export async function sendChatMessage(
  conversationId: string,
  message: string
): Promise<ActionResult<MessageWithSources>> {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'STUDENT') {
      return { success: false, error: 'Only students can send messages' };
    }

    // Validate message
    if (!message || message.trim().length === 0) {
      return { success: false, error: 'Message cannot be empty' };
    }

    if (message.length > 2000) {
      return { success: false, error: 'Message too long (max 2000 characters)' };
    }

    // Get conversation and verify access
    const conversation = await db.chatConversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: RAG_CONFIG.conversationHistoryLimit,
        },
        class: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!conversation || conversation.userId !== session.user.id) {
      return { success: false, error: 'Conversation not found or unauthorized' };
    }

    console.log(`[RAG Chat] Processing message for class: ${conversation.class.name}`);

    // Save user message
    const userMessage = await db.chatMessage.create({
      data: {
        conversationId,
        role: 'user',
        content: message,
      },
    });

    console.log(`[RAG 2.0] Starting enhanced retrieval (Hybrid + Reranking)...`);

    // Perform RAG 2.0 search: Hybrid (Vector + BM25) + Reranking + Parent-Child
    const searchResults = await ragSearch(
      conversation.classId,
      message,
      {
        initialK: RAG_CONFIG.initialK,
        finalK: RAG_CONFIG.finalK,
        vectorWeight: RAG_CONFIG.vectorWeight,
        bm25Weight: RAG_CONFIG.bm25Weight,
        useReranking: RAG_CONFIG.useReranking,
      }
    );

    console.log(`[RAG 2.0] Retrieved ${searchResults.length} high-quality chunks`);

    // Check if we have any relevant content
    if (searchResults.length === 0) {
      const noContextResponse = `I don't have any relevant information in the class materials to answer your question. This could mean:

1. The materials haven't been uploaded yet
2. Your question is outside the scope of the current materials
3. The materials are still being processed

Please try asking your teacher directly, or wait for more materials to be uploaded.`;

      const aiMessage = await db.chatMessage.create({
        data: {
          conversationId,
          role: 'assistant',
          content: noContextResponse,
        },
      });

      revalidatePath(`/class/${conversation.classId}`);

      return {
        success: true,
        data: {
          id: aiMessage.id,
          role: aiMessage.role,
          content: aiMessage.content,
          createdAt: aiMessage.createdAt,
          sources: [],
        },
      };
    }

    // Build context from PARENT chunks (hierarchical retrieval)
    // If parent exists, use it for full context. Otherwise, fall back to child.
    const context = searchResults.map((result) => {
      const contentToUse = result.parentContent || result.content;
      return contentToUse;
    });

    // Build source metadata for citations
    const sourceFiles = searchResults.map((result) => ({
      fileName: result.fileName,
      pageNumber: result.pageNumber,
    }));

    console.log(`[RAG 2.0] Context: ${searchResults.length} chunks, ~${context.join('').length} chars total`);
    console.log(`[RAG 2.0] Using ${searchResults.filter(r => r.parentContent).length}/${searchResults.length} parent chunks for context`);

    // Get conversation history (reverse to chronological order)
    const history = conversation.messages
      .reverse()
      .map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

    console.log(`[RAG 2.0] Using ${history.length} previous messages for continuity`);

    // Generate AI response with enhanced context and citations
    const aiResponse = await chatWithContext(message, context, sourceFiles, history);

    console.log(`[RAG 2.0] Generated response (${aiResponse.length} characters)`);

    // Save AI message
    const aiMessage = await db.chatMessage.create({
      data: {
        conversationId,
        role: 'assistant',
        content: aiResponse,
      },
    });

    // Prepare sources for frontend (with page numbers and sections)
    const sources = searchResults.map((result) => ({
      fileName: result.fileName,
      fileId: result.fileId,
      similarity: result.similarity,
      pageNumber: result.pageNumber,
      section: result.section,
    }));

    // Update conversation timestamp
    await db.chatConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    revalidatePath(`/classes/${conversation.classId}`);

    return {
      success: true,
      data: {
        id: aiMessage.id,
        role: aiMessage.role,
        content: aiMessage.content,
        createdAt: aiMessage.createdAt,
        sources,
      },
    };
  } catch (error) {
    console.error('[RAG Chat] Error:', error);
    return {
      success: false,
      error: 'Failed to send message. Please try again.',
    };
  }
}

/**
 * Get all messages for a conversation
 * @param conversationId - Conversation ID
 * @returns Messages in chronological order
 */
export async function getConversationMessages(
  conversationId: string
): Promise<ActionResult<ChatMessage[]>> {
  try {
    const session = await auth();

    if (!session?.user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get conversation
    const conversation = await db.chatConversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        class: {
          select: {
            teacherId: true,
          },
        },
      },
    });

    if (!conversation) {
      return { success: false, error: 'Conversation not found' };
    }

    // Verify access (student owns conversation OR teacher owns class)
    const isStudent = session.user.role === 'STUDENT' && conversation.userId === session.user.id;
    const isTeacher = session.user.role === 'TEACHER' && conversation.class.teacherId === session.user.id;

    if (!isStudent && !isTeacher) {
      return { success: false, error: 'Unauthorized' };
    }

    return {
      success: true,
      data: conversation.messages,
    };
  } catch (error) {
    console.error('Get conversation messages error:', error);
    return {
      success: false,
      error: 'Failed to fetch messages',
    };
  }
}

/**
 * Get all conversations for a student
 * @returns List of conversations with latest message
 */
export async function getStudentConversations(): Promise<ActionResult<ConversationWithDetails[]>> {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'STUDENT') {
      return { success: false, error: 'Only students can view their conversations' };
    }

    const conversations = await db.chatConversation.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        class: {
          select: {
            id: true,
            name: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return {
      success: true,
      data: conversations,
    };
  } catch (error) {
    console.error('Get student conversations error:', error);
    return {
      success: false,
      error: 'Failed to fetch conversations',
    };
  }
}

/**
 * Delete a conversation (students only, can delete their own)
 * @param conversationId - Conversation ID
 */
export async function deleteConversation(
  conversationId: string
): Promise<ActionResult> {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'STUDENT') {
      return { success: false, error: 'Only students can delete conversations' };
    }

    // Verify ownership
    const conversation = await db.chatConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation || conversation.userId !== session.user.id) {
      return { success: false, error: 'Conversation not found or unauthorized' };
    }

    // Delete conversation (cascades to messages)
    await db.chatConversation.delete({
      where: { id: conversationId },
    });

    revalidatePath('/history');

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Delete conversation error:', error);
    return {
      success: false,
      error: 'Failed to delete conversation',
    };
  }
}

/**
 * Get RAG statistics for debugging/analytics
 * @param classId - Class ID
 */
export async function getRAGStats(
  classId: string
): Promise<ActionResult<{
  totalFiles: number;
  totalChunks: number;
  avgChunksPerFile: number;
  filesReady: number;
}>> {
  try {
    const session = await auth();

    if (!session?.user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get file stats
    const files = await db.classFile.findMany({
      where: { classId },
      include: {
        _count: {
          select: {
            chunks: true,
          },
        },
      },
    });

    const totalFiles = files.length;
    const filesReady = files.filter((f) => f.status === 'COMPLETED').length;
    const totalChunks = files.reduce((sum, f) => sum + f._count.chunks, 0);
    const avgChunksPerFile = totalFiles > 0 ? totalChunks / totalFiles : 0;

    return {
      success: true,
      data: {
        totalFiles,
        totalChunks,
        avgChunksPerFile: Math.round(avgChunksPerFile),
        filesReady,
      },
    };
  } catch (error) {
    console.error('Get RAG stats error:', error);
    return {
      success: false,
      error: 'Failed to get stats',
    };
  }
}
