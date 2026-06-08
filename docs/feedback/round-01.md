# Feedback Round 1 — 2026-06-07

Source: Client (school IT admin) via direct message

## Issues Reported

### 1. Repair log not reflecting after submission
- **Priority:** High
- **Status:** Fixed
- **Root cause:** Field name mismatch — `RepairEntry` interface had `costRepair`/`loggedDate` but DB returns `cost`/`createdAt`
- **Fix:** Corrected interface fields, form state, and display bindings in `DetailPanel.tsx`

### 2. CSV import creating duplicate entries
- **Priority:** High
- **Status:** Fixed
- **Root cause:** No deduplication on serial numbers during import
- **Fix:** Added serial dedup in `POST /api/import` — checks existing DB serials + within-CSV duplicates. UI shows "X imported, Y duplicates skipped"

### 3. No way to clear all data for restart
- **Priority:** Medium
- **Status:** Fixed
- **Root cause:** Feature didn't exist
- **Fix:** Added `POST /api/reset` endpoint + "Clear All Data" danger zone in SettingsModal with "RESET" confirmation. Deletes items, sections, rooms, faults, loans, move logs. Keeps user accounts.

### 4. Option to modify item detail type list
- **Priority:** Medium
- **Status:** Fixed
- **Root cause:** Type list was hardcoded in DetailPanel
- **Fix:** Added `customTypes` JSON field to School model, `GET/PUT /api/types` endpoint, "Item Types" tab in SettingsModal with add/rename/delete/save. Falls back to `DEFAULT_ITEM_TYPES` (17 types).

### 5. Edit menu expanding beyond screen size
- **Priority:** Medium
- **Status:** Fixed
- **Root cause:** Flex child missing `minHeight: 0` preventing overflow scroll
- **Fix:** Added `minHeight: 0` to content scroll container + changed `maxHeight` to `min(82vh, calc(100dvh - 20px))` in DetailPanel

### 6. Fault button too highlighted, wrong position
- **Priority:** Low
- **Status:** Fixed
- **Fix:** Moved fault button to right side with flexbox spacer, removed purple background/border styling to match Move button style
