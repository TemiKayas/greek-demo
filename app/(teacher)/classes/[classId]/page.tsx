'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  getClassDetails,
  generateNewInviteCode,
  revokeInviteCode,
  deleteClass,
} from '@/app/actions/class';
import { generateInviteQRCode } from '@/lib/utils/qr-code';
import { FileUploadSection } from './components/FileUploadSection';
import { FileList } from './components/FileList';
import { ChatHistoryView } from './components/ChatHistoryView';

type ClassDetails = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  teacherId: string;
  teacher: {
    id: string;
    name: string;
    email: string;
  };
  memberships: Array<{
    id: string;
    role: string;
    classId: string;
    userId: string;
    joinedAt: Date;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
  inviteCodes: Array<{
    id: string;
    code: string;
    isActive: boolean;
    expiresAt: Date | null;
    createdAt: Date;
    usedCount: number;
    classId: string;
    createdBy: string | null;
  }>;
  files: Array<{
    id: string;
    classId: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    blobUrl: string;
    uploadedBy: string;
    status: string;
    errorMessage: string | null;
    createdAt: Date;
  }>;
  _count: {
    memberships: number;
    files: number;
    chatConversations: number;
  };
};

export default function ClassDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params?.classId as string;

  const [classData, setClassData] = useState<ClassDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'files' | 'students' | 'history'>('files');
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [selectedCode, setSelectedCode] = useState<{ code: string; qr: string } | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const loadClassDetails = useCallback(async () => {
    setLoading(true);
    const result = await getClassDetails(classId);
    if (result.success) {
      setClassData(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, [classId]);

  useEffect(() => {
    if (classId) {
      loadClassDetails();
    }
  }, [classId, loadClassDetails]);

  function handleFileUploadComplete() {
    setRefreshTrigger((prev) => prev + 1);
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
            <div className="flex gap-2 mb-2">
              <Link href="/classes" className="btn btn-ghost btn-sm">
                ← Back to Classes
              </Link>
              <Link href="/" className="btn btn-ghost btn-sm">
                Home
              </Link>
            </div>
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
            <div className="stat-title">Files Uploaded</div>
            <div className="stat-value">{classData._count.files}</div>
          </div>
          <div className="stat">
            <div className="stat-title">Chat Conversations</div>
            <div className="stat-value">{classData._count.chatConversations}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs tabs-boxed mb-6">
          <a
            className={`tab ${activeTab === 'files' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('files')}
          >
            Files ({classData._count.files})
          </a>
          <a
            className={`tab ${activeTab === 'students' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('students')}
          >
            Students ({classData.memberships.length})
          </a>
          <a
            className={`tab ${activeTab === 'history' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            Chat History ({classData._count.chatConversations})
          </a>
        </div>

        {/* Files Tab */}
        {activeTab === 'files' && (
          <div className="space-y-6">
            <FileUploadSection
              classId={classId}
              onUploadComplete={handleFileUploadComplete}
            />
            <FileList
              classId={classId}
              refreshTrigger={refreshTrigger}
            />
          </div>
        )}

        {/* Students Tab */}
        {activeTab === 'students' && (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <div className="flex justify-between items-center mb-4">
                <h2 className="card-title">Student Roster</h2>
                <button
                  onClick={handleGenerateCode}
                  className={`btn btn-primary btn-sm ${
                    generatingCode ? 'loading' : ''
                  }`}
                  disabled={generatingCode}
                >
                  {generatingCode ? 'Generating...' : 'Generate Invite Code'}
                </button>
              </div>

              {classData.memberships.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-base-content/70 mb-4">
                    No students have joined yet
                  </p>
                  <p className="text-sm text-base-content/60 mb-4">
                    Share an invite code with your students to get started
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Joined</th>
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {classData.inviteCodes.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold mb-3">Active Invite Codes</h3>
                  <div className="space-y-3">
                    {classData.inviteCodes.filter(code => code.isActive).map((code) => (
                      <div
                        key={code.id}
                        className="flex items-center justify-between p-3 border border-base-300 rounded-lg"
                      >
                        <div>
                          <p className="font-mono text-xl font-bold">{code.code}</p>
                          <p className="text-sm text-base-content/60">
                            Used {code.usedCount} times
                          </p>
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
                          <button
                            onClick={() => handleRevokeCode(code.id)}
                            className="btn btn-sm btn-error btn-outline"
                          >
                            Deactivate
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chat History Tab */}
        {activeTab === 'history' && (
          <ChatHistoryView classId={classId} />
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
                  <Image
                    src={selectedCode.qr}
                    alt="QR Code"
                    width={192}
                    height={192}
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
