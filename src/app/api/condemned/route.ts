import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-guard";
import { resolveSchoolId } from "@/lib/tenant";
import { handleApiError } from "@/lib/api-errors";
import { CONDEMNED_STATUS } from "@/lib/constants";
import { purgeExpiredCondemned } from "@/lib/condemned";

// GET — the school's condemned items with their proof-of-disposal PDFs.
// Records past the retention period are purged first (see src/lib/condemned.ts).
export async function GET(req: NextRequest) {
  try {
    const user = await requireSession();
    const schoolId = resolveSchoolId(
      user,
      req.nextUrl.searchParams.get("schoolId") || undefined
    );

    await purgeExpiredCondemned(schoolId);

    const items = await prisma.item.findMany({
      where: { schoolId, status: CONDEMNED_STATUS },
      include: { condemnDocs: { orderBy: { createdAt: "asc" } } },
      orderBy: [{ condemnedAt: "desc" }, { label: "asc" }],
    });

    return NextResponse.json(
      items.map(({ locationName, ...rest }) => ({ ...rest, location: locationName }))
    );
  } catch (e: unknown) {
    return handleApiError(e);
  }
}
