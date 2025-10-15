import { auth } from '@/lib/auth';
import { signOut } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function StudentDashboard() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-blue-600">WordWyrm</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {session.user.name} (Student)
              </span>
              <form
                action={async () => {
                  'use server';
                  await signOut({ redirectTo: '/' });
                }}
              >
                <button
                  type="submit"
                  className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
                >
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4">Student Dashboard</h2>
          <p className="text-gray-600">
            Welcome to your student dashboard! This is where you&apos;ll see
            your quiz history and join new games.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold text-lg mb-2">Join a Game</h3>
              <p className="text-sm text-gray-600 mb-3">
                Enter a game code to join a quiz
              </p>
              <input
                type="text"
                placeholder="Enter game code"
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold text-lg mb-2">My Results</h3>
              <p className="text-sm text-gray-600">
                View your quiz history and scores
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
