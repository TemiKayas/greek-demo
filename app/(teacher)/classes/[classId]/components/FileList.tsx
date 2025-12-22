'use client';

import { useEffect, useState, useCallback } from 'react';
import { getClassFiles, deleteClassFile, retryFileProcessing } from '@/app/actions/fileUpload';

interface FileListProps {
  classId: string;
  refreshTrigger?: number;
}

type FileStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

interface ClassFile {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  blobUrl: string;
  status: FileStatus;
  errorMessage: string | null;
  createdAt: Date;
  _count: {
    chunks: number;
  };
}

export function FileList({ classId, refreshTrigger }: FileListProps) {
  const [files, setFiles] = useState<ClassFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    const result = await getClassFiles(classId);
    if (result.success) {
      setFiles(result.data);
    }
    setLoading(false);
  }, [classId]);

  useEffect(() => {
    loadFiles();
  }, [classId, refreshTrigger, loadFiles]);

  async function handleDelete(fileId: string, fileName: string) {
    if (!confirm(`Delete "${fileName}"? This will remove all associated data and cannot be undone.`)) {
      return;
    }

    setDeleting(fileId);
    const result = await deleteClassFile(fileId);
    if (result.success) {
      loadFiles();
    } else {
      alert(`Error: ${result.error}`);
    }
    setDeleting(null);
  }

  async function handleRetry(fileId: string) {
    const result = await retryFileProcessing(fileId);
    if (result.success) {
      loadFiles();
      alert('Processing restarted');
    } else {
      alert(`Error: ${result.error}`);
    }
  }

  function getStatusBadge(status: FileStatus) {
    const styles = {
      PENDING: 'badge-info',
      PROCESSING: 'badge-warning',
      COMPLETED: 'badge-success',
      FAILED: 'badge-error',
    };
    return `badge ${styles[status]}`;
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function getFileTypeDisplay(mimeType: string): string {
    if (mimeType.includes('pdf')) return 'PDF';
    if (mimeType.includes('word') || mimeType.includes('docx')) return 'Word';
    if (mimeType.includes('text')) return 'Text';
    return 'File';
  }

  if (loading) {
    return (
      <div className="card bg-base-200 p-6">
        <div className="flex justify-center items-center py-8">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-200 p-6">
      <h3 className="text-lg font-semibold mb-4 text-primary-content">Uploaded Files</h3>

      {files.length === 0 ? (
        <div className="text-center py-8 text-primary-content/80">
          <p className="text-lg mb-2">No files uploaded yet</p>
          <p className="text-sm text-primary-content/70">Upload files above to get started</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr className="text-primary-content border-primary-content/20">
                <th className="text-primary-content">File Name</th>
                <th className="text-primary-content">Type</th>
                <th className="text-primary-content">Size</th>
                <th className="text-primary-content">Status</th>
                <th className="text-primary-content">Chunks</th>
                <th className="text-primary-content">Uploaded</th>
                <th className="text-primary-content">Actions</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr key={file.id} className="border-primary-content/10 hover:bg-base-300">
                  <td className="text-primary-content">
                    <div className="font-medium">{file.fileName}</div>
                  </td>
                  <td className="text-primary-content/80">{getFileTypeDisplay(file.fileType)}</td>
                  <td className="text-primary-content/80">{formatFileSize(file.fileSize)}</td>
                  <td className="flex items-center space-x-2">
                    {file.status === 'PENDING' && (
                      <span className="text-primary-content/50 tooltip tooltip-right" data-tip="Pending processing">
                        ● {/* Small circle */}
                      </span>
                    )}
                    {file.status === 'PROCESSING' && (
                      <span className="loading loading-spinner loading-sm text-info tooltip tooltip-right" data-tip="Processing file..."></span>
                    )}
                    {file.status === 'COMPLETED' && (
                      <span className="text-success-content tooltip tooltip-right" data-tip="Processing complete">
                        ✓ {/* Green checkmark */}
                      </span>
                    )}
                    {file.status === 'FAILED' && (
                      <span className="text-error-content tooltip tooltip-right cursor-pointer" data-tip={file.errorMessage || 'Processing failed'}>
                        ✕ {/* Red cross */}
                      </span>
                    )}
                    <span className={getStatusBadge(file.status)}>
                      {file.status}
                    </span>
                  </td>
                  <td className="text-primary-content/80">
                    {file.status === 'COMPLETED' ? (
                      <span className="badge bg-primary/20 text-primary-content border-primary-content/30">{file._count.chunks}</span>
                    ) : (
                      <span className="text-primary-content/60">-</span>
                    )}
                  </td>
                  <td className="text-sm text-primary-content/80">
                    {new Date(file.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      {file.status === 'FAILED' && (
                        <button
                          onClick={() => handleRetry(file.id)}
                          className="btn btn-xs btn-warning"
                        >
                          Retry
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(file.id, file.fileName)}
                        className="btn btn-xs btn-error"
                        disabled={deleting === file.id}
                      >
                        {deleting === file.id ? '...' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {files.length > 0 && (
        <div className="mt-4 text-sm text-primary-content/80">
          <p>
            <strong className="text-primary-content">Total:</strong> {files.length} file{files.length !== 1 ? 's' : ''} •{' '}
            <strong className="text-primary-content">Ready:</strong> {files.filter((f) => f.status === 'COMPLETED').length} •{' '}
            <strong className="text-primary-content">Processing:</strong> {files.filter((f) => f.status === 'PROCESSING' || f.status === 'PENDING').length}
          </p>
        </div>
      )}
    </div>
  );
}
