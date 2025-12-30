'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getClassFiles } from '@/app/actions/fileUpload';

export type FileStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface ClassFile {
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

export interface ProcessingStageInfo {
  stage: string;
  description: string;
  estimatedTimeRemaining: number; // seconds
  icon: string;
}

/**
 * Estimates the current processing stage based on file status and elapsed time
 */
export function estimateProcessingStage(
  file: ClassFile,
  elapsedSeconds: number
): ProcessingStageInfo {
  if (file.status === 'PENDING') {
    return {
      stage: 'QUEUED',
      description: 'Waiting in queue...',
      estimatedTimeRemaining: 90, // Total estimate: 30 + 15 + 45
      icon: '⏳',
    };
  }

  if (file.status === 'PROCESSING') {
    // Stage 1: Extracting text (first 30 seconds)
    if (elapsedSeconds < 30) {
      return {
        stage: 'EXTRACTING',
        description: 'Extracting text from document...',
        estimatedTimeRemaining: 90 - elapsedSeconds,
        icon: '📄',
      };
    }

    // Stage 2: Creating chunks (30-45 seconds)
    if (elapsedSeconds < 45) {
      return {
        stage: 'CHUNKING',
        description: 'Creating hierarchical chunks...',
        estimatedTimeRemaining: 90 - elapsedSeconds,
        icon: '🧩',
      };
    }

    // Stage 3: Generating embeddings (45-90 seconds)
    return {
      stage: 'EMBEDDING',
      description: 'Generating embeddings...',
      estimatedTimeRemaining: Math.max(90 - elapsedSeconds, 5),
      icon: '🤖',
    };
  }

  if (file.status === 'COMPLETED') {
    return {
      stage: 'COMPLETED',
      description: `Ready (${file._count.chunks} chunks)`,
      estimatedTimeRemaining: 0,
      icon: '✅',
    };
  }

  // FAILED
  return {
    stage: 'FAILED',
    description: file.errorMessage || 'Processing failed',
    estimatedTimeRemaining: 0,
    icon: '❌',
  };
}

interface UseFilePollingOptions {
  classId: string;
  pollingInterval?: number; // milliseconds, default 3000
  onAllCompleted?: () => void;
}

interface UseFilePollingReturn {
  files: ClassFile[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  hasProcessingFiles: boolean;
  processingStages: Map<string, ProcessingStageInfo>;
}

/**
 * Hook that polls file status and provides real-time updates
 * Continues polling even when component unmounts (global polling)
 */
export function useFilePolling({
  classId,
  pollingInterval = 3000,
  onAllCompleted,
}: UseFilePollingOptions): UseFilePollingReturn {
  const [files, setFiles] = useState<ClassFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingStages, setProcessingStages] = useState<Map<string, ProcessingStageInfo>>(new Map());

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousProcessingCount = useRef<number>(0);
  const fileStartTimes = useRef<Map<string, number>>(new Map());

  const fetchFiles = useCallback(async () => {
    try {
      const result = await getClassFiles(classId);

      if (result.success) {
        const fetchedFiles = result.data as ClassFile[];
        setFiles(fetchedFiles);

        // Track start times for processing files
        const now = Date.now();
        fetchedFiles.forEach(file => {
          if ((file.status === 'PENDING' || file.status === 'PROCESSING') &&
              !fileStartTimes.current.has(file.id)) {
            fileStartTimes.current.set(file.id, now);
          }
        });

        // Calculate processing stages
        const stages = new Map<string, ProcessingStageInfo>();
        fetchedFiles.forEach(file => {
          const startTime = fileStartTimes.current.get(file.id) || now;
          const elapsedSeconds = Math.floor((now - startTime) / 1000);
          stages.set(file.id, estimateProcessingStage(file, elapsedSeconds));
        });
        setProcessingStages(stages);

        // Check if all files are completed
        const processingCount = fetchedFiles.filter(
          f => f.status === 'PENDING' || f.status === 'PROCESSING'
        ).length;

        // If we had processing files and now we don't, trigger callback
        if (previousProcessingCount.current > 0 && processingCount === 0) {
          onAllCompleted?.();
        }
        previousProcessingCount.current = processingCount;

        setError(null);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Error fetching files:', err);
      setError('Failed to fetch files');
    } finally {
      setLoading(false);
    }
  }, [classId, onAllCompleted]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchFiles();
  }, [fetchFiles]);

  // Start polling
  useEffect(() => {
    // Initial fetch
    fetchFiles();

    // Start polling interval
    intervalRef.current = setInterval(fetchFiles, pollingInterval);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fetchFiles, pollingInterval]);

  const hasProcessingFiles = files.some(
    f => f.status === 'PENDING' || f.status === 'PROCESSING'
  );

  return {
    files,
    loading,
    error,
    refresh,
    hasProcessingFiles,
    processingStages,
  };
}
