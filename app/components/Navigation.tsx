'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { logout } from '@/app/actions/auth';
import { useState } from 'react';

type User = {
  id: string;
  name: string | null;
  email: string;
  role: 'TEACHER' | 'STUDENT' | 'ADMIN';
} | null;

type Props = {
  user: User;
};

export default function Navigation({ user }: Props) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleSignOut() {
    setIsLoggingOut(true);
    await logout();
    router.push('/');
    router.refresh();
  }

  if (!user) {
    // Not logged in - show login/signup buttons
    return (
      <div className="flex items-center gap-2">
        <Link href="/login" className="btn btn-ghost btn-sm">
          Log In
        </Link>
        <Link href="/signup" className="btn btn-primary btn-sm">
          Sign Up
        </Link>
      </div>
    );
  }

  // Logged in - show navigation based on role
  return (
    <div className="flex items-center gap-2">
      {user.role === 'TEACHER' && (
        <>
          <Link href="/classes" className="btn btn-ghost btn-sm">
            Classes
          </Link>
          <Link href="/library" className="btn btn-ghost btn-sm">
            Library
          </Link>
        </>
      )}
      {user.role === 'STUDENT' && (
        <>
          <Link href="/dashboard" className="btn btn-ghost btn-sm">
            Dashboard
          </Link>
          <Link href="/history" className="btn btn-ghost btn-sm">
            History
          </Link>
        </>
      )}
      <Link href="/" className="btn btn-ghost btn-sm">
        Home
      </Link>
      <div className="hidden sm:flex items-center gap-2 text-sm text-base-content/70">
        <span>Welcome, <span className="font-semibold text-base-content">{user.name || user.email}</span></span>
      </div>
      <button
        onClick={handleSignOut}
        className={`btn btn-outline btn-sm ${isLoggingOut ? 'loading' : ''}`}
        disabled={isLoggingOut}
      >
        {isLoggingOut ? 'Signing out...' : 'Sign Out'}
      </button>
    </div>
  );
}
