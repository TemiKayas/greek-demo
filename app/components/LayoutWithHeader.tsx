'use client';

import { ReactNode, useEffect, useState } from 'react';
import HeaderClient from './HeaderClient';

type User = {
  id: string;
  name: string | null;
  email: string;
  role: 'TEACHER' | 'STUDENT' | 'ADMIN';
} | null;

type Props = {
  children: ReactNode;
  requireAuth?: boolean;
};

export default function LayoutWithHeader({ children, requireAuth = true }: Props) {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(requireAuth);

  useEffect(() => {
    if (requireAuth) {
      // For now, we'll get the user from the global window object if available
      // This is a placeholder - in production you'd fetch from an API endpoint
      setLoading(false);
    }
  }, [requireAuth]);

  if (loading) {
    return (
      <>
        <HeaderClient user={null} />
        <div className="min-h-screen flex items-center justify-center">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </>
    );
  }

  return (
    <>
      <HeaderClient user={user} />
      {children}
    </>
  );
}
