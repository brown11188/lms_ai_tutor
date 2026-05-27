import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Use edge-safe config — no pg/bcrypt imported here
const { auth } = NextAuth(authConfig);
const intlMiddleware = createMiddleware(routing);

const protectedRoutes = ['/dashboard', '/courses', '/ai', '/profile'];
const adminRoutes = ['/admin'];
const authRoutes = ['/login', '/register'];

export default auth((req) => {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;
  const session = req.auth;

  const localeMatch = pathname.match(/^\/(vi|en)(\/.*)?$/);
  const locale = localeMatch?.[1] ?? 'vi';
  const pathAfterLocale = localeMatch?.[2] ?? '/';
  const pathnameWithoutLocale = pathAfterLocale || '/';

  const isProtected = protectedRoutes.some(r => pathnameWithoutLocale.startsWith(r));
  const isAdmin = adminRoutes.some(r => pathnameWithoutLocale.startsWith(r));
  const isAuth = authRoutes.some(r => pathnameWithoutLocale.startsWith(r));

  if ((isProtected || isAdmin) && !session) {
    return NextResponse.redirect(new URL(`/${locale}/login`, req.url));
  }

  if (isAdmin && session?.user.role !== 'ADMIN') {
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, req.url));
  }

  if (isAuth && session) {
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, req.url));
  }

  return intlMiddleware(req as unknown as NextRequest);
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
