'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { joinClassWithCode, validateInviteCodeAction } from '@/app/actions/class';

type ClassData = {
  id: string;
  name: string;
  description: string | null;
  teacherId: string;
  teacher?: {
    name: string;
  };
};

type InviteCodeValidation = {
  valid: boolean;
  error?: string;
  classData?: ClassData;
};

export default function JoinClassPage() {
  const params = useParams();
  const router = useRouter();
  const code = params?.code as string;

  const [validation, setValidation] = useState<InviteCodeValidation | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (code) {
      validateCode();
    }
  }, [code]);

  async function validateCode() {
    setLoading(true);
    const result = await validateInviteCodeAction(code);

    if (result.success) {
      setValidation({
        valid: true,
        classData: result.data.class,
      });
    } else {
      setValidation({
        valid: false,
        error: result.error,
      });
    }

    setLoading(false);
  }

  async function handleJoinClass() {
    setJoining(true);
    setError(null);

    const result = await joinClassWithCode(code);

    if (result.success) {
      router.push(`/dashboard?joined=${result.data.classId}`);
    } else {
      setError(result.error);
    }

    setJoining(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
        <Link href="/" className="btn btn-ghost btn-sm absolute top-4 left-4">
          ← Home
        </Link>
        <div className="card w-full max-w-md bg-base-100 shadow-xl">
          <div className="card-body items-center text-center">
            <span className="loading loading-spinner loading-lg"></span>
            <p className="mt-4">Validating invite code...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!validation || !validation.valid) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
        <Link href="/" className="btn btn-ghost btn-sm absolute top-4 left-4">
          ← Home
        </Link>
        <div className="card w-full max-w-md bg-base-100 shadow-xl">
          <div className="card-body items-center text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 text-error mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h2 className="card-title text-2xl mb-2">Invalid Invite Code</h2>
            <p className="text-base-content/70 mb-6">
              {validation?.error || 'This invite code is not valid'}
            </p>
            <div className="card-actions">
              <Link href="/login" className="btn btn-primary">
                Go to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const classData = validation.classData!;

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <Link href="/" className="btn btn-ghost btn-sm absolute top-4 left-4">
        ← Home
      </Link>
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="text-center mb-6">
            <div className="inline-block p-4 bg-primary/10 rounded-full mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 text-primary"
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
            <h2 className="text-3xl font-bold mb-2">You&apos;re Invited!</h2>
            <p className="text-base-content/70">
              Join this class to access learning materials and resources
            </p>
          </div>

          {error && (
            <div className="alert alert-error mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="stroke-current shrink-0 h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="bg-base-200 p-6 rounded-lg mb-6">
            <div className="space-y-3">
              <div>
                <p className="text-sm text-base-content/60">Class Name</p>
                <p className="text-xl font-bold">{classData.name}</p>
              </div>

              {classData.description && (
                <div>
                  <p className="text-sm text-base-content/60">Description</p>
                  <p className="text-sm">{classData.description}</p>
                </div>
              )}

              {classData.teacher && (
                <div>
                  <p className="text-sm text-base-content/60">Teacher</p>
                  <p className="text-sm">{classData.teacher.name}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-base-content/60">Invite Code</p>
                <p className="text-lg font-mono font-bold">{code}</p>
              </div>
            </div>
          </div>

          <div className="card-actions flex-col w-full gap-2">
            <button
              onClick={handleJoinClass}
              className={`btn btn-primary btn-block ${joining ? 'loading' : ''}`}
              disabled={joining}
            >
              {joining ? 'Joining...' : 'Join This Class'}
            </button>
            <Link href="/login" className="btn btn-ghost btn-block">
              Back to Login
            </Link>
          </div>

          <p className="text-xs text-center text-base-content/60 mt-4">
            By joining, you&apos;ll have access to class materials, worksheets, and
            flashcards shared by your teacher.
          </p>
        </div>
      </div>
    </div>
  );
}
