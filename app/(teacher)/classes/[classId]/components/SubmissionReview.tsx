'use client';

import React, { useState, useEffect } from 'react';

type Question = {
  question_text: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'paragraph';
  options?: string[];
  right_answer: string | null;
};

type WorksheetData = {
  title: string;
  questions: Question[];
};

type SubmissionReviewProps = {
  submission: {
    id: string;
    student: {
      name: string;
    };
    answers: Record<number, string>;
  };
  worksheet: {
      id: string;
      title: string;
      filePath: string;
  };
  onBack: () => void;
};

export function SubmissionReview({ submission, worksheet, onBack }: SubmissionReviewProps) {
  const [worksheetData, setWorksheetData] = useState<WorksheetData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWorksheet() {
      setLoading(true);
      try {
        const response = await fetch(worksheet.filePath);
        const data = await response.json();
        setWorksheetData(data);
      } catch (error) {
        console.error('Failed to fetch worksheet:', error);
      }
      setLoading(false);
    }
    fetchWorksheet();
  }, [worksheet.filePath]);

  if (loading) {
    return <div className="text-center p-8"><span className="loading loading-spinner loading-lg"></span></div>;
  }

  if (!worksheetData) {
    return <div className="alert alert-error">Failed to load worksheet details.</div>;
  }

  return (
    <div className="card bg-base-200 shadow-xl">
      <div className="card-body">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="card-title text-primary-content">Reviewing Submission</h2>
            <p className="text-primary-content/80">Student: {submission.student.name}</p>
          </div>
          <button onClick={onBack} className="btn btn-outline">← Back to Submissions</button>
        </div>

        <div className="space-y-6">
          {worksheetData.questions.map((q, index) => {
            const studentAnswer = submission.answers[index] || 'No answer';
            let isCorrect = false;
            if (q.right_answer) {
              if (q.type === 'short_answer') {
                isCorrect = studentAnswer.trim().toLowerCase() === q.right_answer.trim().toLowerCase();
              } else {
                isCorrect = studentAnswer === q.right_answer;
              }
            }
            return (
              <div key={index} className="border border-base-content/20 rounded-lg p-4">
                <p className="font-semibold text-lg">{index + 1}. {q.question_text}</p>
                
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-bold">Student's Answer</h4>
                    <p className={`p-2 rounded ${
                      q.type === 'paragraph' ? '' : (isCorrect ? 'bg-success/20 text-success-content' : 'bg-error/20 text-error-content')
                    }`}>
                      {studentAnswer}
                    </p>
                  </div>
                  {q.type !== 'paragraph' && (
                    <div>
                      <h4 className="font-bold">Correct Answer</h4>
                      <p className="p-2 rounded bg-info/20 text-info-content">{q.right_answer || 'N/A'}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
