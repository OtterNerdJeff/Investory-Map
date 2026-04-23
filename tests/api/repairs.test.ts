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

vi.mock("@/lib/prisma", () => {
  const prismaMock = {
    item: {
      findFirst: vi.fn(),
    },
    repair: {
      create: vi.fn(),
    },
    moveLogEntry: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(async (cb: (tx: unknown) => unknown) => cb(prismaMock)),
  };
  return { prisma: prismaMock };
});

import { requireSession } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { POST as POST_REPAIR } from "@/app/api/items/[itemId]/repairs/route";
import { GET as GET_MOVE_LOG } from "@/app/api/move-log/route";

describe("POST /api/items/[itemId]/repairs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("success creates repair and returns 201", async () => {
    (requireSession as any).mockResolvedValue({
      id: "user1",
      name: "Tech",
      role: "USER",
      schoolId: "sch_1",
    });

    (prisma.item.findFirst as any).mockResolvedValue({
      id: "item1",
      schoolId: "sch_1",
      status: "Operational",
    });

    (prisma.repair.create as any).mockResolvedValue({
      id: "repair_new",
      itemId: "item1",
      description: "Replaced lamp",
      technician: "Bob",
      startDate: new Date("2026-04-01"),
      completeDate: new Date("2026-04-03"),
      cost: 120.5,
      notes: "Ordered from supplier",
      createdAt: new Date(),
    });

    const req = new NextRequest(
      "http://localhost/api/items/item1/repairs",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: "Replaced lamp",
          technician: "Bob",
          startDate: "2026-04-01",
          completeDate: "2026-04-03",
          cost: "120.50",
          notes: "Ordered from supplier",
        }),
      }
    );
    const res = await POST_REPAIR(req, {
      params: Promise.resolve({ itemId: "item1" }),
    });

    expect(res.status).toBe(201);
    expect(prisma.repair.create).toHaveBeenCalledWith({
      data: {
        itemId: "item1",
        description: "Replaced lamp",
        technician: "Bob",
        startDate: new Date("2026-04-01"),
        completeDate: new Date("2026-04-03"),
        cost: 120.5,
        notes: "Ordered from supplier",
      },
    });
  });

  it("returns 404 when item not found", async () => {
    (requireSession as any).mockResolvedValue({
      id: "user1",
      name: "Tech",
      role: "USER",
      schoolId: "sch_1",
    });

    (prisma.item.findFirst as any).mockResolvedValue(null);

    const req = new NextRequest(
      "http://localhost/api/items/nonexistent/repairs",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: "Some repair" }),
      }
    );
    const res = await POST_REPAIR(req, {
      params: Promise.resolve({ itemId: "nonexistent" }),
    });

    expect(res.status).toBe(404);
    expect(prisma.repair.create).not.toHaveBeenCalled();
  });

  it("returns 403 on cross-tenant access", async () => {
    (requireSession as any).mockResolvedValue({
      id: "user1",
      name: "Tech",
      role: "USER",
      schoolId: "sch_1",
    });

    (prisma.item.findFirst as any).mockResolvedValue({
      id: "item_other",
      schoolId: "sch_2",
      status: "Operational",
    });

    const req = new NextRequest(
      "http://localhost/api/items/item_other/repairs",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: "Some repair" }),
      }
    );
    const res = await POST_REPAIR(req, {
      params: Promise.resolve({ itemId: "item_other" }),
    });

    expect(res.status).toBe(403);
    expect(prisma.repair.create).not.toHaveBeenCalled();
  });

  it("returns 400 on missing description (Zod rejects empty string)", async () => {
    (requireSession as any).mockResolvedValue({
      id: "user1",
      name: "Tech",
      role: "USER",
      schoolId: "sch_1",
    });

    (prisma.item.findFirst as any).mockResolvedValue({
      id: "item1",
      schoolId: "sch_1",
      status: "Operational",
    });

    const req = new NextRequest(
      "http://localhost/api/items/item1/repairs",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: "" }),
      }
    );
    const res = await POST_REPAIR(req, {
      params: Promise.resolve({ itemId: "item1" }),
    });

    expect(res.status).toBe(400);
    expect(prisma.repair.create).not.toHaveBeenCalled();
  });

  it("returns 400 when cost is not a valid number", async () => {
    (requireSession as any).mockResolvedValue({
      id: "user1",
      role: "USER",
      schoolId: "sch_1",
    });
    (prisma.item.findFirst as any).mockResolvedValue({
      id: "item1",
      schoolId: "sch_1",
    });

    const req = new NextRequest("http://localhost/api/items/item1/repairs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: "Fix motor", cost: "not-a-number" }),
    });
    const res = await POST_REPAIR(req, {
      params: Promise.resolve({ itemId: "item1" }),
    });

    expect(res.status).toBe(400);
    expect(prisma.repair.create).not.toHaveBeenCalled();
  });
});

describe("GET /api/move-log — school-scoped log", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns move log scoped to the caller's school, newest first", async () => {
    (requireSession as any).mockResolvedValue({
      id: "user1",
      name: "Admin",
      role: "SCHOOL_ADMIN",
      schoolId: "sch_1",
    });

    (prisma.moveLogEntry.findMany as any).mockResolvedValue([
      {
        id: "log_a",
        schoolId: "sch_1",
        itemId: "item1",
        itemLabel: "P01",
        fromLoc: "ROOM_A",
        toLoc: "ROOM_B",
        reason: "Maintenance",
        movedBy: "Admin",
        createdAt: new Date(),
      },
    ]);

    const req = new NextRequest("http://localhost/api/move-log");
    const res = await GET_MOVE_LOG(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(prisma.moveLogEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { schoolId: "sch_1" },
        orderBy: { createdAt: "desc" },
        take: 500,
      })
    );
  });

  it("returns 401 when unauthenticated", async () => {
    (requireSession as any).mockRejectedValue(new Error("Unauthorized"));

    const req = new NextRequest("http://localhost/api/move-log");
    const res = await GET_MOVE_LOG(req);

    expect(res.status).toBe(401);
  });
});
