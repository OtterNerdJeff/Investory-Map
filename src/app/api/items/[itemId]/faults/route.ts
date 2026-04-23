import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, canAccess } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-errors";
import { FaultCreateSchema } from "@/lib/validation/faults";

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
    const parsed = FaultCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const input = parsed.data;

    // Auto-escalate item status based on severity (see CLAUDE.md
    // "Fault auto-escalation"). Wrapped in an interactive transaction so the
    // fault row and the item.status update are atomic — a crash between them
    // would leave the dashboard counts out of sync otherwise.
    const fault = await prisma.$transaction(async (tx) => {
      const created = await tx.fault.create({
        data: {
          itemId,
          faultType: input.faultType,
          severity: input.severity,
          description: input.description ?? null,
          reportedBy: input.reportedBy ?? user.name,
          photos: input.photos ?? [],
        },
      });

      const escalated =
        input.severity === "High" || input.severity === "Critical"
          ? "Faulty"
          : item.status === "Operational"
            ? "Under Maintenance"
            : item.status;

      if (escalated !== item.status) {
        await tx.item.update({
          where: { id: itemId },
          data: { status: escalated },
        });
      }

      return created;
    });

    return NextResponse.json(fault, { status: 201 });
  } catch (e: unknown) {
    return handleApiError(e);
  }
}
