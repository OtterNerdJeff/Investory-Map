import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, canAccess } from "@/lib/auth-guard";

type Params = { params: Promise<{ itemId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await requireSession();
    const { itemId } = await params;
    const body = await req.json();

    const item = await prisma.item.findFirst({ where: { id: itemId } });
    if (!item)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!canAccess(user, item.schoolId))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const [updated, logEntry] = await prisma.$transaction([
      prisma.item.update({
        where: { id: itemId },
        data: { locationName: body.toLocation },
      }),
      prisma.moveLogEntry.create({
        data: {
          schoolId: item.schoolId,
          itemId,
          itemLabel: item.label,
          fromLoc: item.locationName,
          toLoc: body.toLocation,
          reason: body.reason || null,
          movedBy: body.movedBy || user.name,
        },
      }),
    ]);

    return NextResponse.json({ item: updated, logEntry });
  } catch (e: any) {
    if (e.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
