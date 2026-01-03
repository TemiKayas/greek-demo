'use client';

import React, { useState } from 'react';

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

type WorksheetPreviewProps = {
  initialData: WorksheetData;
  classId: string;
  onSave: (data: WorksheetData) => Promise<void>;
  onCancel: () => void;
  isNewWorksheet: boolean; // true if editing before first save, false if editing existing
};

export function WorksheetPreview({
  initialData,
  classId,
  onSave,
  onCancel,
  isNewWorksheet
}: WorksheetPreviewProps) {
  const [worksheetData, setWorksheetData] = useState<WorksheetData>(initialData);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
  const [regeneratePrompt, setRegeneratePrompt] = useState('');
  const [saving, setSaving] = useState(false);

  function handleTitleChange(newTitle: string) {
    setWorksheetData(prev => ({ ...prev, title: newTitle }));
  }

  function handleQuestionTextChange(index: number, newText: string) {
    setWorksheetData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) =>
        i === index ? { ...q, question_text: newText } : q
      ),
    }));
  }

  function handleOptionChange(questionIndex: number, optionIndex: number, newValue: string) {
    setWorksheetData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => {
        if (i === questionIndex && q.options) {
          const newOptions = [...q.options];
          newOptions[optionIndex] = newValue;
          return { ...q, options: newOptions };
        }
        return q;
      }),
    }));
  }

  function handleCorrectAnswerChange(questionIndex: number, newAnswer: string) {
    setWorksheetData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) =>
        i === questionIndex ? { ...q, right_answer: newAnswer } : q
      ),
    }));
  }

  function addOption(questionIndex: number) {
    setWorksheetData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => {
        if (i === questionIndex && q.options) {
          return { ...q, options: [...q.options, ''] };
        }
        return q;
      }),
    }));
  }

  function removeOption(questionIndex: number, optionIndex: number) {
    setWorksheetData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => {
        if (i === questionIndex && q.options) {
          const newOptions = q.options.filter((_, oi) => oi !== optionIndex);
          return { ...q, options: newOptions };
        }
        return q;
      }),
    }));
  }

  function deleteQuestion(questionIndex: number) {
    setWorksheetData(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== questionIndex),
    }));
  }

  async function handleRegenerateQuestion(questionIndex: number) {
    if (!regeneratePrompt.trim()) {
      alert('Please enter a prompt for regenerating this question');
      return;
    }

    setRegeneratingIndex(questionIndex);

    try {
      const response = await fetch('/api/worksheet/regenerate-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId,
          prompt: regeneratePrompt,
          currentQuestion: worksheetData.questions[questionIndex],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to regenerate question');
      }

      const result = await response.json();
      const newQuestion = result.question;

      setWorksheetData(prev => ({
        ...prev,
        questions: prev.questions.map((q, i) =>
          i === questionIndex ? newQuestion : q
        ),
      }));

      setRegeneratingIndex(null);
      setRegeneratePrompt('');
      alert('Question regenerated successfully!');
    } catch (error) {
      console.error('Error regenerating question:', error);
      alert('Failed to regenerate question. Please try again.');
      setRegeneratingIndex(null);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(worksheetData);
    } catch (error) {
      console.error('Error saving worksheet:', error);
      alert('Failed to save worksheet. Please try again.');
    }
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <label className="block text-sm font-medium text-base-content mb-2">
            Worksheet Title
          </label>
          <input
            type="text"
            value={worksheetData.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="input input-bordered w-full max-w-md bg-base-100 text-base-content"
          />
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="btn btn-ghost">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className={`btn btn-primary ${saving ? 'loading' : ''}`}
            disabled={saving}
          >
            {saving ? 'Saving...' : (isNewWorksheet ? 'Publish Worksheet' : 'Save Changes')}
          </button>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-6">
        {worksheetData.questions.map((question, qIndex) => (
          <div key={qIndex} className="card bg-base-100 border border-base-300 shadow-md">
            <div className="card-body">
              {/* Question Header */}
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-base-content">Question {qIndex + 1}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingQuestionIndex(editingQuestionIndex === qIndex ? null : qIndex)}
                    className="btn btn-sm btn-ghost"
                  >
                    {editingQuestionIndex === qIndex ? '✓ Done' : '✏️ Edit'}
                  </button>
                  <button
                    onClick={() => deleteQuestion(qIndex)}
                    className="btn btn-sm btn-ghost text-error"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>

              {/* Question Text */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-base-content mb-2">
                  Question Text
                </label>
                <textarea
                  value={question.question_text}
                  onChange={(e) => handleQuestionTextChange(qIndex, e.target.value)}
                  className="textarea textarea-bordered w-full bg-base-100 text-base-content"
                  rows={3}
                  disabled={editingQuestionIndex !== qIndex}
                />
              </div>

              {/* Question Type Badge */}
              <div className="badge badge-outline mb-4">
                {question.type.replace('_', ' ').toUpperCase()}
              </div>

              {/* Multiple Choice Options */}
              {question.type === 'multiple_choice' && question.options && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-base-content">
                    Answer Options
                  </label>
                  {question.options.map((option, oIndex) => (
                    <div key={oIndex} className="flex gap-2 items-center">
                      <input
                        type="radio"
                        name={`correct-${qIndex}`}
                        checked={question.right_answer === option}
                        onChange={() => handleCorrectAnswerChange(qIndex, option)}
                        className="radio radio-sm radio-primary"
                        disabled={editingQuestionIndex !== qIndex}
                      />
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                        className="input input-sm input-bordered flex-1 bg-base-100 text-base-content"
                        placeholder={`Option ${oIndex + 1}`}
                        disabled={editingQuestionIndex !== qIndex}
                      />
                      {editingQuestionIndex === qIndex && question.options && question.options.length > 2 && (
                        <button
                          onClick={() => removeOption(qIndex, oIndex)}
                          className="btn btn-sm btn-ghost text-error"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  {editingQuestionIndex === qIndex && (
                    <button
                      onClick={() => addOption(qIndex)}
                      className="btn btn-sm btn-ghost"
                    >
                      + Add Option
                    </button>
                  )}
                  <p className="text-sm text-base-content/60">
                    ✓ Select the correct answer by clicking the radio button
                  </p>
                </div>
              )}

              {/* True/False */}
              {question.type === 'true_false' && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-base-content">
                    Correct Answer
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`correct-${qIndex}`}
                        checked={question.right_answer === 'True'}
                        onChange={() => handleCorrectAnswerChange(qIndex, 'True')}
                        className="radio radio-primary"
                        disabled={editingQuestionIndex !== qIndex}
                      />
                      <span className="text-base-content">True</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`correct-${qIndex}`}
                        checked={question.right_answer === 'False'}
                        onChange={() => handleCorrectAnswerChange(qIndex, 'False')}
                        className="radio radio-error"
                        disabled={editingQuestionIndex !== qIndex}
                      />
                      <span className="text-base-content">False</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Short Answer */}
              {question.type === 'short_answer' && (
                <div>
                  <label className="block text-sm font-medium text-base-content mb-2">
                    Expected Answer (optional)
                  </label>
                  <input
                    type="text"
                    value={question.right_answer || ''}
                    onChange={(e) => handleCorrectAnswerChange(qIndex, e.target.value)}
                    className="input input-bordered w-full bg-base-100 text-base-content"
                    placeholder="Enter expected answer or leave blank for manual grading"
                    disabled={editingQuestionIndex !== qIndex}
                  />
                </div>
              )}

              {/* Paragraph - No answer needed */}
              {question.type === 'paragraph' && (
                <p className="text-sm text-base-content/60 italic">
                  Long-form answer - will be manually graded
                </p>
              )}

              {/* Regenerate Question */}
              {editingQuestionIndex === qIndex && (
                <div className="mt-4 pt-4 border-t border-base-300">
                  <label className="block text-sm font-medium text-base-content mb-2">
                    Regenerate This Question
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={regeneratePrompt}
                      onChange={(e) => setRegeneratePrompt(e.target.value)}
                      className="input input-bordered flex-1 bg-base-100 text-base-content"
                      placeholder="e.g., 'Make it harder' or 'Focus on vocabulary'"
                      disabled={regeneratingIndex === qIndex}
                    />
                    <button
                      onClick={() => handleRegenerateQuestion(qIndex)}
                      className={`btn btn-primary ${regeneratingIndex === qIndex ? 'loading' : ''}`}
                      disabled={regeneratingIndex === qIndex || !regeneratePrompt.trim()}
                    >
                      {regeneratingIndex === qIndex ? 'Regenerating...' : 'Regenerate'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {worksheetData.questions.length === 0 && (
        <div className="text-center py-12 text-base-content/60">
          No questions in this worksheet. All questions were deleted.
        </div>
      )}
    </div>
  );
}
