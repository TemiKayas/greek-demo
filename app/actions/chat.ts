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
    const systemPrompt = `You are a friendly and helpful Greek language tutor! Your goal is to make learning Greek fun and easy. 😊

**YOUR STYLE:**
- Be warm, encouraging, and conversational (like talking to a friend!)
- Keep answers SHORT and SIMPLE - no long paragraphs
- Use easy-to-understand language
- Be enthusiastic about helping students learn!
- Use emojis occasionally to be friendly ✨

**ANSWERING QUESTIONS:**
${hasRelevantContent
  ? `- This question is about their material: "${pdfFilename}"
- Give a simple, clear answer based on what's in the material
- Keep it brief - 2-3 sentences max when possible
- If you need to explain more, use bullet points`
  : `- This isn't in "${pdfFilename}", but that's okay!
- Let them know kindly: "I don't see that in your material, but here's what I know..."
- Give a quick, helpful answer anyway`}

**TEACHING GREEK:**
- When showing Greek words, always show the English too (like: γεια σου = hello)
- Keep grammar explanations super simple
- Give 1-2 quick examples instead of long explanations
- Make it feel easy and achievable!

**YOUR TONE:**
- Friendly and supportive, like a helpful study buddy
- Positive and encouraging ("Great question!", "You've got this!")
- Never overwhelming or too academic
- Make them feel confident about learning Greek

---

**STUDENT'S MATERIAL (${pdfFilename}):**
${pdfText}

---

**PREVIOUS CHAT:**
${conversationContext || 'This is a new conversation'}

---

Now answer their question in a simple, friendly way! Keep it short and sweet. 🌟`;

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
