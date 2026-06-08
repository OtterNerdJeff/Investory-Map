import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isAdmin } from "@/lib/auth-guard";
import { resolveSchoolId } from "@/lib/tenant";
import { handleApiError } from "@/lib/api-errors";
import { ItemCreateSchema } from "@/lib/validation/items";

export async function GET(req: NextRequest) {
  try {
    const user = await requireSession();
    const schoolId = resolveSchoolId(
      user,
      req.nextUrl.searchParams.get("schoolId") || undefined
    );

    const items = await prisma.item.findMany({
      where: { schoolId },
      include: {
        faults: { orderBy: { createdAt: "desc" } },
        repairs: { orderBy: { createdAt: "desc" } },
        loanHistory: { orderBy: { dateOut: "desc" } },
        moveLog: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { label: "asc" },
    });

    const mapped = items.map((item) => {
      const { locationName, faults, repairs, loanHistory, moveLog, ...rest } = item as Record<string, unknown>;
      return {
        ...rest,
        location: locationName,
        faults: (faults as Array<Record<string, unknown>>)?.map(f => ({ ...f, date: f.createdAt })),
        repairs: (repairs as Array<Record<string, unknown>>)?.map(r => ({ ...r, loggedDate: r.createdAt, costRepair: r.cost })),
        loanHistory,
        moveLog: (moveLog as Array<Record<string, unknown>>)?.map(m => ({ ...m, from: m.fromLoc, to: m.toLoc, date: m.createdAt })),
      };
    });
    return NextResponse.json(mapped);
  } catch (e: unknown) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireSession();

    if (!isAdmin(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const schoolId = resolveSchoolId(
      user,
      req.nextUrl.searchParams.get("schoolId") || undefined
    );
    const body = await req.json();
    const parsed = ItemCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const input = parsed.data;

    const item = await prisma.item.create({
      data: {
        schoolId,
        label: input.label,
        assetCode: input.assetCode ?? null,
        type: input.type,
        brand: input.brand ?? null,
        model: input.model ?? null,
        serial: input.serial ?? null,
        locationName: input.location || input.locationName,
        cost:
          input.cost !== undefined && input.cost !== null && input.cost !== ""
            ? typeof input.cost === "number"
              ? input.cost
              : parseFloat(input.cost)
            : null,
        warrantyEnd: input.warrantyEnd ? new Date(input.warrantyEnd) : null,
        status: input.status,
        statusNote: input.statusNote ?? null,
        loanable: input.loanable,
        remark: input.remark ?? null,
        comment: input.comment ?? null,
        sheet: input.sheet ?? null,
      },
    });

    const { locationName, ...rest } = item as unknown as Record<string, unknown>;
    return NextResponse.json({ ...rest, location: locationName }, { status: 201 });
  } catch (e: unknown) {
    return handleApiError(e);
  }
}
