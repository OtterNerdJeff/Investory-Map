# Inventory Map — CLAUDE.md

> This file is read automatically by Claude Code on project load.
> It provides full context, architecture, and development guidance for the engineering team continuing this project.

---

## Project Overview

**Inventory Map** is a browser-based, single-file React application for managing physical assets across rooms, floors, and sections of a building. It was built for a school's AV/IT department to replace manual Excel tracking.

- **Version:** 1.0 — Phase 1 complete
- **Primary file:** `InventoryMap.jsx` (~1,480 lines)
- **Deployment:** Static SPA — no server, no database, no build pipeline required
- **Persistence:** Browser `localStorage` only (client-side)
- **Styling:** 100% inline styles — no CSS files, no Tailwind, no styled-components
- **Live in:** Claude.ai artifact renderer (also runs in Vite/CRA)

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| UI Framework | React (hooks) | `useState`, `useEffect`, `useRef`, `useCallback` |
| Language | JavaScript JSX | No TypeScript |
| Styling | Inline JS style objects | Zero external CSS |
| Fonts | Google Fonts CDN | DM Mono + Space Grotesk |
| Icons | Unicode emoji | No icon library |
| Persistence | `localStorage` | Three versioned keys |
| Drag & Drop | HTML5 native API | No library |
| Signatures | HTML5 Canvas API | Finger/mouse draw |
| File Export | Blob + `URL.createObjectURL` | CSV only |
| File Import | `FileReader` API | CSV parsing via string split |
| Photos | FileReader + base64 | Stored as data URIs |
| Build tool | None required | Runs directly as JSX artifact |

---

## localStorage Keys

| Key | Type | Contents |
|---|---|---|
| `invmap_v1` | `Array<Item>` | All inventory items — primary dataset |
| `invmap_sec_v1` | `Object<string, string[]>` | Section names → ordered room arrays |
| `invmap_log_v1` | `Array<MoveLog>` | Global movement audit log |

> **Important:** If you change the Item schema, bump the key version (e.g. `invmap_v2`) to force a fresh load and avoid stale data errors.

---

## Data Model

### Item

```js
{
  id: string,              // "I001" or "I" + uid()
  sheet: string,           // Source: "PNV" | "CON" | "iPad" | "OTH"
  label: string,           // Display name
  assetCode: string,       // Company asset tracking code (may be empty)
  type: string,            // "Projector" | "Visualiser" | "Patch Panel" | "MIC" | "iPad" | etc.
  brand: string,
  model: string,
  serial: string,
  location: string,        // Room name OR borrower name when on loan
  cost: string,            // Purchase cost as string — convert with Number() for math
  warrantyEnd: string,     // "YYYY-MM-DD" or ""
  status: string,          // See STATUS_LIST constant
  statusNote: string,      // Free text when status === "Others"
  remark: string,          // Item-level info, max 300 chars
  comment: string,         // Admin note, max 300 chars
  loanable: boolean,       // Whether item can be loaned out
  isLoaned: boolean,       // Currently on loan
  loanedTo: string,        // Borrower name when on loan
  _prevLocation: string,   // Saved room before condemnation auto-route
  repairs: Repair[],
  faults: Fault[],
  moveLog: MoveEntry[],
  loanHistory: LoanEntry[],
}
```

### Fault

```js
{
  id: string,
  faultType: string,       // From FAULT_TYPES constant
  severity: string,        // "Low" | "Medium" | "High" | "Critical"
  description: string,
  reportedBy: string,
  photos: string[],        // base64 data URIs
  date: string,            // ISO timestamp
  status: string,          // "Open" | "In Progress" | "Resolved"
  resolvedBy: string,      // Set on resolution
  resolutionNote: string,  // Set on resolution
}
```

### Repair

```js
{
  id: string,
  description: string,
  technician: string,
  startDate: string,       // "YYYY-MM-DD"
  completeDate: string,    // "YYYY-MM-DD"
  costRepair: string,
  notes: string,
  loggedDate: string,      // ISO timestamp — auto-set
}
```

### LoanEntry

```js
{
  id: string,
  borrowerName: string,
  borrowerId: string,      // Staff ID or contact
  issuedBy: string,
  expectedReturn: string,  // "YYYY-MM-DD"
  notes: string,
  signature: string|null,  // base64 canvas image or null
  dateOut: string,         // ISO timestamp — auto-set on loan out
  dateIn: string,          // ISO timestamp — auto-set on return
  status: string,          // "Active" | "Returned"
  condition: string,       // "Good" | "Fair" | "Damaged" | "Missing Parts"
  returnedBy: string,
}
```

### MoveEntry

```js
{
  id: string,
  itemId: string,
  itemLabel: string,
  from: string,
  to: string,
  reason: string,
  movedBy: string,
  date: string,            // ISO timestamp
}
```

---

## Component Tree

```
App()                          — all state lives here, no Context/store
  ├── Header bar
  ├── Stats bar (9 counters, Total is clickable → Report)
  ├── Main tabs (Sections / List / Faults / Loans)
  ├── SectionsView()           — room grid with drag & drop
  │     └── ItemChip()         — draggable chip, shift+click multi-select
  ├── ListView()               — searchable/filterable table
  ├── FaultsView()             — global fault dashboard
  ├── LoansView()              — person cards with loaned items
  ├── FloatingWindow()         — draggable detail panel (position:fixed, z:200)
  └── Modals (z:150, rendered conditionally via modal state object)
        MoveModal
        BulkMoveModal          — move N selected items at once
        FaultModal             — fault report with photo upload
        LoanOutModal           — loan out with e-signature canvas
        ReturnModal
        AddItemModal
        ImportModal            — CSV bulk import
        ReportModal            — stats + printable report
        MoveLogModal
        SettingsModal          — manage sections & rooms
```

---

## Key Constants (top of file)

| Constant | Purpose |
|---|---|
| `APP_TITLE` | App title — change here to rebrand |
| `APP_SUBTITLE` | Subtitle below title |
| `STATUS_LIST` | Valid status values for dropdowns |
| `STATUS_COLORS` | Maps status → `{bg, border, text, badge}` colours |
| `TYPE_ICON` | Maps equipment type → emoji icon |
| `FAULT_TYPES` | Selectable fault types in fault report form |
| `SEV_COLORS` | Maps severity → `{bg, text}` colours |
| `CONDEMNED_SECTION` | Section name items auto-route to when condemned — must match a key in `INITIAL_SECTIONS` |
| `RAW_ITEMS` | Seed data used on first load (before localStorage) |
| `INITIAL_SECTIONS` | Seed section/room layout used on first load |

---

## Key Behaviours

### Auto-routing to Condemned
When `status` is set to `"Waiting for Condemnation"`, the item's `location` is automatically overwritten to `CONDEMNED_SECTION` and the previous location is saved in `_prevLocation`. Reverting status restores `_prevLocation`.

### Fault auto-escalation
- High/Critical fault → item status becomes `"Faulty"`
- Low/Medium fault on Operational item → item status becomes `"Under Maintenance"`
- All faults resolved → item status reverts to `"Operational"`

### Loan location override
When loaned out, `item.location` is replaced with the borrower's name. This drives the Loans tab grouping. On return, location is set to the chosen return location.

### Multi-select
- **✓ button** on each chip or **Shift+click** on chip label to select
- Floating action bar appears at bottom: "X items selected — ⇄ Move All | ✕ Clear"
- `BulkMoveModal` handles the move — one reason, one destination, all items move together

### Room reorder drag
Room cards are draggable (⠿ handle). Dragging a room card over another room in the same section reorders them via `reorderRooms()`.

### Move room between sections
In Settings, each room has a ↗ button that opens an inline section picker. `moveRoomToSection()` removes the room from the source section array and appends it to the target — all item locations update automatically.

### Safe room deletion
Deleting a room triggers a `window.prompt()` asking where to redirect items (defaults to `"Spare"`). Items are never orphaned.

---

## Features Reference

### Sections View
- Visual room grid per active section
- Colour-coded room card borders: red = Faulty items, amber = Under Maintenance, orange = Waiting for Condemnation
- Open fault badge on room card header
- Drag item chips between rooms (triggers MoveModal)
- Drag room cards to reorder within section
- ✓ or Shift+click to multi-select items
- + button on each room to add new items

### Floating Detail Window
- `position: fixed`, draggable via title bar (mouse + touch)
- Constrained to viewport bounds during drag
- ✕ close button top right
- Tabs: Details | Faults | Repairs | History
- Edit mode with all fields, status dropdown (all statuses including Under Maintenance), loanable checkbox, remark/comment (300 char each)
- Context action buttons: Report Fault, Move, Loan Out / Return

### List View
- Search across label, brand, model, serial, location, assetCode, type
- Filter by Type (dynamic) and Status
- Clicking any row opens FloatingWindow

### Faults Tab
- All faults across all items, sorted newest first
- Filter by status and severity
- Photo thumbnails → fullscreen lightbox

### Loans Tab
- Person cards grouped by `item.loanedTo`
- Jeff (Custody) distinguished with indigo border
- ↩ Return button per item
- "Show available" toggle lists all loanable items not currently loaned

### Report Modal
- Breakdown by Type, Brand, Status
- Warranty expired list
- 🖨 Print — opens clean formatted print window in new tab

### Settings Modal (⚙ Sections)
- Add / rename / delete sections
- Add / rename / delete rooms (with safe item redirect on delete)
- ↗ Move room to another section
- CONDEMNED_SECTION is protected from deletion

### CSV Export
- All items, 17 columns, quoted values
- Filename: `InventoryMap_YYYY-MM-DD.csv`

### CSV Import
- Headers: `label, assetCode, type, brand, model, serial, location, cost, warrantyEnd, status, loanable, remark, comment`
- Case-insensitive header matching
- Preview before committing

---

## Standalone Deployment (Vite)

```bash
npm create vite@latest inventory-map -- --template react
cd inventory-map
npm install
cp InventoryMap.jsx src/App.jsx
```

Update `src/main.jsx`:
```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
ReactDOM.createRoot(document.getElementById('root')).render(<App />)
```

```bash
npm run build
# Serve dist/ via any static web server (nginx, Apache, Vercel, Netlify)
```

No environment variables or server-side config needed.

---

## Known Limitations & Technical Debt

| Issue | Severity | Notes |
|---|---|---|
| No multi-user sync | High | localStorage is per-browser — Phase 2 backend required |
| No authentication | High | Any browser user has full access — Phase 2 user accounts needed |
| Photo storage limits | Medium | base64 in localStorage hits ~5MB quickly — migrate photos to S3 |
| No data backup/restore | Medium | Add a JSON export/import for full localStorage state |
| Fault resolution uses `prompt()` | Low | Replace with inline modal for better UX |
| No search in Sections view | Low | Items searchable via List tab only |
| `CONDEMNED_SECTION` is a hardcoded constant | Low | Can be renamed in Settings UI but routing logic uses the constant |
| Single FloatingWindow at a time | Low | Clicking a new item replaces the current open window |

---

## Phase 2 Roadmap

### 1. User Accounts & RBAC
Three roles agreed with client:
- **Admin** — full CRUD, settings, delete
- **User/Engineer** — fault report, move items, log repairs, manage loans
- **Viewer** — read-only (fault report TBC)

Recommended: introduce Node.js + Express + PostgreSQL backend with JWT auth. The current data model maps directly to relational tables.

### 2. Backend & Multi-user Sync
- REST API: `GET/POST/PUT/DELETE /items /sections /faults /loans /movelog`
- Migrate photos from base64/localStorage to S3 or equivalent
- Real-time updates: consider WebSocket or polling

### 3. Email Notifications (Loans)
- Loan slip to borrower on loan-out
- Overdue return reminders
- Recommended: EmailJS (client-side, low volume) or SendGrid via serverless function
- All data is already structured in `loanHistory` entries

### 4. Cross-section Drag & Drop
- Currently drag & drop works within a section only
- Proposed: translucent section overlay drawer appears at screen bottom during drag
- Dropping on section name opens MoveModal pre-filled with first room of that section

### 5. Full Loan Module
- Overdue flagging (items past `expectedReturn` highlighted red)
- Loan receipt PDF generation
- Bulk loan out (multiple items, one borrower, one transaction)

### 6. Viewer / Public Dashboard
- Read-only shareable link showing room status and open fault counts
- No edit capability

---

## Pre-loaded Sample Data

Data seeded from client's Excel inventory file (`Damaiventory.xlsx`). Four sheets imported:

| Sheet | Items | Types | Loanable |
|---|---|---|---|
| ProjectorNVisualiser | ~160 | Projectors, Visualisers, Patch Panels | No |
| Waiting to be Condemned | 9 | Mixed | No |
| iPad | 8 (sample) | Carts, iPads, S-Max | Yes |
| Others | ~20 (sample) | DSLR, MIC, Monitor, Portable HD, Printer | Yes (most) |

To replace with full production data: export master inventory to CSV with correct headers and use ⬆ Import CSV. Alternatively edit `RAW_ITEMS` directly and clear localStorage.

---

## Development Notes

- This app was built iteratively through conversation between a non-technical client and Claude (Anthropic). All design decisions were made collaboratively and are documented in the project conversation history.
- The client has no programming background — keep the UI simple, avoid technical jargon in user-facing text, and maintain the dark aesthetic they approved.
- The floating window "Iron Man UI" aesthetic was specifically requested — maintain the dark glassmorphism feel.
- "Jeff (Custody)" is a specific pattern where the client custodians items under their own name but distinguishes personal loans from custody. This is intentional — do not remove the special handling.
- Remark = item-level info (pre-filled from Excel). Comment = admin observation. Both max 300 chars. Keep them as two separate fields.
- The `CONDEMNED_SECTION` auto-routing was specifically requested — items should auto-move when condemned status is set.

---

*Inventory Map v1.0 — Phase 1 complete — April 2026*
*Built with Claude (Anthropic)*
