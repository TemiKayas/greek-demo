'use client';

import { useState } from 'react';
import { Quiz } from '@/lib/processors/ai-generator';
import Navbar from '@/components/shared/Navbar';
import PDFUploadForm from '../components/PDFUploadForm';
import PDFPreview from '@/components/fileupload/PDFPreview';
import QuizDisplay from '../components/QuizDisplay';

export default function TeacherDashboard() {
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  return (
    <div className="min-h-screen bg-[#fffaf2]">
      {/* Navigation */}
      <Navbar title="Game Creation" showBack={true} showSignOut={true} />

      {/* main */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {!currentQuiz ? (
          <div className={`flex flex-col w-full animate-fade-in transition-all duration-500 ${
            selectedFile ? 'lg:flex-row gap-6 items-start' : 'items-center max-w-2xl mx-auto'
          }`}>
            {/* Upload Form */}
            <div className={`flex flex-col w-full transition-all duration-500 ${
              selectedFile ? 'lg:w-1/2' : 'items-center'
            }`}>
              <PDFUploadForm
                onQuizGenerated={setCurrentQuiz}
                onFileSelect={setSelectedFile}
              />
            </div>

            {/* PDF Preview, shows on RHS when file is selected */}
            {selectedFile && (
              <div className="w-full lg:w-1/2 animate-slide-in-right">
                <PDFPreview file={selectedFile} />
              </div>
            )}
          </div>
        ) : (
          /* Quiz Display - Shows after quiz is generated */
          <div className="animate-fade-in">
            <QuizDisplay quiz={currentQuiz} />
          </div>
        )}
      </main>
    </div>
  );
}
