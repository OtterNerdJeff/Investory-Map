import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth-guard", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth-guard")>("@/lib/auth-guard");
  return { ...actual, requireSession: vi.fn() };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    item: { findMany: vi.fn(), findFirst: vi.fn(), deleteMany: vi.fn(), update: vi.fn() },
    condemnDoc: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), delete: vi.fn(), count: vi.fn() },
    $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  },
}));

vi.mock("@/lib/upload", () => ({ uploadFile: vi.fn(), deleteFile: vi.fn() }));

import { requireSession } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { deleteFile } from "@/lib/upload";
import { purgeExpiredCondemned, purgeCutoff, purgeDateFor } from "@/lib/condemned";
import { GET as GET_CONDEMNED } from "@/app/api/condemned/route";
import { POST as POST_DOC } from "@/app/api/items/[itemId]/condemn-docs/route";
import { DELETE as DELETE_DOC } from "@/app/api/condemn-docs/[docId]/route";
import { POST as POST_CONFIRM } from "@/app/api/condemned/confirm/route";
import { PUT as PUT_ITEM } from "@/app/api/items/[itemId]/route";

// vi.clearAllMocks() keeps implementations, so set the defaults each time.
function resetPrismaDefaults() {
  vi.clearAllMocks();
  (prisma.$transaction as any).mockImplementation(async (ops: Promise<unknown>[]) => Promise.all(ops));
  (prisma.condemnDoc.findMany as any).mockResolvedValue([]);
  (prisma.condemnDoc.count as any).mockResolvedValue(0);
  (prisma.condemnDoc.create as any).mockImplementation(async (a: any) => ({ id: `d_${a.data.itemId}`, ...a.data }));
  (prisma.item.update as any).mockImplementation(async (a: any) => ({ id: a.where.id, ...a.data }));
  (prisma.item.findFirst as any).mockResolvedValue(null);
}

const admin = { id: "u1", name: "ICT", role: "SCHOOL_ADMIN", schoolId: "sch_1" };
const teacher = { id: "u2", name: "T", role: "USER", schoolId: "sch_1" };

describe("condemned retention", () => {
  beforeEach(resetPrismaDefaults);

  it("keeps records for exactly 5 years", () => {
    const now = new Date("2026-11-18T00:00:00Z");
    expect(purgeCutoff(now).toISOString()).toBe("2021-11-18T00:00:00.000Z");
    expect(purgeDateFor(new Date("2026-11-18T00:00:00Z")).toISOString()).toBe("2031-11-18T00:00:00.000Z");
  });

  it("only queries this school's condemned items older than the cutoff", async () => {
    (prisma.item.findMany as any).mockResolvedValue([]);
    const n = await purgeExpiredCondemned("sch_1", new Date("2026-11-18T00:00:00Z"));
    expect(n).toBe(0);
    const where = (prisma.item.findMany as any).mock.calls[0][0].where;
    expect(where).toEqual({
      schoolId: "sch_1",
      status: "Condemned",
      condemnedAt: { lt: new Date("2021-11-18T00:00:00Z") },
    });
    expect(prisma.item.deleteMany).not.toHaveBeenCalled();
  });

  it("deletes expired items and every attached file", async () => {
    (prisma.item.findMany as any).mockResolvedValue([
      {
        id: "i1",
        condemnDocs: [{ url: "https://cdn/documents/a.pdf" }],
        faults: [{ photos: ["https://cdn/photos/f.jpg"] }],
        faultReports: [{ photos: [] }],
        loanHistory: [{ signature: "https://cdn/signatures/s.png", issuerSignature: null }],
      },
    ]);
    (deleteFile as any).mockRejectedValueOnce(new Error("gone already"));

    const n = await purgeExpiredCondemned("sch_1");

    expect(n).toBe(1);
    expect(prisma.item.deleteMany).toHaveBeenCalledWith({ where: { schoolId: "sch_1", id: { in: ["i1"] } } });
    expect((deleteFile as any).mock.calls.map((c: unknown[]) => c[0]).sort()).toEqual([
      "https://cdn/documents/a.pdf",
      "https://cdn/photos/f.jpg",
      "https://cdn/signatures/s.png",
    ]);
  });
});

describe("GET /api/condemned", () => {
  beforeEach(() => vi.clearAllMocks());

  it("purges, then returns this school's condemned items with location mapped", async () => {
    (requireSession as any).mockResolvedValue(admin);
    (prisma.item.findMany as any)
      .mockResolvedValueOnce([]) // purge query
      .mockResolvedValueOnce([{ id: "i1", locationName: "ITLR", status: "Condemned", condemnDocs: [] }]);

    const res = await GET_CONDEMNED(new NextRequest("http://localhost/api/condemned"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual([{ id: "i1", location: "ITLR", status: "Condemned", condemnDocs: [] }]);
    expect((prisma.item.findMany as any).mock.calls[1][0].where).toEqual({ schoolId: "sch_1", status: "Condemned" });
  });
});

describe("condemned PDFs", () => {
  beforeEach(resetPrismaDefaults);

  it("blocks teachers from attaching PDFs", async () => {
    (requireSession as any).mockResolvedValue(teacher);
    const req = new NextRequest("http://localhost/api/items/i1/condemn-docs", {
      method: "POST",
      body: JSON.stringify({ url: "https://cdn/documents/a.pdf", fileName: "a.pdf" }),
    });
    const res = await POST_DOC(req, { params: Promise.resolve({ itemId: "i1" }) });
    expect(res.status).toBe(403);
  });

  it("blocks attaching to another school's item", async () => {
    (requireSession as any).mockResolvedValue(admin);
    (prisma.item.findFirst as any).mockResolvedValue({ id: "i1", schoolId: "sch_2" });
    const req = new NextRequest("http://localhost/api/items/i1/condemn-docs", {
      method: "POST",
      body: JSON.stringify({ url: "https://cdn/documents/a.pdf", fileName: "a.pdf" }),
    });
    const res = await POST_DOC(req, { params: Promise.resolve({ itemId: "i1" }) });
    expect(res.status).toBe(403);
    expect(prisma.condemnDoc.create).not.toHaveBeenCalled();
  });

  it("attaches a PDF for admins, scoped to the item's school", async () => {
    (requireSession as any).mockResolvedValue(admin);
    (prisma.item.findFirst as any).mockResolvedValue({ id: "i1", schoolId: "sch_1" });
    (prisma.condemnDoc.create as any).mockImplementation(async (a: any) => ({ id: "d1", ...a.data }));
    const req = new NextRequest("http://localhost/api/items/i1/condemn-docs", {
      method: "POST",
      body: JSON.stringify({ url: "https://cdn/documents/a.pdf", fileName: "Disposal form.pdf" }),
    });
    const res = await POST_DOC(req, { params: Promise.resolve({ itemId: "i1" }) });
    expect(res.status).toBe(201);
    expect((prisma.condemnDoc.create as any).mock.calls[0][0].data).toMatchObject({
      schoolId: "sch_1",
      itemId: "i1",
      fileName: "Disposal form.pdf",
      uploadedBy: "ICT",
    });
  });

  it("removes the stored file when a PDF is deleted", async () => {
    (requireSession as any).mockResolvedValue(admin);
    (prisma.condemnDoc.findFirst as any).mockResolvedValue({ id: "d1", schoolId: "sch_1", url: "https://cdn/documents/a.pdf" });
    const res = await DELETE_DOC(new NextRequest("http://localhost/api/condemn-docs/d1", { method: "DELETE" }), {
      params: Promise.resolve({ docId: "d1" }),
    });
    expect(res.status).toBe(200);
    expect(prisma.condemnDoc.delete).toHaveBeenCalledWith({ where: { id: "d1" } });
    expect(deleteFile).toHaveBeenCalledWith("https://cdn/documents/a.pdf");
  });
});

describe("condemnation workflow", () => {
  beforeEach(resetPrismaDefaults);

  const doc = { url: "https://cdn/documents/form.pdf", fileName: "Form.pdf" };
  const confirmReq = (itemIds: string[]) =>
    new NextRequest("http://localhost/api/condemned/confirm", {
      method: "POST",
      body: JSON.stringify({ itemIds, ...doc }),
    });
  const pendingItem = (id: string, prevLocation: string | null = "ITLR") => ({
    id,
    label: id,
    schoolId: "sch_1",
    status: "Waiting for Condemnation",
    locationName: "Condemned / Pending Disposal",
    prevLocation,
  });

  it("blocks teachers from confirming", async () => {
    (requireSession as any).mockResolvedValue(teacher);
    const res = await POST_CONFIRM(confirmReq(["i1"]));
    expect(res.status).toBe(403);
    expect(prisma.item.findMany).not.toHaveBeenCalled();
  });

  it("attaches one document to many pending items and confirms them all", async () => {
    (requireSession as any).mockResolvedValue(admin);
    (prisma.item.findMany as any).mockResolvedValue([pendingItem("i1"), pendingItem("i2", null)]);

    const res = await POST_CONFIRM(confirmReq(["i1", "i2", "i1"]));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data).toMatchObject({ attached: 2, confirmed: 2 });
    // Duplicate ids are collapsed.
    expect((prisma.item.findMany as any).mock.calls[0][0].where).toEqual({ id: { in: ["i1", "i2"] } });
    // One row per item, all pointing at the same uploaded file.
    const created = (prisma.condemnDoc.create as any).mock.calls.map((c: any[]) => c[0].data);
    expect(created).toEqual([
      { schoolId: "sch_1", itemId: "i1", url: doc.url, fileName: "Form.pdf", uploadedBy: "ICT" },
      { schoolId: "sch_1", itemId: "i2", url: doc.url, fileName: "Form.pdf", uploadedBy: "ICT" },
    ]);
    const updates = (prisma.item.update as any).mock.calls.map((c: any[]) => c[0]);
    expect(updates[0]).toMatchObject({
      where: { id: "i1" },
      data: { status: "Condemned", locationName: "ITLR", prevLocation: null },
    });
    expect(updates[0].data.condemnedAt).toBeInstanceOf(Date);
    // No remembered room: falls back to "Spare", like a manual status change.
    expect(updates[1].data.locationName).toBe("Spare");
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("adds a document to an already condemned item without touching it", async () => {
    (requireSession as any).mockResolvedValue(admin);
    (prisma.item.findMany as any).mockResolvedValue([
      { id: "i1", label: "i1", schoolId: "sch_1", status: "Condemned", locationName: "ITLR", prevLocation: null },
    ]);
    const res = await POST_CONFIRM(confirmReq(["i1"]));
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ attached: 1, confirmed: 0 });
    expect(prisma.item.update).not.toHaveBeenCalled();
  });

  it("changes nothing if any item is from another school", async () => {
    (requireSession as any).mockResolvedValue(admin);
    (prisma.item.findMany as any).mockResolvedValue([pendingItem("i1"), { ...pendingItem("i2"), schoolId: "sch_2" }]);
    const res = await POST_CONFIRM(confirmReq(["i1", "i2"]));
    expect(res.status).toBe(403);
    expect(prisma.condemnDoc.create).not.toHaveBeenCalled();
    expect(prisma.item.update).not.toHaveBeenCalled();
  });

  it("changes nothing if an item is missing", async () => {
    (requireSession as any).mockResolvedValue(admin);
    (prisma.item.findMany as any).mockResolvedValue([pendingItem("i1")]);
    const res = await POST_CONFIRM(confirmReq(["i1", "gone"]));
    expect(res.status).toBe(404);
    expect(prisma.condemnDoc.create).not.toHaveBeenCalled();
  });

  it("rejects items that are not on the condemn list", async () => {
    (requireSession as any).mockResolvedValue(admin);
    (prisma.item.findMany as any).mockResolvedValue([
      pendingItem("i1"),
      { id: "i2", label: "Projector 2", schoolId: "sch_1", status: "Operational", locationName: "ITLR", prevLocation: null },
    ]);
    const res = await POST_CONFIRM(confirmReq(["i1", "i2"]));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("Projector 2");
    expect(prisma.condemnDoc.create).not.toHaveBeenCalled();
  });

  it("requires at least one item", async () => {
    (requireSession as any).mockResolvedValue(admin);
    const res = await POST_CONFIRM(confirmReq([]));
    expect(res.status).toBe(400);
  });

  it("confirms a pending item when a document is attached to it alone", async () => {
    (requireSession as any).mockResolvedValue(admin);
    (prisma.item.findFirst as any).mockResolvedValue(pendingItem("i1"));
    const req = new NextRequest("http://localhost/api/items/i1/condemn-docs", {
      method: "POST",
      body: JSON.stringify(doc),
    });
    const res = await POST_DOC(req, { params: Promise.resolve({ itemId: "i1" }) });
    expect(res.status).toBe(201);
    expect((prisma.item.update as any).mock.calls[0][0]).toMatchObject({
      where: { id: "i1" },
      data: { status: "Condemned", locationName: "ITLR" },
    });
  });

  const deleteDoc = () =>
    DELETE_DOC(new NextRequest("http://localhost/api/condemn-docs/d1", { method: "DELETE" }), {
      params: Promise.resolve({ docId: "d1" }),
    });

  it("sends a condemned item back to pending when its last document is removed", async () => {
    (requireSession as any).mockResolvedValue(admin);
    (prisma.condemnDoc.findFirst as any).mockResolvedValue({ id: "d1", schoolId: "sch_1", itemId: "i1", url: doc.url });
    (prisma.condemnDoc.count as any).mockResolvedValue(0);
    (prisma.item.findFirst as any).mockResolvedValue({ id: "i1", status: "Condemned", locationName: "ITLR", prevLocation: null });

    const res = await deleteDoc();

    expect(await res.json()).toEqual({ ok: true, backToPending: true });
    expect(prisma.item.update).toHaveBeenCalledWith({
      where: { id: "i1" },
      data: {
        status: "Waiting for Condemnation",
        condemnedAt: null,
        locationName: "Condemned / Pending Disposal",
        prevLocation: "ITLR",
      },
    });
  });

  it("keeps an item confirmed while it still has another document", async () => {
    (requireSession as any).mockResolvedValue(admin);
    (prisma.condemnDoc.findFirst as any).mockResolvedValue({ id: "d1", schoolId: "sch_1", itemId: "i1", url: doc.url });
    (prisma.condemnDoc.count as any).mockResolvedValue(1);

    const res = await deleteDoc();

    expect(await res.json()).toEqual({ ok: true, backToPending: false });
    expect(prisma.item.update).not.toHaveBeenCalled();
  });

  it("keeps the stored file while another item still uses it", async () => {
    (requireSession as any).mockResolvedValue(admin);
    (prisma.condemnDoc.findFirst as any).mockResolvedValue({ id: "d1", schoolId: "sch_1", itemId: "i1", url: doc.url });
    (prisma.condemnDoc.count as any).mockResolvedValue(1);
    (prisma.condemnDoc.findMany as any).mockResolvedValue([{ url: doc.url }]);

    await deleteDoc();

    expect(prisma.condemnDoc.delete).toHaveBeenCalledWith({ where: { id: "d1" } });
    expect(deleteFile).not.toHaveBeenCalled();
  });

  it("purge keeps a shared document that an unexpired item still uses", async () => {
    (prisma.item.findMany as any).mockResolvedValue([
      { id: "i1", condemnDocs: [{ url: doc.url }, { url: "https://cdn/documents/own.pdf" }], faults: [], faultReports: [], loanHistory: [] },
    ]);
    (prisma.condemnDoc.findMany as any).mockResolvedValue([{ url: doc.url }]);

    await purgeExpiredCondemned("sch_1");

    expect((deleteFile as any).mock.calls.map((c: unknown[]) => c[0])).toEqual(["https://cdn/documents/own.pdf"]);
  });

  it("will not send an item on loan to the condemn list", async () => {
    (requireSession as any).mockResolvedValue(admin);
    (prisma.item.findFirst as any).mockResolvedValue({
      id: "i1", schoolId: "sch_1", status: "Operational", locationName: "Mr Tan", isLoaned: true, prevLocation: null,
    });
    const req = new NextRequest("http://localhost/api/items/i1", {
      method: "PUT",
      body: JSON.stringify({ status: "Waiting for Condemnation" }),
    });
    const res = await PUT_ITEM(req, { params: Promise.resolve({ itemId: "i1" }) });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("on loan");
    expect(prisma.item.update).not.toHaveBeenCalled();
  });
});

describe("keyFromUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("parses both public-URL and bucket-path upload links", async () => {
    vi.stubEnv("S3_PUBLIC_URL", "https://pub-abc.r2.dev/");
    vi.stubEnv("S3_BUCKET", "investory-map");
    vi.resetModules();
    const { keyFromUrl } = await vi.importActual<typeof import("@/lib/upload")>("@/lib/upload");
    expect(keyFromUrl("https://pub-abc.r2.dev/documents/x.pdf")).toBe("documents/x.pdf");
    expect(keyFromUrl("https://acct.r2.cloudflarestorage.com/investory-map/photos/y.jpg")).toBe("photos/y.jpg");
    expect(keyFromUrl("https://elsewhere.example/z.png")).toBeNull();
  });
});
