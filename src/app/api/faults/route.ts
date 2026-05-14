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

    const faults = await prisma.fault.findMany({
      where: { item: { schoolId } },
      include: {
        item: {
          select: {
            id: true,
            label: true,
            locationName: true,
            type: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const mapped = faults.map((f) => ({
      ...f,
      item: { ...f.item, location: f.item.locationName },
    }));
    return NextResponse.json(mapped);
  } catch (e: unknown) {
    return handleApiError(e);
  }
}
