'use client';

import { useEffect, useState, useCallback } from 'react';
import { getClassFiles } from '@/app/actions/fileUpload';

interface FileListSidebarProps {
  classId: string;
}

interface ClassFile {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  blobUrl: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  createdAt: Date;
  _count: {
    chunks: number;
  };
}

export function FileListSidebar({ classId }: FileListSidebarProps) {
  const [files, setFiles] = useState<ClassFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState<ClassFile | null>(null);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    const result = await getClassFiles(classId);
    if (result.success) {
      // Only show completed files to students
      setFiles(result.data.filter((f) => f.status === 'COMPLETED'));
    }
    setLoading(false);
  }, [classId]);

  useEffect(() => {
    loadFiles();
  }, [classId, loadFiles]);

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function getFileIcon(mimeType: string) {
    if (mimeType.includes('pdf')) {
      return (
        <svg className="w-6 h-6 text-error" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM8 18v-1h8v1H8zm0-4v-1h8v1H8zm0-4V9h5v1H8z"/>
        </svg>
      );
    }
    if (mimeType.includes('word') || mimeType.includes('docx')) {
      return (
        <svg className="w-6 h-6 text-info" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zm-2 14H9l-1-4-1 4H5l2-7h2l1 4 1-4h2l2 7z"/>
        </svg>
      );
    }
    return (
      <svg className="w-6 h-6 text-primary-content/70" fill="currentColor" viewBox="0 0 24 24">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM8 18v-1h8v1H8z"/>
      </svg>
    );
  }

  function handleFileClick(file: ClassFile) {
    // Only preview PDFs
    if (file.fileType.includes('pdf')) {
      setPreviewFile(file);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <span className="loading loading-spinner loading-md text-primary"></span>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-8 px-4">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary-content/10 flex items-center justify-center">
          <svg className="w-6 h-6 text-primary-content/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-sm text-primary-content/80 font-medium">
          No materials yet
        </p>
        <p className="text-xs text-primary-content/60 mt-2">
          Your teacher will upload materials soon
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-3 mb-4">
        <svg className="w-5 h-5 text-primary-content" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        <h3 className="font-semibold text-sm text-primary-content">Class Materials</h3>
      </div>
      {files.map((file) => {
        const isPdf = file.fileType.includes('pdf');
        return (
          <div
            key={file.id}
            onClick={() => handleFileClick(file)}
            className={`p-3 rounded-lg transition-colors border border-primary-content/10 ${
              isPdf ? 'hover:bg-base-300 cursor-pointer hover:border-primary-content/30' : 'cursor-default'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">{getFileIcon(file.fileType)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate text-primary-content" title={file.fileName}>
                    {file.fileName}
                  </p>
                  {isPdf && (
                    <svg className="w-4 h-4 text-primary-content/50 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs text-primary-content/70">
                    {formatFileSize(file.fileSize)}
                  </span>
                  <span className="text-xs text-primary-content/50">•</span>
                  <span className="text-xs text-primary-content/70">
                    {file._count.chunks} sections
                  </span>
                </div>
                <p className="text-xs text-primary-content/50 mt-1">
                  Added {new Date(file.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        );
      })}
      <div className="px-3 pt-4 border-t border-primary-content/20">
        <div className="flex items-center justify-between text-xs text-primary-content/70">
          <span>{files.length} file{files.length !== 1 ? 's' : ''} available</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-success"></span>
            Ready
          </span>
        </div>
      </div>

      {/* PDF Preview Modal */}
      {previewFile && (
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-6xl h-[90vh] bg-base-100 p-0 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-primary-content/20">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-error" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM8 18v-1h8v1H8zm0-4v-1h8v1H8zm0-4V9h5v1H8z"/>
                </svg>
                <div>
                  <h3 className="font-bold text-base-content">{previewFile.fileName}</h3>
                  <p className="text-xs text-base-content/70">
                    {formatFileSize(previewFile.fileSize)} • {previewFile._count.chunks} sections
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreviewFile(null)}
                className="btn btn-sm btn-circle btn-ghost"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe
                src={previewFile.blobUrl}
                className="w-full h-full border-0"
                title={previewFile.fileName}
              />
            </div>
            <div className="p-4 border-t border-primary-content/20 flex justify-between items-center">
              <a
                href={previewFile.blobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm btn-outline"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open in New Tab
              </a>
              <button
                onClick={() => setPreviewFile(null)}
                className="btn btn-sm btn-primary"
              >
                Close
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setPreviewFile(null)}></div>
        </div>
      )}
    </div>
  );
}
