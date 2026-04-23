# ◈ Investory Map

**Room-based asset and inventory management for schools.**

Investory Map is a production-ready web application built for school AV and IT departments to replace manual Excel tracking. It gives your team a live, visual map of every piece of equipment — which room it's in, whether it's working, who has it on loan, and when warranties expire.

---

## Who is it for?

| Role | What they can do |
|---|---|
| **Super Admin** | Onboard schools, manage all tenant data, view aggregate stats across the platform |
| **School Admin** | Full inventory CRUD, settings, import/export, all reports |
| **Teacher / Engineer** | Report faults, move equipment, manage loans — no delete access |

The platform is multi-tenant: each school sees only its own data. A single deployment serves multiple schools.

---

## Features

- **Sections view** — visual room grid per section (floor/area), colour-coded by equipment health
- **Drag & drop** — drag equipment chips between rooms; drag room cards to reorder
- **Multi-select** — shift-click or tap ✓ to select multiple items, then bulk-move them
- **Detail panel** — floating draggable window with full item details, fault history, repairs log, and loan history
- **Fault reporting** — photo upload, severity levels, auto-escalates item status; auto-reverts when all faults resolved
- **Loan management** — e-signature capture on loan-out, condition check on return, full loan history
- **Move log** — full audit trail of every equipment relocation, with reason and timestamp
- **Warranty tracking** — expiry warnings at 90 days, expired badges on chips and list view
- **Reports** — breakdown by type, brand, and status; printable report
- **CSV import / export** — bulk onboard from Excel export; export full inventory as CSV
- **Super Admin HQ** — onboard new schools via a 3-step wizard, drill into any school's stats and users

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict mode) |
| Database | PostgreSQL via Prisma 7 |
| Auth | NextAuth.js v5 — credentials provider, JWT sessions, 3-tier RBAC |
| File storage | S3-compatible (Cloudflare R2 or AWS S3) — photos, signatures |
| Styling | 100% inline styles — no CSS framework, dark theme throughout |
| Testing | Vitest — API route unit tests with mocked Prisma |
| Deployment | Railway (Nixpacks, PostgreSQL plugin) |

---

## Getting Started (local development)

### Prerequisites

- Node.js 20+
- PostgreSQL (local or Docker)
- An S3-compatible bucket for file uploads (local MinIO works for dev)

### 1. Clone and install

```bash
git clone https://github.com/your-org/investory-map.git
cd investory-map
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/investory_map"
NEXTAUTH_SECRET="any-random-string-for-dev"
NEXTAUTH_URL="http://localhost:3000"

# MinIO (local S3) — or leave blank to skip file uploads in dev
S3_ENDPOINT="http://localhost:9000"
S3_REGION="us-east-1"
S3_BUCKET="investory-uploads"
S3_ACCESS_KEY="minioadmin"
S3_SECRET_KEY="minioadmin"
```

### 3. Set up the database

```bash
npx prisma db push       # create all tables
npx prisma db seed       # create super admin + demo school
```

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Login with the credentials printed by the seed script.

---

## Seeded accounts (dev only)

| Role | Email | Password |
|---|---|---|
| Super Admin | `admin@investorymap.sg` | `admin123` |
| School Admin | `ict@dmps.edu.sg` | `ict123` |
| Teacher | `teacher@dmps.edu.sg` | `teacher123` |

---

## Deploying to Railway

See the step-by-step checklist in the [Railway setup guide](#) — or the short version:

1. Create a Railway project, connect this repo to the `main` branch
2. Add the **PostgreSQL** plugin (Railway injects `DATABASE_URL` automatically)
3. Set environment variables: `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `S3_*`
4. Deploy — Railway runs `npm run build` then `npx prisma db push && npm start`
5. Run `npx tsx prisma/seed.ts` via Railway Shell to create the super admin account

The [`railway.toml`](railway.toml) in this repo configures the build and start commands automatically.

---

## Project Structure

```
src/
├── app/
│   ├── api/                    # All API routes
│   │   ├── items/              # CRUD + faults, repairs, loans, move
│   │   ├── sections/           # Sections + rooms CRUD
│   │   ├── faults/             # School-wide fault dashboard
│   │   ├── loans/              # Active loans list
│   │   ├── move-log/           # Movement audit log
│   │   ├── reports/            # Summary stats
│   │   ├── upload/             # S3 file upload
│   │   ├── import/             # CSV bulk import
│   │   ├── export/             # CSV export
│   │   └── super-admin/        # School + user management
│   ├── dashboard/              # Main app (school users)
│   ├── super-admin/            # HQ dashboard (super admin only)
│   └── login/                  # Auth page
├── components/
│   ├── SectionsView.tsx        # Room grid with drag & drop
│   ├── ListView.tsx            # Searchable/filterable table
│   ├── FaultsView.tsx          # Fault dashboard
│   ├── LoansView.tsx           # Person cards + loan management
│   ├── DetailPanel.tsx         # Floating detail window
│   └── modals/                 # MoveModal, FaultModal, LoanOutModal, ...
├── lib/
│   ├── prisma.ts               # Prisma client singleton
│   ├── auth.ts / auth.config.ts
│   ├── auth-guard.ts           # requireSession, requireSuperAdmin
│   ├── api-client.ts           # Typed fetch wrapper for client components
│   ├── constants.ts            # Status colours, type icons, fault types
│   ├── upload.ts               # S3 upload/delete helpers
│   └── validation/             # Zod schemas per domain
└── middleware.ts               # Route protection + tenant enforcement
prisma/
├── schema.prisma               # Full multi-tenant schema
└── seed.ts                     # Demo school + user accounts
tests/
└── api/                        # Vitest unit tests for all API routes
```

---

## Running Tests

```bash
npm test
```

66 tests across 10 test files covering every API route, including tenant isolation, role enforcement, fault auto-escalation, and loan state transitions.

---

## Key Behaviours

**Fault auto-escalation** — reporting a Medium or High fault automatically changes the item's status to `Under Maintenance` or `Faulty`. When all faults on an item are resolved, status reverts to `Operational`.

**Condemned routing** — setting an item's status to `Waiting for Condemnation` automatically moves it to the `Condemned / Pending Disposal` section and saves the previous location. Reverting status restores the original room.

**Loan location override** — when an item is loaned out, its `location` field is replaced with the borrower's name. This drives the Loans tab grouping. On return, location reverts to the chosen room.

**Tenant isolation** — every database query is scoped by `schoolId`. Middleware enforces that users can only access their own school's data. Super Admin can access all schools.

---

*Built for Damai Primary School AV/IT Department · April 2026*
