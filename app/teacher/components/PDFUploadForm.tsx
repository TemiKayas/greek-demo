'use client';

import { useState, useTransition } from 'react';
import { uploadAndProcessPDF } from '@/app/actions/pdf';
import { Quiz } from '@/lib/processors/ai-generator';
import FileUploadDropZone from '@/components/fileupload/FileUploadDropZone';
import StepIndicator from '@/components/fileupload/StepIndicator';

interface PDFUploadFormProps {
  onQuizGenerated: (quiz: Quiz) => void;
  onFileSelect?: (file: File | null) => void;
}

export default function PDFUploadForm({ onQuizGenerated, onFileSelect }: PDFUploadFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [progress, setProgress] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [numQuestions, setNumQuestions] = useState<number>(5);

  async function handleFileSelect(file: File) {
    setSelectedFile(file);
    setError(null);
    onFileSelect?.(file);
  }

  async function handleSubmit() {
    if (!selectedFile) {
      setError('Please select a PDF file');
      return;
    }

    setError(null);
    setProgress('Uploading PDF...');

    const formData = new FormData();
    formData.append('pdf', selectedFile);
    formData.append('numQuestions', numQuestions.toString());

    startTransition(async () => {
      try {
        const result = await uploadAndProcessPDF(formData);

        if (!result.success) {
          setError(result.error);
          setProgress('');
        } else {
          setProgress('Quiz generated successfully!');
          onQuizGenerated(result.data.quiz);
          setSelectedFile(null);
          setTimeout(() => setProgress(''), 3000);
        }
      } catch {
        setError('An unexpected error occurred');
        setProgress('');
      }
    });
  }

  return (
    <div className="w-full">
      {/* Step Indicator */}
      <div className="mb-6 animate-fade-in flex justify-center">
        <StepIndicator step={1} title="Upload your PDF" />
      </div>

      {/* Progress and Error Messages */}
      {progress && (
        <div className="mb-4 p-3 bg-[#96b902]/10 border-2 border-[#96b902] rounded-lg animate-slide-up">
          <p className="text-[#7a9700] font-semibold text-center text-sm">{progress}</p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-100 border-2 border-error rounded-lg animate-slide-up">
          <p className="text-error font-semibold text-center text-sm">{error}</p>
        </div>
      )}

      {/* File Upload Drop Zone */}
      <div className="mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <FileUploadDropZone
          onFileSelect={handleFileSelect}
          disabled={isPending}
          maxSizeMB={25}
        />
      </div>

      {/* Selected File Info */}
      {selectedFile && !isPending && (
        <div className="mb-4 p-3 bg-[#fff6e8] border-2 border-[#ff9f22] rounded-lg animate-fade-in">
          <p className="text-[#473025] font-semibold text-sm">
            Selected: <span className="text-[#ff9f22]">{selectedFile.name}</span>
          </p>
          <p className="text-[#473025] text-xs">
            Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>
      )}

      {/* Number of Questions */}
      <div className="mb-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <label
          htmlFor="numQuestions"
          className="block text-[#473025] font-bold text-base mb-2"
        >
          Number of Questions
        </label>
        <select
          id="numQuestions"
          value={numQuestions}
          onChange={(e) => setNumQuestions(Number(e.target.value))}
          disabled={isPending}
          className="w-full px-3 py-2 bg-[#fff6e8] border-2 border-[#473025] rounded-lg font-semibold text-[#473025] text-sm focus:ring-4 focus:ring-[#96b902]/30 focus:border-[#96b902] transition-all disabled:opacity-50"
        >
          <option value="3">3 questions</option>
          <option value="5">5 questions</option>
          <option value="10">10 questions</option>
          <option value="15">15 questions</option>
        </select>
      </div>

      {/* Generate Quiz Button */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending || !selectedFile}
        className="w-full px-5 py-3 bg-[#96b902] hover:bg-[#7a9700] text-[#fffdfa] text-lg font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:bg-gray-400 disabled:cursor-not-allowed active:scale-95 animate-slide-up"
        style={{ animationDelay: '0.3s' }}
      >
        {isPending ? 'Processing PDF...' : 'Generate Quiz'}
      </button>
    </div>
  );
}
