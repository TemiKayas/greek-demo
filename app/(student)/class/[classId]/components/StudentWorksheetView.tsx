'use client';

import React, { useState, useEffect } from 'react';
import { submitWorksheet } from '@/app/actions/worksheet';

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

type StudentWorksheetViewProps = {
  worksheet: {
    id: string;
    title: string;
    filePath: string;
  };
  onBack: () => void;
};

export function StudentWorksheetView({ worksheet, onBack }: StudentWorksheetViewProps) {
  const [worksheetData, setWorksheetData] = useState<WorksheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);

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

  function handleAnswerChange(questionIndex: number, answer: string) {
    setAnswers(prev => ({ ...prev, [questionIndex]: answer }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    const result = await submitWorksheet(worksheet.id, answers);
    setSubmitting(false);

    if (result.success) {
      alert('Worksheet submitted successfully!');
      onBack();
    } else {
      alert(`Submission failed: ${result.error}`);
    }
  }

  if (loading) {
    return <div className="text-center p-8"><span className="loading loading-spinner loading-lg"></span></div>;
  }

  if (!worksheetData) {
    return <div className="alert alert-error">Failed to load worksheet.</div>;
  }

  return (
    <div className="p-4">
      <button onClick={onBack} className="btn btn-outline mb-4">← Back to List</button>
      <h2 className="text-3xl font-bold mb-6">{worksheetData.title}</h2>

      <div className="space-y-8">
        {worksheetData.questions.map((q, index) => (
          <div key={index} className="card bg-base-200 shadow-md">
            <div className="card-body">
              <p className="font-semibold text-lg">{index + 1}. {q.question_text}</p>
              
              {q.type === 'multiple_choice' && q.options && (
                <div className="space-y-2 mt-2">
                  {q.options.map((option, i) => (
                    <div key={i} className="form-control">
                      <label className="label cursor-pointer">
                        <span className="label-text">{option}</span>
                        <input
                          type="radio"
                          name={`question-${index}`}
                          className="radio checked:bg-primary"
                          value={option}
                          onChange={(e) => handleAnswerChange(index, e.target.value)}
                        />
                      </label>
                    </div>
                  ))}
                </div>
              )}

              {q.type === 'true_false' && (
                <div className="space-y-2 mt-2">
                  <div className="form-control">
                    <label className="label cursor-pointer">
                      <span className="label-text">True</span>
                      <input type="radio" name={`question-${index}`} className="radio checked:bg-primary" value="True" onChange={(e) => handleAnswerChange(index, e.target.value)} />
                    </label>
                  </div>
                  <div className="form-control">
                    <label className="label cursor-pointer">
                      <span className="label-text">False</span>
                      <input type="radio" name={`question-${index}`} className="radio checked:bg-error" value="False" onChange={(e) => handleAnswerChange(index, e.target.value)} />
                    </label>
                  </div>
                </div>
              )}

              {q.type === 'short_answer' && (
                <input
                  type="text"
                  className="input input-bordered w-full mt-2"
                  onChange={(e) => handleAnswerChange(index, e.target.value)}
                />
              )}

              {q.type === 'paragraph' && (
                <textarea
                  className="textarea textarea-bordered w-full h-32 mt-2"
                  onChange={(e) => handleAnswerChange(index, e.target.value)}
                ></textarea>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-end">
        <button
          className={`btn btn-primary ${submitting ? 'loading' : ''}`}
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? 'Submitting...' : 'Submit Worksheet'}
        </button>
      </div>
    </div>
  );
}
