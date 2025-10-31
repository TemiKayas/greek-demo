'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { getAllPDFs, deletePDF } from '@/app/actions/pdf';
import PDFListSidebar from './components/PDFListSidebar';
import ChatbotTab from './components/ChatbotTab';
import WorksheetTab from './components/WorksheetTab';
import FlashcardTab from './components/FlashcardTab';
import ChatHistoryTab from './components/ChatHistoryTab';

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
  blobUrl: string;
  processedContent: {
    extractedText: string;
  } | null;
};

type Tab = 'pdf' | 'chat' | 'worksheet' | 'flashcard' | 'history';

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Main Content */}
      <div className="container mx-auto px-4 lg:px-8 py-4 lg:py-6">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 min-h-[calc(100vh-180px)]">
          {/* Left Sidebar - PDF List */}
          <PDFListSidebar
            pdfs={pdfs}
            selectedPdf={selectedPdf}
            onSelectPdf={setSelectedPdf}
            onDeletePdf={handleDelete}
            isLoading={isLoading}
          />

          {/* Right Panel - Preview & Tools */}
          <div className="flex-1 card bg-base-200 shadow-xl overflow-hidden flex flex-col">
            {selectedPdf ? (
              <>
                {/* Tabs */}
                <div className="bg-base-300 border-b border-base-content/10">
                  <div className="flex w-full">
                    <button
                      onClick={() => setActiveTab('pdf')}
                      className={`flex-1 flex items-center justify-center gap-2 py-4 font-medium transition-colors border-b-2 ${
                        activeTab === 'pdf'
                          ? 'border-primary text-primary bg-base-200'
                          : 'border-transparent text-base-content/60 hover:text-base-content hover:bg-base-200/50'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>PDF</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('chat')}
                      className={`flex-1 flex items-center justify-center gap-2 py-4 font-medium transition-colors border-b-2 ${
                        activeTab === 'chat'
                          ? 'border-primary text-primary bg-base-200'
                          : 'border-transparent text-base-content/60 hover:text-base-content hover:bg-base-200/50'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span>CHAT</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('worksheet')}
                      className={`flex-1 flex items-center justify-center gap-2 py-4 font-medium transition-colors border-b-2 ${
                        activeTab === 'worksheet'
                          ? 'border-primary text-primary bg-base-200'
                          : 'border-transparent text-base-content/60 hover:text-base-content hover:bg-base-200/50'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>WORKSHEET</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('flashcard')}
                      className={`flex-1 flex items-center justify-center gap-2 py-4 font-medium transition-colors border-b-2 ${
                        activeTab === 'flashcard'
                          ? 'border-primary text-primary bg-base-200'
                          : 'border-transparent text-base-content/60 hover:text-base-content hover:bg-base-200/50'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      <span>FLASHCARDS</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('history')}
                      className={`flex-1 flex items-center justify-center gap-2 py-4 font-medium transition-colors border-b-2 ${
                        activeTab === 'history'
                          ? 'border-primary text-primary bg-base-200'
                          : 'border-transparent text-base-content/60 hover:text-base-content hover:bg-base-200/50'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                      <span className="hidden sm:inline">CHAT HISTORY</span>
                      <span className="sm:hidden">HISTORY</span>
                    </button>
                  </div>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-auto bg-base-100">
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
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-base-300 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 sm:w-12 sm:h-12 text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <p className="text-lg sm:text-xl text-base-content/60">
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
