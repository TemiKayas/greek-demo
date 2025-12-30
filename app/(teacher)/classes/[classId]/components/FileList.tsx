'use client';

import { useState } from 'react';
import { deleteClassFile, retryFileProcessing } from '@/app/actions/fileUpload';
import { useFilePolling, type ClassFile, type FileStatus } from '../hooks/useFilePolling';

interface FileListProps {
  classId: string;
  refreshTrigger?: number;
  onProcessingComplete?: () => void;
}

export function FileList({ classId, refreshTrigger, onProcessingComplete }: FileListProps) {
  const [deleting, setDeleting] = useState<string | null>(null);

  const { files, loading, hasProcessingFiles, processingStages, refresh } = useFilePolling({
    classId,
    pollingInterval: 2500,
    onAllCompleted: onProcessingComplete,
  });

  async function handleDelete(fileId: string, fileName: string) {
    if (!confirm(`Delete "${fileName}"? This will remove all associated data and cannot be undone.`)) {
      return;
    }

    setDeleting(fileId);
    const result = await deleteClassFile(fileId);
    if (result.success) {
      refresh();
    } else {
      alert(`Error: ${result.error}`);
    }
    setDeleting(null);
  }

  async function handleRetry(fileId: string) {
    const result = await retryFileProcessing(fileId);
    if (result.success) {
      refresh();
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
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-primary-content">Uploaded Files</h3>
        {hasProcessingFiles && (
          <div className="flex items-center gap-2 text-sm text-info">
            <span className="loading loading-spinner loading-sm"></span>
            <span>Auto-refreshing...</span>
          </div>
        )}
      </div>

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
                <th className="text-primary-content">Processing Stage</th>
                <th className="text-primary-content">Chunks</th>
                <th className="text-primary-content">Actions</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => {
                const stageInfo = processingStages.get(file.id);
                return (
                  <tr key={file.id} className="border-primary-content/10 hover:bg-base-300">
                    <td className="text-primary-content">
                      <div className="font-medium">{file.fileName}</div>
                      <div className="text-xs text-primary-content/60">
                        {new Date(file.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="text-primary-content/80">{getFileTypeDisplay(file.fileType)}</td>
                    <td className="text-primary-content/80">{formatFileSize(file.fileSize)}</td>
                    <td>
                      <span className={getStatusBadge(file.status)}>
                        {file.status}
                      </span>
                    </td>
                    <td>
                      {stageInfo && (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{stageInfo.icon}</span>
                            <span className="text-sm font-medium text-primary-content">
                              {stageInfo.description}
                            </span>
                          </div>
                          {(file.status === 'PENDING' || file.status === 'PROCESSING') && (
                            <div className="text-xs text-primary-content/60">
                              Est. {stageInfo.estimatedTimeRemaining}s remaining
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="text-primary-content/80">
                      {file.status === 'COMPLETED' ? (
                        <span className="badge bg-primary/20 text-primary-content border-primary-content/30">
                          {file._count.chunks} chunks
                        </span>
                      ) : (
                        <span className="text-primary-content/60">-</span>
                      )}
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {files.length > 0 && (
        <div className="mt-4 pt-4 border-t border-primary-content/20">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-content">{files.length}</div>
              <div className="text-primary-content/70">Total Files</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success">{files.filter((f) => f.status === 'COMPLETED').length}</div>
              <div className="text-primary-content/70">Ready</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-warning">{files.filter((f) => f.status === 'PROCESSING' || f.status === 'PENDING').length}</div>
              <div className="text-primary-content/70">Processing</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
