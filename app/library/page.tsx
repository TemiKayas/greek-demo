'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { getAllPDFs, deletePDF } from '@/app/actions/pdf';
import PDFListSidebar from './components/PDFListSidebar';
import ChatbotTab from './components/ChatbotTab';
import WorksheetTab from './components/WorksheetTab';
import FlashcardTab from './components/FlashcardTab';
import Link from 'next/link';

// Dynamically import PDFViewer to avoid SSR issues with react-pdf
const PDFViewer = dynamic(() => import('./components/PDFViewer'), {
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
  filePath: string;
  processedContent: {
    extractedText: string;
  } | null;
};

type Tab = 'pdf' | 'chat' | 'worksheet' | 'flashcard';

export default function LibraryPage() {
  const [pdfs, setPdfs] = useState<PDF[]>([]);
  const [selectedPdf, setSelectedPdf] = useState<PDF | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('pdf');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPDFs();
  }, []);

  async function loadPDFs() {
    setIsLoading(true);
    const result = await getAllPDFs();
    if (result.success && result.data) {
      setPdfs(result.data as any);
      // Auto-select most recent PDF
      if (result.data.length > 0) {
        setSelectedPdf(result.data[0] as any);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b-2 border-blue-500/50 shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-3xl">📚</div>
              <div>
                <h1 className="text-2xl font-bold text-blue-400">Library</h1>
                <p className="text-sm text-gray-300">Manage your Greek learning materials</p>
              </div>
            </div>
            <Link href="/" className="btn btn-outline btn-primary">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              Home
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-6 h-[calc(100vh-180px)]">
          {/* Left Sidebar - PDF List */}
          <PDFListSidebar
            pdfs={pdfs}
            selectedPdf={selectedPdf}
            onSelectPdf={setSelectedPdf}
            onDeletePdf={handleDelete}
            isLoading={isLoading}
          />

          {/* Right Panel - Preview & Tools */}
          <div className="flex-1 bg-gray-800 rounded-lg shadow-lg overflow-hidden flex flex-col border border-gray-700">
            {selectedPdf ? (
              <>
                {/* Tabs */}
                <div className="border-b border-gray-700">
                  <div className="flex">
                    <button
                      onClick={() => setActiveTab('pdf')}
                      className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                        activeTab === 'pdf'
                          ? 'border-blue-500 text-blue-400'
                          : 'border-transparent text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>📄</span>
                        <span>PDF</span>
                      </div>
                    </button>
                    <button
                      onClick={() => setActiveTab('chat')}
                      className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                        activeTab === 'chat'
                          ? 'border-blue-500 text-blue-400'
                          : 'border-transparent text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>💬</span>
                        <span>Chat</span>
                      </div>
                    </button>
                    <button
                      onClick={() => setActiveTab('worksheet')}
                      className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                        activeTab === 'worksheet'
                          ? 'border-blue-500 text-blue-400'
                          : 'border-transparent text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>📝</span>
                        <span>Worksheet</span>
                      </div>
                    </button>
                    <button
                      onClick={() => setActiveTab('flashcard')}
                      className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                        activeTab === 'flashcard'
                          ? 'border-blue-500 text-blue-400'
                          : 'border-transparent text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>🗂️</span>
                        <span>Flashcards</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-auto">
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
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <div className="text-6xl mb-4">📚</div>
                  <p className="text-xl text-gray-400">
                    {isLoading ? 'Loading PDFs...' : 'No PDFs available. Upload one to get started!'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
