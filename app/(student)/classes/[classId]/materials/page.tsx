'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getClassMaterials, getClassDetails } from '@/app/actions/class';

type Material = {
  id: string;
  type: 'FLASHCARD' | 'WORKSHEET' | 'SUMMARY' | 'CHAT';
  content: any;
  createdAt: Date;
  sharedAt: Date;
  pdf: {
    id: string;
    fileName: string;
    blobUrl: string;
    createdAt: Date;
  } | null;
};

type ClassInfo = {
  id: string;
  name: string;
  description: string | null;
  teacher: {
    name: string;
  };
};

export default function ClassMaterialsPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params?.classId as string;

  const [materials, setMaterials] = useState<Material[]>([]);
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');

  useEffect(() => {
    if (classId) {
      loadData();
    }
  }, [classId]);

  async function loadData() {
    setLoading(true);

    // Load class info and materials in parallel
    const [materialsResult, classResult] = await Promise.all([
      getClassMaterials(classId),
      getClassDetails(classId),
    ]);

    if (materialsResult.success) {
      setMaterials(materialsResult.data);
    } else {
      setError(materialsResult.error);
    }

    if (classResult.success) {
      setClassInfo(classResult.data);
    }

    setLoading(false);
  }

  function getMaterialIcon(type: string) {
    switch (type) {
      case 'FLASHCARD':
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
            />
          </svg>
        );
      case 'WORKSHEET':
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
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
        );
      case 'SUMMARY':
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h7"
            />
          </svg>
        );
      case 'CHAT':
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        );
      default:
        return null;
    }
  }

  function getMaterialColor(type: string) {
    switch (type) {
      case 'FLASHCARD':
        return 'bg-blue-500/10 text-blue-500';
      case 'WORKSHEET':
        return 'bg-green-500/10 text-green-500';
      case 'SUMMARY':
        return 'bg-purple-500/10 text-purple-500';
      case 'CHAT':
        return 'bg-orange-500/10 text-orange-500';
      default:
        return 'bg-base-300 text-base-content';
    }
  }

  const filteredMaterials =
    filterType === 'ALL'
      ? materials
      : materials.filter((m) => m.type === filterType);

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

  if (error) {
    return (
      <div className="min-h-screen bg-base-200 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="alert alert-error">
            <span>{error}</span>
          </div>
          <Link href="/dashboard" className="btn btn-ghost mt-4">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard" className="btn btn-ghost btn-sm mb-2">
            ← Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold">{classInfo?.name || 'Class Materials'}</h1>
          {classInfo?.description && (
            <p className="text-base-content/70 mt-2">{classInfo.description}</p>
          )}
          {classInfo?.teacher && (
            <p className="text-sm text-base-content/60 mt-1">
              Teacher: {classInfo.teacher.name}
            </p>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="tabs tabs-boxed mb-6">
          <a
            className={`tab ${filterType === 'ALL' ? 'tab-active' : ''}`}
            onClick={() => setFilterType('ALL')}
          >
            All ({materials.length})
          </a>
          <a
            className={`tab ${filterType === 'FLASHCARD' ? 'tab-active' : ''}`}
            onClick={() => setFilterType('FLASHCARD')}
          >
            Flashcards ({materials.filter((m) => m.type === 'FLASHCARD').length})
          </a>
          <a
            className={`tab ${filterType === 'WORKSHEET' ? 'tab-active' : ''}`}
            onClick={() => setFilterType('WORKSHEET')}
          >
            Worksheets ({materials.filter((m) => m.type === 'WORKSHEET').length})
          </a>
          <a
            className={`tab ${filterType === 'SUMMARY' ? 'tab-active' : ''}`}
            onClick={() => setFilterType('SUMMARY')}
          >
            Summaries ({materials.filter((m) => m.type === 'SUMMARY').length})
          </a>
        </div>

        {/* Materials Grid */}
        {filteredMaterials.length === 0 ? (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body text-center py-16">
              <h2 className="text-2xl font-bold mb-4">
                {filterType === 'ALL'
                  ? 'No materials shared yet'
                  : `No ${filterType.toLowerCase()}s available`}
              </h2>
              <p className="text-base-content/70">
                Your teacher hasn&apos;t shared any{' '}
                {filterType === 'ALL' ? 'materials' : filterType.toLowerCase() + 's'}{' '}
                with this class yet.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMaterials.map((material) => (
              <div key={material.id} className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <div className="flex items-start gap-3">
                    <div className={`p-3 rounded-lg ${getMaterialColor(material.type)}`}>
                      {getMaterialIcon(material.type)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{material.type}</h3>
                      <p className="text-xs text-base-content/60">
                        {material.pdf?.fileName || 'No source file'}
                      </p>
                    </div>
                  </div>

                  {material.type === 'SUMMARY' && material.content && (
                    <p className="text-sm text-base-content/70 mt-4 line-clamp-3">
                      {typeof material.content === 'string'
                        ? material.content.substring(0, 150) + '...'
                        : ''}
                    </p>
                  )}

                  <div className="text-xs text-base-content/60 mt-4">
                    Shared {new Date(material.sharedAt).toLocaleDateString()}
                  </div>

                  <div className="card-actions justify-end mt-4">
                    {material.type === 'FLASHCARD' && (
                      <Link
                        href={`/library?tab=flashcards&materialId=${material.id}`}
                        className="btn btn-primary btn-sm"
                      >
                        Study Flashcards
                      </Link>
                    )}
                    {material.type === 'WORKSHEET' && (
                      <Link
                        href={`/library?tab=worksheets&materialId=${material.id}`}
                        className="btn btn-primary btn-sm"
                      >
                        View Worksheet
                      </Link>
                    )}
                    {material.type === 'SUMMARY' && (
                      <button
                        onClick={() => {
                          // Open modal or navigate to summary view
                          alert('Summary viewer coming soon!');
                        }}
                        className="btn btn-primary btn-sm"
                      >
                        Read Summary
                      </button>
                    )}
                    {material.type === 'CHAT' && (
                      <Link
                        href={`/library?tab=chatbot&pdfId=${material.pdf?.id}`}
                        className="btn btn-primary btn-sm"
                      >
                        Open Chatbot
                      </Link>
                    )}
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
