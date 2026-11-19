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

vi.mock("@/lib/upload", () => ({
  uploadFile: vi.fn(),
  deleteFile: vi.fn(),
}));

import { requireSession } from "@/lib/auth-guard";
import { uploadFile } from "@/lib/upload";
import { POST } from "@/app/api/upload/route";

function makeFormData(overrides?: { file?: File | null; folder?: string }) {
  const fd = new FormData();
  const file =
    overrides?.file !== undefined
      ? overrides.file
      : new File(["data"], "photo.jpg", { type: "image/jpeg" });
  if (file) fd.append("file", file);
  if (overrides?.folder) fd.append("folder", overrides.folder);
  return fd;
}

describe("POST /api/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with url when upload succeeds", async () => {
    (requireSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user1",
      role: "SCHOOL_ADMIN",
      schoolId: "sch_1",
    });
    (uploadFile as ReturnType<typeof vi.fn>).mockResolvedValue(
      "https://s3.example.com/investory-uploads/photos/abc.jpeg"
    );

    const formData = makeFormData();
    const req = new NextRequest("http://localhost/api/upload", {
      method: "POST",
      body: formData,
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.url).toBe(
      "https://s3.example.com/investory-uploads/photos/abc.jpeg"
    );
    expect(uploadFile).toHaveBeenCalledOnce();
  });

  it("returns 401 when unauthenticated", async () => {
    (requireSession as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Unauthorized")
    );

    const formData = makeFormData();
    const req = new NextRequest("http://localhost/api/upload", {
      method: "POST",
      body: formData,
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 when no file provided", async () => {
    (requireSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user1",
      role: "SCHOOL_ADMIN",
      schoolId: "sch_1",
    });

    const formData = makeFormData({ file: null });
    const req = new NextRequest("http://localhost/api/upload", {
      method: "POST",
      body: formData,
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("No file provided");
  });

  it("returns 400 when file is too large", async () => {
    (requireSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user1",
      role: "SCHOOL_ADMIN",
      schoolId: "sch_1",
    });

    // Create a file larger than 5MB
    const oversizedContent = new Uint8Array(5 * 1024 * 1024 + 1);
    const bigFile = new File([oversizedContent], "big.jpg", {
      type: "image/jpeg",
    });
    const formData = makeFormData({ file: bigFile });
    const req = new NextRequest("http://localhost/api/upload", {
      method: "POST",
      body: formData,
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("File too large (max 5MB)");
  });

  it("returns 400 when file type is invalid", async () => {
    (requireSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user1",
      role: "SCHOOL_ADMIN",
      schoolId: "sch_1",
    });

    const pdfFile = new File(["pdf content"], "document.pdf", {
      type: "application/pdf",
    });
    const formData = makeFormData({ file: pdfFile });
    const req = new NextRequest("http://localhost/api/upload", {
      method: "POST",
      body: formData,
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid file type");
  });
});

describe("POST /api/upload — condemned item PDFs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user1",
      role: "SCHOOL_ADMIN",
      schoolId: "sch_1",
    });
  });

  async function post(file: File, folder: string) {
    const req = new NextRequest("http://localhost/api/upload", {
      method: "POST",
      body: makeFormData({ file, folder }),
    });
    const res = await POST(req);
    return { status: res.status, data: await res.json() };
  }

  it("accepts a PDF into the documents folder", async () => {
    (uploadFile as ReturnType<typeof vi.fn>).mockResolvedValue("https://cdn/documents/x.pdf");
    const { status } = await post(new File(["%PDF"], "form.pdf", { type: "application/pdf" }), "documents");
    expect(status).toBe(200);
    expect(uploadFile).toHaveBeenCalledWith(expect.any(Buffer), "application/pdf", "documents");
  });

  it("accepts a photo of the signed form (JPG or PNG)", async () => {
    (uploadFile as ReturnType<typeof vi.fn>).mockResolvedValue("https://cdn/documents/x.jpeg");
    const jpg = await post(new File(["x"], "a.jpg", { type: "image/jpeg" }), "documents");
    const png = await post(new File(["x"], "a.png", { type: "image/png" }), "documents");
    expect(jpg.status).toBe(200);
    expect(png.status).toBe(200);
  });

  it("rejects other file types in the documents folder", async () => {
    const { status } = await post(new File(["x"], "a.docx", { type: "application/msword" }), "documents");
    expect(status).toBe(400);
  });

  it("allows PDFs up to 10MB but not larger", async () => {
    const big = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "big.pdf", { type: "application/pdf" });
    const { status, data } = await post(big, "documents");
    expect(status).toBe(400);
    expect(data.error).toBe("File too large (max 10MB)");
  });
});
