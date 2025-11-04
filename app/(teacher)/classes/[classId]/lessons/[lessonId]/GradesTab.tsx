'use client';

import { useState, useEffect } from 'react';
import { getLessonWorksheetGrades } from '@/app/actions/worksheetSubmission';

type Grade = {
  worksheetId: string;
  score: number | null;
  totalPoints: number;
  submittedAt: Date | null;
};

type Student = {
  id: string;
  name: string;
  email: string;
  grades: Grade[];
};

type Worksheet = {
  id: string;
  title: string;
};

type Props = {
  classId: string;
  lessonId: string;
};

export default function GradesTab({ classId, lessonId }: Props) {
  const [students, setStudents] = useState<Student[]>([]);
  const [worksheets, setWorksheets] = useState<Worksheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGrades();
  }, [classId, lessonId]);

  async function loadGrades() {
    setLoading(true);
    setError(null);
    const result = await getLessonWorksheetGrades(classId, lessonId);

    if (result.success) {
      setStudents(result.data.students);
      setWorksheets(result.data.worksheets);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="alert alert-error max-w-md">
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (worksheets.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center">
          <div className="w-20 h-20 bg-base-300 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-12 h-12 text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-xl text-base-content/60 mb-2">No Worksheets in Packet</p>
          <p className="text-sm text-base-content/40">
            Add worksheets to the lesson packet to see student grades here.
          </p>
        </div>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center">
          <div className="w-20 h-20 bg-base-300 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-12 h-12 text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p className="text-xl text-base-content/60 mb-2">No Students Enrolled</p>
          <p className="text-sm text-base-content/40">
            Invite students to this class to see their worksheet grades.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6 bg-base-100">
      <div className="mb-6">
        <h3 className="text-2xl font-bold mb-2">Student Grades</h3>
        <p className="text-base-content/70">
          {students.length} students · {worksheets.length} worksheets
        </p>
      </div>

      {/* Grades Table */}
      <div className="overflow-x-auto">
        <table className="table table-zebra table-pin-rows table-pin-cols">
          <thead>
            <tr>
              <th className="bg-base-200">Student</th>
              {worksheets.map((worksheet) => (
                <th key={worksheet.id} className="bg-base-200 text-center min-w-[150px]">
                  <div className="truncate" title={worksheet.title}>
                    {worksheet.title}
                  </div>
                </th>
              ))}
              <th className="bg-base-200 text-center">Average</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => {
              const completedGrades = student.grades.filter(g => g.score !== null);
              const average = completedGrades.length > 0
                ? completedGrades.reduce((sum, g) => sum + (g.score || 0), 0) / completedGrades.length
                : null;

              return (
                <tr key={student.id}>
                  <td className="bg-base-200 font-medium">
                    <div>
                      <div className="font-bold">{student.name}</div>
                      <div className="text-xs text-base-content/60">{student.email}</div>
                    </div>
                  </td>
                  {student.grades.map((grade) => (
                    <td key={grade.worksheetId} className="text-center">
                      {grade.score !== null ? (
                        <div className="flex flex-col items-center gap-1">
                          <div
                            className={`badge ${
                              grade.score >= 90
                                ? 'badge-success'
                                : grade.score >= 70
                                ? 'badge-warning'
                                : 'badge-error'
                            }`}
                          >
                            {grade.score.toFixed(1)}%
                          </div>
                          <div className="text-xs text-base-content/50">
                            {new Date(grade.submittedAt!).toLocaleDateString()}
                          </div>
                        </div>
                      ) : (
                        <span className="text-base-content/40 text-xs">Not submitted</span>
                      )}
                    </td>
                  ))}
                  <td className="text-center font-bold">
                    {average !== null ? (
                      <div
                        className={`badge badge-lg ${
                          average >= 90
                            ? 'badge-success'
                            : average >= 70
                            ? 'badge-warning'
                            : 'badge-error'
                        }`}
                      >
                        {average.toFixed(1)}%
                      </div>
                    ) : (
                      <span className="text-base-content/40 text-xs">N/A</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card bg-base-200">
          <div className="card-body">
            <h4 className="card-title text-sm">Total Submissions</h4>
            <p className="text-3xl font-bold">
              {students.reduce((sum, s) => sum + s.grades.filter(g => g.score !== null).length, 0)}
            </p>
            <p className="text-xs text-base-content/60">
              out of {students.length * worksheets.length} possible
            </p>
          </div>
        </div>

        <div className="card bg-base-200">
          <div className="card-body">
            <h4 className="card-title text-sm">Class Average</h4>
            <p className="text-3xl font-bold">
              {(() => {
                const allScores = students
                  .flatMap(s => s.grades)
                  .filter(g => g.score !== null)
                  .map(g => g.score!);
                return allScores.length > 0
                  ? (allScores.reduce((sum, score) => sum + score, 0) / allScores.length).toFixed(1) + '%'
                  : 'N/A';
              })()}
            </p>
            <p className="text-xs text-base-content/60">
              across all worksheets
            </p>
          </div>
        </div>

        <div className="card bg-base-200">
          <div className="card-body">
            <h4 className="card-title text-sm">Completion Rate</h4>
            <p className="text-3xl font-bold">
              {(() => {
                const totalPossible = students.length * worksheets.length;
                const totalCompleted = students.reduce(
                  (sum, s) => sum + s.grades.filter(g => g.score !== null).length,
                  0
                );
                return totalPossible > 0
                  ? ((totalCompleted / totalPossible) * 100).toFixed(1) + '%'
                  : '0%';
              })()}
            </p>
            <p className="text-xs text-base-content/60">
              of all assignments
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
