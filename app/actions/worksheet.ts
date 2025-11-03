'use server';

import { db } from '@/lib/db';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

type WorksheetQuestion = {
  type: 'multiple_choice' | 'true_false' | 'fill_blank' | 'short_answer';
  question: string;
  options?: string[]; // For multiple choice
  answer: string;
  explanation?: string;
};

type WorksheetData = {
  title: string;
  questions: WorksheetQuestion[];
};

type GenerateResult = {
  success: boolean;
  data?: {
    id: string;
    content: WorksheetData;
  };
  error?: string;
};

type GetMaterialsResult = {
  success: boolean;
  data?: Array<{
    id: string;
    title: string;
    createdAt: Date;
    content: WorksheetData;
  }>;
  error?: string;
};

export async function generateWorksheet(
  pdfId: string,
  numQuestions: number
): Promise<GenerateResult> {
  try {
    // Get PDF and its processed content
    const pdf = await db.pDF.findUnique({
      where: { id: pdfId },
      include: { processedContent: true },
    });

    if (!pdf || !pdf.processedContent) {
      return { success: false, error: 'PDF or content not found' };
    }

    const extractedText = pdf.processedContent.extractedText;

    // Create prompt for Gemini
    const prompt = `You are an expert Modern Greek language teacher creating a worksheet for students.

Based on the following Greek learning material, create a worksheet with EXACTLY ${numQuestions} detailed, thoughtful questions.

MATERIAL:
${extractedText}

Generate a good mix of question types:
- Multiple choice (4 options each)
- True/False
- Fill in the blank
- Short answer

Focus on:
- Greek vocabulary and meaning
- Grammar rules and conjugations
- Sentence structure
- Cultural context
- Practical usage

Make questions detailed and educational. Ensure variety in difficulty.

Return your response as a JSON object with this EXACT structure:
{
  "title": "Worksheet: [Topic from Material]",
  "questions": [
    {
      "type": "multiple_choice",
      "question": "The question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "Option A",
      "explanation": "Why this is correct (optional)"
    },
    {
      "type": "true_false",
      "question": "The statement",
      "answer": "True",
      "explanation": "Explanation (optional)"
    },
    {
      "type": "fill_blank",
      "question": "The sentence with ___ for blank",
      "answer": "the correct word",
      "explanation": "Explanation (optional)"
    },
    {
      "type": "short_answer",
      "question": "The question requiring a written response",
      "answer": "Sample answer or key points",
      "explanation": "What to look for in answer (optional)"
    }
  ]
}

IMPORTANT: Return ONLY valid JSON. No markdown, no code blocks, no extra text.`;

    // Call Gemini API with JSON mode
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    // Parse the JSON response
    const worksheetData: WorksheetData = JSON.parse(response);

    // Save to database
    const material = await db.material.create({
      data: {
        pdfId: pdfId,
        userId: pdf.userId, // Add userId from PDF owner
        type: 'WORKSHEET',
        title: worksheetData.title,
        content: JSON.stringify(worksheetData),
      },
    });

    return {
      success: true,
      data: {
        id: material.id,
        content: worksheetData,
      },
    };
  } catch (error) {
    console.error('Worksheet generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate worksheet',
    };
  }
}

export async function getWorksheets(pdfId: string): Promise<GetMaterialsResult> {
  try {
    const materials = await db.material.findMany({
      where: {
        pdfId: pdfId,
        type: 'WORKSHEET',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const worksheets = materials.map((m) => ({
      id: m.id,
      title: m.title,
      createdAt: m.createdAt,
      content: JSON.parse(m.content) as WorksheetData,
    }));

    return { success: true, data: worksheets };
  } catch (error) {
    console.error('Get worksheets error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load worksheets',
    };
  }
}

export async function updateWorksheet(
  worksheetId: string,
  content: WorksheetData
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.material.update({
      where: { id: worksheetId },
      data: {
        title: content.title,
        content: JSON.stringify(content),
      },
    });
    return { success: true };
  } catch (error) {
    console.error('Update worksheet error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update worksheet',
    };
  }
}

export async function deleteWorksheet(worksheetId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await db.material.delete({
      where: { id: worksheetId },
    });
    return { success: true };
  } catch (error) {
    console.error('Delete worksheet error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete worksheet',
    };
  }
}
