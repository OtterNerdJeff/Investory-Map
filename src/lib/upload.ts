import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

const s3 = new S3Client({
  region: process.env.S3_REGION || "us-east-1",
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || "",
    secretAccessKey: process.env.S3_SECRET_KEY || "",
  },
});

const BUCKET = process.env.S3_BUCKET || "investory-uploads";

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

  return `${process.env.S3_ENDPOINT}/${BUCKET}/${key}`;
}

export async function deleteFile(url: string): Promise<void> {
  const key = url.split(`/${BUCKET}/`)[1];
  if (!key) return;

  await s3.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  );
}
