import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-errors";
import bcrypt from "bcryptjs";

type Params = { params: Promise<{ schoolId: string }> };

const ALLOWED_ROLES = ["SCHOOL_ADMIN", "USER"] as const;
type AllowedRole = (typeof ALLOWED_ROLES)[number];

export async function POST(req: NextRequest, { params }: Params) {
  try {
    await requireSuperAdmin();
    const { schoolId } = await params;
    const body = await req.json() as { email: string; password: string; name: string; role?: string };

    if (!body.email || !body.password || !body.name) {
      return NextResponse.json({ error: "email, password, and name are required" }, { status: 400 });
    }

    if (body.role && !ALLOWED_ROLES.includes(body.role as AllowedRole)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    const role: AllowedRole = ALLOWED_ROLES.includes(body.role as AllowedRole)
      ? (body.role as AllowedRole)
      : "USER";

    const school = await prisma.school.findFirst({ where: { id: schoolId } });
    if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 });

    const hash = await bcrypt.hash(body.password, 12);
    const user = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash: hash,
        name: body.name,
        role,
        schoolId,
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (e: unknown) {
    return handleApiError(e);
  }
}
