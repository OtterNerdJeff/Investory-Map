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
    item: {
      findMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    moveLogEntry: {
      create: vi.fn(),
    },
  },
}));

import { requireSession } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { GET, POST } from "@/app/api/items/route";

describe("GET /api/items", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns items scoped to user school", async () => {
    (requireSession as any).mockResolvedValue({
      id: "user1",
      role: "SCHOOL_ADMIN",
      schoolId: "sch_1",
    });

    const mockItems = [
      {
        id: "item1",
        schoolId: "sch_1",
        label: "P01",
        type: "Projector",
        status: "Operational",
        faults: [],
        repairs: [],
        loanHistory: [],
        moveLog: [],
      },
    ];

    (prisma.item.findMany as any).mockResolvedValue(mockItems);

    const req = new NextRequest("http://localhost/api/items");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].label).toBe("P01");
    expect(prisma.item.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { schoolId: "sch_1" },
      })
    );
  });
});

describe("POST /api/items", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects USER role from creating items", async () => {
    (requireSession as any).mockResolvedValue({
      id: "user1",
      role: "USER",
      schoolId: "sch_1",
    });

    const req = new NextRequest("http://localhost/api/items", {
      method: "POST",
      body: JSON.stringify({ label: "P01", type: "Projector" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(403);
  });

  it("allows SCHOOL_ADMIN to create items", async () => {
    (requireSession as any).mockResolvedValue({
      id: "user1",
      role: "SCHOOL_ADMIN",
      schoolId: "sch_1",
    });

    const mockItem = {
      id: "item_new",
      schoolId: "sch_1",
      label: "New Projector",
      type: "Projector",
    };
    (prisma.item.create as any).mockResolvedValue(mockItem);

    const req = new NextRequest("http://localhost/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: "New Projector",
        type: "Projector",
        brand: "Epson",
        locationName: "HALL",
      }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.label).toBe("New Projector");
  });
});
