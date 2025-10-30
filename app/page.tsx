'use client';

import { useState } from 'react';
import Link from 'next/link';
import ThemeToggle from './components/ThemeToggle';

export default function Home() {
  const [inviteCode, setInviteCode] = useState('');

  function handleJoinClass(e: React.FormEvent) {
    e.preventDefault();
    if (inviteCode.trim()) {
      window.location.href = `/join/${inviteCode.trim().toUpperCase()}`;
    }
  }

  return (
    <div className="min-h-screen bg-base-200">
      {/* Header */}
      <header className="bg-base-100 border-b border-base-content/10 shadow-sm">
        <div className="container mx-auto px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 sm:w-7 sm:h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-base-content">
                  Μοντέρνα Ελληνικά
                </h1>
                <p className="text-xs sm:text-sm text-base-content/70">Modern Greek Education Platform</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link href="/login" className="btn btn-ghost btn-sm">
                Log In
              </Link>
              <Link href="/signup" className="btn btn-primary btn-sm">
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4 text-base-content">
              AI-Powered Greek Learning
            </h2>
            <p className="text-xl text-base-content/70 mb-2">
              Teachers create interactive materials. Students learn with AI assistance.
            </p>
          </div>

          {/* Join Class Card */}
          <div className="card bg-base-100 shadow-xl mb-8">
            <div className="card-body">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-primary"
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
                <h3 className="text-2xl font-bold">Join a Class</h3>
              </div>

              <p className="text-base-content/70 mb-6">
                Have an invite code from your teacher? Enter it below to join your class.
              </p>

              <form onSubmit={handleJoinClass} className="space-y-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Class Invite Code</span>
                  </label>
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="ABC123"
                    maxLength={6}
                    className="input input-bordered input-lg text-center font-mono text-2xl tracking-widest"
                    required
                  />
                  <label className="label">
                    <span className="label-text-alt text-base-content/60">
                      Enter the 6-character code from your teacher
                    </span>
                  </label>
                </div>

                <button type="submit" className="btn btn-primary btn-block btn-lg">
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
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                  Join Class
                </button>
              </form>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body">
                <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mb-3">
                  <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h4 className="card-title text-lg">AI-Generated Materials</h4>
                <p className="text-sm text-base-content/70">
                  Flashcards, worksheets, and summaries created automatically from PDFs
                </p>
              </div>
            </div>

            <div className="card bg-base-100 shadow-lg">
              <div className="card-body">
                <div className="w-12 h-12 bg-secondary/20 rounded-lg flex items-center justify-center mb-3">
                  <svg className="w-7 h-7 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h4 className="card-title text-lg">AI Chatbot</h4>
                <p className="text-sm text-base-content/70">
                  Ask questions about your learning materials and get instant answers
                </p>
              </div>
            </div>

            <div className="card bg-base-100 shadow-lg">
              <div className="card-body">
                <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center mb-3">
                  <svg className="w-7 h-7 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h4 className="card-title text-lg">Track Progress</h4>
                <p className="text-sm text-base-content/70">
                  Teachers can view student questions and identify common struggles
                </p>
              </div>
            </div>
          </div>

          {/* For Teachers */}
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body text-center">
              <h3 className="text-xl font-bold mb-2">Are you a teacher?</h3>
              <p className="text-base-content/70 mb-4">
                Create classes, upload materials, and generate interactive learning content
              </p>
              <div className="flex gap-3 justify-center">
                <Link href="/signup" className="btn btn-primary">
                  Get Started
                </Link>
                <Link href="/login" className="btn btn-outline">
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 py-6 bg-base-300 border-t border-base-content/10 text-base-content/60 text-center">
        <p className="text-sm">
          Built with Next.js, Prisma, and Google Gemini
        </p>
      </footer>
    </div>
  );
}
