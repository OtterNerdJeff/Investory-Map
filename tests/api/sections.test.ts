import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth-guard", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth-guard")>(
    "@/lib/auth-guard"
  );
  return {
    ...actual,
    requireSession: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    section: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      aggregate: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    room: {
      findFirst: vi.fn(),
      aggregate: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    item: {
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { requireSession } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { GET, POST } from "@/app/api/sections/route";
import { DELETE as DELETE_SECTION } from "@/app/api/sections/[sectionId]/route";

describe("GET /api/sections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns sections scoped to user's school", async () => {
    (requireSession as any).mockResolvedValue({
      id: "user1",
      role: "SCHOOL_ADMIN",
      schoolId: "sch_1",
    });

    const mockSections = [
      {
        id: "sec_1",
        schoolId: "sch_1",
        name: "Main Block",
        sortOrder: 0,
        isProtected: false,
        rooms: [],
      },
    ];
    (prisma.section.findMany as any).mockResolvedValue(mockSections);

    const req = new NextRequest("http://localhost/api/sections");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe("Main Block");
    expect(prisma.section.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { schoolId: "sch_1" },
      })
    );
  });
});

describe("POST /api/sections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects USER role with 403", async () => {
    (requireSession as any).mockResolvedValue({
      id: "user1",
      role: "USER",
      schoolId: "sch_1",
    });

    const req = new NextRequest("http://localhost/api/sections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New Block" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(403);
    expect(prisma.section.create).not.toHaveBeenCalled();
  });

  it("allows SCHOOL_ADMIN to create a section with auto sortOrder", async () => {
    (requireSession as any).mockResolvedValue({
      id: "user1",
      role: "SCHOOL_ADMIN",
      schoolId: "sch_1",
    });

    (prisma.section.aggregate as any).mockResolvedValue({
      _max: { sortOrder: 2 },
    });
    (prisma.section.create as any).mockImplementation(async (args: any) => ({
      id: "sec_new",
      rooms: [],
      ...args.data,
    }));

    const req = new NextRequest("http://localhost/api/sections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New Block" }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.name).toBe("New Block");
    expect(data.sortOrder).toBe(3);
    expect(prisma.section.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          schoolId: "sch_1",
          name: "New Block",
          sortOrder: 3,
          isProtected: false,
        }),
      })
    );
  });

  it("uses sortOrder 0 when no sections exist yet", async () => {
    (requireSession as any).mockResolvedValue({
      id: "user1",
      role: "SCHOOL_ADMIN",
      schoolId: "sch_1",
    });

    (prisma.section.aggregate as any).mockResolvedValue({
      _max: { sortOrder: null },
    });
    (prisma.section.create as any).mockImplementation(async (args: any) => ({
      id: "sec_new",
      rooms: [],
      ...args.data,
    }));

    const req = new NextRequest("http://localhost/api/sections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "First Block" }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.sortOrder).toBe(0);
  });
});

describe("DELETE /api/sections/[sectionId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when attempting to delete a protected section", async () => {
    (requireSession as any).mockResolvedValue({
      id: "user1",
      role: "SCHOOL_ADMIN",
      schoolId: "sch_1",
    });

    (prisma.section.findFirst as any).mockResolvedValue({
      id: "sec_protected",
      schoolId: "sch_1",
      name: "Condemned / Pending Disposal",
      isProtected: true,
      rooms: [],
    });

    const req = new NextRequest(
      "http://localhost/api/sections/sec_protected",
      { method: "DELETE" }
    );
    const res = await DELETE_SECTION(req, {
      params: Promise.resolve({ sectionId: "sec_protected" }),
    });

    expect(res.status).toBe(400);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("blocks cross-tenant DELETE with 403", async () => {
    (requireSession as any).mockResolvedValue({
      id: "user1",
      role: "SCHOOL_ADMIN",
      schoolId: "sch_1",
    });

    (prisma.section.findFirst as any).mockResolvedValue({
      id: "sec_foreign",
      schoolId: "sch_2",
      name: "Other School Block",
      isProtected: false,
      rooms: [],
    });

    const req = new NextRequest(
      "http://localhost/api/sections/sec_foreign",
      { method: "DELETE" }
    );
    const res = await DELETE_SECTION(req, {
      params: Promise.resolve({ sectionId: "sec_foreign" }),
    });

    expect(res.status).toBe(403);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("deletes a section and cascades items to 'Spare'", async () => {
    (requireSession as any).mockResolvedValue({
      id: "user1",
      role: "SCHOOL_ADMIN",
      schoolId: "sch_1",
    });

    (prisma.section.findFirst as any).mockResolvedValue({
      id: "sec_1",
      schoolId: "sch_1",
      name: "Old Block",
      isProtected: false,
      rooms: [
        { id: "r1", name: "Room A" },
        { id: "r2", name: "Room B" },
      ],
    });

    // Execute the transaction callback with a mock tx that records calls.
    const tx = {
      item: { updateMany: vi.fn().mockResolvedValue({ count: 3 }) },
      section: { delete: vi.fn().mockResolvedValue({}) },
    };
    (prisma.$transaction as any).mockImplementation(async (cb: any) => cb(tx));

    const req = new NextRequest("http://localhost/api/sections/sec_1", {
      method: "DELETE",
    });
    const res = await DELETE_SECTION(req, {
      params: Promise.resolve({ sectionId: "sec_1" }),
    });

    expect(res.status).toBe(200);
    expect(tx.item.updateMany).toHaveBeenCalledWith({
      where: {
        schoolId: "sch_1",
        locationName: { in: ["Room A", "Room B"] },
      },
      data: { locationName: "Spare" },
    });
    expect(tx.section.delete).toHaveBeenCalledWith({
      where: { id: "sec_1" },
    });
  });
});
