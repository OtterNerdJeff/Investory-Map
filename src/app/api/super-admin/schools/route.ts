import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-errors";
import bcrypt from "bcryptjs";
import { CONDEMNED_SECTION } from "@/lib/constants";

export async function GET() {
  try {
    await requireSuperAdmin();

    const schools = await prisma.school.findMany({
      include: { _count: { select: { items: true, users: true } } },
      orderBy: { name: "asc" },
    });

    const schoolsWithStats = await Promise.all(
      schools.map(async (s) => {
        const [operational, faulty, openFaults] = await Promise.all([
          prisma.item.count({ where: { schoolId: s.id, status: "Operational" } }),
          prisma.item.count({ where: { schoolId: s.id, status: "Faulty" } }),
          prisma.fault.count({ where: { item: { schoolId: s.id }, status: { not: "Resolved" } } }),
        ]);
        return { ...s, stats: { operational, faulty, openFaults } };
      })
    );

    return NextResponse.json(schoolsWithStats);
  } catch (e: unknown) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin();
    const body = await req.json() as {
      name: string;
      code: string;
      address?: string;
      adminEmail?: string;
      adminPassword?: string;
      adminName?: string;
    };

    if (!body.name || !body.code) {
      return NextResponse.json({ error: "name and code are required" }, { status: 400 });
    }

    const school = await prisma.school.create({
      data: {
        name: body.name,
        code: body.code,
        address: body.address ?? null,
        sections: {
          create: {
            name: CONDEMNED_SECTION,
            sortOrder: 999,
            isProtected: true,
            rooms: { create: { name: CONDEMNED_SECTION, sortOrder: 0 } },
          },
        },
      },
    });

    if (body.adminEmail && body.adminPassword && body.adminName) {
      const hash = await bcrypt.hash(body.adminPassword, 12);
      await prisma.user.create({
        data: {
          email: body.adminEmail,
          passwordHash: hash,
          name: body.adminName,
          role: "SCHOOL_ADMIN",
          schoolId: school.id,
        },
      });
    }

    return NextResponse.json(school, { status: 201 });
  } catch (e: unknown) {
    return handleApiError(e);
  }
}
