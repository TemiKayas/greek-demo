'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { getWorksheetsForClass } from '@/app/actions/worksheet';
import { WorksheetGenerator } from './WorksheetGenerator';
import { TeacherWorksheetView } from './TeacherWorksheetView';

type Worksheet = {
  id: string;
  title: string;
  createdAt: Date;
  filePath: string;
};

export function WorksheetHome() {
  const params = useParams();
  const classId = params?.classId as string;

  const [worksheets, setWorksheets] = useState<Worksheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGeneratorModal, setShowGeneratorModal] = useState(false);
  const [viewingSubmissionsFor, setViewingSubmissionsFor] = useState<Worksheet | null>(null);

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

  function handleWorksheetCreated() {
    setShowGeneratorModal(false);
    loadWorksheets();
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
                        <button 
                            className="btn btn-sm btn-outline border-primary-content text-primary-content hover:bg-primary hover:border-primary"
                            onClick={() => setViewingSubmissionsFor(worksheet)}
                        >
                          View Submissions
                        </button>
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
          <div className="modal-box w-11/12 max-w-5xl">
            <h3 className="font-bold text-lg mb-4">Generate New Worksheet</h3>
            <WorksheetGenerator onWorksheetCreated={handleWorksheetCreated} />
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
