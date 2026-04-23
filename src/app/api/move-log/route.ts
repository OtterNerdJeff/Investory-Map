import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-guard";
import { resolveSchoolId } from "@/lib/tenant";
import { handleApiError } from "@/lib/api-errors";

export async function GET(req: NextRequest) {
  try {
    const user = await requireSession();
    const schoolId = resolveSchoolId(
      user,
      req.nextUrl.searchParams.get("schoolId") || undefined
    );

    const log = await prisma.moveLogEntry.findMany({
      where: { schoolId },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    return NextResponse.json(log);
  } catch (e: unknown) {
    return handleApiError(e);
  }
}
