import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, canAccess } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-errors";
import { ItemMoveSchema } from "@/lib/validation/items";

type Params = { params: Promise<{ itemId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await requireSession();
    const { itemId } = await params;
    const body = await req.json();

    const parsed = ItemMoveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const input = parsed.data;

    const item = await prisma.item.findFirst({ where: { id: itemId } });
    if (!item)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!canAccess(user, item.schoolId))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Interactive transaction so we read fromLoc and write the update
    // atomically — otherwise a concurrent move could sneak in between the
    // outer findFirst above and the create-log call, corrupting `fromLoc`.
    const { updated, logEntry } = await prisma.$transaction(async (tx) => {
      const current = await tx.item.findFirst({ where: { id: itemId } });
      if (!current) throw new Error("Not found during move");

      const updated = await tx.item.update({
        where: { id: itemId },
        data: { locationName: input.toLocation },
      });
      const logEntry = await tx.moveLogEntry.create({
        data: {
          schoolId: current.schoolId,
          itemId,
          itemLabel: current.label,
          fromLoc: current.locationName,
          toLoc: input.toLocation,
          reason: input.reason ?? null,
          movedBy: input.movedBy ?? user.name,
        },
      });
      return { updated, logEntry };
    });

    return NextResponse.json({ item: updated, logEntry });
  } catch (e: unknown) {
    return handleApiError(e);
  }
}
