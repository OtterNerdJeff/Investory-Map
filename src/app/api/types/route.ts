import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isAdmin } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-errors";
import { resolveSchoolId } from "@/lib/tenant";
import { DEFAULT_ITEM_TYPES } from "@/lib/constants";

export async function GET() {
  try {
    const user = await requireSession();
    const schoolId = resolveSchoolId(user);

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { customTypes: true },
    });

    const types = Array.isArray(school?.customTypes)
      ? (school.customTypes as string[])
      : DEFAULT_ITEM_TYPES;

    return NextResponse.json(types);
  } catch (e: unknown) {
    return handleApiError(e);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireSession();
    if (!isAdmin(user.role))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const schoolId = resolveSchoolId(user);
    const body = await req.json();
    const types: unknown = body.types;

    if (
      !Array.isArray(types) ||
      types.some((t) => typeof t !== "string" || t.trim() === "")
    ) {
      return NextResponse.json(
        { error: "types must be a non-empty array of strings" },
        { status: 400 }
      );
    }

    await prisma.school.update({
      where: { id: schoolId },
      data: { customTypes: types },
    });

    return NextResponse.json(types);
  } catch (e: unknown) {
    return handleApiError(e);
  }
}
