import type { NextAuthConfig } from 'next-auth';

// Edge-safe config — no pg, no bcrypt imports here.
// Used by middleware; full config (with DB + bcrypt) lives in auth.ts.
export const authConfig = {
  providers: [],
  pages: { signIn: '/login' },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: string }).role;
        token.locale = (user as { locale: string }).locale;
      }
      return token;
    },
    session({ session, token }) {
      session.user.role = token.role as string;
      session.user.locale = token.locale as string;
      return session;
    },
  },
} satisfies NextAuthConfig;
