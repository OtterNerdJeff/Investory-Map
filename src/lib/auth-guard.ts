import { Role } from "@prisma/client";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  schoolId: string | null;
  schoolName: string | null;
};

export function canAccess(
  user: { role: Role | string; schoolId: string | null },
  targetSchoolId: string
): boolean {
  if (user.role === "SUPER_ADMIN") return true;
  return user.schoolId === targetSchoolId;
}

export function isAdmin(role: Role | string): boolean {
  return role === "SUPER_ADMIN" || role === "SCHOOL_ADMIN";
}

export function isSuperAdmin(role: Role | string): boolean {
  return role === "SUPER_ADMIN";
}

export async function getSessionUser(): Promise<SessionUser | null> {
  // Dynamic import so this module remains loadable in non-Next contexts
  // (e.g. vitest node runner) without pulling in `next/server` at import time.
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  if (!session?.user) return null;
  return session.user as unknown as SessionUser;
}

export async function requireSession(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireSession();
  if (!isAdmin(user.role)) throw new Error("Forbidden");
  return user;
}

export async function requireSuperAdmin(): Promise<SessionUser> {
  const user = await requireSession();
  if (!isSuperAdmin(user.role)) throw new Error("Forbidden");
  return user;
}
