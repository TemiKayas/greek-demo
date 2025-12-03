'use client';

import { useEffect, useState } from 'react';
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

  useEffect(() => {
    loadFiles();
  }, [classId, refreshTrigger]);

  async function loadFiles() {
    setLoading(true);
    const result = await getClassFiles(classId);
    if (result.success) {
      setFiles(result.data);
    }
    setLoading(false);
  }

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
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-200 p-6">
      <h3 className="text-lg font-semibold mb-4">Uploaded Files</h3>

      {files.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-lg mb-2">No files uploaded yet</p>
          <p className="text-sm">Upload files above to get started</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th>File Name</th>
                <th>Type</th>
                <th>Size</th>
                <th>Status</th>
                <th>Chunks</th>
                <th>Uploaded</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr key={file.id}>
                  <td>
                    <div className="font-medium">{file.fileName}</div>
                    {file.status === 'FAILED' && file.errorMessage && (
                      <div className="text-xs text-error mt-1">{file.errorMessage}</div>
                    )}
                  </td>
                  <td>{getFileTypeDisplay(file.fileType)}</td>
                  <td>{formatFileSize(file.fileSize)}</td>
                  <td>
                    <span className={getStatusBadge(file.status)}>
                      {file.status}
                    </span>
                  </td>
                  <td>
                    {file.status === 'COMPLETED' ? (
                      <span className="badge badge-ghost">{file._count.chunks}</span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="text-sm">
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
        <div className="mt-4 text-sm text-gray-600">
          <p>
            <strong>Total:</strong> {files.length} file{files.length !== 1 ? 's' : ''} •{' '}
            <strong>Ready:</strong> {files.filter((f) => f.status === 'COMPLETED').length} •{' '}
            <strong>Processing:</strong> {files.filter((f) => f.status === 'PROCESSING' || f.status === 'PENDING').length}
          </p>
        </div>
      )}
    </div>
  );
}
