'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '@/lib/db';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

type ChatResult =
  | { success: true; response: string }
  | { success: false; error: string };

export async function chatWithPDF(
  pdfId: string,
  userMessage: string,
  conversationHistory: Message[]
): Promise<ChatResult> {
  try {
    // Get PDF and its processed content
    const pdf = await db.pDF.findUnique({
      where: { id: pdfId },
      include: {
        processedContent: true,
      },
    });

    if (!pdf) {
      return { success: false, error: 'PDF not found' };
    }

    if (!pdf.processedContent) {
      return { success: false, error: 'PDF has not been processed yet' };
    }

    const pdfText = pdf.processedContent.extractedText;
    const pdfFilename = pdf.filename;

    // Check if question is related to the PDF content using keyword matching
    const questionWords = userMessage.toLowerCase().split(/\s+/);
    const pdfWords = pdfText.toLowerCase().split(/\s+/);

    // Find matching keywords (excluding common words)
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'what', 'how', 'why', 'when', 'where', 'who']);
    const relevantQuestionWords = questionWords.filter(word =>
      word.length > 3 && !commonWords.has(word)
    );

    const matchCount = relevantQuestionWords.filter(word =>
      pdfWords.some(pdfWord => pdfWord.includes(word) || word.includes(pdfWord))
    ).length;

    const hasRelevantContent = matchCount > 0;

    // Build conversation history for context
    const conversationContext = conversationHistory
      .map(msg => `${msg.role === 'user' ? 'Student' : 'Tutor'}: ${msg.content}`)
      .join('\n\n');

    // Create system prompt
    const systemPrompt = `You are an expert Modern Greek language tutor helping students understand their course materials.

**IMPORTANT INSTRUCTIONS:**

1. **Primary Source**: You are provided with the complete text from the student's textbook/material: "${pdfFilename}"

2. **Answer Strategy**:
   ${hasRelevantContent
     ? `- The student's question IS related to the provided material
   - Answer using ONLY information from the provided text
   - Always cite the source by saying "According to ${pdfFilename}..." or "Based on the material in ${pdfFilename}..."
   - Be specific and reference the exact concepts/terms from the text`
     : `- The student's question does NOT appear to be in the provided material
   - First state: "I don't see information about that specific topic in ${pdfFilename}."
   - Then provide a helpful general answer based on your knowledge of Modern Greek
   - Be clear that you're using general knowledge, not the specific material`}

3. **Greek Language Focus**:
   - When explaining Greek terms, provide both Greek and English
   - Help with grammar questions by referencing rules and examples
   - Explain vocabulary with translations and context
   - Use Greek characters (Ελληνικά) when appropriate

4. **Teaching Style**:
   - Be clear, concise, and educational
   - Provide examples when helpful
   - Break down complex concepts into simpler parts
   - Encourage understanding, not just memorization

5. **Conversation Context**:
   - Remember the full conversation history
   - Reference previous questions/answers when relevant
   - Build on what's already been discussed

---

**TEXTBOOK/MATERIAL CONTENT (${pdfFilename}):**

${pdfText}

---

**CONVERSATION HISTORY:**

${conversationContext || 'No previous conversation'}

---

Now answer the student's question while following all the instructions above.`;

    // Call Gemini API
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
    });

    const result = await model.generateContent(systemPrompt + '\n\nStudent: ' + userMessage);
    const response = result.response.text();

    return {
      success: true,
      response: response,
    };

  } catch (error) {
    console.error('Chat error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process message',
    };
  }
}
