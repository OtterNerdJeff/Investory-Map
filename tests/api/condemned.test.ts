import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth-guard", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth-guard")>("@/lib/auth-guard");
  return { ...actual, requireSession: vi.fn() };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    item: { findMany: vi.fn(), findFirst: vi.fn(), deleteMany: vi.fn() },
    condemnDoc: { create: vi.fn(), findFirst: vi.fn(), delete: vi.fn() },
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

const admin = { id: "u1", name: "ICT", role: "SCHOOL_ADMIN", schoolId: "sch_1" };
const teacher = { id: "u2", name: "T", role: "USER", schoolId: "sch_1" };

describe("condemned retention", () => {
  beforeEach(() => vi.clearAllMocks());

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
  beforeEach(() => vi.clearAllMocks());

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
