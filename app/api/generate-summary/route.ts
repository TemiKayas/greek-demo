import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { extractedText } = await request.json();

    if (!extractedText) {
      return NextResponse.json(
        { success: false, error: 'No text provided' },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
    });

    const prompt = `You are an expert educational content analyzer. Please provide a clear, concise summary of the following text. Focus on the main ideas, key concepts, and important details. Format your response in markdown with appropriate headings and bullet points.

Text to summarize:
${extractedText}

Please provide:
1. A brief overview (2-3 sentences)
2. Main topics covered
3. Key takeaways
4. Important concepts or terms explained`;

    const result = await model.generateContent(prompt);
    const summary = result.response.text();

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (error) {
    console.error('Error generating summary:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate summary',
      },
      { status: 500 }
    );
  }
}
