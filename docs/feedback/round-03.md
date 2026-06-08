# Feedback Round 3 — 2026-06-08

Source: Client (school IT admin) via direct message

## Issues Reported

### 1. New item from room goes to "Spare" instead of that room
- **Priority:** High
- **Status:** Fixed
- **Root cause:** Zod schema applies `locationName` default "Spare" before the API checks `input.location`. Since `input.locationName` is always "Spare" (the default), it wins over the form's `location` field.
- **Fix:** Changed `POST /api/items` to prefer `input.location` (from form) over `input.locationName` (schema default).

### 2. Item types — option to change/assign icon
- **Priority:** Medium
- **Status:** Fixed
- **Root cause:** Icons were hardcoded in `TYPE_ICON` map in constants.ts with no way to customize.
- **Fix:** Added `typeIcons Json?` field to School model. Updated `/api/types` to GET/PUT both types and icons. Added emoji input column in SettingsModal Item Types tab. Icons flow through dashboard → SectionsView, ListView, DetailPanel, AddItemModal.

### 3. Larger icons for each item
- **Priority:** Low
- **Status:** Fixed
- **Fix:** Increased emoji icon size from 10px to 18px in ItemChip (Sections view), 16px in ListView, and 18px in DetailPanel. Icons now render at approximately 24×24 logical pixels (emoji scaling).

### 4. Sort items by type name in Sections view
- **Priority:** Medium
- **Status:** Fixed
- **Fix:** Added `.sort()` to `roomItems` in SectionsView — items are sorted alphabetically by type first, then by label within the same type. Items of the same type are grouped together visually.
