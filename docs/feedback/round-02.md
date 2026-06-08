# Feedback Round 2 — 2026-06-08

Source: Client (school IT admin) via direct message

## Context
Client has not yet received the deployed version with Round 1 fixes. These comments are based on the older version.

## Issues Reported

### 1. Cannot download CSV data as backup
- **Priority:** High (client-stated)
- **Status:** Already exists — needs deployment
- **Notes:** The "⬇ CSV" button in the header bar already triggers a full CSV export (`GET /api/export`). Returns all items with headers: ID, Label, AssetCode, Type, Brand, Model, Serial, Location, Cost, WarrantyEnd, Status, Loanable, LoanedTo, Remark, Comment, OpenFaults, Repairs. Content-Disposition triggers browser download as `InvestoryMap_YYYY-MM-DD.csv`.
- **Possible issue:** Client may not have noticed the button, or their older deployment may have a bug. Verified working on current codebase (2026-06-08).
- **Action:** Deploy latest version. If client still can't find it, consider making the button label more explicit (e.g., "⬇ Export CSV").

### 2. Option to modify item detail type list (repeat of Round 1 #4)
- **Status:** Already fixed in Round 1
- **Action:** Deploy latest version

### 3. Fault button styling (repeat of Round 1 #6)
- **Status:** Already fixed in Round 1
- **Action:** Deploy latest version
