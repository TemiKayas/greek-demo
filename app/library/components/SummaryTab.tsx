'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Props = {
  pdfId: string;
  extractedText: string;
};

export default function SummaryTab({ pdfId, extractedText }: Props) {
  const [summary, setSummary] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/generate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfId, extractedText }),
      });

      const data = await response.json();

      if (data.success) {
        setSummary(data.summary);
      } else {
        setError(data.error || 'Failed to generate summary');
      }
    } catch (err) {
      setError('An error occurred while generating the summary');
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="h-full flex flex-col p-6">
      {!summary ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold mb-3">Generate Summary</h3>
            <p className="text-base-content/70 mb-6">
              Create a concise summary of the key points from this PDF
            </p>
            {error && (
              <div className="alert alert-error mb-4">
                <span>{error}</span>
              </div>
            )}
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className={`btn btn-primary btn-lg ${isGenerating ? 'loading' : ''}`}
            >
              {isGenerating ? 'Generating...' : 'Generate Summary'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <div className="prose prose-lg max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {summary}
            </ReactMarkdown>
          </div>
          <div className="mt-6 flex gap-3">
            <button onClick={handleGenerate} className="btn btn-primary">
              Regenerate
            </button>
            <button onClick={() => setSummary('')} className="btn btn-ghost">
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
