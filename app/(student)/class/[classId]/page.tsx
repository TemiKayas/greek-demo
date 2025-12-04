'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getClassDetails } from '@/app/actions/class';
import { ChatInterface } from './components/ChatInterface';
import { FileListSidebar } from './components/FileListSidebar';

type ClassDetails = {
  id: string;
  name: string;
  description: string | null;
  teacher: {
    id: string;
    name: string;
  };
};

export default function StudentClassPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params?.classId as string;

  const [classData, setClassData] = useState<ClassDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (classId) {
      loadClassDetails();
    }
  }, [classId]);

  async function loadClassDetails() {
    setLoading(true);
    const result = await getClassDetails(classId);
    if (result.success) {
      setClassData(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error || !classData) {
    return (
      <div className="min-h-screen bg-base-200 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="alert alert-error">
            <span>{error || 'Class not found'}</span>
          </div>
          <Link href="/dashboard" className="btn btn-ghost mt-4">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-base-200">
      {/* Header */}
      <div className="bg-base-100 border-b border-base-300 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="btn btn-ghost btn-sm">
              ← Back
            </Link>
            <div>
              <h1 className="text-2xl font-bold">{classData.name}</h1>
              <p className="text-sm text-base-content/70">
                Teacher: {classData.teacher.name}
              </p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="btn btn-ghost btn-sm lg:hidden"
          >
            {sidebarOpen ? 'Hide Files' : 'Show Files'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-base-100">
          <ChatInterface classId={classId} />
        </div>

        {/* Sidebar */}
        {sidebarOpen && (
          <div className="w-80 border-l border-base-300 bg-base-100 overflow-y-auto">
            <div className="p-4">
              <FileListSidebar classId={classId} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
