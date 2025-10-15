import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: 'TEACHER' | 'STUDENT' | 'ADMIN';
    } & DefaultSession['user'];
  }

  interface User {
    role: 'TEACHER' | 'STUDENT' | 'ADMIN';
  }
}
