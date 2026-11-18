// Condemned items: retention + cleanup.
//
// Client requirement (feedback round 4): condemned items and their proof-of-
// disposal PDFs are kept for CONDEMNED_RETENTION_YEARS after condemnation, then
// removed to save space. Cleanup runs lazily whenever a school's Condemned
// Items list is fetched (GET /api/condemned), so no scheduler is needed.

import { prisma } from "@/lib/prisma";
import { deleteFile } from "@/lib/upload";
import { CONDEMNED_RETENTION_YEARS, CONDEMNED_STATUS } from "@/lib/constants";

/** Date on which a record condemned at `condemnedAt` will be removed. */
export function purgeDateFor(condemnedAt: Date): Date {
  const d = new Date(condemnedAt);
  d.setFullYear(d.getFullYear() + CONDEMNED_RETENTION_YEARS);
  return d;
}

/** Items condemned before this date are past retention. */
export function purgeCutoff(now: Date = new Date()): Date {
  const d = new Date(now);
  d.setFullYear(d.getFullYear() - CONDEMNED_RETENTION_YEARS);
  return d;
}

/**
 * Deletes a school's condemned items whose retention period has ended, along
 * with every uploaded file attached to them (PDFs, fault photos, loan
 * signatures). Returns the number of items removed.
 */
export async function purgeExpiredCondemned(
  schoolId: string,
  now: Date = new Date()
): Promise<number> {
  const expired = await prisma.item.findMany({
    where: {
      schoolId,
      status: CONDEMNED_STATUS,
      condemnedAt: { lt: purgeCutoff(now) },
    },
    select: {
      id: true,
      condemnDocs: { select: { url: true } },
      faults: { select: { photos: true } },
      faultReports: { select: { photos: true } },
      loanHistory: { select: { signature: true, issuerSignature: true } },
    },
  });
  if (expired.length === 0) return 0;

  const urls: string[] = [];
  for (const item of expired) {
    item.condemnDocs.forEach((d) => urls.push(d.url));
    item.faults.forEach((f) => urls.push(...f.photos));
    item.faultReports.forEach((r) => urls.push(...r.photos));
    item.loanHistory.forEach((l) => {
      if (l.signature) urls.push(l.signature);
      if (l.issuerSignature) urls.push(l.issuerSignature);
    });
  }

  // Child rows (docs, faults, loans, move log...) cascade on delete.
  await prisma.item.deleteMany({
    where: { schoolId, id: { in: expired.map((i) => i.id) } },
  });

  // Storage cleanup is best-effort: a missing file must not block the purge.
  await Promise.allSettled(urls.map((u) => deleteFile(u)));

  return expired.length;
}
