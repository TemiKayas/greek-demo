'use client';

import { useState, useEffect } from 'react';
import { uploadMultipleClassFiles } from '@/app/actions/fileUpload';

type UploadStage = 'idle' | 'validating' | 'uploading' | 'creating' | 'processing' | 'complete';

interface FileUploadSectionProps {
  classId: string;
  onUploadComplete?: () => void;
}

export function FileUploadSection({ classId, onUploadComplete }: FileUploadSectionProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState<UploadStage>('idle');
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

  // Block navigation during upload
  useEffect(() => {
    if (!uploading) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Upload in progress. Are you sure you want to leave?';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [uploading]);

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setUploading(true);
    setUploadStage('validating');

    // Store form reference before async operation (React synthetic events are pooled)
    const form = e.currentTarget;

    try {
      const formData = new FormData(form);

      console.log('[UI] Starting file upload...');
      console.log('[UI] FormData files:', formData.getAll('files'));

      // Simulate stage progression for better UX
      // (In reality, server does all at once, but we show stages)
      setUploadStage('validating');
      await new Promise(resolve => setTimeout(resolve, 500));

      setUploadStage('uploading');
      const uploadStartTime = Date.now();

      const result = await uploadMultipleClassFiles(classId, formData);

      const uploadDuration = Date.now() - uploadStartTime;

      // Show creating/processing stages if upload was quick
      if (uploadDuration < 2000) {
        setUploadStage('creating');
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      console.log('[UI] Upload result:', result);

      if (result.success) {
        const { uploadedFiles } = result.data;

        setUploadStage('processing');
        await new Promise(resolve => setTimeout(resolve, 300));

        // Show success message (in atomic mode, all succeed or all fail)
        if (uploadedFiles.length > 0) {
          setSuccess(
            `✅ Successfully uploaded all ${uploadedFiles.length} file(s)! Processing in background...`
          );
          setUploadStage('complete');
          form.reset();
          setSelectedFiles([]);
        }

        onUploadComplete?.();
      } else {
        console.error('[UI] Upload failed:', result.error);
        setError(result.error);
        setUploadStage('idle');
      }
    } catch (err) {
      console.error('[UI] Upload exception:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to upload files: ${errorMessage}`);
      setUploadStage('idle');
    } finally {
      setUploading(false);
      // Reset to idle after showing complete
      setTimeout(() => setUploadStage('idle'), 2000);
    }
  }

  return (
    <div className="card bg-base-200 p-6">
      <h3 className="text-lg font-semibold mb-4">Upload Class Materials</h3>
      <p className="text-sm text-gray-600 mb-4">
        Upload PDF, DOCX, or TXT files. You can select multiple files at once.
        <span className="font-semibold text-primary"> All files must succeed or the entire upload will be cancelled.</span>
      </p>

      <form onSubmit={handleUpload}>
        <div className="form-control">
          <label className="label">
            <span className="label-text">Select files (PDF, DOCX, TXT - max 50MB each, 250MB total)</span>
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

        {/* Upload Stage Progress */}
        {uploading && (
          <div className="mt-4 p-4 bg-base-300 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <span className="loading loading-spinner loading-md text-primary"></span>
              <div className="flex-1">
                <p className="font-semibold text-primary-content">
                  {uploadStage === 'validating' && '🔍 Validating files...'}
                  {uploadStage === 'uploading' && '📤 Uploading to storage...'}
                  {uploadStage === 'creating' && '💾 Creating database records...'}
                  {uploadStage === 'processing' && '⚙️ Starting background processing...'}
                  {uploadStage === 'complete' && '✅ Upload complete!'}
                </p>
                <p className="text-sm text-primary-content/70">
                  {uploadStage === 'validating' && 'Checking file types and sizes...'}
                  {uploadStage === 'uploading' && 'Transferring files to cloud storage...'}
                  {uploadStage === 'creating' && 'Saving file information...'}
                  {uploadStage === 'processing' && 'Files will be processed shortly...'}
                  {uploadStage === 'complete' && 'All files uploaded successfully!'}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-base-100 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-500"
                style={{
                  width: uploadStage === 'validating' ? '25%' :
                         uploadStage === 'uploading' ? '50%' :
                         uploadStage === 'creating' ? '75%' :
                         uploadStage === 'processing' ? '90%' :
                         '100%'
                }}
              ></div>
            </div>

            <p className="text-xs text-warning mt-3 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Do not close this page or navigate away
            </p>
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
              Processing...
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
