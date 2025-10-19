'use client';

import { useState } from 'react';

type Props = {
  pdfId: string;
  extractedText: string;
};

type Flashcard = {
  front: string;
  back: string;
};

export default function FlashcardTab({ pdfId, extractedText }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentCard, setCurrentCard] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  async function handleGenerate() {
    setIsGenerating(true);
    // TODO: Implement flashcard generation with Gemini
    setTimeout(() => {
      setFlashcards([
        { front: 'Γεια σου', back: 'Hello (informal)' },
        { front: 'Ευχαριστώ', back: 'Thank you' },
        { front: 'Παρακαλώ', back: 'Please / You\'re welcome' },
      ]);
      setCurrentCard(0);
      setIsFlipped(false);
      setIsGenerating(false);
    }, 2000);
  }

  function nextCard() {
    setIsFlipped(false);
    setCurrentCard((prev) => (prev + 1) % flashcards.length);
  }

  function prevCard() {
    setIsFlipped(false);
    setCurrentCard((prev) => (prev - 1 + flashcards.length) % flashcards.length);
  }

  return (
    <div className="h-full flex flex-col p-6 bg-gray-900">
      {flashcards.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-lg">
            <div className="text-6xl mb-6">🗂️</div>
            <h3 className="text-2xl font-bold text-blue-400 mb-3">Flashcard Builder</h3>
            <p className="text-gray-300 mb-6">
              Automatically extract key vocabulary and concepts from your PDF to create study
              flashcards. Perfect for memorizing Greek vocabulary!
            </p>

            <div className="space-y-4 mb-8">
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-left">
                <h4 className="font-medium text-gray-300 mb-2">Features:</h4>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>✓ Greek-English vocabulary cards</li>
                  <li>✓ Key terms and definitions</li>
                  <li>✓ Interactive review mode</li>
                  <li>✓ Track your progress</li>
                  <li>✓ Shuffle for better learning</li>
                </ul>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !extractedText}
              className="btn btn-primary btn-lg"
            >
              {isGenerating ? (
                <>
                  <span className="loading loading-spinner"></span>
                  Generating Flashcards...
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
                  Generate Flashcards
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
        <div className="flex-1 flex flex-col bg-gray-900">
          {/* Progress */}
          <div className="mb-6 text-center">
            <p className="text-sm text-gray-300">
              Card {currentCard + 1} of {flashcards.length}
            </p>
            <progress
              className="progress progress-primary w-64 mt-2"
              value={currentCard + 1}
              max={flashcards.length}
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
                  className={`relative w-full h-96 transition-transform duration-500 transform-style-3d ${
                    isFlipped ? 'rotate-y-180' : ''
                  }`}
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  }}
                >
                  {/* Front */}
                  <div
                    className="absolute w-full h-full bg-gray-800 rounded-2xl shadow-2xl border-4 border-blue-500 flex items-center justify-center p-8"
                    style={{
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden',
                    }}
                  >
                    <div className="text-center">
                      <p className="text-sm text-gray-400 mb-4">Greek Term</p>
                      <p className="text-4xl font-bold text-blue-400">
                        {flashcards[currentCard].front}
                      </p>
                      <p className="text-sm text-gray-500 mt-8">Click to flip</p>
                    </div>
                  </div>

                  {/* Back */}
                  <div
                    className="absolute w-full h-full bg-blue-600 rounded-2xl shadow-2xl border-4 border-blue-400 flex items-center justify-center p-8"
                    style={{
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                    }}
                  >
                    <div className="text-center">
                      <p className="text-sm text-white/80 mb-4">English Translation</p>
                      <p className="text-4xl font-bold text-white">
                        {flashcards[currentCard].back}
                      </p>
                      <p className="text-sm text-white/70 mt-8">Click to flip back</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <button onClick={prevCard} className="btn btn-outline btn-circle text-gray-300 hover:text-white hover:border-blue-500">
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
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <button onClick={() => setIsFlipped(!isFlipped)} className="btn btn-primary">
              {isFlipped ? 'Show Front' : 'Show Back'}
            </button>

            <button onClick={nextCard} className="btn btn-outline btn-circle text-gray-300 hover:text-white hover:border-blue-500">
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
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>

          <div className="flex justify-center gap-3 mt-6">
            <button
              onClick={() => {
                setFlashcards([]);
                setCurrentCard(0);
                setIsFlipped(false);
              }}
              className="btn btn-outline btn-sm text-gray-300 hover:text-white hover:border-blue-500"
            >
              Generate New Set
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
