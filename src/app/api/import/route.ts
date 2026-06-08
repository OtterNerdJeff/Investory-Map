import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isAdmin } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-errors";
import { resolveSchoolId } from "@/lib/tenant";

export async function POST(req: NextRequest) {
  try {
    const user = await requireSession();
    if (!isAdmin(user.role))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    if (user.role === "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Super admin must use a school-scoped session to import items" },
        { status: 403 }
      );
    }

    const schoolId = resolveSchoolId(user);
    const body = await req.json();
    const rows: unknown[] = body.items;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 });
    }

    const parsed = rows.map((r) => {
      const row = r as Record<string, unknown>;
      return {
        schoolId,
        label: (row.label as string) || "Unnamed",
        assetCode: (row.assetCode as string) || null,
        type: (row.type as string) || "Projector",
        brand: (row.brand as string) || null,
        model: (row.model as string) || null,
        serial: (row.serial as string) || null,
        locationName: (row.location as string) || (row.locationName as string) || "Spare",
        cost: row.cost ? parseFloat(row.cost as string) : null,
        warrantyEnd: row.warrantyEnd ? new Date(row.warrantyEnd as string) : null,
        status: (row.status as string) || "Operational",
        loanable: row.loanable === true || row.loanable === "Yes",
        remark: (row.remark as string) || null,
        comment: (row.comment as string) || null,
      };
    });

    const serialsInCsv = parsed
      .map((r) => r.serial)
      .filter((s): s is string => s != null && s.trim() !== "");

    let existingSerials = new Set<string>();
    if (serialsInCsv.length > 0) {
      const existing = await prisma.item.findMany({
        where: { schoolId, serial: { in: serialsInCsv } },
        select: { serial: true },
      });
      existingSerials = new Set(existing.map((e) => e.serial!));
    }

    const seenSerials = new Set<string>();
    const deduped = parsed.filter((row) => {
      if (row.serial && row.serial.trim() !== "") {
        if (existingSerials.has(row.serial) || seenSerials.has(row.serial)) {
          return false;
        }
        seenSerials.add(row.serial);
      }
      return true;
    });

    const skipped = parsed.length - deduped.length;

    if (deduped.length === 0) {
      return NextResponse.json(
        { imported: 0, skipped, message: "All items were duplicates (matching serial numbers)" },
        { status: 200 }
      );
    }

    const created = await prisma.item.createMany({ data: deduped });

    return NextResponse.json({ imported: created.count, skipped }, { status: 201 });
  } catch (e: unknown) {
    return handleApiError(e);
  }
}
