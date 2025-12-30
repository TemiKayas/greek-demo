'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getClassDetails } from '@/app/actions/class';
import { ChatInterface } from './components/ChatInterface';
import { FileListSidebar } from './components/FileListSidebar';
import { StudentWorksheetList } from './components/StudentWorksheetList';

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
  const classId = params?.classId as string;

  const [classData, setClassData] = useState<ClassDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'chat' | 'worksheets'>('chat');

  const loadClassDetails = useCallback(async () => {
    setLoading(true);
    const result = await getClassDetails(classId);
    if (result.success) {
      setClassData(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, [classId]);

  useEffect(() => {
    if (classId) {
      loadClassDetails();
    }
  }, [classId, loadClassDetails]);

  if (loading) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  if (error || !classData) {
    return (
      <div className="min-h-screen bg-base-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="alert alert-error">
            <span>{error || 'Class not found'}</span>
          </div>
          <Link href="/dashboard" className="btn btn-primary mt-4">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-base-100">
      {/* Header */}
      <div className="bg-base-200 border-b border-primary-content/10 px-6 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="btn btn-sm btn-outline border-primary-content text-primary-content hover:bg-primary hover:border-primary">
              ← Back
            </Link>
            <div>
              <h1 className="text-xl font-bold text-primary-content">{classData.name}</h1>
              <p className="text-xs text-primary-content/70">
                Teacher: {classData.teacher.name}
              </p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="btn btn-sm btn-outline border-primary-content text-primary-content hover:bg-primary hover:border-primary lg:hidden"
          >
            {sidebarOpen ? 'Hide Files' : 'Show Files'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Area */}
        <div className="flex-1 flex flex-col bg-base-100">
          {/* Tabs */}
          <div className="tabs tabs-boxed mb-6 bg-base-200">
            <a
              className={`tab ${activeTab === 'chat' ? 'tab-active bg-primary text-primary-content' : 'text-primary-content/80 hover:text-primary-content'}`}
              onClick={() => setActiveTab('chat')}
            >
              Chat
            </a>
            <a
              className={`tab ${activeTab === 'worksheets' ? 'tab-active bg-primary text-primary-content' : 'text-primary-content/80 hover:text-primary-content'}`}
              onClick={() => setActiveTab('worksheets')}
            >
              Worksheets
            </a>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'chat' && <ChatInterface classId={classId} />}
            {activeTab === 'worksheets' && <StudentWorksheetList />}
          </div>
        </div>

        {/* Sidebar */}
        {sidebarOpen && (
          <div className="w-80 border-l border-base-content/10 bg-base-200 overflow-y-auto shadow-lg">
            <div className="p-4">
              <FileListSidebar classId={classId} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
