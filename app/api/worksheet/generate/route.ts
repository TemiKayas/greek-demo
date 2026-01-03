import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { put } from '@vercel/blob';
import { extractText } from '@/lib/extractors/text-extractor';
import { extractPDFWithPages } from '@/lib/extractors/pdf-extractor';
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
    const { classId, prompt, skipSave } = body;

    if (!classId || !prompt) {
      return NextResponse.json({ error: 'Missing classId or prompt' }, { status: 400 });
    }

    // 1. Verify class ownership
    const classRecord = await db.class.findFirst({
      where: { id: classId, teacherId: session.user.id },
    });

    if (!classRecord) {
      return NextResponse.json({ error: 'Class not found or you are not the teacher' }, { status: 403 });
    }

    // 2. Get all file chunks for the class
    const chunks = await db.fileChunk.findMany({
      where: { classId: classId },
      select: { content: true },
    });

    if (chunks.length === 0) {
      return NextResponse.json({ error: 'No materials found for this class to generate a worksheet from.' }, { status: 400 });
    }

    const context = chunks.map(chunk => chunk.content).join('\\n\\n---\\n\\n');

    // 3. Generate worksheet with LLM
    const openai = getOpenAI();

    const systemPrompt = `You are a helpful assistant that generates educational worksheets.
Create a worksheet based on the provided context and the user's prompt.
The worksheet must be in the following JSON format:
{
  "title": "Worksheet Title",
  "questions": [
    {
      "question_text": "...",
      "type": "multiple_choice | true_false | short_answer | paragraph",
      "options": ["...", "...", "..."], // Only for multiple_choice
      "right_answer": "..." // Can be null for paragraph
    }
  ]
}
The "title" should be descriptive and based on the user's prompt.
The questions should be relevant to the provided context.
`;

    const fullPrompt = `Context:
${context}

User Prompt:
${prompt}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: fullPrompt },
      ],
      response_format: { type: 'json_object' },
    });

    const worksheetJsonString = response.choices[0].message.content;
    if (!worksheetJsonString) {
      throw new Error('LLM failed to generate worksheet');
    }

    let worksheetData;
    try {
        worksheetData = JSON.parse(worksheetJsonString);
    } catch (e) {
        console.error("Failed to parse LLM response as JSON:", worksheetJsonString);
        throw new Error("The AI model returned an invalid format. Please try again.");
    }

    // If skipSave is true, just return the data for preview
    if (skipSave) {
      return NextResponse.json({ success: true, worksheetData });
    }

    // 4. Save the worksheet
    const worksheetTitle = worksheetData.title || 'Untitled Worksheet';
    const uniqueId = crypto.randomUUID();
    const fileName = `worksheets/${classId}/${uniqueId}.json`;

    const blob = await put(fileName, worksheetJsonString, {
      access: 'public',
      addRandomSuffix: false,
    });

    const worksheet = await db.worksheet.create({
      data: {
        classId,
        title: worksheetTitle,
        filePath: blob.url,
        createdBy: session.user.id,
      },
    });

    return NextResponse.json({ success: true, worksheet });

  } catch (error) {
    console.error('Error generating worksheet:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
