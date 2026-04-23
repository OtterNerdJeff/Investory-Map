import type { NextAuthConfig } from "next-auth";

// Edge-safe NextAuth config. This file MUST NOT import anything that pulls
// in Node-only modules (e.g. bcryptjs, @prisma/client). It is imported by
// `src/middleware.ts`, which runs on the edge runtime.
//
// The Credentials provider — which needs bcrypt to verify passwords and
// Prisma to read users — is added in `src/lib/auth.ts` on top of this base.
export const authConfig = {
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
        token.schoolId = (user as any).schoolId;
        token.schoolName = (user as any).schoolName;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).schoolId = token.schoolId;
        (session.user as any).schoolName = token.schoolName;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
} satisfies NextAuthConfig;
