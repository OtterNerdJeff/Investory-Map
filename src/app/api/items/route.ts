import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isAdmin } from "@/lib/auth-guard";
import { resolveSchoolId } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    const user = await requireSession();
    const schoolId = resolveSchoolId(
      user,
      req.nextUrl.searchParams.get("schoolId") || undefined
    );

    const items = await prisma.item.findMany({
      where: { schoolId },
      include: {
        faults: { orderBy: { createdAt: "desc" } },
        repairs: { orderBy: { createdAt: "desc" } },
        loanHistory: { orderBy: { dateOut: "desc" } },
        moveLog: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { label: "asc" },
    });

    return NextResponse.json(items);
  } catch (e: any) {
    if (e.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireSession();

    if (!isAdmin(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const schoolId = resolveSchoolId(
      user,
      req.nextUrl.searchParams.get("schoolId") || undefined
    );
    const body = await req.json();

    const item = await prisma.item.create({
      data: {
        schoolId,
        label: body.label,
        assetCode: body.assetCode || null,
        type: body.type || "Projector",
        brand: body.brand || null,
        model: body.model || null,
        serial: body.serial || null,
        locationName: body.locationName || "Spare",
        cost: body.cost ? parseFloat(body.cost) : null,
        warrantyEnd: body.warrantyEnd ? new Date(body.warrantyEnd) : null,
        status: body.status || "Operational",
        statusNote: body.statusNote || null,
        loanable: body.loanable || false,
        remark: body.remark || null,
        comment: body.comment || null,
        sheet: body.sheet || null,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (e: any) {
    if (e.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (e.message === "Forbidden")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
