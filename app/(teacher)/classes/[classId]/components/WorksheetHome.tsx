'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { getWorksheetsForClass, deleteWorksheet } from '@/app/actions/worksheet';
import { WorksheetGenerator } from './WorksheetGenerator';
import { TeacherWorksheetView } from './TeacherWorksheetView';
import { WorksheetPreview } from './WorksheetPreview';
import { put } from '@vercel/blob';

type Worksheet = {
  id: string;
  title: string;
  createdAt: Date;
  filePath: string;
};

type WorksheetData = {
  title: string;
  questions: Array<{
    question_text: string;
    type: 'multiple_choice' | 'true_false' | 'short_answer' | 'paragraph';
    options?: string[];
    right_answer: string | null;
  }>;
};

export function WorksheetHome() {
  const params = useParams();
  const classId = params?.classId as string;

  const [worksheets, setWorksheets] = useState<Worksheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGeneratorModal, setShowGeneratorModal] = useState(false);
  const [viewingSubmissionsFor, setViewingSubmissionsFor] = useState<Worksheet | null>(null);
  const [previewData, setPreviewData] = useState<WorksheetData | null>(null);
  const [previewingWorksheet, setPreviewingWorksheet] = useState<Worksheet | null>(null);

  const loadWorksheets = useCallback(async () => {
    setLoading(true);
    const result = await getWorksheetsForClass(classId);
    if (result.success && result.data) {
      setWorksheets(result.data);
    }
    setLoading(false);
  }, [classId]);

  useEffect(() => {
    if (classId) {
      loadWorksheets();
    }
  }, [classId, loadWorksheets]);

  function handleWorksheetGenerated(data: WorksheetData) {
    setPreviewData(data);
    setShowGeneratorModal(false);
  }

  async function handleSaveNewWorksheet(data: WorksheetData) {
    try {
      // Save to blob storage
      const uniqueId = crypto.randomUUID();
      const fileName = `worksheets/${classId}/${uniqueId}.json`;
      const blob = await put(fileName, JSON.stringify(data), {
        access: 'public',
        addRandomSuffix: false,
      });

      // Create database record
      const response = await fetch('/api/worksheet/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId,
          title: data.title,
          filePath: blob.url,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save worksheet');
      }

      // Clear preview and reload list
      setPreviewData(null);
      loadWorksheets();
    } catch (error) {
      console.error('Error saving worksheet:', error);
      throw error;
    }
  }

  async function handleSaveExistingWorksheet(data: WorksheetData) {
    if (!previewingWorksheet) return;

    try {
      // Update blob storage
      const response = await fetch(previewingWorksheet.filePath);
      const existingData = await response.json();

      // Re-upload with same path
      const fileName = previewingWorksheet.filePath.split('/').slice(-2).join('/');
      await put(fileName, JSON.stringify(data), {
        access: 'public',
        addRandomSuffix: false,
      });

      // Update database if title changed
      if (data.title !== previewingWorksheet.title) {
        const updateResponse = await fetch('/api/worksheet/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            worksheetId: previewingWorksheet.id,
            title: data.title,
          }),
        });

        if (!updateResponse.ok) {
          throw new Error('Failed to update worksheet');
        }
      }

      // Clear preview and reload
      setPreviewingWorksheet(null);
      loadWorksheets();
    } catch (error) {
      console.error('Error updating worksheet:', error);
      throw error;
    }
  }

  async function handlePreviewExistingWorksheet(worksheet: Worksheet) {
    try {
      const response = await fetch(worksheet.filePath);
      const data = await response.json();
      setPreviewingWorksheet(worksheet);
      setPreviewData(data);
    } catch (error) {
      console.error('Error loading worksheet for preview:', error);
      alert('Failed to load worksheet');
    }
  }

  function handleCancelPreview() {
    setPreviewData(null);
    setPreviewingWorksheet(null);
  }

  async function handleDeleteWorksheet(worksheet: Worksheet) {
    const confirmMessage = `Are you sure you want to delete "${worksheet.title}"?\n\nThis will also delete all student submissions for this worksheet.\n\nThis action cannot be undone.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const result = await deleteWorksheet(worksheet.id);

      if (result.success) {
        alert('Worksheet deleted successfully');
        loadWorksheets();
      } else {
        alert(`Failed to delete worksheet: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting worksheet:', error);
      alert('Failed to delete worksheet. Please try again.');
    }
  }

  // Show preview if worksheet data exists
  if (previewData) {
    return (
      <div className="p-4">
        <WorksheetPreview
          initialData={previewData}
          classId={classId}
          onSave={previewingWorksheet ? handleSaveExistingWorksheet : handleSaveNewWorksheet}
          onCancel={handleCancelPreview}
          isNewWorksheet={!previewingWorksheet}
        />
      </div>
    );
  }

  if (viewingSubmissionsFor) {
    return <TeacherWorksheetView worksheet={viewingSubmissionsFor} onBack={() => setViewingSubmissionsFor(null)} />;
  }

  return (
    <>
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <div className="flex justify-between items-center mb-4">
            <h2 className="card-title text-primary-content">Worksheets</h2>
            <button
              className="btn btn-primary"
              onClick={() => setShowGeneratorModal(true)}
            >
              Create New Worksheet
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <span className="loading loading-spinner loading-lg text-primary"></span>
            </div>
          ) : worksheets.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-primary-content/80 mb-4">
                No worksheets have been created yet.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr className="text-primary-content">
                    <th>Title</th>
                    <th>Created At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {worksheets.map((worksheet) => (
                    <tr key={worksheet.id} className="text-primary-content/90 hover:bg-base-300">
                      <td>{worksheet.title}</td>
                      <td>{new Date(worksheet.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div className="flex gap-2">
                          <button
                            className="btn btn-sm btn-outline border-primary-content text-primary-content hover:bg-primary hover:border-primary"
                            onClick={() => handlePreviewExistingWorksheet(worksheet)}
                          >
                            Preview
                          </button>
                          <button
                            className="btn btn-sm btn-outline border-primary-content text-primary-content hover:bg-primary hover:border-primary"
                            onClick={() => setViewingSubmissionsFor(worksheet)}
                          >
                            View Submissions
                          </button>
                          <button
                            className="btn btn-sm btn-outline border-error text-error hover:bg-error hover:text-error-content"
                            onClick={() => handleDeleteWorksheet(worksheet)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showGeneratorModal && (
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-5xl bg-base-100">
            <h3 className="font-bold text-lg mb-4 text-base-content">Generate New Worksheet</h3>
            <WorksheetGenerator onWorksheetGenerated={handleWorksheetGenerated} />
            <div className="modal-action">
              <button
                onClick={() => setShowGeneratorModal(false)}
                className="btn"
              >
                Close
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowGeneratorModal(false)}></div>
        </div>
      )}
    </>
  );
}
