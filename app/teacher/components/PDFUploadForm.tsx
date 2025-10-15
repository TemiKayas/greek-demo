'use client';

import { useState, useTransition } from 'react';
import { uploadAndProcessPDF } from '@/app/actions/pdf';

interface PDFUploadFormProps {
  onQuizGenerated: (quiz: any) => void;
}

export default function PDFUploadForm({ onQuizGenerated }: PDFUploadFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [progress, setProgress] = useState<string>('');

  async function handleSubmit(formData: FormData) {
    setError(null);
    setProgress('Uploading PDF...');

    startTransition(async () => {
      try {
        const result = await uploadAndProcessPDF(formData);

        if (!result.success) {
          setError(result.error);
          setProgress('');
        } else {
          setProgress('Quiz generated successfully!');
          onQuizGenerated(result.data.quiz);
          // Reset form
          const form = document.getElementById('pdf-form') as HTMLFormElement;
          form?.reset();
          setTimeout(() => setProgress(''), 3000);
        }
      } catch (err) {
        setError('An unexpected error occurred');
        setProgress('');
      }
    });
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">Upload PDF to Generate Quiz</h2>

      <form id="pdf-form" action={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}

        {progress && (
          <div className="p-3 bg-blue-50 border border-blue-200 text-blue-600 rounded-lg text-sm">
            {progress}
          </div>
        )}

        <div>
          <label
            htmlFor="pdf"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Select PDF File
          </label>
          <input
            type="file"
            id="pdf"
            name="pdf"
            accept=".pdf"
            required
            disabled={isPending}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
          />
          <p className="mt-1 text-xs text-gray-500">Max file size: 25MB</p>
        </div>

        <div>
          <label
            htmlFor="numQuestions"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Number of Questions
          </label>
          <select
            id="numQuestions"
            name="numQuestions"
            defaultValue="5"
            disabled={isPending}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          >
            <option value="3">3 questions</option>
            <option value="5">5 questions</option>
            <option value="10">10 questions</option>
            <option value="15">15 questions</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isPending ? 'Processing PDF...' : 'Upload and Generate Quiz'}
        </button>
      </form>
    </div>
  );
}
