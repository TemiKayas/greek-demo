import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { put } from '@vercel/blob';
import { ragSearch } from '@/lib/vectorSearch';
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

// Extract question count from prompt (default: 10)
function extractQuestionCount(prompt: string): number {
  const match = prompt.match(/(\d+)\s*questions?/i);
  if (match) {
    const count = parseInt(match[1], 10);
    return count > 0 && count <= 50 ? count : 10; // Cap at 50 questions
  }
  return 10; // Default
}

// Calculate scaffolded question distribution
function calculateQuestionDistribution(total: number): {
  warmup: number;
  building: number;
  application: number;
  synthesis: number;
} {
  // Percentages: 20% warmup, 40% building, 30% application, 10% synthesis
  const warmup = Math.max(1, Math.round(total * 0.2));
  const building = Math.max(1, Math.round(total * 0.4));
  const application = Math.max(1, Math.round(total * 0.3));
  const synthesis = Math.max(1, total - warmup - building - application); // Remaining

  return { warmup, building, application, synthesis };
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

    // 2. Extract question count from prompt
    const questionCount = extractQuestionCount(prompt);
    console.log(`[Worksheet Generation] Generating ${questionCount} questions`);

    // 3. Use RAG search to find relevant content
    console.log(`[Worksheet Generation] Searching for relevant material...`);
    const searchResults = await ragSearch(
      classId,
      prompt,
      {
        initialK: 50,    // Cast wider net for diverse questions
        finalK: 10,      // Keep top 10 most relevant chunks (~30K tokens)
        vectorWeight: 0.7,
        bm25Weight: 0.3,
        useReranking: true,
      }
    );

    if (searchResults.length === 0) {
      return NextResponse.json({
        error: 'No materials found for this topic. Please upload relevant course materials first.'
      }, { status: 400 });
    }

    console.log(`[Worksheet Generation] Found ${searchResults.length} relevant chunks`);

    // 4. Build context from parent chunks (for full context)
    const contextChunks = searchResults.map((result) => {
      const content = result.parentContent || result.content;
      const metadata = [
        result.fileName,
        result.pageNumber ? `Page ${result.pageNumber}` : null,
        result.section || null,
      ].filter(Boolean).join(' - ');

      return `[Source: ${metadata}]\n${content}`;
    });

    const context = contextChunks.join('\n\n---\n\n');

    // 5. Calculate scaffolded question distribution
    const distribution = calculateQuestionDistribution(questionCount);

    // 6. Generate worksheet with LLM
    const openai = getOpenAI();

    const systemPrompt = `You are an expert educational assessment designer that creates scaffolded worksheets.

CRITICAL REQUIREMENTS - THESE ARE NON-NEGOTIABLE:
1. You MUST generate EXACTLY ${questionCount} questions - no more, no less
2. Questions MUST progress from easy to hard to support student learning
3. If you cannot generate ${questionCount} questions, explain why in a "error" field instead of "questions"

Generate a worksheet with EXACTLY ${questionCount} questions that follows this scaffolded structure:

**Warm-up (${distribution.warmup} questions):** Basic recall and recognition
  - true_false: Test basic facts and definitions
  - multiple_choice: Simple concept identification

**Building (${distribution.building} questions):** Apply knowledge
  - multiple_choice: More complex scenarios requiring understanding
  - short_answer: Apply terminology and explain concepts briefly

**Application (${distribution.application} questions):** Demonstrate understanding
  - short_answer: Explain concepts, provide examples, analyze situations

**Synthesis (${distribution.synthesis} questions):** Higher-order thinking
  - paragraph: Analyze, compare/contrast, synthesize multiple concepts, or evaluate

IMPORTANT RULES:
1. Questions MUST be ordered from easiest to hardest
2. Use ONLY these question types: true_false, multiple_choice, short_answer, paragraph
3. For multiple_choice: Provide exactly 4 plausible options
4. For true_false: Include a brief explanation in right_answer (e.g., "True - because...")
5. For short_answer: right_answer should be a brief model answer (2-3 sentences)
6. For paragraph: right_answer should be null (open-ended)
7. Questions should be cohesive and build on each other
8. Base ALL questions on the provided context materials

Return ONLY valid JSON in this exact format:
{
  "title": "Descriptive worksheet title based on the topic",
  "questions": [
    {
      "question_text": "Question text here",
      "type": "true_false | multiple_choice | short_answer | paragraph",
      "options": ["A", "B", "C", "D"],  // ONLY for multiple_choice
      "right_answer": "Correct answer or null for paragraph"
    }
  ]
}`;

    const fullPrompt = `Based on the following course materials, create a ${questionCount}-question worksheet about: "${prompt}"

CONTEXT MATERIALS:
${context}

Remember: Order questions from easiest (true/false) to hardest (paragraph). Make questions cohesive and progressive.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: fullPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7, // Some creativity for diverse questions
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

    // 7. Validate question count
    if (!worksheetData.questions) {
      throw new Error(worksheetData.error || 'Failed to generate worksheet - no questions returned');
    }

    if (worksheetData.questions.length !== questionCount) {
      console.error(`[Worksheet Generation] Expected ${questionCount} questions, got ${worksheetData.questions.length}`);
      return NextResponse.json({
        error: `The AI generated ${worksheetData.questions.length} questions instead of ${questionCount}. Please try again with a more specific prompt or adjust the question count.`
      }, { status: 400 });
    }

    console.log(`[Worksheet Generation] Successfully generated ${questionCount} questions`);

    // If skipSave is true, just return the data for preview
    if (skipSave) {
      return NextResponse.json({ success: true, worksheetData });
    }

    // 8. Save the worksheet
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

    console.log(`[Worksheet Generation] Saved worksheet: ${worksheetTitle}`);

    return NextResponse.json({ success: true, worksheet });

  } catch (error) {
    console.error('Error generating worksheet:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
