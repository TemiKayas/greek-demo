'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { getLessonPDFs, deletePDF, uploadAndProcessPDF } from '@/app/actions/pdf';
import { getClassLessons } from '@/app/actions/lesson';
import ChatbotTab from '@/app/library/components/ChatbotTab';
import WorksheetTab from '@/app/library/components/WorksheetTab';
import FlashcardTab from '@/app/library/components/FlashcardTab';
import ChatHistoryTab from '@/app/library/components/ChatHistoryTab';
import StudentChatsTab from './StudentChatsTab';

// Dynamically import PDFViewer to avoid SSR issues with react-pdf
const PDFViewer = dynamic(() => import('@/app/library/components/PDFViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <span className="loading loading-spinner loading-lg text-greek-blue"></span>
    </div>
  ),
});

type PDF = {
  id: string;
  filename: string;
  fileSize: number;
  uploadedAt: Date;
  blobUrl: string;
  processedContent: {
    extractedText: string;
  } | null;
};

type Lesson = {
  id: string;
  name: string;
  description: string | null;
  creatorId: string;
  _count?: {
    pdfs: number;
    materials: number;
  };
};

type Tab = 'pdf' | 'chat' | 'worksheet' | 'flashcard' | 'history' | 'students';

export default function LessonDetailPage() {
  const params = useParams();
  const classId = params?.classId as string;
  const lessonId = params?.lessonId as string;

  const [pdfs, setPdfs] = useState<PDF[]>([]);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [selectedPdf, setSelectedPdf] = useState<PDF | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('pdf');
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (lessonId) {
      loadLessonDetails();
      loadPDFs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  async function loadLessonDetails() {
    // Get lesson details from the class lessons
    const result = await getClassLessons(classId);
    if (result.success) {
      const lessonData = result.data.find((lesson: Lesson) => lesson.id === lessonId);
      if (lessonData) {
        setLesson(lessonData);
      }
    }
  }

  async function loadPDFs() {
    setIsLoading(true);
    const result = await getLessonPDFs(lessonId);
    if (result.success && result.data) {
      setPdfs(result.data as PDF[]);
      // Auto-select most recent PDF
      if (result.data.length > 0) {
        setSelectedPdf(result.data[0] as PDF);
      }
    }
    setIsLoading(false);
  }

  async function handleDelete(pdfId: string) {
    if (!confirm('Are you sure you want to delete this PDF?')) return;

    const result = await deletePDF(pdfId);
    if (result.success) {
      // Reload PDFs
      await loadPDFs();
      // If deleted PDF was selected, clear selection
      if (selectedPdf?.id === pdfId) {
        setSelectedPdf(null);
      }
    } else {
      alert('Failed to delete PDF: ' + result.error);
    }
  }

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploadError(null);
    setUploading(true);

    const formData = new FormData(event.currentTarget);
    const form = event.currentTarget;

    // Add lessonId to formData
    formData.append('lessonId', lessonId);

    const result = await uploadAndProcessPDF(formData);

    if (result.success) {
      setShowUploadModal(false);
      form.reset();
      await loadPDFs();
      await loadLessonDetails(); // Refresh lesson to update PDF count
    } else {
      setUploadError(result.error);
    }

    setUploading(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <>
        <div className="flex gap-3 h-[calc(100vh-2rem)]">
        {/* Left Sidebar - Compact Menu */}
        <div className="w-56 bg-base-200 rounded-lg shadow-xl flex flex-col overflow-hidden">
          {/* Back Button, Lesson Info & Upload Button */}
          <div className="p-3 border-b border-base-content/10 space-y-2">
            <Link
              href={`/classes/${classId}`}
              className="btn btn-ghost btn-sm w-full justify-start gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              <span className="truncate">{lesson?.name || 'Loading...'}</span>
            </Link>

              <button
                onClick={() => setShowUploadModal(true)}
                className="btn btn-primary btn-sm w-full gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                Upload PDF
              </button>
            </div>
            {/* PDF List */}
            <div className="flex-1 overflow-auto p-2 border-b border-base-content/10">
              <div className="px-2 py-1 mb-2">
                <h3 className="text-xs font-semibold text-base-content/70 uppercase">PDFs</h3>
              </div>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <span className="loading loading-spinner loading-md text-primary"></span>
                </div>
              ) : pdfs.length === 0 ? (
                <div className="text-center py-8 px-2">
                  <p className="text-sm text-base-content/60">No PDFs yet</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {pdfs.map((pdf) => (
                    <div
                      key={pdf.id}
                      className={`p-2 rounded cursor-pointer transition-colors group ${
                        selectedPdf?.id === pdf.id
                          ? 'bg-primary/20 text-primary'
                          : 'hover:bg-base-300'
                      }`}
                      onClick={() => setSelectedPdf(pdf)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{pdf.filename}</p>
                          <p className="text-xs text-base-content/60">
                            {(pdf.fileSize / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(pdf.id);
                          }}
                          className="btn btn-ghost btn-xs opacity-0 group-hover:opacity-100"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Feature Menu */}
            <div className="p-2 space-y-1">
              <button
                onClick={() => setActiveTab('pdf')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors ${
                  activeTab === 'pdf'
                    ? 'bg-primary text-primary-content'
                    : 'hover:bg-base-300'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>PDF Preview</span>
              </button>

              <button
                onClick={() => setActiveTab('worksheet')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors ${
                  activeTab === 'worksheet'
                    ? 'bg-primary text-primary-content'
                    : 'hover:bg-base-300'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Worksheet</span>
              </button>

              <button
                onClick={() => setActiveTab('flashcard')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors ${
                  activeTab === 'flashcard'
                    ? 'bg-primary text-primary-content'
                    : 'hover:bg-base-300'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span>Flashcards</span>
              </button>

              <button
                onClick={() => setActiveTab('chat')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors ${
                  activeTab === 'chat'
                    ? 'bg-primary text-primary-content'
                    : 'hover:bg-base-300'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span>Chatbot</span>
              </button>

              <button
                onClick={() => setActiveTab('history')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors ${
                  activeTab === 'history'
                    ? 'bg-primary text-primary-content'
                    : 'hover:bg-base-300'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <span>Chat History</span>
              </button>

              <button
                onClick={() => setActiveTab('students')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors ${
                  activeTab === 'students'
                    ? 'bg-primary text-primary-content'
                    : 'hover:bg-base-300'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>Student Chats</span>
              </button>
            </div>
          </div>

          {/* Right Content Area */}
          <div className="flex-1 bg-base-100 rounded-lg shadow-xl overflow-hidden">
            {selectedPdf ? (
              <>
                {activeTab === 'pdf' && <PDFViewer pdfId={selectedPdf.id} />}
                {activeTab === 'chat' && (
                  <ChatbotTab
                    pdfId={selectedPdf.id}
                    extractedText={selectedPdf.processedContent?.extractedText || ''}
                  />
                )}
                {activeTab === 'worksheet' && (
                  <WorksheetTab
                    pdfId={selectedPdf.id}
                    extractedText={selectedPdf.processedContent?.extractedText || ''}
                  />
                )}
                {activeTab === 'flashcard' && (
                  <FlashcardTab
                    pdfId={selectedPdf.id}
                    extractedText={selectedPdf.processedContent?.extractedText || ''}
                  />
                )}
                {activeTab === 'history' && (
                  <ChatHistoryTab
                    pdfId={selectedPdf.id}
                  />
                )}
                {activeTab === 'students' && (
                  <StudentChatsTab
                    classId={classId}
                    lessonId={lessonId}
                  />
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-20 h-20 bg-base-300 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-12 h-12 text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <p className="text-xl text-base-content/60 mb-4">
                    {isLoading ? 'Loading PDFs...' : 'No PDFs uploaded yet'}
                  </p>
                  {!isLoading && (
                    <button
                      onClick={() => setShowUploadModal(true)}
                      className="btn btn-primary"
                    >
                      Upload Your First PDF
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {showUploadModal && (
          <div className="modal modal-open">
            <div className="modal-box">
              <h3 className="font-bold text-lg mb-4">Upload PDF to Lesson</h3>

              {uploadError && (
                <div className="alert alert-error mb-4">
                  <span>{uploadError}</span>
                </div>
              )}

              <form onSubmit={handleUpload}>
                <div className="form-control mb-6">
                  <label className="label">
                    <span className="label-text">Select PDF File</span>
                  </label>
                  <input
                    type="file"
                    name="pdf"
                    accept=".pdf"
                    className="file-input file-input-bordered"
                    required
                    disabled={uploading}
                  />
                  <label className="label">
                    <span className="label-text-alt">Maximum file size: 25MB</span>
                  </label>
                </div>

                <div className="modal-action">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUploadModal(false);
                      setUploadError(null);
                    }}
                    className="btn"
                    disabled={uploading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`btn btn-primary ${uploading ? 'loading' : ''}`}
                    disabled={uploading}
                  >
                    {uploading ? 'Uploading...' : 'Upload PDF'}
                  </button>
                </div>
              </form>
            </div>
            <div className="modal-backdrop" onClick={() => !uploading && setShowUploadModal(false)}></div>
          </div>
        )}
      </>
    </div>
  );
}
