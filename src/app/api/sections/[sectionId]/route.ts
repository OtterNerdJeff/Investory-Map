import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isAdmin, canAccess } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-errors";
import { SectionUpdateSchema } from "@/lib/validation/sections";

type Params = { params: Promise<{ sectionId: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const user = await requireSession();
    if (!isAdmin(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { sectionId } = await params;
    const section = await prisma.section.findFirst({
      where: { id: sectionId },
    });
    if (!section) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!canAccess(user, section.schoolId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = SectionUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const input = parsed.data;
    const oldName = section.name;
    const isRename = input.name !== undefined && input.name !== oldName;

    // Atomic: section update + item location cascade.
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.section.update({
        where: { id: sectionId },
        data: {
          name: input.name ?? section.name,
          sortOrder: input.sortOrder ?? section.sortOrder,
        },
        include: { rooms: { orderBy: { sortOrder: "asc" } } },
      });

      if (isRename) {
        await tx.item.updateMany({
          where: { schoolId: section.schoolId, locationName: oldName },
          data: { locationName: input.name! },
        });
      }

      return result;
    });

    return NextResponse.json(updated);
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

    const { sectionId } = await params;
    const section = await prisma.section.findFirst({
      where: { id: sectionId },
      include: { rooms: true },
    });
    if (!section) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!canAccess(user, section.schoolId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (section.isProtected) {
      return NextResponse.json(
        { error: "Cannot delete protected section" },
        { status: 400 }
      );
    }

    const roomNames = section.rooms.map((r) => r.name);

    // Atomic: cascade items to "Spare" + delete section (rooms cascade via FK).
    await prisma.$transaction(async (tx) => {
      if (roomNames.length > 0) {
        await tx.item.updateMany({
          where: {
            schoolId: section.schoolId,
            locationName: { in: roomNames },
          },
          data: { locationName: "Spare" },
        });
      }
      await tx.section.delete({ where: { id: sectionId } });
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return handleApiError(e);
  }
}
