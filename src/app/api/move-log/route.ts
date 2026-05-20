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

    return NextResponse.json(log.map(l => ({
      id: l.id,
      itemLabel: l.itemLabel,
      from: l.fromLoc,
      to: l.toLoc,
      reason: l.reason ?? "",
      movedBy: l.movedBy ?? undefined,
      date: l.createdAt,
    })));
  } catch (e: unknown) {
    return handleApiError(e);
  }
}
