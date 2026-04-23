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
        token.id = user.id;
        token.role = user.role;
        token.schoolId = user.schoolId;
        token.schoolName = user.schoolName;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.schoolId = token.schoolId;
        session.user.schoolName = token.schoolName;
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
