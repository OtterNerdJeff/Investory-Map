# Feedback Round 4 — 2026-11-18

Source: Client (school IT admin) via direct message

## Issues Reported

### 1. Changing status to "Others" moves the item to ITLR cupboard
- **Priority:** High
- **Status:** Fixed
- **Root cause:** Setting an item to "Waiting for Condemnation" moves it to the Condemned section and remembers its old room in `prevLocation`. Moving the item again later never cleared that memory. When the status was later changed to anything else (e.g. "Others"), `PUT /api/items/[itemId]` sent the item back to the stale `prevLocation` (ITLR), ignoring where it actually was.
- **Fix:**
  - `PUT /api/items/[itemId]`: only restore `prevLocation` when the item is still in the Condemned section and the user didn't pick another room in the same save. `prevLocation` is always cleared.
  - `POST /api/items/[itemId]/move`: clears `prevLocation` when an item is moved out of the Condemned section, so stale values can't build up again.
  - Existing production rows with a stale `prevLocation` are handled by the PUT fix; no data migration needed.

### 2. "Condemned" status with its own list tab
- **Priority:** Medium
- **Status:** Done
- **Fix:** New "Condemned" status (edit form only, not when adding an item). Condemned items are hidden from the room map, List tab, stats and loans, and appear in a new **🗑 Condemned Items** tab next to Loans. The tab shows label, type, asset code, serial, the room it was removed from, the condemned date and the "kept until" date. Clicking a row opens the item so its status can be changed back (restores it to its room). `Item.condemnedAt` records when it was condemned.
- "Waiting for Condemnation" is unchanged and still means "pending disposal".

### 3. Attach PDF proof of removal, keep 5 years
- **Priority:** Medium
- **Status:** Done
- **Fix:** Admins can attach one or more PDFs (max 10MB each) per condemned item from the Condemned Items tab, and remove them. Stored in S3 under `documents/` (new `CondemnDoc` table). Condemned items and all their files (PDFs, fault photos, loan signatures) are purged 5 years after `condemnedAt`. The purge runs automatically whenever the Condemned Items list loads (`src/lib/condemned.ts`), so no scheduler is needed.
- Also fixed `deleteFile()` in `src/lib/upload.ts`, which could not parse `S3_PUBLIC_URL` links and so never actually deleted files in production.
