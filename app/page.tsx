import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function Home() {
  const session = await auth();

  // Redirect authenticated users to their dashboard
  if (session?.user) {
    const redirectPath =
      session.user.role === 'TEACHER'
        ? '/teacher/dashboard'
        : '/student/dashboard';
    redirect(redirectPath);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <main className="flex flex-col items-center gap-8 p-8 text-center">
        <h1 className="text-6xl font-bold text-blue-600 mb-4">WordWyrm</h1>
        <p className="text-xl text-gray-600 mb-8">
          Transform PDFs into engaging quizzes
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/login"
            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="px-8 py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors"
          >
            Sign Up
          </Link>
        </div>
      </main>
    </div>
  );
}
