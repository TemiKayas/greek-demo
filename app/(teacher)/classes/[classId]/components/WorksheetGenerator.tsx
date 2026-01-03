'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

const loadingMessages = [
  'Analyzing class materials...',
  'Identifying key concepts...',
  'Drafting questions...',
  'Adding variety (True/False, Multiple Choice)...',
  'Finalizing worksheet structure...',
  'Almost there...',
];

type WorksheetData = {
  title: string;
  questions: Array<{
    question_text: string;
    type: 'multiple_choice' | 'true_false' | 'short_answer' | 'paragraph';
    options?: string[];
    right_answer: string | null;
  }>;
};

type WorksheetGeneratorProps = {
  onWorksheetGenerated: (data: WorksheetData) => void;
};

export function WorksheetGenerator({ onWorksheetGenerated }: WorksheetGeneratorProps) {
  const params = useParams();
  const classId = params?.classId as string;
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (generating) {
      interval = setInterval(() => {
        setCurrentMessageIndex((prevIndex) => (prevIndex + 1) % loadingMessages.length);
      }, 2000); // Change message every 2 seconds
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [generating]);

  async function handleGenerate() {
    if (!prompt.trim()) {
      setError('Please enter a prompt for the worksheet.');
      return;
    }
    setError(null);
    setGenerating(true);
    setCurrentMessageIndex(0);

    try {
      const response = await fetch('/api/worksheet/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ classId, prompt, skipSave: true }), // Don't save yet, just generate
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate worksheet');
      }

      const result = await response.json();
      onWorksheetGenerated(result.worksheetData); // Pass data to preview
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="prompt" className="block text-sm font-medium text-base-content mb-2">
          Worksheet Prompt
        </label>
        <textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="textarea textarea-bordered w-full h-32 bg-base-100 text-base-content border-base-300 focus:border-primary focus:outline-none"
          placeholder="e.g., 'Create a 10-question worksheet about the process of photosynthesis, including multiple choice and short answer questions.'"
          disabled={generating}
        />
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {generating ? (
        <div className="text-center p-4">
          <span className="loading loading-spinner loading-lg text-primary mb-4"></span>
          <p className="text-base-content">
            {loadingMessages[currentMessageIndex]}
          </p>
        </div>
      ) : (
        <div className="flex justify-end">
          <button
            className="btn btn-primary"
            onClick={handleGenerate}
            disabled={generating}
          >
            Generate Worksheet
          </button>
        </div>
      )}
    </div>
  );
}
