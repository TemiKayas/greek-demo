'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { getWorksheetsForStudent } from '@/app/actions/worksheet';
import { StudentWorksheetView } from './StudentWorksheetView';

type Worksheet = {
  id: string;
  title: string;
  createdAt: Date;
  filePath: string;
};

export function StudentWorksheetList() {
  const params = useParams();
  const classId = params?.classId as string;

  const [worksheets, setWorksheets] = useState<Worksheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorksheet, setSelectedWorksheet] = useState<Worksheet | null>(null);

  const loadWorksheets = useCallback(async () => {
    setLoading(true);
    const result = await getWorksheetsForStudent(classId);
    if (result.success && result.data) {
      setWorksheets(result.data as Worksheet[]);
    }
    setLoading(false);
  }, [classId]);

  useEffect(() => {
    if (classId) {
      loadWorksheets();
    }
  }, [classId, loadWorksheets]);

  if (selectedWorksheet) {
    return <StudentWorksheetView worksheet={selectedWorksheet} onBack={() => setSelectedWorksheet(null)} />;
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold text-primary-content mb-4">Worksheets</h2>
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      ) : worksheets.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-primary-content/80">
            No worksheets have been assigned yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {worksheets.map((worksheet) => (
            <div key={worksheet.id} className="card bg-base-200 shadow-md hover:shadow-lg transition-shadow">
              <div className="card-body">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="card-title text-primary-content">{worksheet.title}</h3>
                    <p className="text-sm text-primary-content/70">
                      Assigned on: {new Date(worksheet.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={() => setSelectedWorksheet(worksheet)}
                  >
                    Start
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
