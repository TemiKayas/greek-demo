'use client';

import { useState, useEffect } from 'react';
import { generateFlashcards, getFlashcards, deleteFlashcards } from '@/app/actions/flashcard';

type Props = {
  pdfId: string;
  extractedText: string;
};

type Flashcard = {
  front: string;
  back: string;
  category: string;
};

type FlashcardData = {
  title: string;
  cards: Flashcard[];
};

type SavedFlashcardSet = {
  id: string;
  title: string;
  createdAt: Date;
  content: FlashcardData;
};

export default function FlashcardTab({ pdfId, extractedText }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [flashcardSet, setFlashcardSet] = useState<FlashcardData | null>(null);
  const [currentSetId, setCurrentSetId] = useState<string | null>(null);
  const [currentCard, setCurrentCard] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [savedSets, setSavedSets] = useState<SavedFlashcardSet[]>([]);
  const [isLoadingPast, setIsLoadingPast] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Auto-generate flashcards when tab is first opened
  useEffect(() => {
    loadPastFlashcards();
  }, [pdfId]);

  async function loadPastFlashcards() {
    setIsLoadingPast(true);
    const result = await getFlashcards(pdfId);
    if (result.success && result.data) {
      setSavedSets(result.data);
      // Auto-load the most recent set if no set is currently loaded
      if (!flashcardSet && result.data.length > 0) {
        const mostRecent = result.data[0];
        setFlashcardSet(mostRecent.content);
        setCurrentSetId(mostRecent.id);
      }
    }
    setIsLoadingPast(false);
  }

  async function handleGenerate() {
    setIsGenerating(true);
    const result = await generateFlashcards(pdfId);

    if (result.success && result.data) {
      setFlashcardSet(result.data.content);
      setCurrentSetId(result.data.id);
      setCurrentCard(0);
      setIsFlipped(false);
      setFilterCategory('all');
      // Reload past flashcards
      await loadPastFlashcards();
    } else {
      alert('Failed to generate flashcards: ' + result.error);
    }

    setIsGenerating(false);
  }

  function loadFlashcardSet(saved: SavedFlashcardSet) {
    setFlashcardSet(saved.content);
    setCurrentSetId(saved.id);
    setCurrentCard(0);
    setIsFlipped(false);
    setFilterCategory('all');
  }

  async function handleDelete(setId: string) {
    if (!confirm('Delete this flashcard set?')) return;

    const result = await deleteFlashcards(setId);
    if (result.success) {
      // If currently viewing deleted set, clear it
      if (currentSetId === setId) {
        setFlashcardSet(null);
        setCurrentSetId(null);
      }
      await loadPastFlashcards();
    }
  }

  function nextCard() {
    setIsFlipped(false);
    const filtered = getFilteredCards();
    setCurrentCard((prev) => (prev + 1) % filtered.length);
  }

  function prevCard() {
    setIsFlipped(false);
    const filtered = getFilteredCards();
    setCurrentCard((prev) => (prev - 1 + filtered.length) % filtered.length);
  }

  function getFilteredCards(): Flashcard[] {
    if (!flashcardSet) return [];
    if (filterCategory === 'all') return flashcardSet.cards;
    return flashcardSet.cards.filter(card => card.category === filterCategory);
  }

  function getCategories(): string[] {
    if (!flashcardSet) return [];
    const cats = new Set(flashcardSet.cards.map(card => card.category));
    return Array.from(cats);
  }

  const filteredCards = getFilteredCards();
  const categories = getCategories();

  return (
    <div className="h-full flex flex-col p-6 bg-gray-900">
      {!flashcardSet ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-lg">
            <div className="text-6xl mb-6">🗂️</div>
            <h3 className="text-2xl font-bold text-blue-400 mb-3">Flashcard Builder</h3>
            <p className="text-gray-300 mb-6">
              Automatically extract key concepts, vocabulary, and grammar rules from your PDF to create study
              flashcards. Perfect for memorizing Greek vocabulary and understanding grammar!
            </p>

            <div className="space-y-4 mb-8">
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-left">
                <h4 className="font-medium text-gray-300 mb-2">Flashcard Content:</h4>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>📚 Greek-English vocabulary with examples</li>
                  <li>📖 Grammar rules and conjugations</li>
                  <li>🏛️ Cultural facts and traditions</li>
                  <li>💬 Practical expressions and usage</li>
                  <li>💡 Key concepts and explanations</li>
                </ul>
              </div>

              {/* Past flashcard sets dropdown */}
              {savedSets.length > 0 && (
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Load Previous Flashcard Set:
                  </label>
                  <select
                    className="select select-bordered w-full bg-gray-700 border-gray-600 text-white"
                    onChange={(e) => {
                      const selected = savedSets.find(s => s.id === e.target.value);
                      if (selected) loadFlashcardSet(selected);
                    }}
                    disabled={isLoadingPast}
                  >
                    <option value="">Select a flashcard set...</option>
                    {savedSets.map((set) => (
                      <option key={set.id} value={set.id}>
                        {set.title} ({set.content.cards.length} cards) - {new Date(set.createdAt).toLocaleDateString()}
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
          {/* Header with title and actions */}
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-2xl font-bold text-white">{flashcardSet.title}</h3>
            <div className="flex gap-2">
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="btn btn-sm btn-outline text-gray-300 hover:text-white hover:border-blue-500"
              >
                {isGenerating ? (
                  <span className="loading loading-spinner loading-xs"></span>
                ) : (
                  'Generate New Set'
                )}
              </button>
              <button
                onClick={() => {
                  setFlashcardSet(null);
                  setCurrentSetId(null);
                }}
                className="btn btn-sm btn-ghost text-gray-400"
              >
                Close
              </button>
            </div>
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
                  className={`btn btn-sm ${filterCategory === 'all' ? 'btn-primary' : 'btn-outline text-gray-300'}`}
                >
                  All ({flashcardSet.cards.length})
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setFilterCategory(cat);
                      setCurrentCard(0);
                      setIsFlipped(false);
                    }}
                    className={`btn btn-sm ${filterCategory === cat ? 'btn-primary' : 'btn-outline text-gray-300'}`}
                  >
                    {cat} ({flashcardSet.cards.filter(c => c.category === cat).length})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Progress */}
          <div className="mb-6 text-center">
            <p className="text-sm text-gray-300">
              Card {currentCard + 1} of {filteredCards.length}
              {filterCategory !== 'all' && ` (${filterCategory})`}
            </p>
            <progress
              className="progress progress-primary w-64 mt-2"
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
                  className={`relative w-full h-96 transition-transform duration-500 transform-style-3d`}
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
                      <p className="text-xs text-blue-400 uppercase font-bold mb-4">
                        {filteredCards[currentCard].category}
                      </p>
                      <p className="text-3xl font-bold text-white whitespace-pre-wrap">
                        {filteredCards[currentCard].front}
                      </p>
                      <p className="text-sm text-gray-500 mt-8">Click to flip</p>
                    </div>
                  </div>

                  {/* Back */}
                  <div
                    className="absolute w-full h-full bg-blue-600 rounded-2xl shadow-2xl border-4 border-blue-400 flex items-center justify-center p-8 overflow-y-auto"
                    style={{
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                    }}
                  >
                    <div className="text-center">
                      <p className="text-xs text-white/80 uppercase font-bold mb-4">
                        {filteredCards[currentCard].category}
                      </p>
                      <div className="text-lg text-white whitespace-pre-wrap leading-relaxed">
                        {filteredCards[currentCard].back}
                      </div>
                      <p className="text-sm text-white/70 mt-8">Click to flip back</p>
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
              className="btn btn-outline btn-circle text-gray-300 hover:text-white hover:border-blue-500"
              disabled={filteredCards.length <= 1}
            >
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

            <button
              onClick={() => setIsFlipped(!isFlipped)}
              className="btn btn-primary"
            >
              {isFlipped ? 'Show Front' : 'Show Back'}
            </button>

            <button
              onClick={nextCard}
              className="btn btn-outline btn-circle text-gray-300 hover:text-white hover:border-blue-500"
              disabled={filteredCards.length <= 1}
            >
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

          {/* Delete button */}
          {currentSetId && (
            <div className="flex justify-center mt-6">
              <button
                onClick={() => handleDelete(currentSetId)}
                className="btn btn-sm btn-error btn-outline"
              >
                Delete This Flashcard Set
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
