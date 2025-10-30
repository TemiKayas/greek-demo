'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getClassLessons } from '@/app/actions/lesson';

type Lesson = {
  id: string;
  name: string;
  description: string | null;
  creatorId: string;
  sharedAt?: Date;
  order?: number;
  _count?: {
    pdfs: number;
    materials: number;
  };
};

export default function StudentClassMaterialsPage() {
  const params = useParams();
  const classId = params?.classId as string;

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (classId) {
      loadLessons();
    }
  }, [classId]);

  async function loadLessons() {
    setLoading(true);
    const result = await getClassLessons(classId);
    if (result.success) {
      setLessons(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
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

  return (
    <div className="min-h-screen bg-base-200 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link
                href="/dashboard"
                className="btn btn-ghost btn-sm btn-circle"
              >
                <svg
                  className="w-5 h-5"
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
              </Link>
              <h1 className="text-4xl font-bold">Course Lessons</h1>
            </div>
            <p className="text-base-content/70 ml-12">
              Access learning materials organized by lesson
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="alert alert-error mb-6">
            <span>{error}</span>
          </div>
        )}

        {/* Lessons Grid */}
        {lessons.length === 0 ? (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body text-center py-16">
              <div className="inline-block p-4 bg-base-200 rounded-full mb-4 mx-auto">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-16 w-16 text-base-content/40"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-4">No lessons yet</h2>
              <p className="text-base-content/70">
                Your teacher hasn&apos;t added any lessons to this class yet. Check back later!
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lessons.map((lesson) => (
              <div key={lesson.id} className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
                <div className="card-body">
                  <h2 className="card-title text-xl">{lesson.name}</h2>
                  {lesson.description && (
                    <p className="text-base-content/70 text-sm line-clamp-3 mb-4">
                      {lesson.description}
                    </p>
                  )}

                  <div className="flex gap-6 mt-2">
                    <div className="flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-primary"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <div>
                        <div className="text-2xl font-bold text-base-content">
                          {lesson._count?.pdfs || 0}
                        </div>
                        <div className="text-xs text-base-content/60">PDFs</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-secondary"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                        />
                      </svg>
                      <div>
                        <div className="text-2xl font-bold text-base-content">
                          {lesson._count?.materials || 0}
                        </div>
                        <div className="text-xs text-base-content/60">Materials</div>
                      </div>
                    </div>
                  </div>

                  <div className="card-actions justify-end mt-6">
                    <Link
                      href={`/classes/${classId}/materials/lessons/${lesson.id}`}
                      className="btn btn-primary btn-sm"
                    >
                      Open Lesson
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
