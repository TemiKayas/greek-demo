'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

type ActionResult<T = any> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Submit a worksheet with answers (for students)
 */
export async function submitWorksheet(
  classId: string,
  lessonId: string,
  worksheetId: string,
  answers: Record<number, string> // questionIndex -> student answer
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'Not authenticated' };
  }

  if (session.user.role !== 'STUDENT') {
    return { success: false, error: 'Only students can submit worksheets' };
  }

  try {
    // Get the worksheet to calculate score
    const worksheet = await db.material.findUnique({
      where: { id: worksheetId },
    });

    if (!worksheet) {
      return { success: false, error: 'Worksheet not found' };
    }

    const worksheetData = JSON.parse(worksheet.content);
    const questions = worksheetData.questions || [];

    // Auto-grade the worksheet
    let correctCount = 0;
    const totalPoints = questions.length;

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const studentAnswer = answers[i]?.trim() || '';
      const correctAnswer = question.answer?.trim() || '';

      // For multiple choice and true/false, exact match
      if (question.type === 'multiple_choice' || question.type === 'true_false') {
        if (studentAnswer.toLowerCase() === correctAnswer.toLowerCase()) {
          correctCount++;
        }
      }
      // For fill_blank, check if answer contains the correct answer (case insensitive)
      else if (question.type === 'fill_blank') {
        if (studentAnswer.toLowerCase().includes(correctAnswer.toLowerCase())) {
          correctCount++;
        }
      }
      // For short_answer, we can't auto-grade, give benefit of the doubt for now
      else if (question.type === 'short_answer') {
        // TODO: Could use AI to grade short answers
        // For now, count as correct if they provided any answer
        if (studentAnswer.length > 0) {
          correctCount++;
        }
      }
    }

    const score = totalPoints > 0 ? (correctCount / totalPoints) * 100 : 0;

    // Create or update submission
    const submission = await db.worksheetSubmission.upsert({
      where: {
        userId_worksheetId_classId: {
          userId: session.user.id,
          worksheetId,
          classId,
        },
      },
      update: {
        answers: JSON.stringify(answers),
        score,
        totalPoints,
        submittedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        classId,
        lessonId,
        worksheetId,
        answers: JSON.stringify(answers),
        score,
        totalPoints,
      },
    });

    revalidatePath(`/classes/${classId}/materials/lessons/${lessonId}`);

    return {
      success: true,
      data: {
        submissionId: submission.id,
        score: submission.score,
        totalPoints: submission.totalPoints,
      },
    };
  } catch (error) {
    console.error('Error submitting worksheet:', error);
    return { success: false, error: 'Failed to submit worksheet' };
  }
}

/**
 * Get a student's submission for a worksheet
 */
export async function getWorksheetSubmission(
  worksheetId: string,
  classId: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const submission = await db.worksheetSubmission.findUnique({
      where: {
        userId_worksheetId_classId: {
          userId: session.user.id,
          worksheetId,
          classId,
        },
      },
    });

    if (!submission) {
      return { success: true, data: null };
    }

    return {
      success: true,
      data: {
        id: submission.id,
        answers: JSON.parse(submission.answers),
        score: submission.score,
        totalPoints: submission.totalPoints,
        submittedAt: submission.submittedAt,
      },
    };
  } catch (error) {
    console.error('Error getting worksheet submission:', error);
    return { success: false, error: 'Failed to get submission' };
  }
}

/**
 * Get all worksheet submissions for a lesson (for teachers)
 */
export async function getLessonWorksheetGrades(
  classId: string,
  lessonId: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'Not authenticated' };
  }

  if (session.user.role !== 'TEACHER') {
    return { success: false, error: 'Only teachers can view grades' };
  }

  try {
    // Verify teacher owns the class
    const classData = await db.class.findUnique({
      where: { id: classId },
      select: { teacherId: true },
    });

    if (!classData || classData.teacherId !== session.user.id) {
      return { success: false, error: 'Unauthorized' };
    }

    // Get all students in the class
    const memberships = await db.classMembership.findMany({
      where: { classId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Get all worksheets in the lesson's packet
    const packet = await db.packet.findUnique({
      where: { lessonId },
      include: {
        items: {
          where: { itemType: 'WORKSHEET' },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!packet) {
      return { success: true, data: { students: [], worksheets: [] } };
    }

    // Get worksheet details
    const worksheetIds = packet.items.map(item => item.itemId);
    const worksheets = await db.material.findMany({
      where: { id: { in: worksheetIds } },
      select: {
        id: true,
        title: true,
      },
    });

    // Get all submissions for this lesson
    const submissions = await db.worksheetSubmission.findMany({
      where: {
        classId,
        lessonId,
        worksheetId: { in: worksheetIds },
      },
    });

    // Build grade matrix
    const students = memberships.map(membership => {
      const studentSubmissions = submissions.filter(
        sub => sub.userId === membership.user.id
      );

      const grades = worksheets.map(worksheet => {
        const submission = studentSubmissions.find(
          sub => sub.worksheetId === worksheet.id
        );

        return {
          worksheetId: worksheet.id,
          score: submission?.score || null,
          totalPoints: submission?.totalPoints || 0,
          submittedAt: submission?.submittedAt || null,
        };
      });

      return {
        id: membership.user.id,
        name: membership.user.name,
        email: membership.user.email,
        grades,
      };
    });

    return {
      success: true,
      data: {
        students,
        worksheets: worksheets.map(w => ({ id: w.id, title: w.title })),
      },
    };
  } catch (error) {
    console.error('Error getting lesson grades:', error);
    return { success: false, error: 'Failed to get grades' };
  }
}
