import { Role } from "@prisma/client";

type UserContext = {
  role: Role | string;
  schoolId: string | null;
};

export function resolveSchoolId(
  user: UserContext,
  explicitSchoolId?: string
): string {
  if (user.role === "SUPER_ADMIN") {
    if (explicitSchoolId) return explicitSchoolId;
    throw new Error("schoolId required for super admin operations");
  }

  if (!user.schoolId) {
    throw new Error("User has no school assigned");
  }

  return user.schoolId;
}
