'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Props = {
  pdfId: string;
  extractedText: string;
};

export default function LessonPlanTab({ pdfId, extractedText }: Props) {
  const [lessonPlan, setLessonPlan] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/generate-lesson-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfId, extractedText }),
      });

      const data = await response.json();

      if (data.success) {
        setLessonPlan(data.lessonPlan);
      } else {
        setError(data.error || 'Failed to generate lesson plan');
      }
    } catch (err) {
      setError('An error occurred while generating the lesson plan');
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleExportPDF() {
    // TODO: Implement PDF export
    alert('PDF export will be implemented soon!');
  }

  return (
    <div className="h-full flex flex-col p-6">
      {!lessonPlan ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 bg-secondary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold mb-3">Generate Lesson Plan</h3>
            <p className="text-base-content/70 mb-6">
              Create a structured lesson plan with objectives, activities, and assessments
            </p>
            {error && (
              <div className="alert alert-error mb-4">
                <span>{error}</span>
              </div>
            )}
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className={`btn btn-secondary btn-lg ${isGenerating ? 'loading' : ''}`}
            >
              {isGenerating ? 'Generating...' : 'Generate Lesson Plan'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <div className="prose prose-lg max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {lessonPlan}
            </ReactMarkdown>
          </div>
          <div className="mt-6 flex gap-3">
            <button onClick={handleExportPDF} className="btn btn-primary">
              Export as PDF
            </button>
            <button onClick={handleGenerate} className="btn btn-secondary">
              Regenerate
            </button>
            <button onClick={() => setLessonPlan('')} className="btn btn-ghost">
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
