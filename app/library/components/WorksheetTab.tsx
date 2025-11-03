'use client';

import { useState, useEffect, useRef } from 'react';
import { generateWorksheet, getWorksheets, deleteWorksheet } from '@/app/actions/worksheet';
import { autoAddToPacket } from '@/app/actions/packet-utils';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

type Props = {
  pdfId: string;
  extractedText: string;
  lessonId?: string; // Optional for backward compatibility
  onWorksheetGenerated?: () => void; // Callback to trigger packet refresh
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

export default function WorksheetTab({ pdfId, extractedText, lessonId, onWorksheetGenerated }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [worksheet, setWorksheet] = useState<WorksheetData | null>(null);
  const [currentWorksheetId, setCurrentWorksheetId] = useState<string | null>(null);
  const [numQuestions, setNumQuestions] = useState(5);
  const [showAnswers, setShowAnswers] = useState(false);
  const [savedWorksheets, setSavedWorksheets] = useState<SavedWorksheet[]>([]);
  const [isLoadingPast, setIsLoadingPast] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const worksheetRef = useRef<HTMLDivElement>(null);

  // Load past worksheets on mount
  useEffect(() => {
    loadPastWorksheets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    console.log('[WorksheetTab] Generating worksheet, lessonId:', lessonId);
    const result = await generateWorksheet(pdfId, numQuestions);

    if (result.success && result.data) {
      console.log('[WorksheetTab] Worksheet generated:', result.data.id);
      setWorksheet(result.data.content);
      setCurrentWorksheetId(result.data.id);
      setShowAnswers(false);
      // Reload past worksheets
      await loadPastWorksheets();

      // Auto-add worksheet to packet if lessonId is provided
      if (lessonId) {
        console.log('[WorksheetTab] Auto-adding worksheet to packet...');
        const addResult = await autoAddToPacket(lessonId, 'WORKSHEET', result.data.id);
        console.log('[WorksheetTab] Auto-add result:', addResult);
        // Trigger packet refresh callback
        if (onWorksheetGenerated) {
          console.log('[WorksheetTab] Triggering packet refresh callback');
          onWorksheetGenerated();
        }
      } else {
        console.warn('[WorksheetTab] No lessonId provided, skipping auto-add to packet');
      }
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

  async function downloadWorksheetPDF(includeAnswers: boolean) {
    if (!worksheet || !worksheetRef.current) return;

    setIsDownloading(true);

    try {
      // Temporarily set the answers state for rendering
      const originalShowAnswers = showAnswers;
      setShowAnswers(includeAnswers);

      // Wait for state to update and render
      await new Promise(resolve => setTimeout(resolve, 300));

      // Capture the worksheet as canvas with specific settings
      const canvas = await html2canvas(worksheetRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: worksheetRef.current.scrollWidth,
        windowHeight: worksheetRef.current.scrollHeight,
      });

      // Create PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      // Calculate dimensions to fit on page with margins
      const margin = 10;
      const availableWidth = pdfWidth - (2 * margin);
      const availableHeight = pdfHeight - (2 * margin);
      const ratio = Math.min(availableWidth / imgWidth, availableHeight / imgHeight);

      const scaledWidth = imgWidth * ratio;
      const scaledHeight = imgHeight * ratio;

      let yPosition = margin;
      let heightLeft = scaledHeight;

      // Add first page
      pdf.addImage(imgData, 'PNG', margin, yPosition, scaledWidth, scaledHeight);

      heightLeft -= (pdfHeight - 2 * margin);

      // Add additional pages if needed
      while (heightLeft > 0) {
        yPosition = -(pdfHeight - 2 * margin) * ((scaledHeight - heightLeft) / scaledHeight);
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', margin, yPosition, scaledWidth, scaledHeight);
        heightLeft -= (pdfHeight - 2 * margin);
      }

      // Save the PDF
      const filename = includeAnswers
        ? `${worksheet.title.replace(/[^a-z0-9]/gi, '_')}_answers.pdf`
        : `${worksheet.title.replace(/[^a-z0-9]/gi, '_')}.pdf`;
      pdf.save(filename);

      // Restore original state
      setShowAnswers(originalShowAnswers);
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Failed to generate PDF. Please try again.');
    }

    setIsDownloading(false);
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
    <div className="h-full flex flex-col bg-base-100">
      {!worksheet ? (
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="text-center max-w-2xl w-full">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <svg className="w-10 h-10 sm:w-12 sm:h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-base-content mb-3">Worksheet Generator</h3>
            <p className="text-sm sm:text-base text-base-content/60 mb-4 sm:mb-6 px-4">
              Generate practice exercises and comprehension questions based on your PDF content.
            </p>

            {/* Past worksheets dropdown - AT THE TOP */}
            {savedWorksheets.length > 0 && (
              <div className="card bg-base-200 border border-base-content/10 p-3 sm:p-4 mb-4 sm:mb-6">
                <label className="block text-xs sm:text-sm font-medium mb-2 text-primary">
                  Load Previous Worksheet:
                </label>
                <select
                  className="select select-bordered w-full text-sm sm:text-base"
                  onChange={(e) => {
                    const selected = savedWorksheets.find(w => w.id === e.target.value);
                    if (selected) loadWorksheet(selected);
                  }}
                  disabled={isLoadingPast}
                  defaultValue=""
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

            <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
              <div className="card bg-base-200 border border-base-content/10 p-3 sm:p-4 text-left">
                <h4 className="font-medium text-sm sm:text-base mb-2 text-primary">Features:</h4>
                <ul className="text-xs sm:text-sm text-base-content/70 space-y-1">
                  <li>• Multiple choice questions</li>
                  <li>• True/False statements</li>
                  <li>• Fill-in-the-blank exercises</li>
                  <li>• Short answer questions</li>
                  <li>• Greek grammar and vocabulary focus</li>
                  <li>• Downloadable PDF with answer key</li>
                </ul>
              </div>

              {/* Number of questions selector */}
              <div className="card bg-base-200 border border-base-content/10 p-3 sm:p-4">
                <label className="block text-xs sm:text-sm font-medium mb-2 text-primary">
                  Number of Questions: {numQuestions}
                </label>
                <input
                  type="range"
                  min="3"
                  max="10"
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(parseInt(e.target.value))}
                  className="range range-primary range-sm w-full"
                  disabled={isGenerating}
                />
                <div className="flex justify-between text-xs text-base-content/60 mt-1">
                  <span>3</span>
                  <span>10</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !extractedText}
              className="btn btn-primary btn-md sm:btn-lg w-full max-w-md"
            >
              {isGenerating ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Generating Worksheet...
                </>
              ) : (
                'Generate New Worksheet'
              )}
            </button>

            {!extractedText && (
              <p className="text-xs sm:text-sm text-error mt-4">
                No text extracted from this PDF. Please upload a text-based PDF.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Action buttons - Fixed at top */}
          <div className="bg-base-200 border-b border-base-300 p-3 sm:p-4 flex-shrink-0">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <h3 className="text-base sm:text-xl font-bold text-base-content truncate">{worksheet.title}</h3>
              <div className="flex gap-2 flex-wrap w-full sm:w-auto">
                <button
                  onClick={() => setShowAnswers(!showAnswers)}
                  className="btn btn-xs sm:btn-sm btn-outline flex-1 sm:flex-none"
                  disabled={isDownloading}
                >
                  {showAnswers ? 'Hide Answers' : 'Show Answers'}
                </button>
                <button
                  onClick={() => downloadWorksheetPDF(false)}
                  className="btn btn-xs sm:btn-sm btn-outline flex-1 sm:flex-none"
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <span className="loading loading-spinner loading-xs"></span>
                  ) : (
                    <span className="hidden sm:inline">Download Worksheet</span>
                  )}
                  <span className="sm:hidden">Download</span>
                </button>
                <button
                  onClick={() => downloadWorksheetPDF(true)}
                  className="btn btn-xs sm:btn-sm btn-primary flex-1 sm:flex-none"
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <span className="loading loading-spinner loading-xs"></span>
                  ) : (
                    <span className="hidden sm:inline">Download Answer Key</span>
                  )}
                  <span className="sm:hidden">Answers</span>
                </button>
                <button
                  onClick={() => {
                    setWorksheet(null);
                    setCurrentWorksheetId(null);
                  }}
                  className="btn btn-xs sm:btn-sm btn-ghost"
                  disabled={isDownloading}
                >
                  Close
                </button>
              </div>
            </div>
          </div>

          {/* Worksheet content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-base-100">
            <div
              ref={worksheetRef}
              style={{
                backgroundColor: '#ffffff',
                color: '#000000',
                padding: '40px',
                maxWidth: '800px',
                margin: '0 auto',
                fontFamily: 'Arial, sans-serif',
                minHeight: '1000px',
              }}
            >
              {/* Header */}
              <div style={{ borderBottom: '2px solid #000000', paddingBottom: '15px', marginBottom: '25px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#000000', margin: '0 0 10px 0' }}>
                  {worksheet.title}
                </h1>
                <p style={{ fontSize: '14px', color: '#333333', margin: '0' }}>
                  {showAnswers ? 'Answer Key' : 'Student Worksheet'}
                </p>
                <div style={{ marginTop: '10px', fontSize: '12px', color: '#666666' }}>
                  <p style={{ margin: '5px 0' }}>Name: _______________________________</p>
                  <p style={{ margin: '5px 0' }}>Date: _______________________________</p>
                </div>
              </div>

              {/* Questions */}
              <div style={{ marginTop: '20px' }}>
                {worksheet.questions.map((q, idx) => (
                  <div key={idx} style={{ marginBottom: '35px', pageBreakInside: 'avoid' }}>
                    {/* Question Header */}
                    <div style={{ marginBottom: '10px' }}>
                      <span style={{ fontSize: '12px', color: '#666666', textTransform: 'uppercase', display: 'block', marginBottom: '5px' }}>
                        {formatQuestionType(q.type)}
                      </span>
                      <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#000000', margin: '0', lineHeight: '1.5' }}>
                        {idx + 1}. {q.question}
                      </p>
                    </div>

                    {/* Multiple choice options */}
                    {q.type === 'multiple_choice' && q.options && (
                      <div style={{ marginTop: '12px', marginLeft: '20px' }}>
                        {q.options.map((option, optIdx) => (
                          <div key={optIdx} style={{ marginBottom: '8px', display: 'flex', alignItems: 'flex-start' }}>
                            <span style={{ marginRight: '8px', fontSize: '14px' }}>
                              {String.fromCharCode(65 + optIdx)}.
                            </span>
                            <span style={{ fontSize: '14px', color: '#000000' }}>
                              {option}
                              {showAnswers && option === q.answer && (
                                <strong style={{ marginLeft: '10px' }}> (CORRECT)</strong>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Answer section for answer key */}
                    {showAnswers && (
                      <div style={{ marginTop: '15px', padding: '12px', backgroundColor: '#f0f0f0', border: '1px solid #cccccc' }}>
                        <p style={{ fontSize: '13px', fontWeight: 'bold', margin: '0 0 5px 0' }}>
                          ANSWER:
                        </p>
                        <p style={{ fontSize: '13px', margin: '0 0 10px 0' }}>
                          {q.answer}
                        </p>
                        {q.explanation && (
                          <>
                            <p style={{ fontSize: '13px', fontWeight: 'bold', margin: '10px 0 5px 0' }}>
                              EXPLANATION:
                            </p>
                            <p style={{ fontSize: '13px', margin: '0' }}>
                              {q.explanation}
                            </p>
                          </>
                        )}
                      </div>
                    )}

                    {/* Answer lines for student worksheet */}
                    {!showAnswers && q.type !== 'multiple_choice' && (
                      <div style={{ marginTop: '15px' }}>
                        <div style={{ borderBottom: '1px solid #000000', marginBottom: '12px', paddingTop: '25px' }}></div>
                        <div style={{ borderBottom: '1px solid #000000', marginBottom: '12px', paddingTop: '25px' }}></div>
                        <div style={{ borderBottom: '1px solid #000000', marginBottom: '12px', paddingTop: '25px' }}></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div style={{ marginTop: '40px', paddingTop: '15px', borderTop: '1px solid #cccccc', textAlign: 'center' }}>
                <p style={{ fontSize: '10px', color: '#666666', margin: '0' }}>
                  Generated with Modern Greek Learning Assistant
                </p>
              </div>
            </div>

            {/* Delete button */}
            {currentWorksheetId && (
              <div className="flex justify-center mt-4 sm:mt-6">
                <button
                  onClick={() => handleDelete(currentWorksheetId)}
                  className="btn btn-xs sm:btn-sm btn-error btn-outline"
                >
                  Delete This Worksheet
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
