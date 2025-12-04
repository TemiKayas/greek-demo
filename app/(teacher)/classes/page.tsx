'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getTeacherClasses, createClass } from '@/app/actions/class';
import { generateInviteQRCode } from '@/lib/utils/qr-code';

type Class = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  teacherId: string;
  _count: {
    memberships: number;
    files: number;
  };
  inviteCodes: Array<{
    id: string;
    classId: string;
    code: string;
    isActive: boolean;
    expiresAt: Date | null;
    createdAt: Date;
    createdBy: string | null;
    usedCount: number;
  }>;
};

export default function ClassesPage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [selectedCode, setSelectedCode] = useState<{ code: string; qr: string } | null>(null);

  useEffect(() => {
    loadClasses();
  }, []);

  async function loadClasses() {
    setLoading(true);
    const result = await getTeacherClasses();
    if (result.success) {
      setClasses(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }

  async function handleCreateClass(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError(null);
    setCreating(true);

    const formData = new FormData(event.currentTarget);
    const form = event.currentTarget;

    const result = await createClass(formData);

    if (result.success) {
      setShowCreateModal(false);
      form.reset();
      await loadClasses();
    } else {
      setCreateError(result.error);
    }

    setCreating(false);
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
    // Could add a toast notification here
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold">My Classes</h1>
            <p className="text-base-content/70 mt-2">
              Manage your classes and invite students
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/" className="btn btn-ghost">
              Home
            </Link>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary"
            >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
            Create Class
          </button>
          </div>
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
              <h2 className="text-2xl font-bold mb-4">No classes yet</h2>
              <p className="text-base-content/70 mb-6">
                Create your first class to get started
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn btn-primary btn-wide mx-auto"
              >
                Create Your First Class
              </button>
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

                  <div className="flex gap-4 mt-4 text-sm">
                    <div className="stat-value text-2xl">
                      {cls._count.memberships}
                    </div>
                    <div className="stat-desc">students</div>
                  </div>

                  <div className="flex gap-4 mt-2 text-sm">
                    <div className="stat-value text-2xl">
                      {cls._count.files}
                    </div>
                    <div className="stat-desc">files</div>
                  </div>

                  <div className="card-actions justify-between mt-6">
                    <button
                      onClick={() =>
                        cls.inviteCodes[0] && showInviteCode(cls.inviteCodes[0].code)
                      }
                      className="btn btn-sm btn-ghost"
                      disabled={!cls.inviteCodes[0]}
                    >
                      Invite Code
                    </button>
                    <Link href={`/classes/${cls.id}`} className="btn btn-sm btn-primary">
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Class Modal */}
        {showCreateModal && (
          <div className="modal modal-open">
            <div className="modal-box">
              <h3 className="font-bold text-lg mb-4">Create New Class</h3>

              {createError && (
                <div className="alert alert-error mb-4">
                  <span>{createError}</span>
                </div>
              )}

              <form onSubmit={handleCreateClass}>
                <div className="form-control mb-4">
                  <label className="label">
                    <span className="label-text">Class Name</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    placeholder="e.g., Greek 101"
                    className="input input-bordered"
                    required
                    disabled={creating}
                  />
                </div>

                <div className="form-control mb-6">
                  <label className="label">
                    <span className="label-text">Description (optional)</span>
                  </label>
                  <textarea
                    name="description"
                    placeholder="What will students learn in this class?"
                    className="textarea textarea-bordered h-24"
                    disabled={creating}
                  />
                </div>

                <div className="modal-action">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setCreateError(null);
                    }}
                    className="btn"
                    disabled={creating}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`btn btn-primary ${creating ? 'loading' : ''}`}
                    disabled={creating}
                  >
                    {creating ? 'Creating...' : 'Create Class'}
                  </button>
                </div>
              </form>
            </div>
            <div className="modal-backdrop" onClick={() => !creating && setShowCreateModal(false)}></div>
          </div>
        )}

        {/* Invite Code Modal */}
        {showCodeModal && selectedCode && (
          <div className="modal modal-open">
            <div className="modal-box">
              <h3 className="font-bold text-lg mb-4">Invite Students</h3>

              <div className="text-center space-y-4">
                <div className="bg-base-200 p-6 rounded-lg">
                  <p className="text-sm text-base-content/70 mb-2">Invite Code</p>
                  <p className="text-4xl font-mono font-bold tracking-wider">
                    {selectedCode.code}
                  </p>
                </div>

                <div className="bg-base-200 p-4 rounded-lg inline-block">
                  <img src={selectedCode.qr} alt="QR Code" className="w-48 h-48" />
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
                  Share this code or QR code with students to join the class
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
            <div className="modal-backdrop" onClick={() => setShowCodeModal(false)}></div>
          </div>
        )}
      </div>
    </div>
  );
}
