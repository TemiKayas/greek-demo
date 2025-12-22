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
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  createdAt: Date;
  _count: {
    chunks: number;
  };
}

export function FileListSidebar({ classId }: FileListSidebarProps) {
  const [files, setFiles] = useState<ClassFile[]>([]);
  const [loading, setLoading] = useState(true);

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

  function getFileIcon(mimeType: string): string {
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || mimeType.includes('docx')) return '📝';
    if (mimeType.includes('text')) return '📃';
    return '📁';
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
      {files.map((file) => (
        <div
          key={file.id}
          className="p-3 rounded-lg hover:bg-base-300 transition-colors cursor-default border border-primary-content/10"
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl">{getFileIcon(file.fileType)}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-primary-content" title={file.fileName}>
                {file.fileName}
              </p>
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
      ))}
      <div className="px-3 pt-4 border-t border-primary-content/20">
        <div className="flex items-center justify-between text-xs text-primary-content/70">
          <span>{files.length} file{files.length !== 1 ? 's' : ''} available</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-success"></span>
            Ready
          </span>
        </div>
      </div>
    </div>
  );
}
