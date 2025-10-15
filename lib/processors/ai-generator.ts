import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
  explanation?: string;
}

export interface Quiz {
  questions: QuizQuestion[];
}

export async function generateQuiz(
  text: string,
  numQuestions: number = 5
): Promise<Quiz> {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const prompt = `You are a quiz generator. Based on the following text, create ${numQuestions} multiple-choice questions.

TEXT:
${text.slice(0, 10000)}

Generate a JSON object with this exact structure:
{
  "questions": [
    {
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "The correct option text",
      "explanation": "Brief explanation of why this is correct"
    }
  ]
}

Requirements:
- Create exactly ${numQuestions} questions
- Each question must have exactly 4 options
- The answer must be one of the options (exact match)
- Questions should test understanding, not just memorization
- Cover different parts of the text
- Keep questions clear and concise`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    const quiz = JSON.parse(response) as Quiz;

    // Validate the quiz structure
    if (!quiz.questions || quiz.questions.length === 0) {
      throw new Error('No questions generated');
    }

    return quiz;
  } catch (error) {
    console.error('Quiz generation error:', error);
    throw new Error('Failed to generate quiz. Please try again.');
  }
}
