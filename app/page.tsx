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
    <div className="min-h-screen bg-gradient-to-br from-greek-blue via-aegean to-greek-blue-light">
      {/* Greek pattern overlay */}
      <div className="greek-pattern absolute inset-0 pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 bg-white/95 backdrop-blur-sm border-b-4 border-greek-blue shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-4xl">🏛️</div>
              <div>
                <h1 className="text-3xl font-bold text-greek-blue">
                  Μοντέρνα Ελληνικά
                </h1>
                <p className="text-sm text-gray-600">Modern Greek Education Tools</p>
              </div>
            </div>
            <Link href="/library" className="btn btn-primary gap-2">
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
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
              Library
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12 text-white">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 animate-fade-in">
              AI-Powered Learning Tools
            </h2>
            <p className="text-xl md:text-2xl text-white/90 mb-2">
              Transform your Greek language PDFs into interactive materials
            </p>
            <p className="text-lg text-white/80">
              Upload • Chat • Generate Worksheets & Flashcards
            </p>
          </div>

          {/* Upload Card */}
          <div className="bg-white rounded-lg shadow-2xl p-8 mb-8 animate-slide-up border-t-4 border-ancient-gold">
            <div className="flex items-center gap-3 mb-6">
              <div className="text-3xl">📄</div>
              <h3 className="text-2xl font-bold text-greek-blue">Upload Your Material</h3>
            </div>

            <form action={handleUpload} className="space-y-6">
              <div className="form-control">
                <label className="label">
                  <span className="label-text text-lg font-medium">Choose a PDF file</span>
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
                  <span className="label-text-alt text-gray-500">
                    Maximum file size: 25MB
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isUploading}
                className="btn btn-primary w-full text-lg h-14"
              >
                {isUploading ? (
                  <>
                    <span className="loading loading-spinner"></span>
                    Processing PDF...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-6 h-6"
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
                className={`alert mt-6 ${
                  uploadResult.success ? 'alert-success' : 'alert-error'
                } animate-slide-up`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="stroke-current shrink-0 h-6 w-6"
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
                <span>{uploadResult.message}</span>
              </div>
            )}
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/95 backdrop-blur-sm rounded-lg p-6 shadow-lg border-l-4 border-aegean hover:shadow-xl transition-shadow">
              <div className="text-4xl mb-3">💬</div>
              <h4 className="text-xl font-bold text-greek-blue mb-2">RAG Chatbot</h4>
              <p className="text-gray-600">
                Ask questions about your uploaded materials and get instant answers
              </p>
            </div>

            <div className="bg-white/95 backdrop-blur-sm rounded-lg p-6 shadow-lg border-l-4 border-terracotta hover:shadow-xl transition-shadow">
              <div className="text-4xl mb-3">📝</div>
              <h4 className="text-xl font-bold text-greek-blue mb-2">Worksheets</h4>
              <p className="text-gray-600">
                Auto-generate practice exercises and comprehension questions
              </p>
            </div>

            <div className="bg-white/95 backdrop-blur-sm rounded-lg p-6 shadow-lg border-l-4 border-ancient-gold hover:shadow-xl transition-shadow">
              <div className="text-4xl mb-3">🗂️</div>
              <h4 className="text-xl font-bold text-greek-blue mb-2">Flashcards</h4>
              <p className="text-gray-600">
                Create vocabulary cards automatically from your PDF content
              </p>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6 shadow-lg border-l-4 border-olive">
            <h4 className="font-bold text-greek-blue mb-2 flex items-center gap-2">
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
            <ol className="list-decimal list-inside text-gray-700 space-y-1">
              <li>Upload a Greek language PDF (textbook, article, lesson notes)</li>
              <li>Wait for text extraction and processing</li>
              <li>Use the tools to generate study materials or chat with your content</li>
            </ol>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 mt-12 py-6 bg-greek-blue-dark text-white text-center">
        <p className="text-sm">
          Built with Next.js, Prisma, and Google Gemini • Modern Greek Education Demo
        </p>
      </footer>
    </div>
  );
}
