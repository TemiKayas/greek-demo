'use client';

import { useState, useEffect } from 'react';
import { generateWorksheet, getWorksheets, deleteWorksheet } from '@/app/actions/worksheet';
import jsPDF from 'jspdf';

type Props = {
  pdfId: string;
  extractedText: string;
};

type WorksheetQuestion = {
  type: 'multiple_choice' | 'true_false' | 'fill_blank' | 'short_answer';
  question: string;
  options?: string[];
  answer: string;
  explanation?: string;
};

type WorksheetData = {
  title: string;
  questions: WorksheetQuestion[];
};

type SavedWorksheet = {
  id: string;
  title: string;
  createdAt: Date;
  content: WorksheetData;
};

export default function WorksheetTab({ pdfId, extractedText }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [worksheet, setWorksheet] = useState<WorksheetData | null>(null);
  const [currentWorksheetId, setCurrentWorksheetId] = useState<string | null>(null);
  const [numQuestions, setNumQuestions] = useState(5);
  const [showAnswers, setShowAnswers] = useState(false);
  const [savedWorksheets, setSavedWorksheets] = useState<SavedWorksheet[]>([]);
  const [isLoadingPast, setIsLoadingPast] = useState(false);

  // Load past worksheets on mount
  useEffect(() => {
    loadPastWorksheets();
  }, [pdfId]);

  async function loadPastWorksheets() {
    setIsLoadingPast(true);
    const result = await getWorksheets(pdfId);
    if (result.success && result.data) {
      setSavedWorksheets(result.data);
    }
    setIsLoadingPast(false);
  }

  async function handleGenerate() {
    setIsGenerating(true);
    const result = await generateWorksheet(pdfId, numQuestions);

    if (result.success && result.data) {
      setWorksheet(result.data.content);
      setCurrentWorksheetId(result.data.id);
      setShowAnswers(false);
      // Reload past worksheets
      await loadPastWorksheets();
    } else {
      alert('Failed to generate worksheet: ' + result.error);
    }

    setIsGenerating(false);
  }

  function loadWorksheet(saved: SavedWorksheet) {
    setWorksheet(saved.content);
    setCurrentWorksheetId(saved.id);
    setShowAnswers(false);
  }

  async function handleDelete(worksheetId: string) {
    if (!confirm('Delete this worksheet?')) return;

    const result = await deleteWorksheet(worksheetId);
    if (result.success) {
      // If currently viewing deleted worksheet, clear it
      if (currentWorksheetId === worksheetId) {
        setWorksheet(null);
        setCurrentWorksheetId(null);
      }
      await loadPastWorksheets();
    }
  }

  function downloadWorksheetPDF(includeAnswers: boolean) {
    if (!worksheet) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const lineHeight = 7;
    let y = margin;

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(worksheet.title, margin, y);
    y += lineHeight * 2;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(includeAnswers ? 'ANSWER KEY' : 'Student Worksheet', margin, y);
    y += lineHeight * 1.5;

    // Questions
    worksheet.questions.forEach((q, idx) => {
      // Check if we need a new page
      if (y > pageHeight - 40) {
        doc.addPage();
        y = margin;
      }

      // Question number and type
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      const questionHeader = `${idx + 1}. [${formatQuestionType(q.type)}]`;
      doc.text(questionHeader, margin, y);
      y += lineHeight;

      // Question text
      doc.setFont('helvetica', 'normal');
      const questionLines = doc.splitTextToSize(q.question, pageWidth - 2 * margin);
      questionLines.forEach((line: string) => {
        if (y > pageHeight - 30) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += lineHeight;
      });

      // Options for multiple choice
      if (q.type === 'multiple_choice' && q.options) {
        doc.setFontSize(10);
        q.options.forEach((option) => {
          if (y > pageHeight - 30) {
            doc.addPage();
            y = margin;
          }
          const optionText = `   ${option}`;
          doc.text(optionText, margin + 5, y);
          y += lineHeight * 0.8;
        });
      }

      // Answer space or answer
      if (includeAnswers) {
        doc.setFont('helvetica', 'bold');
        doc.text('Answer:', margin + 5, y);
        doc.setFont('helvetica', 'normal');
        const answerLines = doc.splitTextToSize(q.answer, pageWidth - 2 * margin - 10);
        answerLines.forEach((line: string) => {
          if (y > pageHeight - 25) {
            doc.addPage();
            y = margin;
          }
          doc.text(line, margin + 25, y);
          y += lineHeight;
        });

        if (q.explanation) {
          doc.setFontSize(9);
          doc.setFont('helvetica', 'italic');
          const explainLines = doc.splitTextToSize(`Explanation: ${q.explanation}`, pageWidth - 2 * margin - 10);
          explainLines.forEach((line: string) => {
            if (y > pageHeight - 25) {
              doc.addPage();
              y = margin;
            }
            doc.text(line, margin + 25, y);
            y += lineHeight * 0.9;
          });
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
        }
      } else {
        // Blank lines for student answers
        doc.setDrawColor(200);
        for (let i = 0; i < 2; i++) {
          if (y > pageHeight - 25) {
            doc.addPage();
            y = margin;
          }
          doc.line(margin + 5, y, pageWidth - margin, y);
          y += lineHeight;
        }
      }

      y += lineHeight * 0.5; // Space between questions
    });

    // Save the PDF
    const filename = includeAnswers
      ? `${worksheet.title.replace(/[^a-z0-9]/gi, '_')}_answers.pdf`
      : `${worksheet.title.replace(/[^a-z0-9]/gi, '_')}.pdf`;
    doc.save(filename);
  }

  function formatQuestionType(type: string): string {
    switch (type) {
      case 'multiple_choice': return 'Multiple Choice';
      case 'true_false': return 'True/False';
      case 'fill_blank': return 'Fill in the Blank';
      case 'short_answer': return 'Short Answer';
      default: return type;
    }
  }

  return (
    <div className="h-full flex flex-col p-6 bg-gray-900">
      {!worksheet ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-lg">
            <div className="text-6xl mb-6">📝</div>
            <h3 className="text-2xl font-bold text-blue-400 mb-3">Worksheet Generator</h3>
            <p className="text-gray-300 mb-6">
              Generate practice exercises and comprehension questions based on your PDF content.
              Perfect for classroom use or self-study.
            </p>

            <div className="space-y-4 mb-8">
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-left">
                <h4 className="font-medium text-gray-300 mb-2">Features:</h4>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>✓ Multiple choice questions</li>
                  <li>✓ True/False statements</li>
                  <li>✓ Fill-in-the-blank exercises</li>
                  <li>✓ Short answer questions</li>
                  <li>✓ Greek grammar and vocabulary focus</li>
                  <li>✓ Downloadable PDF with answer key</li>
                </ul>
              </div>

              {/* Number of questions selector */}
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Number of Questions: {numQuestions}
                </label>
                <input
                  type="range"
                  min="3"
                  max="10"
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(parseInt(e.target.value))}
                  className="range range-primary range-sm"
                  disabled={isGenerating}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>3</span>
                  <span>10</span>
                </div>
              </div>

              {/* Past worksheets dropdown */}
              {savedWorksheets.length > 0 && (
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Load Previous Worksheet:
                  </label>
                  <select
                    className="select select-bordered w-full bg-gray-700 border-gray-600 text-white"
                    onChange={(e) => {
                      const selected = savedWorksheets.find(w => w.id === e.target.value);
                      if (selected) loadWorksheet(selected);
                    }}
                    disabled={isLoadingPast}
                  >
                    <option value="">Select a worksheet...</option>
                    {savedWorksheets.map((ws) => (
                      <option key={ws.id} value={ws.id}>
                        {ws.title} - {new Date(ws.createdAt).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !extractedText}
              className="btn btn-primary btn-lg"
            >
              {isGenerating ? (
                <>
                  <span className="loading loading-spinner"></span>
                  Generating Worksheet...
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
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                  Generate New Worksheet
                </>
              )}
            </button>

            {!extractedText && (
              <p className="text-sm text-error mt-4">
                No text extracted from this PDF. Please upload a text-based PDF.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto bg-gray-900">
          {/* Action buttons */}
          <div className="sticky top-0 bg-gray-900 border-b border-gray-700 pb-4 mb-4 flex flex-wrap gap-3 items-center justify-between z-10">
            <h3 className="text-2xl font-bold text-white">{worksheet.title}</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAnswers(!showAnswers)}
                className="btn btn-sm btn-outline text-gray-300 hover:text-white hover:border-blue-500"
              >
                {showAnswers ? 'Hide Answers' : 'Show Answers'}
              </button>
              <button
                onClick={() => downloadWorksheetPDF(false)}
                className="btn btn-sm btn-outline text-gray-300 hover:text-white hover:border-blue-500"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Worksheet
              </button>
              <button
                onClick={() => downloadWorksheetPDF(true)}
                className="btn btn-sm btn-primary"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Answer Key
              </button>
              <button
                onClick={() => {
                  setWorksheet(null);
                  setCurrentWorksheetId(null);
                }}
                className="btn btn-sm btn-ghost text-gray-400"
              >
                Close
              </button>
            </div>
          </div>

          {/* Worksheet content */}
          <div className="bg-white text-black rounded-lg p-8 max-w-4xl mx-auto shadow-2xl">
            <div className="border-b-2 border-gray-300 pb-4 mb-6">
              <h1 className="text-3xl font-bold text-gray-800">{worksheet.title}</h1>
              <p className="text-sm text-gray-600 mt-2">
                {showAnswers ? 'Answer Key' : 'Student Worksheet'}
              </p>
            </div>

            <div className="space-y-6">
              {worksheet.questions.map((q, idx) => (
                <div key={idx} className="border-l-4 border-blue-500 pl-4 py-2">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="font-bold text-lg text-gray-800">{idx + 1}.</span>
                    <div className="flex-1">
                      <span className="text-xs font-medium text-blue-600 uppercase bg-blue-50 px-2 py-1 rounded">
                        {formatQuestionType(q.type)}
                      </span>
                      <p className="text-lg mt-2 text-gray-800 font-medium">{q.question}</p>

                      {/* Multiple choice options */}
                      {q.type === 'multiple_choice' && q.options && (
                        <div className="mt-3 space-y-2 ml-4">
                          {q.options.map((option, optIdx) => (
                            <div key={optIdx} className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-gray-400 rounded"></div>
                              <span className="text-gray-700">{option}</span>
                              {showAnswers && option === q.answer && (
                                <span className="text-green-600 font-bold ml-2">✓ Correct</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Answer section */}
                      {showAnswers && (
                        <div className="mt-3 bg-green-50 border border-green-200 rounded p-3">
                          <p className="text-sm font-bold text-green-800">Answer:</p>
                          <p className="text-gray-800 mt-1">{q.answer}</p>
                          {q.explanation && (
                            <>
                              <p className="text-sm font-bold text-green-800 mt-2">Explanation:</p>
                              <p className="text-gray-700 text-sm mt-1">{q.explanation}</p>
                            </>
                          )}
                        </div>
                      )}

                      {/* Blank lines for student answers */}
                      {!showAnswers && q.type !== 'multiple_choice' && (
                        <div className="mt-3 space-y-2">
                          <div className="border-b border-gray-300 py-2"></div>
                          <div className="border-b border-gray-300 py-2"></div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delete button */}
          {currentWorksheetId && (
            <div className="flex justify-center mt-6">
              <button
                onClick={() => handleDelete(currentWorksheetId)}
                className="btn btn-sm btn-error btn-outline"
              >
                Delete This Worksheet
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
