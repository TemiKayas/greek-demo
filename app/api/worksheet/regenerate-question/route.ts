import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import OpenAI from 'openai';

// Lazy initialization of OpenAI client
let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { classId, prompt, currentQuestion } = body;

    if (!classId || !prompt || !currentQuestion) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify class ownership
    const classRecord = await db.class.findFirst({
      where: { id: classId, teacherId: session.user.id },
    });

    if (!classRecord) {
      return NextResponse.json({ error: 'Class not found or you are not the teacher' }, { status: 403 });
    }

    // Get all file chunks for context
    const chunks = await db.fileChunk.findMany({
      where: { classId: classId },
      select: { content: true },
    });

    if (chunks.length === 0) {
      return NextResponse.json({ error: 'No materials found for this class' }, { status: 400 });
    }

    const context = chunks.map(chunk => chunk.content).join('\\n\\n---\\n\\n');

    // Generate single question with LLM
    const openai = getOpenAI();

    const systemPrompt = `You are a helpful assistant that generates educational questions.
Based on the provided context and user's prompt, regenerate the given question.
The question must be in the following JSON format:
{
  "question_text": "...",
  "type": "multiple_choice | true_false | short_answer | paragraph",
  "options": ["...", "...", "..."], // Only for multiple_choice
  "right_answer": "..." // Can be null for paragraph
}

Keep the same question type as the original unless specifically instructed otherwise.
The regenerated question should align with the user's prompt (e.g., make it harder, focus on a specific topic, etc.).
`;

    const fullPrompt = `Context:
${context}

Current Question:
Type: ${currentQuestion.type}
Question: ${currentQuestion.question_text}
${currentQuestion.options ? `Options: ${currentQuestion.options.join(', ')}` : ''}
${currentQuestion.right_answer ? `Correct Answer: ${currentQuestion.right_answer}` : ''}

User's Regeneration Prompt:
${prompt}

Please regenerate this question based on the user's instructions while maintaining the same question type.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: fullPrompt },
      ],
      response_format: { type: 'json_object' },
    });

    const questionJsonString = response.choices[0].message.content;
    if (!questionJsonString) {
      throw new Error('LLM failed to regenerate question');
    }

    let questionData;
    try {
      questionData = JSON.parse(questionJsonString);
    } catch (e) {
      console.error('Failed to parse LLM response as JSON:', questionJsonString);
      throw new Error('The AI model returned an invalid format. Please try again.');
    }

    return NextResponse.json({ success: true, question: questionData });

  } catch (error) {
    console.error('Error regenerating question:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
