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
import {
  GET as GET_ONE,
  PUT as PUT_ONE,
} from "@/app/api/items/[itemId]/route";

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

describe("PUT /api/items/[itemId] — condemned auto-routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("auto-routes location to CONDEMNED_SECTION when status becomes 'Waiting for Condemnation'", async () => {
    (requireSession as any).mockResolvedValue({
      id: "user1",
      role: "SCHOOL_ADMIN",
      schoolId: "sch_1",
    });

    (prisma.item.findFirst as any).mockResolvedValue({
      id: "item1",
      schoolId: "sch_1",
      label: "P01",
      locationName: "ROOM_A",
      status: "Operational",
      prevLocation: null,
    });

    (prisma.item.update as any).mockImplementation(async (args: any) => ({
      id: "item1",
      schoolId: "sch_1",
      ...args.data,
      faults: [],
      repairs: [],
      loanHistory: [],
      moveLog: [],
    }));

    const req = new NextRequest("http://localhost/api/items/item1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Waiting for Condemnation" }),
    });
    const res = await PUT_ONE(req, {
      params: Promise.resolve({ itemId: "item1" }),
    });

    expect(res.status).toBe(200);
    expect(prisma.item.update).toHaveBeenCalledTimes(1);
    const callArgs = (prisma.item.update as any).mock.calls[0][0];
    expect(callArgs.data.locationName).toBe("Condemned / Pending Disposal");
    expect(callArgs.data.prevLocation).toBe("ROOM_A");
    expect(callArgs.data.status).toBe("Waiting for Condemnation");
  });

  it("restores prevLocation when exiting 'Waiting for Condemnation' status", async () => {
    (requireSession as any).mockResolvedValue({
      id: "user1",
      role: "SCHOOL_ADMIN",
      schoolId: "sch_1",
    });

    (prisma.item.findFirst as any).mockResolvedValue({
      id: "item1",
      schoolId: "sch_1",
      label: "P01",
      locationName: "Condemned / Pending Disposal",
      status: "Waiting for Condemnation",
      prevLocation: "ROOM_A",
    });

    (prisma.item.update as any).mockImplementation(async (args: any) => ({
      id: "item1",
      schoolId: "sch_1",
      ...args.data,
      faults: [],
      repairs: [],
      loanHistory: [],
      moveLog: [],
    }));

    const req = new NextRequest("http://localhost/api/items/item1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Operational" }),
    });
    const res = await PUT_ONE(req, {
      params: Promise.resolve({ itemId: "item1" }),
    });

    expect(res.status).toBe(200);
    expect(prisma.item.update).toHaveBeenCalledTimes(1);
    const callArgs = (prisma.item.update as any).mock.calls[0][0];
    expect(callArgs.data.locationName).toBe("ROOM_A");
    expect(callArgs.data.prevLocation).toBeNull();
    expect(callArgs.data.status).toBe("Operational");
  });
});

describe("cross-tenant access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks user from sch_1 from reading item in sch_2", async () => {
    (requireSession as any).mockResolvedValue({
      id: "user1",
      role: "USER",
      schoolId: "sch_1",
    });

    (prisma.item.findFirst as any).mockResolvedValue({
      id: "item_sch2",
      schoolId: "sch_2",
      label: "Foreign Projector",
      locationName: "OTHER_ROOM",
      status: "Operational",
      faults: [],
      repairs: [],
      loanHistory: [],
      moveLog: [],
    });

    const req = new NextRequest("http://localhost/api/items/item_sch2");
    const res = await GET_ONE(req, {
      params: Promise.resolve({ itemId: "item_sch2" }),
    });

    expect(res.status).toBe(403);
  });
});
