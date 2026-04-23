import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";

// Full NextAuth instance with the Credentials provider. This file pulls in
// bcryptjs and Prisma, so it is NOT edge-safe and must never be imported
// from middleware. Middleware imports `auth.config.ts` instead.
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: { school: true },
        });

        // Run bcrypt.compare even when user is missing, to equalize timing.
        // This dummy hash is a real bcrypt hash (of a random value) — never matches.
        const DUMMY_HASH =
          "$2a$10$CwTycUXWue0Thq9StjUM0uJ8e5vZGMmGrZxQXNWpFpXQq3KkLqZy6";
        const hash = user?.passwordHash ?? DUMMY_HASH;
        const isValid = await bcrypt.compare(
          credentials.password as string,
          hash
        );

        if (!user || !isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          schoolId: user.schoolId,
          schoolName: user.school?.name || null,
        };
      },
    }),
  ],
});
