import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isAdmin, canAccess } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-errors";
import { CondemnDocCreateSchema } from "@/lib/validation/condemned";

type Params = { params: Promise<{ itemId: string }> };

// POST — attach an already-uploaded PDF (see POST /api/upload, folder
// "documents") to an item as proof of disposal.
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await requireSession();
    if (!isAdmin(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { itemId } = await params;
    const item = await prisma.item.findFirst({ where: { id: itemId } });
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!canAccess(user, item.schoolId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const parsed = CondemnDocCreateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const doc = await prisma.condemnDoc.create({
      data: {
        schoolId: item.schoolId,
        itemId,
        url: parsed.data.url,
        fileName: parsed.data.fileName,
        uploadedBy: user.name ?? null,
      },
    });
    return NextResponse.json(doc, { status: 201 });
  } catch (e: unknown) {
    return handleApiError(e);
  }
}
