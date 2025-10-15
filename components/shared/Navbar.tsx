'use client';

import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import Image from 'next/image';

/**
 * navigation bar component with back button, logo, and sign out
 * used at the top of teacher dashboard pages
 *
 * props:
 * - title: the page title to display (default: 'Game Creation')
 * - showBack: whether to show the back button (default: true)
 * - showSignOut: whether to show the sign out button (default: true)
 */

interface NavbarProps {
  title?: string;
  showBack?: boolean;
  showSignOut?: boolean;
}

export default function Navbar({ title = 'Game Creation', showBack = true, showSignOut = true }: NavbarProps) {
  const router = useRouter();

  return (
    <nav className="bg-[#fffaf2] border-b-2 border-[#473025]/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* left side: back button and wordwyrm logo */}
          <div className="flex items-center gap-6">
            {showBack && (
              <button
                onClick={() => router.back()}
                className="text-[#473025] hover:text-[#3a261e] transition-colors"
                aria-label="Go back"
              >
                <Image
                  src="/assets/fileupload/arrow-left.svg"
                  alt="Back"
                  width={24}
                  height={24}
                  className="rotate-90"
                />
              </button>
            )}
            <h1 className="font-fantaisie text-2xl text-[#473025] tracking-wider">WW</h1>
          </div>

          {/* right side: page title and sign out button */}
          <div className="flex items-center gap-4">
            {title && <p className="text-[#473025] font-bold text-xl">{title}</p>}
            {showSignOut && (
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="px-4 py-2 text-sm font-semibold text-[#473025] hover:text-[#ff9f22] transition-colors"
              >
                Sign Out
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
