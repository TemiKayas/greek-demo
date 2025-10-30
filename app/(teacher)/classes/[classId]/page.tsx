'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getClassDetails,
  generateNewInviteCode,
  revokeInviteCode,
  deleteClass,
} from '@/app/actions/class';
import {
  getClassLessons,
  createLesson,
  shareLessonWithClass,
} from '@/app/actions/lesson';
import { generateInviteQRCode } from '@/lib/utils/qr-code';

type ClassDetails = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  teacher: {
    id: string;
    name: string;
    email: string;
  };
  memberships: Array<{
    id: string;
    joinedAt: Date;
    user: {
      id: string;
      name: string;
      email: string;
      createdAt: Date;
    };
  }>;
  inviteCodes: Array<{
    id: string;
    code: string;
    isActive: boolean;
    expiresAt: Date | null;
    createdAt: Date;
    usedCount: number;
  }>;
  _count: {
    sharedMaterials: number;
    chatConversations: number;
  };
};

export default function ClassDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params?.classId as string;

  const [classData, setClassData] = useState<ClassDetails | null>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'lessons' | 'students' | 'codes'>('lessons');
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [selectedCode, setSelectedCode] = useState<{ code: string; qr: string } | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [showCreateLessonModal, setShowCreateLessonModal] = useState(false);
  const [creatingLesson, setCreatingLesson] = useState(false);
  const [createLessonError, setCreateLessonError] = useState<string | null>(null);

  useEffect(() => {
    if (classId) {
      loadClassDetails();
      loadLessons();
    }
  }, [classId]);

  async function loadClassDetails() {
    setLoading(true);
    const result = await getClassDetails(classId);
    if (result.success) {
      setClassData(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }

  async function loadLessons() {
    const result = await getClassLessons(classId);
    if (result.success) {
      setLessons(result.data);
    }
  }

  async function handleCreateLesson(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateLessonError(null);
    setCreatingLesson(true);

    const formData = new FormData(event.currentTarget);
    const form = event.currentTarget;

    // Create lesson first
    const lessonResult = await createLesson(formData);

    if (lessonResult.success) {
      // Then share it with this class
      await shareLessonWithClass(lessonResult.data.lessonId, classId);
      setShowCreateLessonModal(false);
      form.reset();
      await loadLessons();
    } else {
      setCreateLessonError(lessonResult.error);
    }

    setCreatingLesson(false);
  }

  async function handleGenerateCode() {
    setGeneratingCode(true);
    const result = await generateNewInviteCode(classId);
    if (result.success) {
      await loadClassDetails();
    }
    setGeneratingCode(false);
  }

  async function handleRevokeCode(codeId: string) {
    if (!confirm('Are you sure you want to deactivate this invite code?')) return;

    const result = await revokeInviteCode(codeId);
    if (result.success) {
      await loadClassDetails();
    }
  }

  async function handleDeleteClass() {
    if (
      !confirm(
        'Are you sure you want to delete this class? This action cannot be undone.'
      )
    )
      return;

    const result = await deleteClass(classId);
    if (result.success) {
      router.push('/classes');
    } else {
      alert(result.error);
    }
  }

  async function showInviteCode(code: string) {
    const qrDataUrl = await generateInviteQRCode(code);
    setSelectedCode({ code, qr: qrDataUrl });
    setShowCodeModal(true);
  }

  function copyInviteCode(code: string) {
    const baseUrl = window.location.origin;
    const inviteUrl = `${baseUrl}/join/${code}`;
    navigator.clipboard.writeText(inviteUrl);
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

  if (error || !classData) {
    return (
      <div className="min-h-screen bg-base-200 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="alert alert-error">
            <span>{error || 'Class not found'}</span>
          </div>
          <Link href="/classes" className="btn btn-ghost mt-4">
            ← Back to Classes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <Link href="/classes" className="btn btn-ghost btn-sm mb-2">
              ← Back to Classes
            </Link>
            <h1 className="text-4xl font-bold">{classData.name}</h1>
            {classData.description && (
              <p className="text-base-content/70 mt-2">{classData.description}</p>
            )}
          </div>
          <div className="dropdown dropdown-end">
            <label tabIndex={0} className="btn btn-ghost">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
              </svg>
            </label>
            <ul
              tabIndex={0}
              className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52"
            >
              <li>
                <button onClick={handleDeleteClass} className="text-error">
                  Delete Class
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Stats */}
        <div className="stats shadow mb-8 w-full">
          <div className="stat">
            <div className="stat-title">Students</div>
            <div className="stat-value">{classData.memberships.length}</div>
          </div>
          <div className="stat">
            <div className="stat-title">Materials Shared</div>
            <div className="stat-value">{classData._count.sharedMaterials}</div>
          </div>
          <div className="stat">
            <div className="stat-title">Chat Conversations</div>
            <div className="stat-value">{classData._count.chatConversations}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs tabs-boxed mb-6">
          <a
            className={`tab ${activeTab === 'lessons' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('lessons')}
          >
            Lessons ({lessons.length})
          </a>
          <a
            className={`tab ${activeTab === 'students' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('students')}
          >
            Students ({classData.memberships.length})
          </a>
          <a
            className={`tab ${activeTab === 'codes' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('codes')}
          >
            Invite Codes ({classData.inviteCodes.length})
          </a>
        </div>

        {/* Lessons Tab */}
        {activeTab === 'lessons' && (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <div className="flex justify-between items-center mb-4">
                <h2 className="card-title">Lessons</h2>
                <button
                  onClick={() => setShowCreateLessonModal(true)}
                  className="btn btn-primary btn-sm"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-1"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Create Lesson
                </button>
              </div>

              {lessons.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-base-content/70 mb-4">
                    No lessons created yet
                  </p>
                  <button
                    onClick={() => setShowCreateLessonModal(true)}
                    className="btn btn-primary btn-sm"
                  >
                    Create Your First Lesson
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {lessons.map((lesson) => (
                    <div key={lesson.id} className="card bg-base-200 shadow">
                      <div className="card-body p-4">
                        <h3 className="card-title text-base">{lesson.name}</h3>
                        {lesson.description && (
                          <p className="text-sm text-base-content/70 line-clamp-2">
                            {lesson.description}
                          </p>
                        )}
                        <div className="mt-3 space-y-1 text-xs text-base-content/60">
                          <p>{lesson._count?.pdfs || 0} PDFs</p>
                          <p>{lesson._count?.materials || 0} Materials</p>
                        </div>
                        <div className="card-actions justify-end mt-3">
                          <Link
                            href={`/classes/${classId}/lessons/${lesson.id}`}
                            className="btn btn-primary btn-xs"
                          >
                            Open
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Students Tab */}
        {activeTab === 'students' && (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Student Roster</h2>

              {classData.memberships.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-base-content/70 mb-4">
                    No students have joined yet
                  </p>
                  <button
                    onClick={() => setActiveTab('codes')}
                    className="btn btn-primary btn-sm"
                  >
                    View Invite Codes
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Joined</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classData.memberships.map((membership) => (
                        <tr key={membership.id}>
                          <td>{membership.user.name}</td>
                          <td>{membership.user.email}</td>
                          <td>
                            {new Date(membership.joinedAt).toLocaleDateString()}
                          </td>
                          <td>
                            <Link
                              href={`/classes/${classId}/insights?student=${membership.user.id}`}
                              className="btn btn-ghost btn-xs"
                            >
                              View Activity
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Invite Codes Tab */}
        {activeTab === 'codes' && (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <div className="flex justify-between items-center mb-4">
                <h2 className="card-title">Invite Codes</h2>
                <button
                  onClick={handleGenerateCode}
                  className={`btn btn-primary btn-sm ${
                    generatingCode ? 'loading' : ''
                  }`}
                  disabled={generatingCode}
                >
                  {generatingCode ? 'Generating...' : 'Generate New Code'}
                </button>
              </div>

              <div className="space-y-4">
                {classData.inviteCodes.map((code) => (
                  <div
                    key={code.id}
                    className="flex items-center justify-between p-4 border border-base-300 rounded-lg"
                  >
                    <div>
                      <p className="font-mono text-2xl font-bold">{code.code}</p>
                      <div className="text-sm text-base-content/70 space-y-1 mt-2">
                        <p>Used: {code.usedCount} times</p>
                        <p>
                          Created:{' '}
                          {new Date(code.createdAt).toLocaleDateString()}
                        </p>
                        {code.expiresAt && (
                          <p>
                            Expires:{' '}
                            {new Date(code.expiresAt).toLocaleDateString()}
                          </p>
                        )}
                        <p>
                          Status:{' '}
                          <span
                            className={
                              code.isActive ? 'text-success' : 'text-error'
                            }
                          >
                            {code.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => showInviteCode(code.code)}
                        className="btn btn-sm btn-ghost"
                      >
                        View QR
                      </button>
                      <button
                        onClick={() => copyInviteCode(code.code)}
                        className="btn btn-sm btn-primary"
                      >
                        Copy Link
                      </button>
                      {code.isActive && (
                        <button
                          onClick={() => handleRevokeCode(code.id)}
                          className="btn btn-sm btn-error btn-outline"
                        >
                          Deactivate
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Create Lesson Modal */}
        {showCreateLessonModal && (
          <div className="modal modal-open">
            <div className="modal-box">
              <h3 className="font-bold text-lg mb-4">Create New Lesson</h3>

              {createLessonError && (
                <div className="alert alert-error mb-4">
                  <span>{createLessonError}</span>
                </div>
              )}

              <form onSubmit={handleCreateLesson}>
                <div className="form-control mb-4">
                  <label className="label">
                    <span className="label-text">Lesson Name</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    placeholder="e.g., Greek Alphabet Basics"
                    className="input input-bordered"
                    required
                    disabled={creatingLesson}
                  />
                </div>

                <div className="form-control mb-6">
                  <label className="label">
                    <span className="label-text">Description (optional)</span>
                  </label>
                  <textarea
                    name="description"
                    placeholder="What will students learn in this lesson?"
                    className="textarea textarea-bordered h-24"
                    disabled={creatingLesson}
                  />
                </div>

                <div className="modal-action">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateLessonModal(false);
                      setCreateLessonError(null);
                    }}
                    className="btn"
                    disabled={creatingLesson}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`btn btn-primary ${creatingLesson ? 'loading' : ''}`}
                    disabled={creatingLesson}
                  >
                    {creatingLesson ? 'Creating...' : 'Create Lesson'}
                  </button>
                </div>
              </form>
            </div>
            <div
              className="modal-backdrop"
              onClick={() => !creatingLesson && setShowCreateLessonModal(false)}
            ></div>
          </div>
        )}

        {/* QR Code Modal */}
        {showCodeModal && selectedCode && (
          <div className="modal modal-open">
            <div className="modal-box">
              <h3 className="font-bold text-lg mb-4">Invite Students</h3>

              <div className="text-center space-y-4">
                <div className="bg-base-200 p-6 rounded-lg">
                  <p className="text-sm text-base-content/70 mb-2">
                    Invite Code
                  </p>
                  <p className="text-4xl font-mono font-bold tracking-wider">
                    {selectedCode.code}
                  </p>
                </div>

                <div className="bg-base-200 p-4 rounded-lg inline-block">
                  <img
                    src={selectedCode.qr}
                    alt="QR Code"
                    className="w-48 h-48"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => copyInviteCode(selectedCode.code)}
                    className="btn btn-primary flex-1"
                  >
                    Copy Invite Link
                  </button>
                </div>

                <p className="text-sm text-base-content/60">
                  Students can scan this QR code or use the invite link
                </p>
              </div>

              <div className="modal-action">
                <button
                  onClick={() => {
                    setShowCodeModal(false);
                    setSelectedCode(null);
                  }}
                  className="btn"
                >
                  Close
                </button>
              </div>
            </div>
            <div
              className="modal-backdrop"
              onClick={() => setShowCodeModal(false)}
            ></div>
          </div>
        )}
      </div>
    </div>
  );
}
