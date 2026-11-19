import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isAdmin, canAccess } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-errors";
import { attachCondemnDoc } from "@/lib/condemned";
import { CONDEMNED_STATUS, PENDING_CONDEMN_STATUS } from "@/lib/constants";
import { CondemnConfirmSchema } from "@/lib/validation/condemned";

// POST — attach one already-uploaded document (see POST /api/upload, folder
// "documents") to several items and confirm the pending ones as condemned.
// All-or-nothing: if any item is missing, belongs to another school, or is not
// in the condemnation workflow, nothing is changed.
export async function POST(req: NextRequest) {
  try {
    const user = await requireSession();
    if (!isAdmin(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const parsed = CondemnConfirmSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const itemIds = [...new Set(parsed.data.itemIds)];

    const items = await prisma.item.findMany({ where: { id: { in: itemIds } } });
    if (items.length !== itemIds.length) {
      return NextResponse.json({ error: "Some items were not found" }, { status: 404 });
    }
    if (!items.every((i) => canAccess(user, i.schoolId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const notInWorkflow = items.filter(
      (i) => i.status !== PENDING_CONDEMN_STATUS && i.status !== CONDEMNED_STATUS
    );
    if (notInWorkflow.length > 0) {
      return NextResponse.json(
        {
          error: `Not waiting for condemnation: ${notInWorkflow.map((i) => i.label).join(", ")}`,
        },
        { status: 400 }
      );
    }

    const { confirmed } = await attachCondemnDoc(items, {
      url: parsed.data.url,
      fileName: parsed.data.fileName,
      uploadedBy: user.name ?? null,
    });
    return NextResponse.json({ ok: true, attached: items.length, confirmed }, { status: 201 });
  } catch (e: unknown) {
    return handleApiError(e);
  }
}
