import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession, canAccess } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-errors";
import { FaultUpdateSchema } from "@/lib/validation/faults";

type Params = { params: Promise<{ faultId: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const user = await requireSession();
    const { faultId } = await params;

    const fault = await prisma.fault.findFirst({
      where: { id: faultId },
      include: { item: true },
    });
    if (!fault) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!canAccess(user, fault.item.schoolId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = FaultUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const input = parsed.data;

    const data: Prisma.FaultUpdateInput = {};
    if (input.status !== undefined) data.status = input.status;
    if (input.resolvedBy !== undefined) data.resolvedBy = input.resolvedBy ?? null;
    if (input.resolutionNote !== undefined) {
      data.resolutionNote = input.resolutionNote ?? null;
    }

    // Atomic: update the fault and (if this resolves the final open fault
    // on the item) revert item.status to Operational. See CLAUDE.md
    // "Fault auto-escalation" — all resolved → Operational.
    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.fault.update({
        where: { id: faultId },
        data,
      });

      if (input.status === "Resolved") {
        const openFaults = await tx.fault.count({
          where: { itemId: fault.itemId, status: { not: "Resolved" } },
        });
        if (openFaults === 0) {
          await tx.item.update({
            where: { id: fault.itemId },
            data: { status: "Operational" },
          });
        }
      }

      return u;
    });

    return NextResponse.json(updated);
  } catch (e: unknown) {
    return handleApiError(e);
  }
}
