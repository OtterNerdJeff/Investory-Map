# Investory Map — CLAUDE.md

> This file is read automatically by Claude Code on project load.
> It provides full context, architecture, and development guidance.

---

## Project Overview

**Investory Map** is a production Next.js 16 web application for managing physical assets (AV/IT equipment) across rooms, floors, and sections of a school building. It replaced a manual Excel-based system for a school's AV/IT department.

- **Version:** 2.1 — Phase 2 shipped; Phase 3 roadmap active
- **Architecture:** Next.js 16 App Router full-stack monolith
- **Database:** PostgreSQL via Prisma 7 with driver adapter (`@prisma/adapter-pg`)
- **Auth:** NextAuth.js v5 (credentials provider, JWT sessions, 30-day persistence)
- **Multi-tenancy:** `schoolId` FK on every tenant table, middleware-enforced
- **Styling:** 100% inline styles — no CSS framework, light theme
- **Deployment:** Railway (Nixpacks + PostgreSQL plugin)

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router) | Full-stack, SSR + client components |
| Language | TypeScript (strict) | No `any` except where unavoidable |
| ORM | Prisma 7 | Driver adapter pattern (`PrismaPg`) |
| Database | PostgreSQL | Multi-tenant via `schoolId` FK |
| Auth | NextAuth.js v5 beta | Credentials provider, JWT strategy, 30-day maxAge |
| File storage | S3-compatible | `@aws-sdk/client-s3`, works with R2 or AWS |
| Validation | Zod 4 | Input validation on all API routes |
| Testing | Vitest | API route unit tests, mocked Prisma |
| Fonts | DM Mono + Space Grotesk | Loaded via Google Fonts link in layout.tsx |
| Icons | Unicode emoji | No icon library |
| Drag & Drop | HTML5 native API | No library — items between rooms, rooms within section |
| Signatures | HTML5 Canvas API | Finger/mouse draw, uploaded to S3 |
| Deployment | Railway | `railway.toml` in repo root |

---

## Repository Structure

```
src/
├── app/
│   ├── api/                          # All API routes (Next.js Route Handlers)
│   │   ├── items/[itemId]/
│   │   │   ├── faults/route.ts       # POST — report fault
│   │   │   ├── repairs/route.ts      # GET, POST repairs
│   │   │   ├── loans/route.ts        # POST loan-out / return
│   │   │   └── move/route.ts         # POST move item
│   │   ├── items/route.ts            # GET list, POST create
│   │   ├── sections/[sectionId]/
│   │   │   ├── rooms/route.ts        # POST, PUT (reorder + rename), DELETE rooms
│   │   │   └── route.ts              # PUT, DELETE section
│   │   ├── sections/route.ts         # GET, POST sections
│   │   ├── faults/[faultId]/route.ts # PUT update fault status
│   │   ├── faults/route.ts           # GET school-wide faults
│   │   ├── loans/route.ts            # GET active loans
│   │   ├── move-log/route.ts         # GET audit log
│   │   ├── profile/route.ts          # PUT change password (bcrypt verify + hash)
│   │   ├── reports/route.ts          # GET summary stats
│   │   ├── upload/route.ts           # POST file → S3
│   │   ├── import/route.ts           # POST CSV bulk import
│   │   ├── export/route.ts           # GET CSV export (Content-Disposition: attachment)
│   │   └── super-admin/              # School + user management (SUPER_ADMIN only)
│   ├── dashboard/
│   │   ├── layout.tsx                # Auth guard + session provider
│   │   └── page.tsx                  # Main app — all state, all handlers
│   ├── super-admin/
│   │   ├── layout.tsx                # SUPER_ADMIN guard (server component)
│   │   ├── page.tsx                  # All-schools overview + stats
│   │   ├── schools/[schoolId]/page.tsx  # School drill-down + user management
│   │   └── onboard/page.tsx          # 3-step new school wizard
│   ├── login/page.tsx
│   ├── page.tsx                      # Public landing page (hero + feature cards)
│   └── layout.tsx                    # Root layout (fonts, SessionProvider)
├── components/
│   ├── SectionsView.tsx              # Room grid, item drag & drop, room reorder drag & drop
│   ├── ItemChip.tsx                  # Draggable equipment chip, multi-select ✓ button
│   ├── ListView.tsx                  # Search + filter table (type, status, warranty)
│   ├── FaultsView.tsx                # School-wide fault dashboard
│   ├── LoansView.tsx                 # Person cards + loan management
│   ├── DetailPanel.tsx               # Floating draggable detail window (mobile-safe width)
│   ├── Header.tsx                    # Two-row: logo+auth row / action-buttons row
│   ├── StatsBar.tsx                  # 9 clickable stat cards → tab/filter navigation
│   ├── TabNav.tsx
│   ├── LoginForm.tsx
│   └── modals/
│       ├── MoveModal.tsx
│       ├── BulkMoveModal.tsx
│       ├── FaultModal.tsx            # Photo upload via S3
│       ├── LoanOutModal.tsx          # Canvas signature → S3
│       ├── ReturnModal.tsx
│       ├── AddItemModal.tsx
│       ├── ChangePasswordModal.tsx   # 3-field form → PUT /api/profile
│       ├── ImportModal.tsx           # CSV parse client-side → api.import.csv()
│       ├── ReportModal.tsx           # Print-ready report
│       ├── MoveLogModal.tsx
│       └── SettingsModal.tsx         # Section + room CRUD (uses IDs, not names)
├── lib/
│   ├── prisma.ts                     # Singleton PrismaClient with PrismaPg adapter
│   ├── auth.ts                       # NextAuth full config (bcrypt, Prisma) — NOT edge-safe
│   ├── auth.config.ts                # Edge-safe NextAuth config; session maxAge: 30 days
│   ├── auth-guard.ts                 # requireSession(), requireSuperAdmin()
│   ├── tenant.ts                     # getTenantSchoolId() from session
│   ├── api-client.ts                 # Typed fetch wrapper — client components only
│   ├── api-errors.ts                 # handleApiError() — centralised error responses
│   ├── constants.ts                  # STATUS_COLORS, TYPE_ICON, FAULT_TYPES, SEV_COLORS, helpers
│   ├── upload.ts                     # uploadFile(), deleteFile() via S3 SDK
│   └── validation/                   # Zod schemas: items.ts, faults.ts, loans.ts, repairs.ts, sections.ts
├── middleware.ts                     # Route protection, redirects unauthenticated users
└── types/
    └── next-auth.d.ts                # Session type augmentation (role, schoolId, schoolName)
prisma/
├── schema.prisma                     # Full schema — School, User, Item, Section, Room, Fault, Repair, LoanEntry, MoveLogEntry
└── seed.ts                           # Creates super admin + demo school + 3 user accounts
tests/
└── api/                              # Vitest tests — 66 tests across 10 files
retheme.py                            # One-shot script used to migrate dark → light theme colours
railway.toml                          # Railway build + start config
```

---

## Data Model (Prisma)

The schema is in `prisma/schema.prisma`. Key relationships:

```
School
  ├── users: User[]           (role: SUPER_ADMIN | SCHOOL_ADMIN | USER)
  ├── sections: Section[]
  │     └── rooms: Room[]     (sortOrder: Int — drives drag-reorder display)
  └── items: Item[]
        ├── faults: Fault[]
        ├── repairs: Repair[]
        ├── loanEntries: LoanEntry[]
        └── moveLog: MoveLogEntry[]
```

Every tenant table has `schoolId String` referencing `School.id`. API routes always filter by `schoolId` from the session — never from request parameters.

Key item fields:
- `location: String` — room name, OR borrower name when on loan
- `isLoaned: Boolean` — drives Loans tab grouping
- `loanedTo: String?` — borrower name (denormalised for quick display)
- `status: String` — see `STATUS_LIST` in `constants.ts`
- `warrantyEnd: DateTime?`

Key room fields:
- `sortOrder: Int` — display order within a section; updated via `PUT /api/sections/[sectionId]/rooms`

---

## Auth Pattern

**`src/lib/auth.ts`** — full NextAuth config with bcrypt + Prisma. **Never import this in middleware** — it pulls in Node.js modules.

**`src/lib/auth.config.ts`** — edge-safe config (JWT callbacks, pages). Session `maxAge` is 30 days.

**`src/middleware.ts`** — uses `auth.config.ts`. Redirects unauthenticated users to `/login`. Blocks non-`SUPER_ADMIN` from `/super-admin/*`.

**`requireSession()`** — call at the top of every API route handler. Returns `{ id, name, role, schoolId }`. Throws `401` if no session.

**`requireSuperAdmin()`** — same but also throws `403` if role is not `SUPER_ADMIN`.

---

## API Pattern

All API routes follow this structure:

```typescript
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    // Use session.schoolId to scope all queries
    const data = await prisma.item.findMany({ where: { schoolId: session.schoolId } });
    return NextResponse.json(data);
  } catch (e: unknown) {
    return handleApiError(e);
  }
}
```

`handleApiError()` in `src/lib/api-errors.ts` maps `401`/`403`/`404` sentinel errors from `requireSession` and returns appropriate JSON responses. Other errors return `500`.

Input validation uses Zod schemas from `src/lib/validation/`. Parse with `.safeParse()` and return `400` on failure.

---

## Key Constants (`src/lib/constants.ts`)

| Export | Purpose |
|---|---|
| `STATUS_LIST` | Valid status strings for dropdowns |
| `STATUS_COLORS` | Maps status → `{bg, border, text, badge}` — light tinted backgrounds, dark text |
| `TYPE_ICON` | Maps equipment type → emoji |
| `FAULT_TYPES` | Selectable fault types |
| `SEV_COLORS` | Maps severity → `{bg, text}` — light tinted backgrounds, dark text |
| `CONDEMNED_SECTION` | `"Condemned / Pending Disposal"` — protected section name |
| `getStatusColor(status)` | Returns `STATUS_COLORS[status]` with fallback |
| `getTypeIcon(type)` | Returns emoji with fallback |
| `fmtDate(d)` | Formats date as `dd Mon yyyy` (en-SG locale) |
| `isExpired(d)` | Returns true if date is in the past |
| `expiringSoon(d)` | Returns true if date is within 90 days |

---

## Colour Palette (Light Theme)

All colours are inline styles — no CSS variables used in components.

| Role | Value |
|---|---|
| Page background | `#f8fafc` |
| Card / modal background | `#ffffff` |
| Primary text | `#1e293b` |
| Muted text | `#64748b` / `#94a3b8` |
| Indigo accent (headings, links) | `#4f46e5` |
| Border (default) | `#e2e8f0` |
| Border (inputs) | `#cbd5e1` |
| Button background | `#f1f5f9` |
| Primary button | `#3730a3` (white text) |
| Indigo highlight bg | `#ede9fe` |

Status badge colours are in `STATUS_COLORS` (light tint bg + dark text). Severity colours in `SEV_COLORS` (same pattern).

---

## Key Behaviours

### Fault auto-escalation (enforced server-side in `POST /api/items/[itemId]/faults`)
- `severity: "Medium"` + item is `Operational` → item status → `"Under Maintenance"`
- `severity: "High"` or `"Critical"` → item status → `"Faulty"` (regardless of prior status)
- When last open fault is resolved (`PUT /api/faults/[faultId]`, status → `"Resolved"`) → item status → `"Operational"`

### Condemned routing (enforced client-side in `DetailPanel` edit handler)
Setting status to `"Waiting for Condemnation"` calls `api.items.move()` to relocate the item to `CONDEMNED_SECTION`. Previous location is saved so it can be restored if status reverts.

### Loan location override
`POST /api/items/[itemId]/loans` with `action: "loan-out"` sets `item.location = borrowerName` and `item.isLoaned = true`. `action: "return"` sets `item.location = returnLocation` and `item.isLoaned = false`.

### Multi-select
`selectedItems: Set<string>` in dashboard state. ✓ button on each chip calls `onToggleSelect(id, shiftHeld)`. When set is non-empty, a fixed action bar appears at the bottom of the screen. `BulkMoveModal` sends individual `api.items.move()` calls in sequence.

### Room drag-reorder
Rooms can be dragged within a section. `onRoomCardDragStart` / `onRoomCardDrop` in `dashboard/page.tsx` build a reordered array, apply optimistic UI via `setSections`, then persist each changed room's `sortOrder` via `api.sections.updateRoomOrder()` → `PUT /api/sections/[sectionId]/rooms`. Rolls back on error.

### Stats bar click-to-filter
Each of the 9 cards in `StatsBar` calls `onClickStat(label)`. `handleStatClick` in `dashboard/page.tsx` maps labels to tab switches + filter state changes (e.g. "Faulty" → List tab with `filterStatus: "Faulty"`; "On Loan" → Loans tab).

### CSV export
`onExportCSV` creates a temporary `<a>` element pointing to `/api/export` and programmatically clicks it. The route returns `Content-Disposition: attachment; filename=inventory.csv`.

### Change password
Header shows a clickable `👤 Name` button → opens `ChangePasswordModal`. The modal POSTs to `PUT /api/profile` with `{ currentPassword, newPassword }`. The route bcrypt-verifies the current password before hashing and saving the new one.

### SettingsModal uses IDs, not names
`SettingsModal` receives `SectionData[]` (with `id`, `name`, `isProtected`, `rooms: RoomData[]`). All callbacks pass IDs. The `sectionsRaw` state in `dashboard/page.tsx` holds this structure alongside the flat `sections: Record<string, string[]>` used by `SectionsView`.

### "Jeff (Custody)"
`LoansView` renders a person card with an indigo border for items loaned to the string `"Jeff (Custody)"`. This is intentional client behaviour — do not remove.

---

## Environment Variables

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Yes | JWT signing secret — `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Yes | Full URL of the app (e.g. `https://app.railway.app`) |
| `S3_ENDPOINT` | Yes* | Empty string uses AWS regional routing; set for R2 or MinIO |
| `S3_REGION` | Yes | `auto` for R2, `ap-southeast-1` for AWS |
| `S3_BUCKET` | Yes | Bucket name |
| `S3_ACCESS_KEY` | Yes | S3/R2 access key ID |
| `S3_SECRET_KEY` | Yes | S3/R2 secret access key |

*File uploads will fail silently if S3 vars are missing, but the rest of the app works.

---

## Development Workflow

```bash
npm install          # also runs: prisma generate (postinstall)
npx prisma db push   # sync schema to local DB (no migration files needed in dev)
npx prisma db seed   # create demo accounts
npm run dev          # start Next.js dev server
npm test             # run Vitest test suite (66 tests)
npx tsc --noEmit     # type check
npm run build        # production build check
```

---

## Deployment (Railway)

`railway.toml` in repo root configures:
- **Build:** `npm run build`
- **Start:** `npx prisma db push && npm start` (schema sync on each deploy)
- **Healthcheck:** `/login`

On first deploy, run the seed script via Railway Shell: `npx tsx prisma/seed.ts`

---

## Client Context

- Built for Damai Primary School's AV/IT department (Singapore)
- Client has no programming background — keep UI simple, no technical jargon in user-facing text
- Light theme (clean, professional) — client switched preference from the original dark theme in May 2026
- `remark` = item-level info (pre-filled from original Excel). `comment` = admin observation. Both capped at 300 chars. Keep as two separate fields.
- `CONDEMNED_SECTION` auto-routing was a specific client requirement

---

## Roadmap (Phase 3+)

- **Email notifications** — loan slip on loan-out, overdue return reminders (SendGrid or EmailJS)
- **Cross-section drag & drop** — drop-zone overlay at screen bottom during drag
- **Overdue loan flagging** — highlight items past `expectedReturn` in red
- **Loan receipt PDF** — printable slip with signature image
- **Viewer role** — read-only shareable link per school
- **Real-time updates** — WebSocket or polling for multi-user sync
- **User manual** — PowerPoint deck for new user onboarding (python-pptx, v1.0.2 installed)

---

*Investory Map v2.1 — May 2026*
*Built with Claude (Anthropic)*
