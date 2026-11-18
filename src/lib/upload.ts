import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

const S3_ENDPOINT = (process.env.S3_ENDPOINT ?? "").replace(/\/$/, "");
const S3_PUBLIC_URL = (process.env.S3_PUBLIC_URL ?? "").replace(/\/$/, "");
const BUCKET = process.env.S3_BUCKET ?? "investory-uploads";

const s3 = new S3Client({
  region: process.env.S3_REGION ?? "us-east-1",
  ...(S3_ENDPOINT ? { endpoint: S3_ENDPOINT, forcePathStyle: true } : {}),
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY ?? "",
    secretAccessKey: process.env.S3_SECRET_KEY ?? "",
  },
});

export async function uploadFile(
  buffer: Buffer,
  contentType: string,
  folder: string = "photos"
): Promise<string> {
  const ext = contentType.split("/")[1] || "bin";
  const key = `${folder}/${uuidv4()}.${ext}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  if (S3_PUBLIC_URL) return `${S3_PUBLIC_URL}/${key}`;
  return `${S3_ENDPOINT}/${BUCKET}/${key}`;
}

/**
 * Recovers the object key from a stored upload URL. Handles both URL shapes
 * uploadFile() has produced: `${S3_PUBLIC_URL}/<key>` (current) and
 * `<endpoint>/<bucket>/<key>` (before S3_PUBLIC_URL existed).
 */
export function keyFromUrl(url: string): string | null {
  if (S3_PUBLIC_URL && url.startsWith(`${S3_PUBLIC_URL}/`)) {
    return url.slice(S3_PUBLIC_URL.length + 1) || null;
  }
  return url.split(`/${BUCKET}/`)[1] || null;
}

export async function deleteFile(url: string): Promise<void> {
  const key = keyFromUrl(url);
  if (!key) return;

  await s3.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  );
}
