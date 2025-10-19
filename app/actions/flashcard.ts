'use server';

import { db } from '@/lib/db';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

type Flashcard = {
  front: string;
  back: string;
  category: string; // e.g., "Vocabulary", "Grammar", "Culture"
};

type FlashcardData = {
  title: string;
  cards: Flashcard[];
};

type GenerateResult = {
  success: boolean;
  data?: {
    id: string;
    content: FlashcardData;
  };
  error?: string;
};

type GetMaterialsResult = {
  success: boolean;
  data?: Array<{
    id: string;
    title: string;
    createdAt: Date;
    content: FlashcardData;
  }>;
  error?: string;
};

export async function generateFlashcards(pdfId: string): Promise<GenerateResult> {
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
    const prompt = `You are an expert Modern Greek language teacher creating comprehensive flashcards for students.

Based on the following Greek learning material, create a complete set of flashcards covering all important concepts.

MATERIAL:
${extractedText}

Create flashcards that cover:
1. **Vocabulary**: Greek words/phrases with English translations and example usage
2. **Grammar Rules**: Verb conjugations, noun cases, sentence structure
3. **Cultural Facts**: Relevant cultural context or traditions
4. **Practical Usage**: Common expressions and when to use them
5. **Key Concepts**: Main ideas and their explanations

Create as many flashcards as needed to comprehensively cover the material (typically 15-30 cards depending on content density).

Each flashcard should have:
- **Front**: The term, concept, or question in Greek or English
- **Back**: The answer, explanation, or translation with additional context
- **Category**: One of: "Vocabulary", "Grammar", "Culture", "Practical", "Concept"

Return your response as a JSON object with this EXACT structure:
{
  "title": "Flashcards: [Topic from Material]",
  "cards": [
    {
      "front": "Γεια σου",
      "back": "Hello (informal)\\n\\nUsed when greeting friends or people younger than you.\\n\\nExample: Γεια σου, Μαρία! (Hello, Maria!)",
      "category": "Vocabulary"
    },
    {
      "front": "What are the three genders in Greek?",
      "back": "Masculine (ο), Feminine (η), and Neuter (το)\\n\\nEvery noun has a gender, which affects articles and adjectives.",
      "category": "Grammar"
    },
    {
      "front": "Greek Coffee Tradition",
      "back": "Greek coffee (ελληνικός καφές) is traditionally served in small cups and never stirred after brewing. The grounds settle at the bottom.\\n\\nIt's a social ritual, often enjoyed slowly with conversation.",
      "category": "Culture"
    }
  ]
}

Make each card informative and pedagogically valuable. Use \\n for line breaks in the back text.

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
    const flashcardData: FlashcardData = JSON.parse(response);

    // Save to database
    const material = await db.material.create({
      data: {
        pdfId: pdfId,
        type: 'FLASHCARD',
        title: flashcardData.title,
        content: JSON.stringify(flashcardData),
      },
    });

    return {
      success: true,
      data: {
        id: material.id,
        content: flashcardData,
      },
    };
  } catch (error) {
    console.error('Flashcard generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate flashcards',
    };
  }
}

export async function getFlashcards(pdfId: string): Promise<GetMaterialsResult> {
  try {
    const materials = await db.material.findMany({
      where: {
        pdfId: pdfId,
        type: 'FLASHCARD',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const flashcards = materials.map((m) => ({
      id: m.id,
      title: m.title,
      createdAt: m.createdAt,
      content: JSON.parse(m.content) as FlashcardData,
    }));

    return { success: true, data: flashcards };
  } catch (error) {
    console.error('Get flashcards error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load flashcards',
    };
  }
}

export async function deleteFlashcards(flashcardId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await db.material.delete({
      where: { id: flashcardId },
    });
    return { success: true };
  } catch (error) {
    console.error('Delete flashcards error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete flashcards',
    };
  }
}
