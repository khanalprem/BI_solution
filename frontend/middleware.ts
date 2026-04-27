import { NextRequest, NextResponse } from 'next/server';

// SECURITY: this middleware is a UX hint, NOT an authorization gate.
// The real gate is the Rails `authenticate_user!` filter on every API
// endpoint (see backend/app/controllers/application_controller.rb). The
// `bankbi-auth` cookie below is set client-side and trivially forgeable;
// do NOT trust it from a server component or use it for any data-fetching
// decision. If you need server-rendered data, read the JWT from a cookie
// you trust (HttpOnly + Secure + SameSite=Strict) — not this one.
const AUTH_COOKIE = 'bankbi-auth';
const SIGNIN_PATH = '/signin';
const SIGNUP_PATH = '/signup';
const DEFAULT_AUTH_REDIRECT = '/dashboard/executive';

function isDashboardPath(pathname: string) {
  return pathname === '/dashboard' || pathname.startsWith('/dashboard/');
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasAuthSession = Boolean(request.cookies.get(AUTH_COOKIE)?.value);

  if (pathname === '/') {
    return NextResponse.redirect(new URL(SIGNIN_PATH, request.url));
  }

  if (isDashboardPath(pathname) && !hasAuthSession) {
    const signinUrl = new URL(SIGNIN_PATH, request.url);
    signinUrl.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(signinUrl);
  }

  if ((pathname === SIGNIN_PATH || pathname === SIGNUP_PATH) && hasAuthSession) {
    return NextResponse.redirect(new URL(DEFAULT_AUTH_REDIRECT, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/signin', '/signup', '/dashboard/:path*'],
};
