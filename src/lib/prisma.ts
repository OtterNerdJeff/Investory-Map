import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7 requires a driver adapter to be passed to PrismaClient.
// We use the official pg adapter against DATABASE_URL.
//
// Note: we deliberately do NOT throw if DATABASE_URL is missing at module
// load time. Next.js evaluates this module during `next build` (and
// potentially during prerender) where DATABASE_URL may not be set. If the
// connection string is empty, `pg` will surface a clear error on the first
// actual DB query instead — which is the correct place for that failure.
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL ?? "",
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
