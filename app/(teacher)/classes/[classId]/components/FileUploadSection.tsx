'use client';

import { useState } from 'react';
import { uploadClassFile } from '@/app/actions/fileUpload';

interface FileUploadSectionProps {
  classId: string;
  onUploadComplete?: () => void;
}

export function FileUploadSection({ classId, onUploadComplete }: FileUploadSectionProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setUploading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const result = await uploadClassFile(classId, formData);

      if (result.success) {
        e.currentTarget.reset();
        onUploadComplete?.();
        alert('File uploaded successfully! Processing in background...');
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to upload file');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="card bg-base-200 p-6">
      <h3 className="text-lg font-semibold mb-4">Upload Class Materials</h3>
      <p className="text-sm text-gray-600 mb-4">
        Upload PDF, DOCX, or TXT files. Files will be processed and made available to students for chatting.
      </p>

      <form onSubmit={handleUpload}>
        <div className="form-control">
          <label className="label">
            <span className="label-text">Select file (PDF, DOCX, TXT - max 25MB)</span>
          </label>
          <input
            type="file"
            name="file"
            accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            className="file-input file-input-bordered w-full"
            required
            disabled={uploading}
          />
        </div>

        {error && (
          <div className="alert alert-error mt-4">
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary mt-4 w-full"
          disabled={uploading}
        >
          {uploading ? (
            <>
              <span className="loading loading-spinner"></span>
              Uploading...
            </>
          ) : (
            'Upload File'
          )}
        </button>
      </form>

      <div className="text-sm text-gray-500 mt-4">
        <p><strong>Supported formats:</strong></p>
        <ul className="list-disc list-inside">
          <li>PDF (.pdf) - Documents and textbooks</li>
          <li>Word (.docx) - Microsoft Word documents</li>
          <li>Text (.txt) - Plain text files</li>
        </ul>
      </div>
    </div>
  );
}
