import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isAdmin, canAccess } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-errors";
import { deleteFile } from "@/lib/upload";

type Params = { params: Promise<{ docId: string }> };

// DELETE — remove an attached PDF and its stored file.
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireSession();
    if (!isAdmin(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { docId } = await params;
    const doc = await prisma.condemnDoc.findFirst({ where: { id: docId } });
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!canAccess(user, doc.schoolId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.condemnDoc.delete({ where: { id: docId } });
    try {
      await deleteFile(doc.url);
    } catch {
      // Storage cleanup is best-effort; the record is already gone.
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return handleApiError(e);
  }
}
