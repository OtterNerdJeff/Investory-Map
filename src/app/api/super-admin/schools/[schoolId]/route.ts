import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-errors";

type Params = { params: Promise<{ schoolId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    await requireSuperAdmin();
    const { schoolId } = await params;

    const school = await prisma.school.findFirst({
      where: { id: schoolId },
      include: {
        users: { select: { id: true, name: true, email: true, role: true, createdAt: true } },
        sections: { include: { rooms: { orderBy: { sortOrder: "asc" } } }, orderBy: { sortOrder: "asc" } },
        _count: { select: { items: true } },
      },
    });

    if (!school) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const items = await prisma.item.findMany({
      where: { schoolId },
      select: { id: true, type: true, brand: true, status: true, isLoaned: true, warrantyEnd: true },
    });

    const now = new Date();
    const stats = {
      total: items.length,
      operational: items.filter((i) => i.status === "Operational").length,
      faulty: items.filter((i) => i.status === "Faulty").length,
      maintenance: items.filter((i) => i.status === "Under Maintenance").length,
      condemned: items.filter((i) => i.status === "Waiting for Condemnation").length,
      loaned: items.filter((i) => i.isLoaned).length,
      warrantyExpired: items.filter((i) => i.warrantyEnd && i.warrantyEnd < now).length,
    };

    return NextResponse.json({ ...school, stats });
  } catch (e: unknown) {
    return handleApiError(e);
  }
}
