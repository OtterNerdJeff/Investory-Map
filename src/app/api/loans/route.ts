import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-guard";
import { resolveSchoolId } from "@/lib/tenant";
import { handleApiError } from "@/lib/api-errors";

// School-wide loaned-items list. Each row is an Item with its single active
// LoanEntry attached — drives the Loans tab's person-card grouping.
export async function GET(req: NextRequest) {
  try {
    const user = await requireSession();
    const schoolId = resolveSchoolId(
      user,
      req.nextUrl.searchParams.get("schoolId") || undefined
    );

    const items = await prisma.item.findMany({
      where: { schoolId, isLoaned: true },
      include: {
        loanHistory: {
          where: { status: "Active" },
          orderBy: { dateOut: "desc" },
          take: 1,
        },
      },
      orderBy: { loanedTo: "asc" },
    });

    return NextResponse.json(items);
  } catch (e: unknown) {
    return handleApiError(e);
  }
}
