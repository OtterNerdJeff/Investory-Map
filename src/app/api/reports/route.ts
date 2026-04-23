import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-errors";
import { resolveSchoolId } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    const user = await requireSession();
    const schoolId = resolveSchoolId(
      user,
      req.nextUrl.searchParams.get("schoolId") || undefined
    );

    const [items, openFaults] = await Promise.all([
      prisma.item.findMany({
        where: { schoolId },
        select: {
          id: true, type: true, brand: true, status: true,
          isLoaned: true, warrantyEnd: true, label: true, model: true, locationName: true,
        },
      }),
      prisma.fault.count({
        where: { item: { schoolId }, status: { not: "Resolved" } },
      }),
    ]);

    const now = new Date();
    const stats = {
      total: items.length,
      operational: items.filter((i) => i.status === "Operational").length,
      faulty: items.filter((i) => i.status === "Faulty").length,
      maintenance: items.filter((i) => i.status === "Under Maintenance").length,
      condemned: items.filter((i) => i.status === "Waiting for Condemnation").length,
      loaned: items.filter((i) => i.isLoaned).length,
      openFaults,
      warrantyExpired: items.filter((i) => i.warrantyEnd && i.warrantyEnd < now).length,
      expiringSoon: items.filter((i) => {
        if (!i.warrantyEnd) return false;
        const diff = (i.warrantyEnd.getTime() - now.getTime()) / 86400000;
        return diff > 0 && diff < 90;
      }).length,
    };

    const byType: Record<string, number> = {};
    const byBrand: Record<string, number> = {};
    items.forEach((i) => {
      byType[i.type] = (byType[i.type] ?? 0) + 1;
      byBrand[i.brand ?? "Unknown"] = (byBrand[i.brand ?? "Unknown"] ?? 0) + 1;
    });

    const warrantyExpired = items
      .filter((i) => i.warrantyEnd && i.warrantyEnd < now)
      .map((i) => ({
        label: i.label,
        brand: i.brand,
        model: i.model,
        location: i.locationName,
        warrantyEnd: i.warrantyEnd,
      }));

    return NextResponse.json({ stats, byType, byBrand, warrantyExpired });
  } catch (e: unknown) {
    return handleApiError(e);
  }
}
