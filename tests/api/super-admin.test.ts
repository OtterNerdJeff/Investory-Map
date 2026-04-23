import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth-guard", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth-guard")>("@/lib/auth-guard");
  return { ...actual, requireSuperAdmin: vi.fn() };
});

vi.mock("@/lib/prisma", () => {
  const prismaMock = {
    school: { findMany: vi.fn(), create: vi.fn(), findFirst: vi.fn(), count: vi.fn() },
    item: { count: vi.fn(), findMany: vi.fn() },
    fault: { count: vi.fn() },
    user: { create: vi.fn(), count: vi.fn() },
  };
  return { prisma: prismaMock };
});

vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn().mockResolvedValue("hashed") },
}));

import { requireSuperAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { GET as GET_SCHOOLS, POST as POST_SCHOOL } from "@/app/api/super-admin/schools/route";
import { GET as GET_SCHOOL } from "@/app/api/super-admin/schools/[schoolId]/route";
import { POST as POST_USER } from "@/app/api/super-admin/schools/[schoolId]/users/route";
import { GET as GET_STATS } from "@/app/api/super-admin/stats/route";

describe("GET /api/super-admin/schools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with school list including per-school stats", async () => {
    (requireSuperAdmin as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "super1",
      role: "SUPER_ADMIN",
      schoolId: null,
    });

    (prisma.school.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "s1", name: "School A", _count: { items: 10, users: 3 } },
    ]);
    // item.count is called 2x per school (operational, faulty)
    (prisma.item.count as ReturnType<typeof vi.fn>).mockResolvedValue(5);
    (prisma.fault.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

    const res = await GET_SCHOOLS();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe("s1");
    expect(data[0].stats).toEqual({ operational: 5, faulty: 5, openFaults: 0 });
  });
});

describe("POST /api/super-admin/schools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 201 and creates school without admin user when admin fields omitted", async () => {
    (requireSuperAdmin as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "super1",
      role: "SUPER_ADMIN",
      schoolId: null,
    });

    const mockSchool = { id: "s_new", name: "New School", code: "NS001" };
    (prisma.school.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockSchool);

    const req = new NextRequest("http://localhost/api/super-admin/schools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New School", code: "NS001" }),
    });
    const res = await POST_SCHOOL(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.id).toBe("s_new");
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("returns 400 when name or code is missing", async () => {
    (requireSuperAdmin as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "super1",
      role: "SUPER_ADMIN",
      schoolId: null,
    });

    const req = new NextRequest("http://localhost/api/super-admin/schools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Missing Code Only" }),
    });
    const res = await POST_SCHOOL(req);

    expect(res.status).toBe(400);
  });
});

describe("GET /api/super-admin/schools/[schoolId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 when school not found", async () => {
    (requireSuperAdmin as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "super1",
      role: "SUPER_ADMIN",
      schoolId: null,
    });

    (prisma.school.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/super-admin/schools/nonexistent");
    const res = await GET_SCHOOL(req, { params: Promise.resolve({ schoolId: "nonexistent" }) });

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Not found");
  });

  it("returns 200 with school details and computed stats", async () => {
    (requireSuperAdmin as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "super1",
      role: "SUPER_ADMIN",
      schoolId: null,
    });

    (prisma.school.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "s1",
      name: "School A",
      code: "SA001",
      users: [{ id: "u1", name: "Admin", email: "admin@sa.com", role: "SCHOOL_ADMIN", createdAt: new Date() }],
      sections: [],
      _count: { items: 2 },
    });

    (prisma.item.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "i1", type: "Projector", brand: "Epson", status: "Operational", isLoaned: false, warrantyEnd: null },
      { id: "i2", type: "MIC", brand: "Shure", status: "Faulty", isLoaned: true, warrantyEnd: new Date("2020-01-01") },
    ]);

    const req = new NextRequest("http://localhost/api/super-admin/schools/s1");
    const res = await GET_SCHOOL(req, { params: Promise.resolve({ schoolId: "s1" }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.id).toBe("s1");
    expect(data.stats.total).toBe(2);
    expect(data.stats.operational).toBe(1);
    expect(data.stats.faulty).toBe(1);
    expect(data.stats.loaned).toBe(1);
    expect(data.stats.warrantyExpired).toBe(1);
  });
});

describe("POST /api/super-admin/schools/[schoolId]/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 201 and creates user in the given school", async () => {
    (requireSuperAdmin as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "super1",
      role: "SUPER_ADMIN",
      schoolId: null,
    });

    (prisma.school.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "s1", name: "School A" });

    const mockUser = {
      id: "u_new",
      name: "Jane Doe",
      email: "jane@school.com",
      role: "USER",
      createdAt: new Date(),
    };
    (prisma.user.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

    const req = new NextRequest("http://localhost/api/super-admin/schools/s1/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "jane@school.com", password: "secret123", name: "Jane Doe" }),
    });
    const res = await POST_USER(req, { params: Promise.resolve({ schoolId: "s1" }) });
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.id).toBe("u_new");
    expect(data.email).toBe("jane@school.com");
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "jane@school.com",
          passwordHash: "hashed",
          name: "Jane Doe",
          schoolId: "s1",
        }),
      })
    );
  });

  it("returns 404 when the school does not exist", async () => {
    (requireSuperAdmin as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "super1",
      role: "SUPER_ADMIN",
      schoolId: null,
    });

    (prisma.school.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/super-admin/schools/bogus/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "x@x.com", password: "pass", name: "X" }),
    });
    const res = await POST_USER(req, { params: Promise.resolve({ schoolId: "bogus" }) });

    expect(res.status).toBe(404);
  });
});

describe("GET /api/super-admin/stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with aggregate platform counts", async () => {
    (requireSuperAdmin as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "super1",
      role: "SUPER_ADMIN",
      schoolId: null,
    });

    (prisma.school.count as ReturnType<typeof vi.fn>).mockResolvedValue(3);
    (prisma.user.count as ReturnType<typeof vi.fn>).mockResolvedValue(12);
    (prisma.item.count as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(150)  // itemCount (total)
      .mockResolvedValueOnce(5);   // activeLoans (isLoaned: true)
    (prisma.fault.count as ReturnType<typeof vi.fn>).mockResolvedValue(7);

    const res = await GET_STATS();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.schools).toBe(3);
    expect(data.users).toBe(12);
    expect(data.totalAssets).toBe(150);
    expect(data.openFaults).toBe(7);
    expect(data.activeLoans).toBe(5);
  });
});
