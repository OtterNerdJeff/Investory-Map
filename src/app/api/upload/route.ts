import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-errors";
import { uploadFile } from "@/lib/upload";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MB = 1024 * 1024;

// Each folder accepts its own file types and size limit. "documents" holds
// condemnation documents: a PDF, or a photo of the signed form.
const FOLDER_RULES = {
  photos: { types: IMAGE_TYPES, maxBytes: 5 * MB },
  signatures: { types: IMAGE_TYPES, maxBytes: 5 * MB },
  documents: { types: ["application/pdf", "image/jpeg", "image/png"], maxBytes: 10 * MB },
} as const;
type AllowedFolder = keyof typeof FOLDER_RULES;

export async function POST(req: NextRequest) {
  try {
    await requireSession();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const rawFolder = formData.get("folder");
    const folder: AllowedFolder =
      typeof rawFolder === "string" && rawFolder in FOLDER_RULES
        ? (rawFolder as AllowedFolder)
        : "photos";
    const rules = FOLDER_RULES[folder];

    if (file.size > rules.maxBytes) {
      return NextResponse.json(
        { error: `File too large (max ${rules.maxBytes / MB}MB)` },
        { status: 400 }
      );
    }
    if (!(rules.types as readonly string[]).includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadFile(buffer, file.type, folder);

    return NextResponse.json({ url });
  } catch (e: unknown) {
    return handleApiError(e);
  }
}
