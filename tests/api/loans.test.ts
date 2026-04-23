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
      findMany: vi.fn(),
      update: vi.fn(),
    },
    loanEntry: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    // Interactive transaction — the callback runs against the same prismaMock
    // so `tx.item.update` etc. land on our spies above.
    $transaction: vi.fn(async (cb: (tx: unknown) => unknown) => cb(prismaMock)),
  };
  return { prisma: prismaMock };
});

import { requireSession } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { POST as POST_LOAN } from "@/app/api/items/[itemId]/loans/route";
import { GET as GET_LOANS } from "@/app/api/loans/route";

describe("POST /api/items/[itemId]/loans — loan-out", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets item.isLoaned + creates an Active LoanEntry in one transaction", async () => {
    (requireSession as any).mockResolvedValue({
      id: "user1",
      name: "Jeff",
      role: "USER",
      schoolId: "sch_1",
    });

    (prisma.item.findFirst as any).mockResolvedValue({
      id: "item1",
      schoolId: "sch_1",
      isLoaned: false,
      locationName: "STORE",
    });
    (prisma.item.update as any).mockImplementation(async (args: any) => ({
      id: "item1",
      ...args.data,
    }));
    (prisma.loanEntry.create as any).mockImplementation(async (args: any) => ({
      id: "loan_new",
      ...args.data,
    }));

    const req = new NextRequest("http://localhost/api/items/item1/loans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "loan-out",
        borrowerName: "Alice",
        expectedReturn: "2026-05-01",
        notes: "Trip",
      }),
    });
    const res = await POST_LOAN(req, {
      params: Promise.resolve({ itemId: "item1" }),
    });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(prisma.item.update).toHaveBeenCalledWith({
      where: { id: "item1" },
      data: {
        isLoaned: true,
        loanedTo: "Alice",
        locationName: "Alice",
      },
    });
    expect(prisma.loanEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          itemId: "item1",
          borrowerName: "Alice",
          status: "Active",
          issuedBy: "Jeff",
        }),
      })
    );
    expect(body.loanEntry.id).toBe("loan_new");
  });
});

describe("POST /api/items/[itemId]/loans — return", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates only the item when no active loan exists", async () => {
    (requireSession as any).mockResolvedValue({
      id: "user1",
      name: "Jeff",
      role: "USER",
      schoolId: "sch_1",
    });

    (prisma.item.findFirst as any).mockResolvedValue({
      id: "item1",
      schoolId: "sch_1",
      isLoaned: true,
      locationName: "Alice",
    });
    (prisma.loanEntry.findFirst as any).mockResolvedValue(null);
    (prisma.item.update as any).mockImplementation(async (args: any) => ({
      id: "item1",
      ...args.data,
    }));

    const req = new NextRequest("http://localhost/api/items/item1/loans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "return",
        returnLocation: "STORE",
      }),
    });
    const res = await POST_LOAN(req, {
      params: Promise.resolve({ itemId: "item1" }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(prisma.item.update).toHaveBeenCalledWith({
      where: { id: "item1" },
      data: {
        isLoaned: false,
        loanedTo: null,
        locationName: "STORE",
      },
    });
    expect(prisma.loanEntry.update).not.toHaveBeenCalled();
    expect(body.loanEntry).toBeNull();
  });

  it("closes the active loan entry and updates the item when a loan exists", async () => {
    (requireSession as any).mockResolvedValue({
      id: "user1",
      name: "Jeff",
      role: "USER",
      schoolId: "sch_1",
    });

    (prisma.item.findFirst as any).mockResolvedValue({
      id: "item1",
      schoolId: "sch_1",
      isLoaned: true,
      locationName: "Alice",
    });
    (prisma.loanEntry.findFirst as any).mockResolvedValue({
      id: "loan_active",
      itemId: "item1",
      status: "Active",
      dateOut: new Date("2026-04-01"),
    });
    (prisma.item.update as any).mockImplementation(async (args: any) => ({
      id: "item1",
      ...args.data,
    }));
    (prisma.loanEntry.update as any).mockImplementation(async (args: any) => ({
      id: "loan_active",
      ...args.data,
    }));

    const req = new NextRequest("http://localhost/api/items/item1/loans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "return",
        returnLocation: "STORE",
        condition: "Fair",
      }),
    });
    const res = await POST_LOAN(req, {
      params: Promise.resolve({ itemId: "item1" }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(prisma.loanEntry.update).toHaveBeenCalledWith({
      where: { id: "loan_active" },
      data: expect.objectContaining({
        status: "Returned",
        condition: "Fair",
        returnLocation: "STORE",
        receivedBy: "Jeff",
      }),
    });
    // dateIn stamped on return
    const updateArgs = (prisma.loanEntry.update as any).mock.calls[0][0];
    expect(updateArgs.data.dateIn).toBeInstanceOf(Date);
    expect(body.loanEntry.status).toBe("Returned");
  });
});

describe("POST /api/items/[itemId]/loans — validation + tenancy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for an unknown action value", async () => {
    (requireSession as any).mockResolvedValue({
      id: "user1",
      name: "Jeff",
      role: "USER",
      schoolId: "sch_1",
    });

    const req = new NextRequest("http://localhost/api/items/item1/loans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "teleport",
        borrowerName: "Alice",
      }),
    });
    const res = await POST_LOAN(req, {
      params: Promise.resolve({ itemId: "item1" }),
    });

    expect(res.status).toBe(400);
    expect(prisma.item.update).not.toHaveBeenCalled();
    expect(prisma.loanEntry.create).not.toHaveBeenCalled();
  });

  it("returns 403 when a USER tries to loan-out an item in another school", async () => {
    (requireSession as any).mockResolvedValue({
      id: "user1",
      name: "Jeff",
      role: "USER",
      schoolId: "sch_1",
    });

    (prisma.item.findFirst as any).mockResolvedValue({
      id: "item_other",
      schoolId: "sch_2",
      isLoaned: false,
      locationName: "STORE",
    });

    const req = new NextRequest(
      "http://localhost/api/items/item_other/loans",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "loan-out",
          borrowerName: "Alice",
        }),
      }
    );
    const res = await POST_LOAN(req, {
      params: Promise.resolve({ itemId: "item_other" }),
    });

    expect(res.status).toBe(403);
    expect(prisma.item.update).not.toHaveBeenCalled();
    expect(prisma.loanEntry.create).not.toHaveBeenCalled();
  });
});

describe("GET /api/loans — school-wide loaned list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns only loaned items scoped to the caller's school", async () => {
    (requireSession as any).mockResolvedValue({
      id: "user1",
      name: "Viewer",
      role: "SCHOOL_ADMIN",
      schoolId: "sch_1",
    });

    (prisma.item.findMany as any).mockResolvedValue([
      {
        id: "item1",
        schoolId: "sch_1",
        label: "P01",
        isLoaned: true,
        loanedTo: "Alice",
        loanHistory: [
          { id: "loan_a", status: "Active", borrowerName: "Alice" },
        ],
      },
    ]);

    const req = new NextRequest("http://localhost/api/loans");
    const res = await GET_LOANS(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(prisma.item.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { schoolId: "sch_1", isLoaned: true },
        include: {
          loanHistory: {
            where: { status: "Active" },
            orderBy: { dateOut: "desc" },
            take: 1,
          },
        },
        orderBy: { loanedTo: "asc" },
      })
    );
  });
});
