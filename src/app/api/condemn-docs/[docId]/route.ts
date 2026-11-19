import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isAdmin, canAccess } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-errors";
import { backToPendingData, deleteDocFilesIfUnused } from "@/lib/condemned";
import { CONDEMNED_STATUS } from "@/lib/constants";

type Params = { params: Promise<{ docId: string }> };

// DELETE — remove a document from one item. The stored file is deleted only
// when no other item still uses it. A condemned item left with no document
// goes back to the pending list.
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

    let backToPending = false;
    const remaining = await prisma.condemnDoc.count({ where: { itemId: doc.itemId } });
    if (remaining === 0) {
      const item = await prisma.item.findFirst({ where: { id: doc.itemId } });
      if (item && item.status === CONDEMNED_STATUS) {
        await prisma.item.update({
          where: { id: item.id },
          data: backToPendingData(item),
        });
        backToPending = true;
      }
    }

    try {
      await deleteDocFilesIfUnused([doc.url]);
    } catch {
      // Storage cleanup is best-effort; the record is already gone.
    }

    return NextResponse.json({ ok: true, backToPending });
  } catch (e: unknown) {
    return handleApiError(e);
  }
}
