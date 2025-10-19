'use client';

import { useState } from 'react';

type Props = {
  pdfId: string;
  extractedText: string;
};

export default function WorksheetTab({ pdfId, extractedText }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [worksheet, setWorksheet] = useState<any>(null);

  async function handleGenerate() {
    setIsGenerating(true);
    // TODO: Implement worksheet generation with Gemini
    setTimeout(() => {
      setWorksheet({
        title: 'Sample Worksheet',
        questions: [
          { type: 'Multiple Choice', question: 'Example question 1?' },
          { type: 'Fill in the Blank', question: 'Complete the sentence: ___' },
        ],
      });
      setIsGenerating(false);
    }, 2000);
  }

  return (
    <div className="h-full flex flex-col p-6 bg-gray-900">
      {!worksheet ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-lg">
            <div className="text-6xl mb-6">📝</div>
            <h3 className="text-2xl font-bold text-blue-400 mb-3">Worksheet Generator</h3>
            <p className="text-gray-300 mb-6">
              Generate practice exercises and comprehension questions based on your PDF content.
              Perfect for classroom use or self-study.
            </p>

            <div className="space-y-4 mb-8">
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-left">
                <h4 className="font-medium text-gray-300 mb-2">Features:</h4>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>✓ Multiple choice questions</li>
                  <li>✓ Fill-in-the-blank exercises</li>
                  <li>✓ Comprehension questions</li>
                  <li>✓ Greek grammar exercises</li>
                  <li>✓ Printable format</li>
                </ul>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !extractedText}
              className="btn btn-primary btn-lg"
            >
              {isGenerating ? (
                <>
                  <span className="loading loading-spinner"></span>
                  Generating Worksheet...
                </>
              ) : (
                <>
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                  Generate Worksheet
                </>
              )}
            </button>

            {!extractedText && (
              <p className="text-sm text-error mt-4">
                No text extracted from this PDF. Please upload a text-based PDF.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto bg-gray-900">
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">{worksheet.title}</h3>
              <button className="btn btn-outline btn-sm" onClick={() => window.print()}>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                  />
                </svg>
                Print
              </button>
            </div>

            <div className="space-y-6">
              {worksheet.questions.map((q: any, idx: number) => (
                <div key={idx} className="border-l-4 border-blue-500 pl-4">
                  <span className="text-xs font-medium text-gray-400 uppercase">{q.type}</span>
                  <p className="text-lg mt-1 text-gray-200">{q.question}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex gap-3">
              <button onClick={() => setWorksheet(null)} className="btn btn-outline text-gray-300 hover:text-white hover:border-blue-500">
                Generate New
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
