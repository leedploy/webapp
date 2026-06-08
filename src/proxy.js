import { NextResponse } from 'next/server';

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const authSession = request.cookies.get('auth_session')?.value;

  // Public paths that do not require login
  const isPublicPath = pathname === '/login' || pathname.startsWith('/api/auth');

  // Static assets/files that must be allowed
  const isAssetPath = pathname.startsWith('/_next') || 
                      pathname.includes('.') || 
                      pathname.startsWith('/static');

  if (isAssetPath) {
    return NextResponse.next();
  }

  // Authentication check
  const isAuthenticated = authSession === 'leed_logged_in_session_token';

  if (!isAuthenticated && !isPublicPath) {
    // If they call API directly, return 401 JSON
    if (pathname.startsWith('/api/')) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized. Please login.' }),
        { status: 401, headers: { 'content-type': 'application/json' } }
      );
    }
    // For pages, redirect to /login
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect to home if they are already logged in and try to visit /login
  if (isAuthenticated && pathname === '/login') {
    const homeUrl = new URL('/', request.url);
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
