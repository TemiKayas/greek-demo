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
        <span className="loading loading-spinner loading-md"></span>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-8 px-4">
        <p className="text-sm text-base-content/70">
          No materials available yet
        </p>
        <p className="text-xs text-base-content/60 mt-2">
          Your teacher will upload materials soon
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-sm px-3 mb-3">Class Materials</h3>
      {files.map((file) => (
        <div
          key={file.id}
          className="p-3 rounded-lg hover:bg-base-200 transition-colors cursor-default"
        >
          <div className="flex items-start gap-2">
            <span className="text-2xl">{getFileIcon(file.fileType)}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" title={file.fileName}>
                {file.fileName}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-base-content/60">
                  {formatFileSize(file.fileSize)}
                </span>
                <span className="text-xs text-base-content/60">•</span>
                <span className="text-xs text-base-content/60">
                  {file._count.chunks} sections
                </span>
              </div>
              <p className="text-xs text-base-content/50 mt-1">
                Added {new Date(file.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      ))}
      <div className="px-3 pt-3 border-t border-base-300">
        <p className="text-xs text-base-content/60">
          {files.length} file{files.length !== 1 ? 's' : ''} available
        </p>
      </div>
    </div>
  );
}
