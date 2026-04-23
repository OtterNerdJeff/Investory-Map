import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isAdmin } from "@/lib/auth-guard";
import { resolveSchoolId } from "@/lib/tenant";
import { handleApiError } from "@/lib/api-errors";
import { SectionCreateSchema } from "@/lib/validation/sections";

export async function GET(req: NextRequest) {
  try {
    const user = await requireSession();
    const schoolId = resolveSchoolId(
      user,
      req.nextUrl.searchParams.get("schoolId") || undefined
    );

    const sections = await prisma.section.findMany({
      where: { schoolId },
      include: { rooms: { orderBy: { sortOrder: "asc" } } },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(sections);
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
    const parsed = SectionCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const input = parsed.data;

    const maxOrder = await prisma.section.aggregate({
      where: { schoolId },
      _max: { sortOrder: true },
    });

    const section = await prisma.section.create({
      data: {
        schoolId,
        name: input.name,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
        isProtected: input.isProtected ?? false,
      },
      include: { rooms: true },
    });

    return NextResponse.json(section, { status: 201 });
  } catch (e: unknown) {
    return handleApiError(e);
  }
}
