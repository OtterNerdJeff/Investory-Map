import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-errors";
import { z } from "zod";

type Params = { params: Promise<{ userId: string }> };

const UpdateSchema = z.object({
  role: z.enum(["SUPER_ADMIN", "SCHOOL_ADMIN", "USER"]),
});

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await requireSuperAdmin();
    const { userId } = await params;

    const body = await req.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        role: parsed.data.role,
        // SUPER_ADMIN is platform-wide — detach from school
        ...(parsed.data.role === "SUPER_ADMIN" ? { schoolId: null } : {}),
      },
      select: { id: true, name: true, email: true, role: true, schoolId: true },
    });

    return NextResponse.json(updated);
  } catch (e: unknown) {
    return handleApiError(e);
  }
}
