import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isAdmin, canAccess } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-errors";
import {
  RoomCreateSchema,
  RoomUpdateSchema,
  RoomDeleteSchema,
} from "@/lib/validation/sections";

type Params = { params: Promise<{ sectionId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
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
    const parsed = RoomCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const input = parsed.data;

    const maxOrder = await prisma.room.aggregate({
      where: { sectionId },
      _max: { sortOrder: true },
    });

    const room = await prisma.room.create({
      data: {
        sectionId,
        name: input.name,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });

    return NextResponse.json(room, { status: 201 });
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
    const parsed = RoomUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const input = parsed.data;

    const room = await prisma.room.findFirst({
      where: { id: input.roomId, sectionId },
    });
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const oldName = room.name;
    const isRename = input.name !== undefined && input.name !== oldName;

    // Atomic: room update + item location cascade.
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.room.update({
        where: { id: input.roomId },
        data: {
          name: input.name ?? room.name,
          sortOrder: input.sortOrder ?? room.sortOrder,
        },
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
    });
    if (!section) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!canAccess(user, section.schoolId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = RoomDeleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const input = parsed.data;

    const room = await prisma.room.findFirst({
      where: { id: input.roomId, sectionId },
    });
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Atomic: redirect items + delete room.
    await prisma.$transaction(async (tx) => {
      await tx.item.updateMany({
        where: { schoolId: section.schoolId, locationName: room.name },
        data: { locationName: input.redirectTo },
      });
      await tx.room.delete({ where: { id: input.roomId } });
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return handleApiError(e);
  }
}
