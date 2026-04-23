import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-errors";

export async function GET() {
  try {
    await requireSuperAdmin();

    const [schoolCount, userCount, itemCount, openFaults, activeLoans] =
      await Promise.all([
        prisma.school.count(),
        prisma.user.count(),
        prisma.item.count(),
        prisma.fault.count({ where: { status: { not: "Resolved" } } }),
        prisma.item.count({ where: { isLoaned: true } }),
      ]);

    return NextResponse.json({ schools: schoolCount, users: userCount, totalAssets: itemCount, openFaults, activeLoans });
  } catch (e: unknown) {
    return handleApiError(e);
  }
}
