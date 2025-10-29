'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getStudentClasses } from '@/app/actions/class';

type StudentClass = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  joinedAt: Date;
  teacher: {
    id: string;
    name: string;
    email: string;
  };
  _count: {
    sharedMaterials: number;
    memberships: number;
  };
};

export default function StudentDashboardPage() {
  const [classes, setClasses] = useState<StudentClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadClasses();
  }, []);

  async function loadClasses() {
    setLoading(true);
    const result = await getStudentClasses();
    if (result.success) {
      setClasses(result.data);
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
        <div className="mb-8">
          <h1 className="text-4xl font-bold">My Classes</h1>
          <p className="text-base-content/70 mt-2">
            Access learning materials and resources from your classes
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="alert alert-error mb-6">
            <span>{error}</span>
          </div>
        )}

        {/* Classes Grid */}
        {classes.length === 0 ? (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body text-center py-16">
              <div className="inline-block p-4 bg-primary/10 rounded-full mb-4 mx-auto">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-16 w-16 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-4">No classes yet</h2>
              <p className="text-base-content/70 mb-6">
                You haven&apos;t joined any classes. Ask your teacher for an invite code
                to get started.
              </p>
              <div className="text-sm text-base-content/60">
                <p>Have an invite code?</p>
                <p className="mt-2">
                  Visit the invite link provided by your teacher or enter the code
                  at{' '}
                  <code className="bg-base-200 px-2 py-1 rounded">
                    /join/[CODE]
                  </code>
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((cls) => (
              <div key={cls.id} className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h2 className="card-title">{cls.name}</h2>
                  {cls.description && (
                    <p className="text-base-content/70 text-sm line-clamp-2">
                      {cls.description}
                    </p>
                  )}

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center text-sm">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-2 text-base-content/70"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      <span className="text-base-content/70">
                        Teacher: {cls.teacher.name}
                      </span>
                    </div>

                    <div className="flex items-center text-sm">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-2 text-base-content/70"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                      <span className="text-base-content/70">
                        {cls._count.memberships} students
                      </span>
                    </div>

                    <div className="flex items-center text-sm">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-2 text-base-content/70"
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
                      <span className="text-base-content/70">
                        {cls._count.sharedMaterials} materials
                      </span>
                    </div>

                    <div className="text-xs text-base-content/60 mt-2">
                      Joined {new Date(cls.joinedAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="card-actions justify-end mt-6">
                    <Link
                      href={`/classes/${cls.id}/materials`}
                      className="btn btn-primary btn-sm"
                    >
                      View Materials
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
