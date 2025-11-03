'use client';

import { useState, useEffect } from 'react';
import { generateFlashcards, getFlashcards, deleteFlashcards, updateFlashcards } from '@/app/actions/flashcard';
import { autoAddToPacket } from '@/app/actions/packet-utils';

type Props = {
  pdfId: string;
  extractedText: string;
  lessonId?: string;
  flashcardId?: string | null; // Optional: Load a specific flashcard set
  onFlashcardGenerated?: () => void;
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

type EditingCard = {
  front: string;
  back: string;
  category: string;
};

export default function FlashcardTab({ pdfId, extractedText, lessonId, flashcardId, onFlashcardGenerated }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [flashcardSet, setFlashcardSet] = useState<FlashcardData | null>(null);
  const [editingFlashcardSet, setEditingFlashcardSet] = useState<FlashcardData | null>(null);
  const [currentSetId, setCurrentSetId] = useState<string | null>(null);
  const [currentCard, setCurrentCard] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [savedSets, setSavedSets] = useState<SavedFlashcardSet[]>([]);
  const [isLoadingPast, setIsLoadingPast] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'edit' | 'add'>('add');
  const [editingCardIndex, setEditingCardIndex] = useState<number | null>(null);
  const [modalCard, setModalCard] = useState<EditingCard>({
    front: '',
    back: '',
    category: 'Vocabulary',
  });

  useEffect(() => {
    loadPastFlashcards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfId]);

  // Load specific flashcard set when flashcardId prop changes
  useEffect(() => {
    if (flashcardId && savedSets.length > 0) {
      const found = savedSets.find(s => s.id === flashcardId);
      if (found) {
        loadFlashcardSet(found);
      }
    }
  }, [flashcardId, savedSets]);

  async function loadPastFlashcards() {
    setIsLoadingPast(true);
    const result = await getFlashcards(pdfId);
    if (result.success && result.data) {
      setSavedSets(result.data);
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
    console.log('[FlashcardTab] Generating flashcards, lessonId:', lessonId);
    const result = await generateFlashcards(pdfId);

    if (result.success && result.data) {
      console.log('[FlashcardTab] Flashcards generated:', result.data.id);
      setFlashcardSet(result.data.content);
      setCurrentSetId(result.data.id);
      setCurrentCard(0);
      setIsFlipped(false);
      setFilterCategory('all');
      await loadPastFlashcards();

      if (lessonId) {
        console.log('[FlashcardTab] Auto-adding flashcards to packet...');
        const addResult = await autoAddToPacket(lessonId, 'FLASHCARD', result.data.id);
        console.log('[FlashcardTab] Auto-add result:', addResult);
        if (onFlashcardGenerated) {
          console.log('[FlashcardTab] Triggering packet refresh callback');
          onFlashcardGenerated();
        }
      } else {
        console.warn('[FlashcardTab] No lessonId provided, skipping auto-add to packet');
      }
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
    setIsEditMode(false);
    setEditingFlashcardSet(null);
  }

  async function handleDelete(setId: string) {
    if (!confirm('Delete this flashcard set?')) return;

    const result = await deleteFlashcards(setId);
    if (result.success) {
      if (currentSetId === setId) {
        setFlashcardSet(null);
        setCurrentSetId(null);
      }
      await loadPastFlashcards();
    }
  }

  function enterEditMode() {
    if (!flashcardSet) return;
    setEditingFlashcardSet(JSON.parse(JSON.stringify(flashcardSet)));
    setIsEditMode(true);
  }

  function cancelEditing() {
    if (!confirm('Discard all changes?')) return;
    setEditingFlashcardSet(null);
    setIsEditMode(false);
  }

  async function saveChanges() {
    if (!editingFlashcardSet || !currentSetId) return;
    setIsSaving(true);
    const result = await updateFlashcards(currentSetId, editingFlashcardSet);
    if (result.success) {
      setFlashcardSet(editingFlashcardSet);
      setIsEditMode(false);
      setEditingFlashcardSet(null);
      alert('Flashcard set saved successfully!');
    } else {
      alert('Failed to save changes: ' + result.error);
    }
    setIsSaving(false);
  }

  // Modal functions
  function openAddCardModal() {
    setModalMode('add');
    setModalCard({
      front: '',
      back: '',
      category: 'Vocabulary',
    });
    setIsModalOpen(true);
  }

  function openEditCardModal(index: number) {
    if (!editingFlashcardSet) return;
    setModalMode('edit');
    setEditingCardIndex(index);
    setModalCard({
      front: editingFlashcardSet.cards[index].front,
      back: editingFlashcardSet.cards[index].back,
      category: editingFlashcardSet.cards[index].category,
    });
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingCardIndex(null);
  }

  function saveModalCard() {
    if (!editingFlashcardSet) return;

    if (!modalCard.front.trim() || !modalCard.back.trim()) {
      alert('Front and back cannot be empty');
      return;
    }

    const newCards = [...editingFlashcardSet.cards];

    if (modalMode === 'add') {
      newCards.push(modalCard);
    } else if (modalMode === 'edit' && editingCardIndex !== null) {
      newCards[editingCardIndex] = modalCard;
    }

    setEditingFlashcardSet({ ...editingFlashcardSet, cards: newCards });
    closeModal();
  }

  function deleteCard(index: number) {
    if (!editingFlashcardSet) return;
    if (!confirm('Delete this card?')) return;

    const newCards = editingFlashcardSet.cards.filter((_, i) => i !== index);
    setEditingFlashcardSet({ ...editingFlashcardSet, cards: newCards });
  }

  function updateTitle(title: string) {
    if (!editingFlashcardSet) return;
    setEditingFlashcardSet({ ...editingFlashcardSet, title });
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
    <div className="h-full flex flex-col p-4 sm:p-6 bg-base-100">
      {!flashcardSet ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-lg px-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <svg className="w-10 h-10 sm:w-12 sm:h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-base-content mb-3">Flashcard Builder</h3>
            <p className="text-sm sm:text-base text-base-content/60 mb-4 sm:mb-6">
              Automatically extract key concepts, vocabulary, and grammar rules from your PDF to create study
              flashcards. Perfect for memorizing Greek vocabulary and understanding grammar!
            </p>

            <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
              <div className="card bg-base-200 border border-base-content/10 p-3 sm:p-4 text-left">
                <h4 className="font-medium text-sm sm:text-base mb-2 text-primary">Flashcard Content:</h4>
                <ul className="text-xs sm:text-sm text-base-content/70 space-y-1">
                  <li>• Greek-English vocabulary with examples</li>
                  <li>• Grammar rules and conjugations</li>
                  <li>• Cultural facts and traditions</li>
                  <li>• Practical expressions and usage</li>
                  <li>• Key concepts and explanations</li>
                </ul>
              </div>

              {savedSets.length > 0 && (
                <div className="card bg-base-200 border border-base-content/10 p-3 sm:p-4">
                  <label className="block text-xs sm:text-sm font-medium mb-2 text-primary">
                    Load Previous Flashcard Set:
                  </label>
                  <select
                    className="select select-bordered w-full text-sm sm:text-base"
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
              className="btn btn-primary btn-md sm:btn-lg"
            >
              {isGenerating ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Generating Flashcards...
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
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                  Generate Flashcards
                </>
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
        <div className="flex-1 flex flex-col bg-base-100">
          {/* Header with title and actions */}
          <div className="mb-3 sm:mb-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <h3 className="text-lg sm:text-2xl font-bold text-base-content truncate">{flashcardSet.title}</h3>
            <div className="flex gap-2 w-full sm:w-auto">
              {!isEditMode && (
                <>
                  <button
                    onClick={enterEditMode}
                    className="btn btn-xs sm:btn-sm btn-primary flex-1 sm:flex-none"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span className="hidden sm:inline">Edit Cards</span>
                  </button>
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="btn btn-xs sm:btn-sm btn-outline flex-1 sm:flex-none"
                  >
                    {isGenerating ? (
                      <span className="loading loading-spinner loading-xs"></span>
                    ) : (
                      <span className="hidden sm:inline">Generate New Set</span>
                    )}
                    <span className="sm:hidden">New</span>
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  setFlashcardSet(null);
                  setCurrentSetId(null);
                  setIsEditMode(false);
                  setEditingFlashcardSet(null);
                }}
                className="btn btn-xs sm:btn-sm btn-ghost"
              >
                Close
              </button>
            </div>
          </div>

          {isEditMode ? (
            /* EDIT MODE */
            <div className="flex-1 flex flex-col">
              {/* Edit Header */}
              <div className="mb-4 p-4 bg-primary/10 rounded-lg border border-primary/20">
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                  <div className="flex-1 w-full sm:w-auto">
                    <label className="label label-text-alt mb-1">Set Title:</label>
                    <input
                      type="text"
                      value={editingFlashcardSet?.title || ''}
                      onChange={(e) => updateTitle(e.target.value)}
                      className="input input-bordered w-full"
                    />
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      onClick={saveChanges}
                      disabled={isSaving}
                      className="btn btn-success flex-1 sm:flex-none"
                    >
                      {isSaving ? (
                        <>
                          <span className="loading loading-spinner loading-xs"></span>
                          Saving...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Save Changes
                        </>
                      )}
                    </button>
                    <button
                      onClick={cancelEditing}
                      disabled={isSaving}
                      className="btn btn-ghost flex-1 sm:flex-none"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>

              {/* Add Card Button */}
              <div className="mb-4 flex justify-center">
                <button
                  onClick={openAddCardModal}
                  className="btn btn-primary btn-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add New Card
                </button>
              </div>

              {/* Cards List */}
              <div className="flex-1 overflow-y-auto space-y-3">
                {editingFlashcardSet?.cards.map((card, index) => (
                  <div
                    key={index}
                    className="card bg-base-200 border-2 border-base-300 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="badge badge-primary">{index + 1}</div>

                      <div className="flex-1 space-y-2">
                        <div className="badge badge-outline">{card.category}</div>
                        <div className="text-sm">
                          <div className="font-semibold text-primary mb-1">Front:</div>
                          <div className="whitespace-pre-wrap bg-base-100 p-2 rounded">{card.front}</div>
                        </div>
                        <div className="text-sm">
                          <div className="font-semibold text-secondary mb-1">Back:</div>
                          <div className="whitespace-pre-wrap bg-base-100 p-2 rounded">{card.back}</div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => openEditCardModal(index)}
                          className="btn btn-sm btn-square btn-ghost"
                          title="Edit card"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteCard(index)}
                          className="btn btn-sm btn-square btn-error btn-ghost"
                          title="Delete card"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {editingFlashcardSet?.cards.length === 0 && (
                  <div className="text-center py-12 text-base-content/60">
                    <p>No cards yet. Click "Add New Card" to create one.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* VIEW MODE */
            <>
              {/* Category filter */}
              {categories.length > 1 && (
                <div className="mb-3 sm:mb-4">
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => {
                        setFilterCategory('all');
                        setCurrentCard(0);
                        setIsFlipped(false);
                      }}
                      className={`btn btn-xs sm:btn-sm ${filterCategory === 'all' ? 'btn-primary' : 'btn-outline'}`}
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
                        className={`btn btn-xs sm:btn-sm ${filterCategory === cat ? 'btn-primary' : 'btn-outline'}`}
                      >
                        <span className="hidden sm:inline">{cat}</span>
                        <span className="sm:hidden">{cat.substring(0, 4)}</span>
                        ({flashcardSet.cards.filter(c => c.category === cat).length})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Progress */}
              <div className="mb-4 sm:mb-6 text-center">
                <p className="text-xs sm:text-sm text-base-content/70">
                  Card {currentCard + 1} of {filteredCards.length}
                  {filterCategory !== 'all' && ` (${filterCategory})`}
                </p>
                <progress
                  className="progress progress-primary w-full max-w-xs sm:max-w-md mt-2"
                  value={currentCard + 1}
                  max={filteredCards.length}
                ></progress>
              </div>

              {/* Flashcard */}
              <div className="flex-1 flex items-center justify-center px-4">
                <div className="relative w-full max-w-2xl">
                  <div
                    onClick={() => setIsFlipped(!isFlipped)}
                    className="cursor-pointer"
                    style={{ perspective: '1000px' }}
                  >
                    <div
                      className={`relative w-full h-64 sm:h-80 md:h-96 transition-transform duration-500 transform-style-3d`}
                      style={{
                        transformStyle: 'preserve-3d',
                        transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                      }}
                    >
                      {/* Front */}
                      <div
                        className="absolute w-full h-full bg-base-200 rounded-xl sm:rounded-2xl shadow-2xl border-2 sm:border-4 border-primary flex items-center justify-center p-4 sm:p-6 md:p-8"
                        style={{
                          backfaceVisibility: 'hidden',
                          WebkitBackfaceVisibility: 'hidden',
                        }}
                      >
                        <div className="text-center">
                          <p className="text-xs sm:text-sm text-primary uppercase font-bold mb-2 sm:mb-4">
                            {filteredCards[currentCard].category}
                          </p>
                          <p className="text-xl sm:text-2xl md:text-3xl font-bold text-base-content whitespace-pre-wrap">
                            {filteredCards[currentCard].front}
                          </p>
                          <p className="text-xs sm:text-sm text-base-content/50 mt-4 sm:mt-8">Click to flip</p>
                        </div>
                      </div>

                      {/* Back */}
                      <div
                        className="absolute w-full h-full bg-base-200 rounded-xl sm:rounded-2xl shadow-2xl border-2 sm:border-4 border-primary flex items-center justify-center p-4 sm:p-6 md:p-8 overflow-y-auto"
                        style={{
                          backfaceVisibility: 'hidden',
                          WebkitBackfaceVisibility: 'hidden',
                          transform: 'rotateY(180deg)',
                        }}
                      >
                        <div className="text-center">
                          <p className="text-xs sm:text-sm text-primary uppercase font-bold mb-2 sm:mb-4">
                            {filteredCards[currentCard].category}
                          </p>
                          <div className="text-sm sm:text-base md:text-lg text-base-content whitespace-pre-wrap leading-relaxed">
                            {filteredCards[currentCard].back}
                          </div>
                          <p className="text-xs sm:text-sm text-base-content/50 mt-4 sm:mt-8">Click to flip back</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-2 sm:gap-4 mt-4 sm:mt-8">
                <button
                  onClick={prevCard}
                  className="btn btn-outline btn-circle btn-sm sm:btn-md"
                  disabled={filteredCards.length <= 1}
                >
                  <svg
                    className="w-4 h-4 sm:w-6 sm:h-6"
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
                  className="btn btn-primary btn-sm sm:btn-md"
                >
                  {isFlipped ? 'Show Front' : 'Show Back'}
                </button>

                <button
                  onClick={nextCard}
                  className="btn btn-outline btn-circle btn-sm sm:btn-md"
                  disabled={filteredCards.length <= 1}
                >
                  <svg
                    className="w-4 h-4 sm:w-6 sm:h-6"
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
                <div className="flex justify-center mt-4 sm:mt-6">
                  <button
                    onClick={() => handleDelete(currentSetId)}
                    className="btn btn-xs sm:btn-sm btn-error btn-outline"
                  >
                    Delete This Flashcard Set
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Edit/Add Card Modal */}
      {isModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-lg mb-4">
              {modalMode === 'add' ? 'Add New Card' : 'Edit Card'}
            </h3>

            <div className="space-y-4">
              {/* Category */}
              <div>
                <label className="label">
                  <span className="label-text">Category</span>
                </label>
                <select
                  value={modalCard.category}
                  onChange={(e) => setModalCard({ ...modalCard, category: e.target.value })}
                  className="select select-bordered w-full"
                >
                  <option value="Vocabulary">Vocabulary</option>
                  <option value="Grammar">Grammar</option>
                  <option value="Culture">Culture</option>
                  <option value="Practical">Practical</option>
                  <option value="Concept">Concept</option>
                </select>
              </div>

              {/* Front */}
              <div>
                <label className="label">
                  <span className="label-text">Front (Question/Term)</span>
                </label>
                <textarea
                  value={modalCard.front}
                  onChange={(e) => setModalCard({ ...modalCard, front: e.target.value })}
                  className="textarea textarea-bordered w-full"
                  rows={3}
                  placeholder="Enter the front of the card..."
                />
              </div>

              {/* Back */}
              <div>
                <label className="label">
                  <span className="label-text">Back (Answer/Definition)</span>
                </label>
                <textarea
                  value={modalCard.back}
                  onChange={(e) => setModalCard({ ...modalCard, back: e.target.value })}
                  className="textarea textarea-bordered w-full"
                  rows={5}
                  placeholder="Enter the back of the card..."
                />
                <label className="label">
                  <span className="label-text-alt">Tip: Use line breaks to separate information</span>
                </label>
              </div>
            </div>

            <div className="modal-action">
              <button onClick={closeModal} className="btn btn-ghost">
                Cancel
              </button>
              <button onClick={saveModalCard} className="btn btn-primary">
                {modalMode === 'add' ? 'Add Card' : 'Save Changes'}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={closeModal}></div>
        </div>
      )}
    </div>
  );
}
