import { auth } from '@/lib/auth';
import Navigation from './Navigation';
import Link from 'next/link';

export default async function Header() {
  const session = await auth();

  return (
    <header className="bg-base-200 border-b border-base-content/20 shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/30 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-primary-content"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary-content">ClassChat</h1>
              <p className="text-xs text-primary-content/80">AI-Powered Learning</p>
            </div>
          </Link>
          <Navigation user={session?.user || null} />
        </div>
      </div>
    </header>
  );
}
