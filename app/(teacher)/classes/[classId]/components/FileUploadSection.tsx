'use client';

import { useState } from 'react';
import { uploadMultipleClassFiles } from '@/app/actions/fileUpload';

interface FileUploadSectionProps {
  classId: string;
  onUploadComplete?: () => void;
}

export function FileUploadSection({ classId, onUploadComplete }: FileUploadSectionProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
      setError(null);
      setSuccess(null);
    }
  }

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setUploading(true);

    // Store form reference before async operation (React synthetic events are pooled)
    const form = e.currentTarget;

    try {
      const formData = new FormData(form);

      console.log('[UI] Starting file upload...');
      console.log('[UI] FormData files:', formData.getAll('files'));

      const result = await uploadMultipleClassFiles(classId, formData);

      console.log('[UI] Upload result:', result);

      if (result.success) {
        const { uploadedFiles, failedFiles } = result.data;

        // Show success message
        if (uploadedFiles.length > 0) {
          setSuccess(
            `Successfully uploaded ${uploadedFiles.length} file(s)! Processing in background...`
          );
        }

        // Show errors for failed files
        if (failedFiles.length > 0) {
          const failedNames = failedFiles.map(f => `${f.fileName}: ${f.error}`).join(', ');
          setError(`Some files failed to upload: ${failedNames}`);
        }

        // Reset form if all files succeeded
        if (failedFiles.length === 0) {
          form.reset();
          setSelectedFiles([]);
        }

        onUploadComplete?.();
      } else {
        console.error('[UI] Upload failed:', result.error);
        setError(result.error);
      }
    } catch (err) {
      console.error('[UI] Upload exception:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to upload files: ${errorMessage}`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="card bg-base-200 p-6">
      <h3 className="text-lg font-semibold mb-4">Upload Class Materials</h3>
      <p className="text-sm text-gray-600 mb-4">
        Upload PDF, DOCX, or TXT files. You can select multiple files at once. Files will be processed and made available to students for chatting.
      </p>

      <form onSubmit={handleUpload}>
        <div className="form-control">
          <label className="label">
            <span className="label-text">Select files (PDF, DOCX, TXT - max 25MB each)</span>
          </label>
          <input
            type="file"
            name="files"
            accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            className="file-input file-input-bordered w-full"
            required
            disabled={uploading}
            multiple
            onChange={handleFileSelect}
          />
          {selectedFiles.length > 0 && (
            <label className="label">
              <span className="label-text-alt text-success">
                {selectedFiles.length} file(s) selected
              </span>
            </label>
          )}
        </div>

        {success && (
          <div className="alert alert-success mt-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{success}</span>
          </div>
        )}

        {error && (
          <div className="alert alert-error mt-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary mt-4 w-full"
          disabled={uploading || selectedFiles.length === 0}
        >
          {uploading ? (
            <>
              <span className="loading loading-spinner"></span>
              Uploading {selectedFiles.length} file(s)...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload {selectedFiles.length > 0 ? `${selectedFiles.length} File(s)` : 'Files'}
            </>
          )}
        </button>
      </form>

      <div className="divider"></div>

      <div className="text-sm text-gray-500">
        <p className="font-semibold mb-2">Supported formats:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>PDF (.pdf) - Documents and textbooks</li>
          <li>Word (.docx) - Microsoft Word documents</li>
          <li>Text (.txt) - Plain text files</li>
        </ul>
        <p className="mt-3 text-xs text-gray-400">
          💡 Tip: Hold Ctrl/Cmd to select multiple files at once
        </p>
      </div>
    </div>
  );
}
