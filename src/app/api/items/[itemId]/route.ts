import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isAdmin, canAccess } from "@/lib/auth-guard";
import { CONDEMNED_SECTION } from "@/lib/constants";

type Params = { params: Promise<{ itemId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = await requireSession();
    const { itemId } = await params;

    const item = await prisma.item.findFirst({
      where: { id: itemId },
      include: {
        faults: { orderBy: { createdAt: "desc" } },
        repairs: { orderBy: { createdAt: "desc" } },
        loanHistory: { orderBy: { dateOut: "desc" } },
        moveLog: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!canAccess(user, item.schoolId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(item);
  } catch (e: any) {
    if (e.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const user = await requireSession();
    if (!isAdmin(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { itemId } = await params;
    const existing = await prisma.item.findFirst({ where: { id: itemId } });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!canAccess(user, existing.schoolId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const data: any = {};

    const fields = [
      "label",
      "assetCode",
      "type",
      "brand",
      "model",
      "serial",
      "locationName",
      "status",
      "statusNote",
      "loanable",
      "isLoaned",
      "loanedTo",
      "remark",
      "comment",
      "sheet",
    ];
    for (const f of fields) {
      if (body[f] !== undefined) data[f] = body[f];
    }
    if (body.cost !== undefined)
      data.cost = body.cost ? parseFloat(body.cost) : null;
    if (body.warrantyEnd !== undefined)
      data.warrantyEnd = body.warrantyEnd
        ? new Date(body.warrantyEnd)
        : null;

    // Auto-route condemned
    if (
      data.status === "Waiting for Condemnation" &&
      existing.locationName !== CONDEMNED_SECTION
    ) {
      data.prevLocation = existing.locationName;
      data.locationName = CONDEMNED_SECTION;
    }
    if (
      data.status &&
      data.status !== "Waiting for Condemnation" &&
      existing.status === "Waiting for Condemnation"
    ) {
      data.locationName = existing.prevLocation || "Spare";
      data.prevLocation = null;
    }

    const item = await prisma.item.update({
      where: { id: itemId },
      data,
      include: {
        faults: { orderBy: { createdAt: "desc" } },
        repairs: { orderBy: { createdAt: "desc" } },
        loanHistory: { orderBy: { dateOut: "desc" } },
        moveLog: { orderBy: { createdAt: "desc" } },
      },
    });

    return NextResponse.json(item);
  } catch (e: any) {
    if (e.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const user = await requireSession();
    if (!isAdmin(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { itemId } = await params;
    const existing = await prisma.item.findFirst({ where: { id: itemId } });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!canAccess(user, existing.schoolId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.item.delete({ where: { id: itemId } });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
