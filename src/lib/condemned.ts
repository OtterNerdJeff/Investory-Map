// Condemned items: retention + cleanup.
//
// Client requirement (feedback round 4): condemned items and their proof-of-
// disposal PDFs are kept for CONDEMNED_RETENTION_YEARS after condemnation, then
// removed to save space. Cleanup runs lazily whenever a school's Condemned
// Items list is fetched (GET /api/condemned), so no scheduler is needed.

import { prisma } from "@/lib/prisma";
import { deleteFile } from "@/lib/upload";
import {
  CONDEMNED_RETENTION_YEARS,
  CONDEMNED_SECTION,
  CONDEMNED_STATUS,
  PENDING_CONDEMN_STATUS,
} from "@/lib/constants";

// Condemnation workflow:
//   1. An item is sent to the pending list (status PENDING_CONDEMN_STATUS,
//      moved to CONDEMNED_SECTION, old room kept in prevLocation).
//   2. An admin attaches a document. One upload can cover many items: each
//      item gets its own CondemnDoc row pointing at the same file.
//   3. An item with a document is confirmed (status CONDEMNED_STATUS).
//      Removing its last document sends it back to the pending list.

type ItemPlace = { locationName: string; prevLocation: string | null };

/** Field changes that turn a pending item into a confirmed condemned one. */
export function confirmCondemnedData(item: ItemPlace, now: Date = new Date()) {
  return {
    status: CONDEMNED_STATUS,
    condemnedAt: now,
    // Same as a manual status change (PUT /api/items/[itemId]): the record
    // keeps the room the item was removed from.
    locationName:
      item.locationName === CONDEMNED_SECTION
        ? item.prevLocation || "Spare"
        : item.locationName,
    prevLocation: null,
  };
}

/** Field changes that send a confirmed item back to the pending list. */
export function backToPendingData(item: ItemPlace) {
  return {
    status: PENDING_CONDEMN_STATUS,
    condemnedAt: null,
    locationName: CONDEMNED_SECTION,
    ...(item.locationName !== CONDEMNED_SECTION
      ? { prevLocation: item.locationName }
      : {}),
  };
}

/**
 * Attaches one uploaded document to every given item and confirms the ones
 * that were pending. All-or-nothing.
 */
export async function attachCondemnDoc(
  items: Array<ItemPlace & { id: string; schoolId: string; status: string }>,
  doc: { url: string; fileName: string; uploadedBy: string | null }
) {
  const now = new Date();
  const pending = items.filter((i) => i.status === PENDING_CONDEMN_STATUS);
  const results = await prisma.$transaction([
    ...items.map((i) =>
      prisma.condemnDoc.create({
        data: {
          schoolId: i.schoolId,
          itemId: i.id,
          url: doc.url,
          fileName: doc.fileName,
          uploadedBy: doc.uploadedBy,
        },
      })
    ),
    ...pending.map((i) =>
      prisma.item.update({
        where: { id: i.id },
        data: confirmCondemnedData(i, now),
      })
    ),
  ]);
  return { docs: results.slice(0, items.length), confirmed: pending.length };
}

/**
 * Deletes stored document files that no CondemnDoc row points at any more.
 * A file shared by several items must outlive the removal of any one of them.
 * Best-effort: a missing file must not fail the caller.
 */
export async function deleteDocFilesIfUnused(urls: string[]): Promise<void> {
  const unique = [...new Set(urls)];
  if (unique.length === 0) return;
  const stillUsed = await prisma.condemnDoc.findMany({
    where: { url: { in: unique } },
    select: { url: true },
  });
  const used = new Set(stillUsed.map((d) => d.url));
  await Promise.allSettled(
    unique.filter((u) => !used.has(u)).map((u) => deleteFile(u))
  );
}

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
  const docUrls: string[] = [];
  for (const item of expired) {
    item.condemnDocs.forEach((d) => docUrls.push(d.url));
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
  // A document may be shared with items that are not expired yet.
  await deleteDocFilesIfUnused(docUrls);

  return expired.length;
}
