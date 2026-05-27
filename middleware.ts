import { auth } from '@/auth';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const intlMiddleware = createMiddleware(routing);

const protectedRoutes = ['/dashboard', '/courses', '/ai', '/profile'];
const adminRoutes = ['/admin'];
const authRoutes = ['/login', '/register'];

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Strip locale prefix to check path
  const pathnameWithoutLocale = pathname.replace(/^\/(vi|en)/, '') || '/';

  const session = await auth();

  const isProtected = protectedRoutes.some(r => pathnameWithoutLocale.startsWith(r));
  const isAdmin = adminRoutes.some(r => pathnameWithoutLocale.startsWith(r));
  const isAuth = authRoutes.some(r => pathnameWithoutLocale.startsWith(r));

  if ((isProtected || isAdmin) && !session) {
    const locale = pathname.match(/^\/(vi|en)/)?.[1] ?? 'vi';
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  if (isAdmin && session?.user.role !== 'ADMIN') {
    const locale = pathname.match(/^\/(vi|en)/)?.[1] ?? 'vi';
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
  }

  if (isAuth && session) {
    const locale = pathname.match(/^\/(vi|en)/)?.[1] ?? 'vi';
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
