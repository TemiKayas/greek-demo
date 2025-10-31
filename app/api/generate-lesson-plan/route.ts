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

    const prompt = `You are an expert curriculum designer and teacher. Based on the following educational content, create a comprehensive lesson plan. Format your response in clear, structured markdown.

Content:
${extractedText}

Please create a lesson plan with the following sections:

# Lesson Plan

## Overview
- Grade Level/Target Audience
- Subject Area
- Estimated Duration
- Learning Objectives (3-5 clear, measurable objectives)

## Prerequisites
- Prior knowledge students should have
- Required materials/resources

## Lesson Structure

### Introduction (5-10 minutes)
- Hook/Engagement activity
- Learning objectives review

### Main Content (30-40 minutes)
- Key concepts to teach
- Teaching strategies and activities
- Discussion questions
- Examples and demonstrations

### Practice Activities (20-30 minutes)
- Individual or group work suggestions
- Hands-on activities
- Critical thinking exercises

### Assessment
- Formative assessment strategies
- Summative assessment ideas
- Success criteria

### Conclusion (5-10 minutes)
- Summary of key points
- Exit ticket or reflection activity

## Extensions
- Differentiation strategies for advanced learners
- Support strategies for struggling learners
- Connection to real-world applications

## Homework/Follow-up
- Suggested assignments
- Additional resources for students`;

    const result = await model.generateContent(prompt);
    const lessonPlan = result.response.text();

    return NextResponse.json({
      success: true,
      lessonPlan,
    });
  } catch (error) {
    console.error('Error generating lesson plan:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate lesson plan',
      },
      { status: 500 }
    );
  }
}
