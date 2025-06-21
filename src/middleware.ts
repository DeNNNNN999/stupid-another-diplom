import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Paths that don't require authentication
const publicPaths = [
  '/login',
  '/register',
];

// Paths that require admin access
const adminPaths = [
  '/admin',
  '/admin/dashboard',
  '/admin/users',
  '/admin/access-codes',
  '/admin/reports',
];

export function middleware(request: NextRequest) {
  // Get the token and user data from cookies
  const token = request.cookies.get('auth_token')?.value;
  const userString = request.cookies.get('auth_user')?.value;
  
  const user = userString ? JSON.parse(userString) : null;
  const isAuthenticated = !!token && !!user;
  const isAdmin = user?.role === 'ADMIN';
  
  const { pathname } = request.nextUrl;
  
  // If the path is public, allow access
  if (publicPaths.some(path => pathname.startsWith(path))) {
    // If already authenticated, redirect to dashboard
    if (isAuthenticated && (pathname === '/login' || pathname === '/register')) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }
  
  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // Redirect root path to appropriate dashboard
  if (pathname === '/') {
    if (isAdmin) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    } else {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }
  
  // If trying to access admin pages without admin role
  if (adminPaths.some(path => pathname.startsWith(path)) && !isAdmin) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except for:
    // - API routes
    // - Static files (e.g., favicons, images)
    // - _next files
    // - Public files
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};