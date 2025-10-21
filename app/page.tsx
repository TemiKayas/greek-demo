'use client';

import { useState } from 'react';
import Link from 'next/link';
import { uploadAndProcessPDF } from './actions/pdf';

export default function Home() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  async function handleUpload(formData: FormData) {
    setIsUploading(true);
    setUploadResult(null);

    const result = await uploadAndProcessPDF(formData);

    setIsUploading(false);
    setUploadResult({
      success: result.success,
      message: result.success
        ? `PDF uploaded successfully! Extracted ${result.data.extractedText.length} characters.`
        : result.error,
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Greek pattern overlay */}
      <div className="greek-pattern absolute inset-0 pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 bg-base-100 border-b border-base-content/10 shadow-lg">
        <div className="container mx-auto px-4 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 sm:w-7 sm:h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="text-center sm:text-left">
                <h1 className="text-2xl sm:text-3xl font-bold text-base-content">
                  Μοντέρνα Ελληνικά
                </h1>
                <p className="text-xs sm:text-sm text-base-content/70">Modern Greek Education Tools</p>
              </div>
            </div>
            <Link href="/library" className="btn btn-primary btn-sm sm:btn-md gap-2">
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
              <span className="hidden sm:inline">Library</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-4 lg:px-8 py-8 lg:py-12">
        <div className="max-w-5xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-8 lg:mb-12">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-3 lg:mb-4 animate-fade-in text-base-content">
              AI-Powered Learning Tools
            </h2>
            <p className="text-lg sm:text-xl lg:text-2xl text-base-content/80 mb-2 px-4">
              Transform your Greek language PDFs into interactive materials
            </p>
            <p className="text-base sm:text-lg text-primary">
              Upload • Chat • Generate Worksheets & Flashcards
            </p>
          </div>

          {/* Upload Card */}
          <div className="card bg-base-100 shadow-xl mb-8 border border-base-content/10 animate-slide-up">
            <div className="card-body p-4 sm:p-6 lg:p-8">
              <div className="flex items-center gap-3 mb-4 lg:mb-6">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-primary">Upload Your Material</h3>
              </div>

              <form action={handleUpload} className="space-y-4 lg:space-y-6">
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text text-base sm:text-lg font-medium">Choose a PDF file</span>
                  </label>
                  <input
                    type="file"
                    name="pdf"
                    accept=".pdf"
                    required
                    disabled={isUploading}
                    className="file-input file-input-bordered file-input-primary w-full"
                  />
                  <label className="label">
                    <span className="label-text-alt text-base-content/60">
                      Maximum file size: 25MB
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isUploading}
                  className="btn btn-primary w-full text-base sm:text-lg h-12 sm:h-14"
                >
                  {isUploading ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Processing PDF...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-5 h-5 sm:w-6 sm:h-6"
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
                      Upload & Process PDF
                    </>
                  )}
                </button>
              </form>

              {/* Upload Result */}
              {uploadResult && (
                <div
                  className={`alert ${
                    uploadResult.success ? 'alert-success' : 'alert-error'
                  } animate-slide-up mt-4`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="stroke-current shrink-0 h-5 w-5 sm:h-6 sm:w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    {uploadResult.success ? (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    ) : (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    )}
                  </svg>
                  <span className="text-sm sm:text-base">{uploadResult.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-8">
            <div className="card bg-base-100 shadow-lg hover:shadow-xl hover:bg-base-200 transition-all duration-300 border border-base-content/10">
              <div className="card-body p-4 sm:p-6">
                <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mb-3">
                  <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h4 className="card-title text-lg sm:text-xl text-base-content mb-1 sm:mb-2">RAG Chatbot</h4>
                <p className="text-sm sm:text-base text-base-content/70">
                  Ask questions about your uploaded materials and get instant answers
                </p>
              </div>
            </div>

            <div className="card bg-base-100 shadow-lg hover:shadow-xl hover:bg-base-200 transition-all duration-300 border border-base-content/10">
              <div className="card-body p-4 sm:p-6">
                <div className="w-12 h-12 bg-secondary/20 rounded-lg flex items-center justify-center mb-3">
                  <svg className="w-7 h-7 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h4 className="card-title text-lg sm:text-xl text-base-content mb-1 sm:mb-2">Worksheets</h4>
                <p className="text-sm sm:text-base text-base-content/70">
                  Auto-generate practice exercises and comprehension questions
                </p>
              </div>
            </div>

            <div className="card bg-base-100 shadow-lg hover:shadow-xl hover:bg-base-200 transition-all duration-300 border border-base-content/10">
              <div className="card-body p-4 sm:p-6">
                <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center mb-3">
                  <svg className="w-7 h-7 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h4 className="card-title text-lg sm:text-xl text-base-content mb-1 sm:mb-2">Flashcards</h4>
                <p className="text-sm sm:text-base text-base-content/70">
                  Create vocabulary cards automatically from your PDF content
                </p>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="card bg-base-100 border border-base-content/10 p-6">
            <div className="w-full">
              <h4 className="font-bold text-base-content mb-3 flex items-center gap-2">
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
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Getting Started
              </h4>
              <ol className="list-decimal list-inside text-sm sm:text-base text-base-content/70 space-y-2 ml-7">
                <li>Upload a Greek language PDF (textbook, article, lesson notes)</li>
                <li>Wait for text extraction and processing</li>
                <li>Use the tools to generate study materials or chat with your content</li>
              </ol>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 mt-8 py-4 lg:py-6 bg-base-300 border-t border-base-content/10 text-base-content/60 text-center">
        <p className="text-xs sm:text-sm px-4">
          Built with Next.js, Prisma, and Google Gemini • Modern Greek Education Demo
        </p>
      </footer>
    </div>
  );
}
