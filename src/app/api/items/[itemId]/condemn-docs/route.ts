import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isAdmin, canAccess } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-errors";
import { attachCondemnDoc } from "@/lib/condemned";
import { CondemnDocCreateSchema } from "@/lib/validation/condemned";

type Params = { params: Promise<{ itemId: string }> };

// POST — attach an already-uploaded document (see POST /api/upload, folder
// "documents") to one item. If the item was waiting for a document, this
// confirms it as condemned. For several items at once, see
// POST /api/condemned/confirm.
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

    const { docs } = await attachCondemnDoc([item], {
      url: parsed.data.url,
      fileName: parsed.data.fileName,
      uploadedBy: user.name ?? null,
    });
    return NextResponse.json(docs[0], { status: 201 });
  } catch (e: unknown) {
    return handleApiError(e);
  }
}
