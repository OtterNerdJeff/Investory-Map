◈
INVENTORY MAP
Room-based Asset & Inventory Manager
Development Handover Document
Phase 1 Release  ·  Version 1.0  ·  April 2026

1. Project Overview
Inventory Map is a browser-based, single-file React application for managing physical assets across multiple rooms, floors and sections of a building. It was purpose-built for a school's AV and IT department to replace manual Excel tracking, providing a visual room-by-room map of all equipment, fault reporting, loan management, and warranty monitoring.

The application is fully self-contained — it requires no server, no database, and no build pipeline to run. All state persists in the browser's localStorage. It is designed to be deployable as a single .jsx file hosted via any static web server or served directly through Claude.ai's artifact renderer.




2. Tech Stack
The entire application is written in a single .jsx file. No build tools, package managers, or external dependencies are required at runtime. All imports are resolved by the artifact renderer or a CDN-backed React environment.




3. Application Architecture
3.1 Data Model
All application state lives in three top-level arrays, persisted to localStorage under versioned keys:



Item Object Schema
Each item in the inventory array has the following shape:



Fault Object Schema


Loan Entry Schema


3.2 Component Tree
The component hierarchy is flat and intentional — all state lives in App() with no Context or global store:

App()
  ├── Header bar
  ├── Stats bar (9 counters)
  ├── Main tabs (Sections / List / Faults / Loans)
  ├── SectionsView()  — room grid with drag & drop
  │     └── ItemChip()  — draggable equipment chip
  ├── ListView()  — searchable/filterable table
  ├── FaultsView()  — fault dashboard
  ├── LoansView()  — person cards with loaned items
  ├── FloatingWindow()  — draggable detail panel (always on top)
  └── Modals (MoveModal, FaultModal, LoanOutModal, ReturnModal,
           ReportModal, MoveLogModal, AddItemModal,
           ImportModal, SettingsModal)

3.3 Key Behaviours
Auto-routing to Condemned section: When an item's status is set to Waiting for Condemnation, its location is automatically overwritten to the CONDEMNED_SECTION constant and the previous location is saved in _prevLocation. Changing status away from condemned restores the previous location.

Fault auto-escalation: Submitting a High or Critical fault sets the item status to Faulty. Submitting Low or Medium changes Operational to Under Maintenance. When all faults on an item are Resolved, the item status reverts to Operational.

Loan location override: When an item is loaned out, its location field is replaced with the borrower's name. This drives the Loans tab grouping by person. On return, location is set to the specified return location.

Room reorder drag: Room cards (not items) are also draggable. Dragging a room card over another room in the same section swaps their order in the sections state array.


4. Feature Reference
4.1 Sections View
Visual grid of rooms within the active section
Section selector tabs across the top (fully editable via Settings)
Room cards show colour-coded borders: red = Faulty items, amber = Under Maintenance, default = all clear
Open fault count badge displayed on room card header
Equipment chips inside each room show type icon, label, brand/model, fault indicator, loan indicator, warranty expiry warning
Drag any chip to another room — triggers move reason prompt before confirming
Drag room cards to reorder within a section (⠿ handle visible on hover)
+ button on each room card opens Add Equipment modal pre-filled with that room
⇄ button on each chip opens Move modal (mobile-friendly alternative to drag)

4.2 Floating Detail Window
Replaces traditional slide-in panel — appears as a floating draggable window
Triggered by clicking any item chip, table row, or item name anywhere in the app
Draggable via title bar (desktop mouse + touch supported)
Constrained to viewport bounds during drag
Traffic light close button (red dot) top left
Four internal tabs: Details, Faults, Repairs, History
Details tab: all fields displayed, Edit button enters inline edit mode
Edit mode includes Asset Code, all item fields, Status (with Others description field), Loanable checkbox, Remark and Comment fields with 300-char counters
Fault tab: full fault history with photos, severity badges, status selectors, resolution notes
Repairs tab: repair log form with start/complete date, technician, cost, notes
History tab: movement log + full loan history with signature indicator
Context-sensitive action buttons: Report Fault (always), Move (always), Loan Out (if loanable and not loaned), Return (if currently loaned)

4.3 List View
Searchable across: label, brand, model, serial, location, asset code, type
Filter dropdowns: by Type (dynamic from data), by Status
Clicking any row opens the floating detail window
Hint text reminds users: floating window opens wherever they are on screen
All 10 columns: Label, Type, Brand, Model, Serial, Location, Cost, Warranty, Status, Loan
Warranty column colour-coded: red = expired, yellow = within 90 days, grey = valid

4.4 Faults Tab
Global fault dashboard across all items
Filter by status: All, Open, In Progress, Resolved
Filter by severity: All, Low, Medium, High, Critical
Each fault card shows: severity badge, item label (clickable to open detail), location, date, fault type, description, reporter, photos, resolution info
Status dropdown on each fault card for inline status changes
Photo thumbnails open fullscreen lightbox on click

4.5 Loans Tab
Grid of person cards — each person who has at least one item on loan
Jeff (Custody) card highlighted with indigo border to distinguish custody from active loans
Each person card shows initials avatar, name, item count, and list of loaned items
↩ Return button on each item within a person card
Show/hide toggle for all loanable items not currently on loan
Loan Out modal: borrower name, ID/contact, issued by, expected return date, notes, e-signature canvas
Return modal: return location selector, condition dropdown (Good/Fair/Damaged/Missing Parts), received by, notes
E-signature canvas supports mouse drawing and touch/finger on mobile

4.6 Report Modal
Triggered by clicking Total stat or 📊 Report button
Summary grid: Total, Operational, On Loan, Expired Warranty, Open Faults, Condemned
By Type breakdown table
By Brand breakdown table
Warranty Expired list with label, brand, model, location, expiry date
🖨 Print button opens formatted print window in new tab with all tables and a Print button

4.7 Section & Room Management
Accessed via ⚙ Sections button in header
Left panel: list of all sections — click to select
Right panel: rooms in selected section — inline rename via onBlur
Add new section with text field + + button
Rename section: edit field + Rename button (updates all item locations automatically)
Delete section: removes section, items with matching locations are NOT deleted (their location field retains the value)
Add/remove rooms within any section
CONDEMNED_SECTION is protected and cannot be deleted

4.8 Bulk Import CSV
Accepts CSV files with headers: label, assetCode, type, brand, model, serial, location, cost, warrantyEnd, status, loanable, remark, comment
Preview shows first 8 rows before committing
All imported items get new UIDs and empty arrays for faults/repairs/moveLog/loanHistory
Header parsing is case-insensitive and handles common variations (assetcode vs asset code)

4.9 CSV Export
Exports all items as CSV with 17 columns
Filename: InventoryMap_YYYY-MM-DD.csv
Open fault count and repair count included as computed columns
All values quoted to handle commas in field values

4.10 Move Log
Global audit trail of every equipment relocation
Each entry: item label, from location, to location, reason, moved by, date
Also stored per-item in item.moveLog for the History tab
Accessible via 📋 Log button in header


5. Pre-loaded Sample Data
The application ships with representative sample data parsed from the client's Excel inventory file. This data is defined in the RAW_ITEMS constant array at the top of the file and is only used as the initial state on first load — after that, localStorage takes over.



To replace with real data: export the master inventory to CSV with the correct column headers and use the ⬆ Import CSV button. Alternatively, edit the RAW_ITEMS constant directly in the source file and clear localStorage to force a fresh load.

Note: The initial sections layout in INITIAL_SECTIONS maps to the school's physical building layout — PAC & Ground, Floors 2-7, iPad, Others, and the Condemned section. These are fully customisable at runtime via the Settings panel.


6. Phase 2 Planned Features
The following features were discussed with the client but deferred to Phase 2. They are documented here for the engineering team to scope and implement.

6.1 User Accounts & Role-based Access Control
Three roles were agreed: Admin (full access), User/Engineer (fault report + move), Viewer (read-only or fault report only).
Since the app has no backend, Phase 2 will likely require either: (a) a lightweight backend with JWT authentication, or (b) a client-side PIN/password system with role stored in sessionStorage
Admin: full CRUD on all items, sections, rooms, settings
User/Engineer: can report faults, move items, log repairs, manage loans — cannot delete items or sections
Viewer: read-only view of sections and list — may or may not be able to report faults (TBC with client)
Recommended approach: introduce a backend (Node.js + SQLite or PostgreSQL) to store user accounts securely

6.2 Cross-section Drag & Drop
Currently drag & drop works within a section only. Cross-section moves require a UI that allows the user to see both sections simultaneously or select a destination section while dragging.
Proposed: when dragging an item chip, show a translucent section overlay drawer at the bottom of the screen listing all sections as drop targets
Dropping on a section name opens the Move modal with the target section's first room pre-selected

6.3 Email Notifications for Loans
Client requested email notification on loan out (loan slip to borrower) and reminder on overdue returns.
Recommended: EmailJS (client-side) for simple integration without a backend — suitable for low volume
Alternatively: SendGrid or AWS SES via a lightweight serverless function (Vercel/Netlify)
Loan slip should include: item label, serial, borrower name, issued by, date out, expected return date, signature image
Data structure is already ready — loanHistory entries contain all required fields

6.4 Full Loan Module
Beyond the current simple loan out/return flow:
Overdue loan flagging — items past expectedReturn date highlighted in red on Loans tab
Loan receipt PDF generation (printable loan slip)
Bulk loan out (loan multiple items to same person in one transaction)
Loan approval workflow (User requests → Admin approves)

6.5 Data Persistence Backend
The current localStorage approach is suitable for single-user or demo use. For multi-user deployment across a team:
Recommended stack: Node.js + Express + PostgreSQL (or SQLite for simplicity)
REST API endpoints: GET/POST/PUT/DELETE /items, /sections, /faults, /loans, /movelog
The existing data model maps directly to relational tables — no major schema redesign needed
Photos stored as base64 in localStorage will hit storage limits at scale — migrate to S3 or equivalent

6.6 Viewer Role / Public Dashboard
A read-only view that can be shared with teachers or non-technical staff, showing room equipment status and open fault counts without edit capability.


7. Deployment Guide
7.1 Current State (Phase 1)
The application exists as a single .jsx file: InventoryMap.jsx. In its current form it runs as a React artifact in Claude.ai. No build step is required for this environment.

7.2 Standalone Web App Deployment
To deploy as a standalone web application accessible to multiple users on a network:

Step 1 — Create a new Vite project:
npm create vite@latest inventory-map -- --template react
cd inventory-map
npm install

Step 2 — Replace src/App.jsx with InventoryMap.jsx content:
cp InventoryMap.jsx src/App.jsx

Step 3 — Update src/main.jsx to import App:
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
ReactDOM.createRoot(document.getElementById('root')).render(<App />)

Step 4 — Build and serve:
npm run build
npm run preview  # or serve the dist/ folder via nginx/Apache

Step 5 — For school intranet deployment, copy the dist/ folder to any web server. No environment variables or server-side configuration is needed.

7.3 Important Notes for Deployment
Each user's browser has its own localStorage — data is NOT shared between users in this Phase 1 architecture
If shared data is required before a backend is built, consider using a shared hosted JSON file as a read/write store (not recommended for production, suitable for small teams)
Base64 photo storage in localStorage is limited to ~5MB per origin in most browsers — advise users to keep photos under 1MB each and limit to 2-3 per fault report
For iPad/mobile use, the floating window is constrained to viewport — ensure it renders at the correct size on smaller screens (the window width is fixed at 360px)
The Google Fonts @import in the CSS will fail in offline environments — replace with locally hosted font files if the app needs to work without internet access


8. Known Limitations & Technical Debt



9. Key Constants Reference
These constants are defined at the top of InventoryMap.jsx and control core application behaviour:




10. Development Context & Conversation History
This application was designed and built iteratively through a series of conversations between the client and Claude (Anthropic). The following summarises the key decisions made during development:




11. Handover Checklist
The following items should be completed or verified before the engineering team takes ownership:

Review InventoryMap.jsx — ensure the file renders correctly in both Claude.ai artifact mode and Vite standalone mode
Confirm localStorage key version (invmap_v1) — bump version if schema changes to force fresh load
Replace RAW_ITEMS with full production inventory data when client provides complete Excel export
Test drag & drop on mobile (touch events implemented but should be validated on iOS Safari and Android Chrome)
Validate signature canvas on iPad — primary use device for loan sign-out
Test CSV import with client's full Excel export (convert to CSV first)
Test print report output in client's preferred browser
Scope Phase 2 backend work — recommend starting with user authentication before multi-user data sync
Add a JSON backup/restore utility to protect against accidental localStorage wipe
Discuss and agree Phase 2 scope with client — user accounts, backend, email notifications, cross-section drag


Inventory Map — Development Handover Document
Phase 1 complete. Ready for engineering handover.
Built with Claude (Anthropic)  ·  April 2026
