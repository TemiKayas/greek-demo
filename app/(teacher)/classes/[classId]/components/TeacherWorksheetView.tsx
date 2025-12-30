'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getWorksheetSubmissions } from '@/app/actions/worksheet';
import { SubmissionReview } from './SubmissionReview';

type Submission = {
    id: string;
    student: {
        name: string;
        email: string;
    };
    submittedAt: Date;
    answers: any;
};

type TeacherWorksheetViewProps = {
  worksheet: {
    id: string;
    title: string;
    filePath: string;
  };
  onBack: () => void;
};

export function TeacherWorksheetView({ worksheet, onBack }: TeacherWorksheetViewProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  const loadSubmissions = useCallback(async () => {
    setLoading(true);
    const result = await getWorksheetSubmissions(worksheet.id);
    if (result.success && result.data) {
      setSubmissions(result.data as Submission[]);
    }
    setLoading(false);
  }, [worksheet.id]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  if (selectedSubmission) {
    return <SubmissionReview submission={selectedSubmission} onBack={() => setSelectedSubmission(null)} worksheet={worksheet} />;
  }

  return (
    <div className="card bg-base-200 shadow-xl">
      <div className="card-body">
        <div className="flex justify-between items-center mb-4">
          <h2 className="card-title text-primary-content">Submissions for "{worksheet.title}"</h2>
          <button onClick={onBack} className="btn btn-outline">← Back to Worksheets</button>
        </div>

        {loading ? (
          <div className="text-center p-8"><span className="loading loading-spinner loading-lg"></span></div>
        ) : submissions.length === 0 ? (
          <p className="text-center py-12">No submissions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Student Email</th>
                  <th>Submitted At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map(sub => (
                  <tr key={sub.id}>
                    <td>{sub.student.name}</td>
                    <td>{sub.student.email}</td>
                    <td>{new Date(sub.submittedAt).toLocaleString()}</td>
                    <td>
                      <button 
                        className="btn btn-sm btn-primary"
                        onClick={() => setSelectedSubmission(sub)}
                      >
                        Review
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
  );
}
