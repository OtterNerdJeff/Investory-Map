import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isAdmin } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-errors";
import { resolveSchoolId } from "@/lib/tenant";

export async function POST() {
  try {
    const user = await requireSession();
    if (!isAdmin(user.role))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const schoolId = resolveSchoolId(user);

    await prisma.$transaction([
      prisma.moveLogEntry.deleteMany({ where: { schoolId } }),
      prisma.auditLogEntry.deleteMany({ where: { schoolId } }),
      prisma.item.deleteMany({ where: { schoolId } }),
      prisma.section.deleteMany({ where: { schoolId } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return handleApiError(e);
  }
}
