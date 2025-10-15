'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import PDFUploadForm from '../components/PDFUploadForm';
import QuizDisplay from '../components/QuizDisplay';

export default function TeacherDashboard() {
  const [currentQuiz, setCurrentQuiz] = useState<any>(null);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-blue-600">WordWyrm</h1>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Teacher Dashboard</h2>
          <p className="text-gray-600">
            Upload a PDF and generate an AI-powered quiz instantly
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <PDFUploadForm onQuizGenerated={setCurrentQuiz} />
          </div>

          <div>
            {currentQuiz ? (
              <QuizDisplay quiz={currentQuiz} />
            ) : (
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <div className="py-12">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    No quiz yet
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Upload a PDF to generate your first quiz
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
