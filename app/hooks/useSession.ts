'use client';

import { useEffect, useState } from 'react';

type User = {
  id: string;
  name: string | null;
  email: string;
  role: 'TEACHER' | 'STUDENT' | 'ADMIN';
} | null;

export function useSession() {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        setUser(data?.user || null);
        setLoading(false);
      })
      .catch(() => {
        setUser(null);
        setLoading(false);
      });
  }, []);

  return { user, loading };
}
