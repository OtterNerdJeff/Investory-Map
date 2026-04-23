import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession, isAdmin, canAccess } from "@/lib/auth-guard";
import { CONDEMNED_SECTION } from "@/lib/constants";
import { handleApiError } from "@/lib/api-errors";
import { ItemUpdateSchema } from "@/lib/validation/items";

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
  } catch (e: unknown) {
    return handleApiError(e);
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
    const parsed = ItemUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const input = parsed.data;
    const data: Prisma.ItemUpdateInput = {};

    // Pass-through scalar fields (only set if the client actually sent them).
    if (input.label !== undefined) data.label = input.label;
    if (input.assetCode !== undefined) data.assetCode = input.assetCode ?? null;
    if (input.type !== undefined) data.type = input.type;
    if (input.brand !== undefined) data.brand = input.brand ?? null;
    if (input.model !== undefined) data.model = input.model ?? null;
    if (input.serial !== undefined) data.serial = input.serial ?? null;
    if (input.locationName !== undefined) data.locationName = input.locationName;
    if (input.status !== undefined) data.status = input.status;
    if (input.statusNote !== undefined) data.statusNote = input.statusNote ?? null;
    if (input.loanable !== undefined) data.loanable = input.loanable;
    if (input.isLoaned !== undefined) data.isLoaned = input.isLoaned;
    if (input.loanedTo !== undefined) data.loanedTo = input.loanedTo ?? null;
    if (input.remark !== undefined) data.remark = input.remark ?? null;
    if (input.comment !== undefined) data.comment = input.comment ?? null;
    if (input.sheet !== undefined) data.sheet = input.sheet ?? null;

    if (input.cost !== undefined) {
      data.cost =
        input.cost === null || input.cost === ""
          ? null
          : typeof input.cost === "number"
            ? input.cost
            : parseFloat(input.cost);
    }
    if (input.warrantyEnd !== undefined) {
      data.warrantyEnd = input.warrantyEnd ? new Date(input.warrantyEnd) : null;
    }

    // Auto-route condemned (see CLAUDE.md "Auto-routing to Condemned").
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
  } catch (e: unknown) {
    return handleApiError(e);
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
  } catch (e: unknown) {
    return handleApiError(e);
  }
}
