import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const userRole = req.auth?.user?.role;

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/login', '/signup'];
  const isPublicRoute = publicRoutes.includes(nextUrl.pathname);

  // Auth routes (login, signup) - redirect if already logged in
  const authRoutes = ['/login', '/signup'];
  const isAuthRoute = authRoutes.includes(nextUrl.pathname);

  // Protected route patterns
  const isTeacherRoute = nextUrl.pathname.startsWith('/classes') ||
                         nextUrl.pathname.startsWith('/lessons') ||
                         nextUrl.pathname.startsWith('/library');
  const isStudentRoute = nextUrl.pathname.startsWith('/dashboard') ||
                         nextUrl.pathname.startsWith('/history');

  // If user is already logged in and tries to access auth pages, redirect to appropriate dashboard
  if (isLoggedIn && isAuthRoute) {
    if (userRole === 'TEACHER') {
      return NextResponse.redirect(new URL('/classes', nextUrl));
    } else if (userRole === 'STUDENT') {
      return NextResponse.redirect(new URL('/dashboard', nextUrl));
    }
    return NextResponse.redirect(new URL('/', nextUrl));
  }

  // If user is not logged in and tries to access protected routes, redirect to login
  if (!isLoggedIn && !isPublicRoute) {
    const loginUrl = new URL('/login', nextUrl);
    loginUrl.searchParams.set('callbackUrl', nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based access control
  if (isLoggedIn) {
    // Teachers trying to access student routes
    if (userRole === 'TEACHER' && isStudentRoute) {
      return NextResponse.redirect(new URL('/classes', nextUrl));
    }

    // Students trying to access teacher routes
    if (userRole === 'STUDENT' && isTeacherRoute) {
      return NextResponse.redirect(new URL('/dashboard', nextUrl));
    }
  }

  return NextResponse.next();
}) as any;

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
