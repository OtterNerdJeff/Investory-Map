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
      update: vi.fn(),
    },
    fault: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
    // Interactive-tx callback delegates to the same mocked prisma — so any
    // `tx.item.update(...)` inside a route body lands on our spies above.
    $transaction: vi.fn(async (cb: (tx: unknown) => unknown) => cb(prismaMock)),
  };
  return { prisma: prismaMock };
});

import { requireSession } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { POST as POST_FAULT } from "@/app/api/items/[itemId]/faults/route";
import { PUT as PUT_FAULT } from "@/app/api/faults/[faultId]/route";
import { GET as GET_FAULTS } from "@/app/api/faults/route";

describe("POST /api/items/[itemId]/faults — auto-escalation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("escalates Operational item to 'Under Maintenance' on Medium-severity fault", async () => {
    (requireSession as any).mockResolvedValue({
      id: "user1",
      name: "Reporter",
      role: "USER",
      schoolId: "sch_1",
    });

    (prisma.item.findFirst as any).mockResolvedValue({
      id: "item1",
      schoolId: "sch_1",
      status: "Operational",
    });

    (prisma.fault.create as any).mockImplementation(async (args: any) => ({
      id: "fault_new",
      ...args.data,
      createdAt: new Date(),
    }));
    (prisma.item.update as any).mockResolvedValue({});

    const req = new NextRequest("http://localhost/api/items/item1/faults", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        faultType: "No display",
        severity: "Medium",
      }),
    });
    const res = await POST_FAULT(req, {
      params: Promise.resolve({ itemId: "item1" }),
    });

    expect(res.status).toBe(201);
    expect(prisma.item.update).toHaveBeenCalledWith({
      where: { id: "item1" },
      data: { status: "Under Maintenance" },
    });
  });

  it("escalates to 'Faulty' on High-severity fault regardless of prior status", async () => {
    (requireSession as any).mockResolvedValue({
      id: "user1",
      name: "Reporter",
      role: "USER",
      schoolId: "sch_1",
    });

    (prisma.item.findFirst as any).mockResolvedValue({
      id: "item1",
      schoolId: "sch_1",
      status: "Under Maintenance",
    });

    (prisma.fault.create as any).mockImplementation(async (args: any) => ({
      id: "fault_new",
      ...args.data,
      createdAt: new Date(),
    }));
    (prisma.item.update as any).mockResolvedValue({});

    const req = new NextRequest("http://localhost/api/items/item1/faults", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        faultType: "No power",
        severity: "High",
      }),
    });
    const res = await POST_FAULT(req, {
      params: Promise.resolve({ itemId: "item1" }),
    });

    expect(res.status).toBe(201);
    expect(prisma.item.update).toHaveBeenCalledWith({
      where: { id: "item1" },
      data: { status: "Faulty" },
    });
  });

  it("does NOT change item.status when a Low fault arrives on an already-Faulty item", async () => {
    (requireSession as any).mockResolvedValue({
      id: "user1",
      name: "Reporter",
      role: "USER",
      schoolId: "sch_1",
    });

    (prisma.item.findFirst as any).mockResolvedValue({
      id: "item1",
      schoolId: "sch_1",
      status: "Faulty",
    });

    (prisma.fault.create as any).mockImplementation(async (args: any) => ({
      id: "fault_new",
      ...args.data,
      createdAt: new Date(),
    }));
    (prisma.item.update as any).mockResolvedValue({});

    const req = new NextRequest("http://localhost/api/items/item1/faults", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        faultType: "Fan noise",
        severity: "Low",
      }),
    });
    const res = await POST_FAULT(req, {
      params: Promise.resolve({ itemId: "item1" }),
    });

    expect(res.status).toBe(201);
    expect(prisma.item.update).not.toHaveBeenCalled();
  });

  it("returns 403 when user cannot access the item's school", async () => {
    (requireSession as any).mockResolvedValue({
      id: "user1",
      name: "Reporter",
      role: "USER",
      schoolId: "sch_1",
    });

    (prisma.item.findFirst as any).mockResolvedValue({
      id: "item_other",
      schoolId: "sch_2",
      status: "Operational",
    });

    const req = new NextRequest(
      "http://localhost/api/items/item_other/faults",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faultType: "No display", severity: "Medium" }),
      }
    );
    const res = await POST_FAULT(req, {
      params: Promise.resolve({ itemId: "item_other" }),
    });

    expect(res.status).toBe(403);
    expect(prisma.fault.create).not.toHaveBeenCalled();
  });

  it("returns 400 on invalid fault severity (zod rejects)", async () => {
    (requireSession as any).mockResolvedValue({
      id: "user1",
      name: "Reporter",
      role: "USER",
      schoolId: "sch_1",
    });

    (prisma.item.findFirst as any).mockResolvedValue({
      id: "item1",
      schoolId: "sch_1",
      status: "Operational",
    });

    const req = new NextRequest("http://localhost/api/items/item1/faults", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        faultType: "No display",
        severity: "Apocalyptic",
      }),
    });
    const res = await POST_FAULT(req, {
      params: Promise.resolve({ itemId: "item1" }),
    });

    expect(res.status).toBe(400);
    expect(prisma.fault.create).not.toHaveBeenCalled();
  });
});

describe("PUT /api/faults/[faultId] — auto-revert on resolve", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reverts item.status to 'Operational' when the last open fault is resolved", async () => {
    (requireSession as any).mockResolvedValue({
      id: "user1",
      name: "Resolver",
      role: "USER",
      schoolId: "sch_1",
    });

    (prisma.fault.findFirst as any).mockResolvedValue({
      id: "fault1",
      itemId: "item1",
      status: "Open",
      item: { id: "item1", schoolId: "sch_1", status: "Faulty" },
    });

    (prisma.fault.update as any).mockImplementation(async (args: any) => ({
      id: "fault1",
      itemId: "item1",
      ...args.data,
    }));
    (prisma.fault.count as any).mockResolvedValue(0);
    (prisma.item.update as any).mockResolvedValue({});

    const req = new NextRequest("http://localhost/api/faults/fault1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "Resolved",
        resolvedBy: "Tech",
        resolutionNote: "Replaced lamp",
      }),
    });
    const res = await PUT_FAULT(req, {
      params: Promise.resolve({ faultId: "fault1" }),
    });

    expect(res.status).toBe(200);
    expect(prisma.item.update).toHaveBeenCalledWith({
      where: { id: "item1" },
      data: { status: "Operational" },
    });
  });

  it("leaves item.status unchanged when other open faults remain", async () => {
    (requireSession as any).mockResolvedValue({
      id: "user1",
      name: "Resolver",
      role: "USER",
      schoolId: "sch_1",
    });

    (prisma.fault.findFirst as any).mockResolvedValue({
      id: "fault1",
      itemId: "item1",
      status: "Open",
      item: { id: "item1", schoolId: "sch_1", status: "Faulty" },
    });

    (prisma.fault.update as any).mockImplementation(async (args: any) => ({
      id: "fault1",
      itemId: "item1",
      ...args.data,
    }));
    (prisma.fault.count as any).mockResolvedValue(2);
    (prisma.item.update as any).mockResolvedValue({});

    const req = new NextRequest("http://localhost/api/faults/fault1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Resolved" }),
    });
    const res = await PUT_FAULT(req, {
      params: Promise.resolve({ faultId: "fault1" }),
    });

    expect(res.status).toBe(200);
    expect(prisma.item.update).not.toHaveBeenCalled();
  });

  it("does not count or revert when status is transitioning to 'In Progress'", async () => {
    (requireSession as any).mockResolvedValue({
      id: "user1",
      name: "Resolver",
      role: "USER",
      schoolId: "sch_1",
    });

    (prisma.fault.findFirst as any).mockResolvedValue({
      id: "fault1",
      itemId: "item1",
      status: "Open",
      item: { id: "item1", schoolId: "sch_1", status: "Faulty" },
    });

    (prisma.fault.update as any).mockImplementation(async (args: any) => ({
      id: "fault1",
      itemId: "item1",
      ...args.data,
    }));

    const req = new NextRequest("http://localhost/api/faults/fault1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "In Progress" }),
    });
    const res = await PUT_FAULT(req, {
      params: Promise.resolve({ faultId: "fault1" }),
    });

    expect(res.status).toBe(200);
    expect(prisma.fault.count).not.toHaveBeenCalled();
    expect(prisma.item.update).not.toHaveBeenCalled();
  });

  it("blocks cross-tenant PUT with 403", async () => {
    (requireSession as any).mockResolvedValue({
      id: "user1",
      name: "Resolver",
      role: "USER",
      schoolId: "sch_1",
    });

    (prisma.fault.findFirst as any).mockResolvedValue({
      id: "fault_other",
      itemId: "item_other",
      status: "Open",
      item: { id: "item_other", schoolId: "sch_2", status: "Faulty" },
    });

    const req = new NextRequest("http://localhost/api/faults/fault_other", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Resolved" }),
    });
    const res = await PUT_FAULT(req, {
      params: Promise.resolve({ faultId: "fault_other" }),
    });

    expect(res.status).toBe(403);
    expect(prisma.fault.update).not.toHaveBeenCalled();
  });
});

describe("GET /api/faults — school-wide dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns faults scoped to the caller's school, newest first", async () => {
    (requireSession as any).mockResolvedValue({
      id: "user1",
      name: "Viewer",
      role: "SCHOOL_ADMIN",
      schoolId: "sch_1",
    });

    (prisma.fault.findMany as any).mockResolvedValue([
      {
        id: "fault_a",
        itemId: "item1",
        faultType: "No display",
        severity: "Medium",
        status: "Open",
        item: {
          id: "item1",
          label: "P01",
          locationName: "ROOM_A",
          type: "Projector",
        },
      },
    ]);

    const req = new NextRequest("http://localhost/api/faults");
    const res = await GET_FAULTS(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(prisma.fault.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { item: { schoolId: "sch_1" } },
        orderBy: { createdAt: "desc" },
      })
    );
  });
});
