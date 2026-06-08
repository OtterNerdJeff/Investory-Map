import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isAdmin } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-errors";
import { resolveSchoolId } from "@/lib/tenant";
import { DEFAULT_ITEM_TYPES, TYPE_ICON } from "@/lib/constants";

export async function GET() {
  try {
    const user = await requireSession();
    const schoolId = resolveSchoolId(user);

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { customTypes: true, typeIcons: true },
    });

    const types = Array.isArray(school?.customTypes)
      ? (school.customTypes as string[])
      : DEFAULT_ITEM_TYPES;

    const defaultIcons: Record<string, string> = {};
    for (const t of types) {
      defaultIcons[t] = TYPE_ICON[t] || TYPE_ICON.default;
    }

    const icons =
      school?.typeIcons && typeof school.typeIcons === "object"
        ? { ...defaultIcons, ...(school.typeIcons as Record<string, string>) }
        : defaultIcons;

    return NextResponse.json({ types, icons });
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
    const icons: unknown = body.icons;

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
      data: {
        customTypes: types as string[],
        ...(icons && typeof icons === "object" ? { typeIcons: icons as Record<string, string> } : {}),
      },
    });

    return NextResponse.json({ types, icons: icons || {} });
  } catch (e: unknown) {
    return handleApiError(e);
  }
}
