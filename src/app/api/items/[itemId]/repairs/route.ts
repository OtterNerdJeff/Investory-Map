import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, canAccess } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-errors";
import { RepairCreateSchema } from "@/lib/validation/repairs";

type Params = { params: Promise<{ itemId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await requireSession();
    const { itemId } = await params;

    const item = await prisma.item.findFirst({ where: { id: itemId } });
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!canAccess(user, item.schoolId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = RepairCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const input = parsed.data;

    const repair = await prisma.repair.create({
      data: {
        itemId,
        description: input.description,
        technician: input.technician ?? null,
        startDate: input.startDate ? new Date(input.startDate) : null,
        completeDate: input.completeDate ? new Date(input.completeDate) : null,
        cost: input.cost ? parseFloat(input.cost) : null,
        notes: input.notes ?? null,
      },
    });

    return NextResponse.json(repair, { status: 201 });
  } catch (e: unknown) {
    return handleApiError(e);
  }
}
