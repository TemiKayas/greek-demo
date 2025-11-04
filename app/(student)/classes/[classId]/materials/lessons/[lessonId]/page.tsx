'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getLessonDetails } from '@/app/actions/lesson';
import { getPublishedPacket } from '@/app/actions/packet';
import { submitWorksheet, getWorksheetSubmission } from '@/app/actions/worksheetSubmission';
import StudentChatbot from './StudentChatbot';
import StudentPacketTabs from './StudentPacketTabs';
import { PacketItemType } from '@prisma/client';
import dynamic from 'next/dynamic';

const PDFViewer = dynamic(() => import('@/app/library/components/PDFViewer'), {
  ssr: false,
});

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

type Tab = 'materials' | 'chat';

export default function StudentLessonMaterialsPage() {
  const params = useParams();
  const classId = params?.classId as string;
  const lessonId = params?.lessonId as string;

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('materials');
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [activeItemType, setActiveItemType] = useState<PacketItemType | null>(null);
  const [activeItemData, setActiveItemData] = useState<any>(null);

  useEffect(() => {
    if (lessonId) {
      loadLesson();
      loadPacketData();
    }
  }, [lessonId]);

  async function loadLesson() {
    setLoading(true);
    const result = await getLessonDetails(lessonId);
    if (result.success) {
      setLesson(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }

  async function loadPacketData() {
    const result = await getPublishedPacket(lessonId);
    if (result.success && result.data) {
      const items = result.data.items || [];
      // Auto-select first item if available
      if (items.length > 0 && !activeItemId) {
        const firstItem = items[0];
        setActiveItemId(firstItem.itemId);
        setActiveItemType(firstItem.itemType);
        setActiveItemData(firstItem.itemData);
      }
    }
  }

  function handleTabChange(itemId: string, type: PacketItemType) {
    // Load the item data from the packet
    getPublishedPacket(lessonId).then((result) => {
      if (result.success && result.data) {
        const item = result.data.items.find((i: any) => i.itemId === itemId);
        if (item) {
          setActiveItemId(itemId);
          setActiveItemType(type);
          setActiveItemData(item.itemData);
          setActiveTab('materials');
        }
      }
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-base-200 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="min-h-screen bg-base-200 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="alert alert-error mb-4">
            <span>{error || 'Lesson not found'}</span>
          </div>
          <Link
            href={`/classes/${classId}/materials`}
            className="btn btn-ghost"
          >
            ← Back to Lessons
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 flex flex-col">
      {/* Header */}
      <div className="bg-base-100 shadow-sm border-b border-base-content/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href={`/classes/${classId}/materials`}
                className="btn btn-ghost btn-sm btn-circle"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">{lesson.name}</h1>
                {lesson.description && (
                  <p className="text-sm text-base-content/70">{lesson.description}</p>
                )}
              </div>
            </div>
            <Link href="/dashboard" className="btn btn-ghost btn-sm">
              Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full">
        {/* Packet Tabs */}
        <StudentPacketTabs
          lessonId={lessonId}
          activeItemId={activeItemId}
          onTabChange={handleTabChange}
        />

        {/* Tab Navigation */}
        <div className="bg-base-100 border-b border-base-content/10 px-4">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('materials')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'materials'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-base-content/70 hover:text-base-content'
              }`}
            >
              <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Study Materials
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'chat'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-base-content/70 hover:text-base-content'
              }`}
            >
              <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              AI Study Assistant
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-base-100">
          {activeTab === 'materials' ? (
            <div className="h-full">
              {activeItemData ? (
                <div className="h-full">
                  {activeItemType === 'PDF' && activeItemData.id && (
                    <PDFViewer pdfId={activeItemData.id} />
                  )}
                  {activeItemType === 'PDF' && !activeItemData.id && (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center text-base-content/60">
                        <p className="text-lg font-medium">PDF not available</p>
                        <p className="text-sm mt-1">The PDF file could not be loaded.</p>
                      </div>
                    </div>
                  )}
                  {activeItemType === 'WORKSHEET' && (
                    <StudentWorksheetViewer
                      worksheet={JSON.parse(activeItemData.content)}
                      worksheetId={activeItemData.id}
                      classId={classId}
                      lessonId={lessonId}
                    />
                  )}
                  {activeItemType === 'FLASHCARD' && (
                    <StudentFlashcardViewer flashcards={JSON.parse(activeItemData.content)} />
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-base-content/60">
                    <svg className="w-20 h-20 mx-auto mb-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-lg font-medium">No Material Selected</p>
                    <p className="text-sm mt-1">Click a tab above to view materials.</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-[600px]">
              <StudentChatbot classId={classId} lessonId={lessonId} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Student Worksheet Viewer (Interactive with submission)
function StudentWorksheetViewer({
  worksheet,
  worksheetId,
  classId,
  lessonId,
}: {
  worksheet: any;
  worksheetId: string;
  classId: string;
  lessonId: string;
}) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showAnswers, setShowAnswers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submission, setSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubmission();
  }, [worksheetId]);

  async function loadSubmission() {
    setLoading(true);
    const result = await getWorksheetSubmission(worksheetId, classId);
    if (result.success && result.data) {
      setSubmission(result.data);
      setAnswers(result.data.answers || {});
    }
    setLoading(false);
  }

  async function handleSubmit() {
    if (Object.keys(answers).length === 0) {
      alert('Please answer at least one question before submitting.');
      return;
    }

    setSubmitting(true);
    const result = await submitWorksheet(classId, lessonId, worksheetId, answers);

    if (result.success) {
      alert(`Submitted! Your score: ${result.data.score.toFixed(1)}%`);
      await loadSubmission(); // Reload to show updated submission
    } else {
      alert('Failed to submit: ' + result.error);
    }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6 bg-base-100">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">{worksheet.title}</h2>
            <div className="flex gap-2">
              {submission && (
                <div className="badge badge-lg badge-success gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Score: {submission.score?.toFixed(1)}%
                </div>
              )}
              <button
                onClick={() => setShowAnswers(!showAnswers)}
                className="btn btn-sm btn-outline"
                disabled={!submission}
              >
                {showAnswers ? 'Hide Answers' : 'Show Answers'}
              </button>
            </div>
          </div>

          {submission && (
            <div className="alert alert-info">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                Last submitted: {new Date(submission.submittedAt).toLocaleString()}. You can resubmit to update your answers.
              </span>
            </div>
          )}
        </div>

        {/* Questions */}
        <div className="space-y-6">
          {worksheet.questions.map((q: any, index: number) => (
            <div key={index} className="card bg-base-200 p-6">
              <div className="flex gap-3">
                <div className="badge badge-primary">{index + 1}</div>
                <div className="flex-1">
                  <p className="font-medium mb-3">{q.question}</p>

                  {q.type === 'multiple_choice' && q.options && (
                    <div className="space-y-2 mb-3">
                      {q.options.map((opt: string, optIndex: number) => (
                        <div
                          key={optIndex}
                          className={`p-2 rounded ${
                            showAnswers && opt === q.answer
                              ? 'bg-success/20 border border-success'
                              : 'bg-base-100'
                          }`}
                        >
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`q${index}`}
                              className="radio radio-sm"
                              checked={answers[index] === opt}
                              onChange={() =>
                                setAnswers(prev => ({ ...prev, [index]: opt }))
                              }
                            />
                            <span>{opt}</span>
                          </label>
                        </div>
                      ))}
                    </div>
                  )}

                  {q.type === 'true_false' && (
                    <div className="space-y-2 mb-3">
                      <div className={`p-2 rounded ${showAnswers && q.answer === 'True' ? 'bg-success/20 border border-success' : 'bg-base-100'}`}>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`q${index}`}
                            className="radio radio-sm"
                            checked={answers[index] === 'True'}
                            onChange={() =>
                              setAnswers(prev => ({ ...prev, [index]: 'True' }))
                            }
                          />
                          <span>True</span>
                        </label>
                      </div>
                      <div className={`p-2 rounded ${showAnswers && q.answer === 'False' ? 'bg-success/20 border border-success' : 'bg-base-100'}`}>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`q${index}`}
                            className="radio radio-sm"
                            checked={answers[index] === 'False'}
                            onChange={() =>
                              setAnswers(prev => ({ ...prev, [index]: 'False' }))
                            }
                          />
                          <span>False</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {(q.type === 'fill_blank' || q.type === 'short_answer') && (
                    <textarea
                      className="textarea textarea-bordered w-full mb-3"
                      rows={q.type === 'short_answer' ? 3 : 1}
                      placeholder="Your answer..."
                      value={answers[index] || ''}
                      onChange={e =>
                        setAnswers(prev => ({ ...prev, [index]: e.target.value }))
                      }
                    />
                  )}

                  {showAnswers && (
                    <div className="mt-3 p-3 bg-success/10 rounded border border-success/30">
                      <p className="text-sm font-semibold text-success mb-1">Correct Answer:</p>
                      <p className="text-sm">{q.answer}</p>
                      {q.explanation && (
                        <>
                          <p className="text-sm font-semibold text-success mt-2 mb-1">Explanation:</p>
                          <p className="text-sm text-base-content/70">{q.explanation}</p>
                        </>
                      )}
                      {answers[index] && (
                        <>
                          <p className="text-sm font-semibold text-primary mt-2 mb-1">Your Answer:</p>
                          <p className="text-sm">{answers[index]}</p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Submit Button */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={handleSubmit}
            className={`btn btn-primary btn-lg ${submitting ? 'loading' : ''}`}
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : submission ? 'Resubmit Worksheet' : 'Submit Worksheet'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Student Flashcard Viewer (Interactive)
function StudentFlashcardViewer({ flashcards }: { flashcards: any }) {
  const [currentCard, setCurrentCard] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');

  const filteredCards = filterCategory === 'all'
    ? flashcards.cards
    : flashcards.cards.filter((c: any) => c.category === filterCategory);

  const categories = Array.from(new Set(flashcards.cards.map((c: any) => c.category)));

  function nextCard() {
    setIsFlipped(false);
    setCurrentCard((prev) => (prev + 1) % filteredCards.length);
  }

  function prevCard() {
    setIsFlipped(false);
    setCurrentCard((prev) => (prev - 1 + filteredCards.length) % filteredCards.length);
  }

  if (!filteredCards || filteredCards.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-base-content/60">No flashcards available.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6 bg-base-100">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold">{flashcards.title}</h2>
      </div>

      {/* Category filter */}
      {categories.length > 1 && (
        <div className="mb-4">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => {
                setFilterCategory('all');
                setCurrentCard(0);
                setIsFlipped(false);
              }}
              className={`btn btn-sm ${filterCategory === 'all' ? 'btn-primary' : 'btn-outline'}`}
            >
              All ({flashcards.cards.length})
            </button>
            {categories.map((cat: any) => (
              <button
                key={cat}
                onClick={() => {
                  setFilterCategory(cat);
                  setCurrentCard(0);
                  setIsFlipped(false);
                }}
                className={`btn btn-sm ${filterCategory === cat ? 'btn-primary' : 'btn-outline'}`}
              >
                {cat} ({flashcards.cards.filter((c: any) => c.category === cat).length})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Progress */}
      <div className="mb-6 text-center">
        <p className="text-sm text-base-content/70">
          Card {currentCard + 1} of {filteredCards.length}
          {filterCategory !== 'all' && ` (${filterCategory})`}
        </p>
        <progress
          className="progress progress-primary w-full max-w-md mt-2"
          value={currentCard + 1}
          max={filteredCards.length}
        ></progress>
      </div>

      {/* Flashcard */}
      <div className="flex-1 flex items-center justify-center">
        <div className="relative w-full max-w-2xl">
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="cursor-pointer"
            style={{ perspective: '1000px' }}
          >
            <div
              className="relative w-full h-80 md:h-96 transition-transform duration-500"
              style={{
                transformStyle: 'preserve-3d',
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              }}
            >
              {/* Front */}
              <div
                className="absolute w-full h-full bg-base-200 rounded-2xl shadow-2xl border-4 border-primary flex items-center justify-center p-8"
                style={{
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                }}
              >
                <div className="text-center">
                  <p className="text-sm text-primary uppercase font-bold mb-4">
                    {filteredCards[currentCard].category}
                  </p>
                  <p className="text-3xl font-bold text-base-content whitespace-pre-wrap">
                    {filteredCards[currentCard].front}
                  </p>
                  <p className="text-sm text-base-content/50 mt-8">Click to flip</p>
                </div>
              </div>

              {/* Back */}
              <div
                className="absolute w-full h-full bg-base-200 rounded-2xl shadow-2xl border-4 border-primary flex items-center justify-center p-8 overflow-y-auto"
                style={{
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                }}
              >
                <div className="text-center">
                  <p className="text-sm text-primary uppercase font-bold mb-4">
                    {filteredCards[currentCard].category}
                  </p>
                  <div className="text-lg text-base-content whitespace-pre-wrap leading-relaxed">
                    {filteredCards[currentCard].back}
                  </div>
                  <p className="text-sm text-base-content/50 mt-8">Click to flip back</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 mt-8">
        <button
          onClick={prevCard}
          className="btn btn-outline btn-circle"
          disabled={filteredCards.length <= 1}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          onClick={() => setIsFlipped(!isFlipped)}
          className="btn btn-primary"
        >
          {isFlipped ? 'Show Front' : 'Show Back'}
        </button>

        <button
          onClick={nextCard}
          className="btn btn-outline btn-circle"
          disabled={filteredCards.length <= 1}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
