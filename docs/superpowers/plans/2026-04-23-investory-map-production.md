# Investory Map — Production Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the single-file localStorage React prototype (`DamaiIMS.jsx`, 1321 lines) into a production-ready, multi-tenant school asset management platform with PostgreSQL, 3-tier RBAC, and a Super Admin HQ dashboard.

**Architecture:** Next.js 14 App Router full-stack monolith with Prisma ORM, PostgreSQL, NextAuth.js v5 for authentication, and S3-compatible object storage for photos/signatures. Multi-tenancy via `schoolId` foreign key on every tenant-scoped table with middleware-enforced isolation. The existing dark-theme UI is preserved and migrated into React components calling API routes instead of localStorage.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Prisma, PostgreSQL, NextAuth.js v5, S3/R2 (file uploads), Vitest (testing)

**Existing Codebase Reference:** The current app is a single file at `DamaiIMS.jsx` containing:
- Lines 1-21: Constants (STATUS_LIST, STATUS_COLORS, TYPE_ICON, FAULT_TYPES, SEV_COLORS, CONDEMNED_SECTION)
- Lines 24-214: RAW_ITEMS (172 items) and INITIAL_SECTIONS data
- Lines 216-224: Helper functions (uid, now, fmtDate, isExpired, expiringSoon, itype, sc, clamp)
- Lines 227-524: App() component — all state, CRUD functions, drag/drop, CSV export, render
- Lines 526-590: SectionsView, ItemChip
- Lines 592-633: ListView
- Lines 635-679: FaultsView
- Lines 681-739: LoansView
- Lines 741-962: DetailPanel, RemarkCommentDisplay, RemarkCommentFields
- Lines 964-1036: MoveModal, FaultModal
- Lines 1038-1109: LoanOutModal, ReturnModal
- Lines 1111-1211: ReportModal, MoveLogModal
- Lines 1213-1321: AddItemModal, ImportModal, SettingsModal

---

## Dependency Graph

```
Task 1 (Scaffold) ──→ Task 2 (DB Schema) ──→ Task 3 (Auth) ──→ Task 4 (Tenant Middleware)
                                                                        │
                           ┌────────────────────────────────────────────┤
                           ↓                    ↓                       ↓
                     Task 5 (Items API)   Task 6 (Sections API)   Task 7 (Faults API)
                           ↓                    ↓                       ↓
                     Task 8 (Loans API)   Task 9 (Move Log API)  Task 10 (Upload API)
                           │                    │                       │
                           └────────────┬───────┘───────────────────────┘
                                        ↓
                              Task 11 (API Client + Auth Context)
                                        ↓
                      ┌─────────────────┤─────────────────┐
                      ↓                 ↓                 ↓
               Task 12 (Shell)   Task 13 (Sections)  Task 14 (List)
                      ↓                 ↓                 ↓
               Task 15 (Faults)  Task 16 (Loans)    Task 17 (Detail)
                      ↓                 ↓                 ↓
               Task 18 (Modals)  Task 19 (Reports)  Task 20 (CSV)
                                        │
                                        ↓
                           Task 21 (Super Admin API)
                                        ↓
                           Task 22 (Super Admin UI)
                                        ↓
                           Task 23 (School Onboarding)
                                        ↓
                           Task 24 (Seed + Migration Script)
```

**Parallelizable groups after Task 4:**
- Tasks 5, 6, 7, 8, 9, 10 (all API routes — independent)
- Tasks 13, 14, 15, 16 (frontend views — independent after Task 12)
- Tasks 21, 22, 23 (super admin — independent of frontend migration)

---

## File Structure

```
investory-map/
├── prisma/
│   ├── schema.prisma                    # Full database schema
│   └── seed.ts                          # Seed script: creates super admin, demo school, imports RAW_ITEMS
├── src/
│   ├── app/
│   │   ├── layout.tsx                   # Root layout: fonts, metadata
│   │   ├── page.tsx                     # Landing redirect → /login or /dashboard
│   │   ├── login/
│   │   │   └── page.tsx                 # Login page
│   │   ├── dashboard/
│   │   │   ├── layout.tsx               # Auth-guarded layout with header
│   │   │   └── page.tsx                 # Main app (migrated from App())
│   │   ├── super-admin/
│   │   │   ├── layout.tsx               # Super admin layout with guard
│   │   │   ├── page.tsx                 # All schools overview
│   │   │   ├── schools/
│   │   │   │   └── [schoolId]/
│   │   │   │       └── page.tsx         # Drill into one school
│   │   │   └── onboard/
│   │   │       └── page.tsx             # New school wizard
│   │   └── api/
│   │       ├── auth/
│   │       │   └── [...nextauth]/
│   │       │       └── route.ts         # NextAuth handler
│   │       ├── items/
│   │       │   ├── route.ts             # GET (list), POST (create)
│   │       │   ├── [itemId]/
│   │       │   │   ├── route.ts         # GET, PUT, DELETE single item
│   │       │   │   ├── faults/
│   │       │   │   │   └── route.ts     # GET, POST faults for item
│   │       │   │   ├── repairs/
│   │       │   │   │   └── route.ts     # GET, POST repairs for item
│   │       │   │   ├── loans/
│   │       │   │   │   └── route.ts     # POST loan-out, POST return
│   │       │   │   └── move/
│   │       │   │       └── route.ts     # POST move item
│   │       ├── sections/
│   │       │   ├── route.ts             # GET, POST sections
│   │       │   └── [sectionId]/
│   │       │       ├── route.ts         # PUT, DELETE section
│   │       │       └── rooms/
│   │       │           └── route.ts     # POST add room, PUT rename, DELETE
│   │       ├── faults/
│   │       │   ├── route.ts             # GET all faults (school-wide)
│   │       │   └── [faultId]/
│   │       │       └── route.ts         # PUT update fault status
│   │       ├── loans/
│   │       │   └── route.ts             # GET all active loans
│   │       ├── move-log/
│   │       │   └── route.ts             # GET move log
│   │       ├── reports/
│   │       │   └── route.ts             # GET summary stats
│   │       ├── upload/
│   │       │   └── route.ts             # POST file upload
│   │       ├── import/
│   │       │   └── route.ts             # POST CSV import
│   │       ├── export/
│   │       │   └── route.ts             # GET CSV export
│   │       └── super-admin/
│   │           ├── schools/
│   │           │   ├── route.ts         # GET all schools, POST create school
│   │           │   └── [schoolId]/
│   │           │       ├── route.ts     # GET school detail + stats
│   │           │       └── users/
│   │           │           └── route.ts # GET, POST manage users
│   │           └── stats/
│   │               └── route.ts         # GET aggregate stats
│   ├── lib/
│   │   ├── prisma.ts                    # Singleton Prisma client
│   │   ├── auth.ts                      # NextAuth config (providers, callbacks)
│   │   ├── auth-guard.ts                # getSession + role-check helpers
│   │   ├── tenant.ts                    # getTenantSchoolId() — extracts schoolId from session
│   │   ├── upload.ts                    # S3 upload/delete helpers
│   │   └── constants.ts                 # Migrated constants from DamaiIMS.jsx lines 1-21
│   ├── middleware.ts                    # Route protection + tenant header injection
│   └── components/
│       ├── Header.tsx                   # App header bar (from App lines 432-443)
│       ├── StatsBar.tsx                 # 9-counter stats row (from App lines 445-463)
│       ├── TabNav.tsx                   # Sections/List/Faults/Loans tabs
│       ├── SectionsView.tsx             # Room grid + drag-drop (lines 526-571)
│       ├── ItemChip.tsx                 # Draggable item card (lines 573-590)
│       ├── ListView.tsx                 # Searchable table (lines 592-633)
│       ├── FaultsView.tsx               # Fault dashboard (lines 635-679)
│       ├── LoansView.tsx                # Person cards (lines 681-739)
│       ├── DetailPanel.tsx              # Floating detail window (lines 741-926)
│       ├── modals/
│       │   ├── MoveModal.tsx            # (lines 965-992)
│       │   ├── FaultModal.tsx           # (lines 994-1036)
│       │   ├── LoanOutModal.tsx         # (lines 1038-1079)
│       │   ├── ReturnModal.tsx          # (lines 1081-1109)
│       │   ├── ReportModal.tsx          # (lines 1111-1184)
│       │   ├── MoveLogModal.tsx         # (lines 1186-1211)
│       │   ├── AddItemModal.tsx         # (lines 1213-1247)
│       │   ├── ImportModal.tsx          # (lines 1249-1271)
│       │   └── SettingsModal.tsx        # (lines 1273-1321)
│       ├── LoginForm.tsx                # Email/password login form
│       ├── Lightbox.tsx                 # Fullscreen photo viewer
│       └── ui/
│           ├── Badge.tsx                # Reusable badge component
│           └── Modal.tsx                # Modal overlay wrapper
├── tests/
│   ├── api/
│   │   ├── items.test.ts
│   │   ├── sections.test.ts
│   │   ├── faults.test.ts
│   │   ├── loans.test.ts
│   │   ├── move-log.test.ts
│   │   ├── auth.test.ts
│   │   └── super-admin.test.ts
│   └── lib/
│       ├── tenant.test.ts
│       └── auth-guard.test.ts
├── package.json
├── tsconfig.json
├── next.config.ts
├── vitest.config.ts
├── .env.example
└── .env.local                           # Local dev secrets (git-ignored)
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `vitest.config.ts`
- Create: `.env.example`
- Create: `.env.local`
- Create: `.gitignore`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`

- [ ] **Step 1: Initialize Next.js project**

Run from the repo root (`/Users/garygoh/Git Projects/Investory-Map`):

```bash
npx create-next-app@latest investory-app --typescript --app --src-dir --no-tailwind --no-eslint --import-alias "@/*"
```

When prompted: use App Router = Yes, Turbopack = Yes.

- [ ] **Step 2: Move scaffold contents to repo root**

```bash
# Move all generated files from investory-app/ into current directory
cp -r investory-app/* investory-app/.* . 2>/dev/null
rm -rf investory-app
```

- [ ] **Step 3: Install dependencies**

```bash
npm install prisma @prisma/client next-auth@5 @auth/prisma-adapter bcryptjs uuid
npm install -D @types/bcryptjs @types/uuid vitest @vitejs/plugin-react
```

- [ ] **Step 4: Create .env.example**

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/investory_map"

# NextAuth
NEXTAUTH_SECRET="generate-a-random-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# File Upload (S3-compatible — use MinIO for local dev)
S3_ENDPOINT="http://localhost:9000"
S3_REGION="us-east-1"
S3_BUCKET="investory-uploads"
S3_ACCESS_KEY="minioadmin"
S3_SECRET_KEY="minioadmin"
```

- [ ] **Step 5: Create .env.local with same values for local dev**

Copy `.env.example` to `.env.local` with actual local values.

```bash
cp .env.example .env.local
```

- [ ] **Step 6: Create vitest.config.ts**

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 7: Update package.json scripts**

Add to `"scripts"` in `package.json`:

```json
{
  "db:generate": "prisma generate",
  "db:push": "prisma db push",
  "db:migrate": "prisma migrate dev",
  "db:seed": "npx tsx prisma/seed.ts",
  "db:studio": "prisma studio",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 8: Update root layout with project fonts**

Write `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Investory Map",
  description: "School Asset Management Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Space+Grotesk:wght@500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, background: "#080b12" }}>{children}</body>
    </html>
  );
}
```

- [ ] **Step 9: Create placeholder root page**

Write `src/app/page.tsx`:

```tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/login");
}
```

- [ ] **Step 10: Verify dev server starts**

```bash
npm run dev
```

Expected: Server starts on http://localhost:3000, redirects to /login (404 is fine — login page comes in Task 3).

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js 14 project with TypeScript, Prisma, NextAuth deps"
```

---

## Task 2: Database Schema

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/prisma.ts`
- Create: `src/lib/constants.ts`

- [ ] **Step 1: Initialize Prisma**

```bash
npx prisma init --datasource-provider postgresql
```

- [ ] **Step 2: Write the full Prisma schema**

Write `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  SUPER_ADMIN
  SCHOOL_ADMIN
  USER
}

model School {
  id        String   @id @default(cuid())
  name      String
  code      String   @unique
  address   String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  users    User[]
  items    Item[]
  sections Section[]
  moveLog  MoveLogEntry[]
  auditLog AuditLogEntry[]
}

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  name         String
  role         Role     @default(USER)
  schoolId     String?
  school       School?  @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model Item {
  id           String    @id @default(cuid())
  schoolId     String
  school       School    @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  label        String
  assetCode    String?
  type         String
  brand        String?
  model        String?
  serial       String?
  locationName String    @default("Spare")
  cost         Decimal?  @db.Decimal(12, 2)
  warrantyEnd  DateTime?
  status       String    @default("Operational")
  statusNote   String?
  loanable     Boolean   @default(false)
  isLoaned     Boolean   @default(false)
  loanedTo     String?
  remark       String?
  comment      String?
  sheet        String?
  prevLocation String?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  faults      Fault[]
  repairs     Repair[]
  moveLog     MoveLogEntry[]
  loanHistory LoanEntry[]

  @@index([schoolId])
  @@index([schoolId, status])
  @@index([schoolId, type])
}

model Section {
  id          String  @id @default(cuid())
  schoolId    String
  school      School  @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  name        String
  sortOrder   Int     @default(0)
  isProtected Boolean @default(false)

  rooms Room[]

  @@unique([schoolId, name])
  @@index([schoolId])
}

model Room {
  id        String  @id @default(cuid())
  sectionId String
  section   Section @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  name      String
  sortOrder Int     @default(0)

  @@unique([sectionId, name])
}

model Fault {
  id          String   @id @default(cuid())
  itemId      String
  item        Item     @relation(fields: [itemId], references: [id], onDelete: Cascade)
  faultType   String
  severity    String   @default("Low")
  status      String   @default("Open")
  description String?
  reportedBy  String?
  resolvedBy  String?
  resolutionNote String?
  photos      String[] @default([])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([itemId])
}

model Repair {
  id           String    @id @default(cuid())
  itemId       String
  item         Item      @relation(fields: [itemId], references: [id], onDelete: Cascade)
  description  String
  startDate    DateTime?
  completeDate DateTime?
  technician   String?
  cost         Decimal?  @db.Decimal(12, 2)
  notes        String?
  createdAt    DateTime  @default(now())

  @@index([itemId])
}

model LoanEntry {
  id             String    @id @default(cuid())
  itemId         String
  item           Item      @relation(fields: [itemId], references: [id], onDelete: Cascade)
  borrowerName   String
  borrowerId     String?
  issuedBy       String?
  expectedReturn DateTime?
  condition      String?
  notes          String?
  signature      String?
  dateOut        DateTime  @default(now())
  dateIn         DateTime?
  receivedBy     String?
  returnLocation String?
  status         String    @default("Active")

  @@index([itemId])
}

model MoveLogEntry {
  id        String   @id @default(cuid())
  schoolId  String
  school    School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  itemId    String
  item      Item     @relation(fields: [itemId], references: [id], onDelete: Cascade)
  itemLabel String
  fromLoc   String
  toLoc     String
  reason    String?
  movedBy   String?
  createdAt DateTime @default(now())

  @@index([schoolId])
  @@index([itemId])
}

model AuditLogEntry {
  id        String   @id @default(cuid())
  schoolId  String
  school    School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  userId    String?
  userName  String?
  action    String
  entity    String
  entityId  String?
  details   Json?
  createdAt DateTime @default(now())

  @@index([schoolId])
}
```

- [ ] **Step 3: Create Prisma singleton**

Write `src/lib/prisma.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 4: Migrate constants from DamaiIMS.jsx**

Write `src/lib/constants.ts`:

```typescript
export const STATUS_LIST = [
  "Operational",
  "Spare",
  "Waiting for Condemnation",
  "Others",
] as const;

export const STATUS_COLORS: Record<
  string,
  { bg: string; border: string; text: string; badge: string }
> = {
  Operational: {
    bg: "#052e16",
    border: "#16a34a",
    text: "#4ade80",
    badge: "#14532d",
  },
  Spare: {
    bg: "#1e1b4b",
    border: "#6366f1",
    text: "#a5b4fc",
    badge: "#312e81",
  },
  "Waiting for Condemnation": {
    bg: "#450a0a",
    border: "#dc2626",
    text: "#fca5a5",
    badge: "#7f1d1d",
  },
  Others: {
    bg: "#1c1917",
    border: "#78716c",
    text: "#d4d0cb",
    badge: "#44403c",
  },
  "Under Maintenance": {
    bg: "#422006",
    border: "#f59e0b",
    text: "#fcd34d",
    badge: "#78350f",
  },
  Faulty: {
    bg: "#450a0a",
    border: "#ef4444",
    text: "#fca5a5",
    badge: "#7f1d1d",
  },
};

export const TYPE_ICON: Record<string, string> = {
  Projector: "📽",
  Visualiser: "📷",
  PatchPanel: "🔌",
  iPad: "📱",
  "iPad Cart": "🛒",
  "Portable HD": "💾",
  MIC: "🎤",
  DSLR: "📸",
  Monitor: "🖥",
  PRINTER: "🖨",
  "Mobile Charging Cart": "🔋",
  "S-Max": "📱",
  "Old iPAD": "📱",
  "Owned iPAD": "📱",
  DESKTOP: "💻",
  Camera: "📸",
  IPAD: "📱",
  default: "📦",
};

export const FAULT_TYPES = [
  "Lamp burnt out",
  "No display",
  "Colour distortion",
  "Overheating",
  "No power",
  "Remote not working",
  "Lens issue",
  "Fan noise",
  "Connection error",
  "Physical damage",
  "Other",
] as const;

export const SEV_COLORS: Record<string, { bg: string; text: string }> = {
  Low: { bg: "#14532d", text: "#4ade80" },
  Medium: { bg: "#78350f", text: "#fcd34d" },
  High: { bg: "#7c2d12", text: "#fb923c" },
  Critical: { bg: "#7f1d1d", text: "#fca5a5" },
};

export const CONDEMNED_SECTION = "Condemned / Pending Disposal";

export function getTypeIcon(type: string): string {
  return TYPE_ICON[type] || TYPE_ICON.default;
}

export function getStatusColor(status: string) {
  return STATUS_COLORS[status] || STATUS_COLORS.Others;
}

export function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-SG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function isExpired(d: string | Date | null | undefined): boolean {
  if (!d) return false;
  return new Date(d) < new Date();
}

export function expiringSoon(d: string | Date | null | undefined): boolean {
  if (!d) return false;
  const diff =
    (new Date(d).getTime() - new Date().getTime()) / (86400 * 1000);
  return diff > 0 && diff < 90;
}
```

- [ ] **Step 5: Push schema to database**

```bash
npx prisma db push
```

Expected: All tables created successfully.

- [ ] **Step 6: Generate Prisma client**

```bash
npx prisma generate
```

Expected: Prisma Client generated.

- [ ] **Step 7: Verify with Prisma Studio**

```bash
npx prisma studio
```

Expected: Opens browser showing all tables (School, User, Item, Section, Room, Fault, Repair, LoanEntry, MoveLogEntry, AuditLogEntry) — all empty.

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma src/lib/prisma.ts src/lib/constants.ts
git commit -m "feat: add Prisma schema with multi-tenant data model and migrated constants"
```

---

## Task 3: Authentication (NextAuth.js v5)

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/lib/auth-guard.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/app/login/page.tsx`
- Create: `src/components/LoginForm.tsx`
- Create: `src/middleware.ts`
- Test: `tests/lib/auth-guard.test.ts`

- [ ] **Step 1: Write the failing test for auth-guard**

Write `tests/lib/auth-guard.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { canAccess } from "@/lib/auth-guard";

describe("canAccess", () => {
  it("allows SUPER_ADMIN to access any school", () => {
    expect(
      canAccess({ role: "SUPER_ADMIN", schoolId: null }, "school_123")
    ).toBe(true);
  });

  it("allows SCHOOL_ADMIN to access their own school", () => {
    expect(
      canAccess(
        { role: "SCHOOL_ADMIN", schoolId: "school_123" },
        "school_123"
      )
    ).toBe(true);
  });

  it("blocks SCHOOL_ADMIN from accessing another school", () => {
    expect(
      canAccess(
        { role: "SCHOOL_ADMIN", schoolId: "school_123" },
        "school_456"
      )
    ).toBe(false);
  });

  it("allows USER to access their own school", () => {
    expect(
      canAccess({ role: "USER", schoolId: "school_123" }, "school_123")
    ).toBe(true);
  });

  it("blocks USER from accessing another school", () => {
    expect(
      canAccess({ role: "USER", schoolId: "school_123" }, "school_456")
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/lib/auth-guard.test.ts
```

Expected: FAIL — `canAccess` not found.

- [ ] **Step 3: Write auth-guard implementation**

Write `src/lib/auth-guard.ts`:

```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Role } from "@prisma/client";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  schoolId: string | null;
};

export function canAccess(
  user: { role: Role | string; schoolId: string | null },
  targetSchoolId: string
): boolean {
  if (user.role === "SUPER_ADMIN") return true;
  return user.schoolId === targetSchoolId;
}

export function isAdmin(role: Role | string): boolean {
  return role === "SUPER_ADMIN" || role === "SCHOOL_ADMIN";
}

export function isSuperAdmin(role: Role | string): boolean {
  return role === "SUPER_ADMIN";
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session.user as SessionUser;
}

export async function requireSession(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireSession();
  if (!isAdmin(user.role)) throw new Error("Forbidden");
  return user;
}

export async function requireSuperAdmin(): Promise<SessionUser> {
  const user = await requireSession();
  if (!isSuperAdmin(user.role)) throw new Error("Forbidden");
  return user;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/lib/auth-guard.test.ts
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Write NextAuth configuration**

Write `src/lib/auth.ts`:

```typescript
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { school: true },
        });

        if (!user) return null;

        const isValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          schoolId: user.schoolId,
          schoolName: user.school?.name || null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.schoolId = (user as any).schoolId;
        token.schoolName = (user as any).schoolName;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).schoolId = token.schoolId;
        (session.user as any).schoolName = token.schoolName;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
};
```

- [ ] **Step 6: Create NextAuth route handler**

Write `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

- [ ] **Step 7: Create route protection middleware**

Write `src/middleware.ts`:

```typescript
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    if (path.startsWith("/super-admin") && token?.role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/super-admin/:path*", "/api/((?!auth).*)"],
};
```

- [ ] **Step 8: Create LoginForm component**

Write `src/components/LoginForm.tsx`:

```tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#080b12",
        fontFamily: "'DM Mono','Courier New',monospace",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: "#0d1117",
          border: "1px solid #1e2432",
          borderRadius: 12,
          padding: 32,
          width: "min(400px, 90vw)",
        }}
      >
        <div
          style={{
            fontFamily: "'Space Grotesk',sans-serif",
            fontWeight: 600,
            fontSize: 20,
            color: "#818cf8",
            marginBottom: 4,
            textAlign: "center",
          }}
        >
          ◈ Investory Map
        </div>
        <div
          style={{
            fontSize: 11,
            color: "#4b5563",
            textAlign: "center",
            marginBottom: 24,
          }}
        >
          School Asset Management
        </div>

        {error && (
          <div
            style={{
              background: "#7f1d1d",
              border: "1px solid #ef4444",
              borderRadius: 6,
              padding: "8px 12px",
              color: "#fca5a5",
              fontSize: 12,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label
            style={{
              fontSize: 10,
              color: "#4b5563",
              display: "block",
              marginBottom: 4,
            }}
          >
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              background: "#080b12",
              border: "1px solid #2d3748",
              color: "#e2e8f0",
              borderRadius: 5,
              padding: "9px 12px",
              fontFamily: "inherit",
              fontSize: 13,
              width: "100%",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label
            style={{
              fontSize: 10,
              color: "#4b5563",
              display: "block",
              marginBottom: 4,
            }}
          >
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              background: "#080b12",
              border: "1px solid #2d3748",
              color: "#e2e8f0",
              borderRadius: 5,
              padding: "9px 12px",
              fontFamily: "inherit",
              fontSize: 13,
              width: "100%",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            background: "#3730a3",
            border: "1px solid #6366f1",
            color: "#fff",
            padding: "10px 16px",
            borderRadius: 6,
            cursor: loading ? "wait" : "pointer",
            fontFamily: "inherit",
            fontSize: 13,
            fontWeight: 500,
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 9: Create login page**

Write `src/app/login/page.tsx`:

```tsx
import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
  return <LoginForm />;
}
```

- [ ] **Step 10: Commit**

```bash
git add src/lib/auth.ts src/lib/auth-guard.ts src/app/api/auth src/middleware.ts src/app/login src/components/LoginForm.tsx tests/lib/auth-guard.test.ts
git commit -m "feat: add NextAuth.js authentication with credentials provider and RBAC guards"
```

---

## Task 4: Tenant Isolation Middleware

**Files:**
- Create: `src/lib/tenant.ts`
- Test: `tests/lib/tenant.test.ts`

- [ ] **Step 1: Write failing test**

Write `tests/lib/tenant.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { resolveSchoolId } from "@/lib/tenant";

describe("resolveSchoolId", () => {
  it("returns schoolId for SCHOOL_ADMIN", () => {
    const result = resolveSchoolId({
      role: "SCHOOL_ADMIN",
      schoolId: "sch_123",
    });
    expect(result).toBe("sch_123");
  });

  it("returns schoolId for USER", () => {
    const result = resolveSchoolId({
      role: "USER",
      schoolId: "sch_456",
    });
    expect(result).toBe("sch_456");
  });

  it("throws for SUPER_ADMIN without explicit schoolId", () => {
    expect(() =>
      resolveSchoolId({ role: "SUPER_ADMIN", schoolId: null })
    ).toThrow("schoolId required");
  });

  it("returns explicit schoolId for SUPER_ADMIN when provided", () => {
    const result = resolveSchoolId(
      { role: "SUPER_ADMIN", schoolId: null },
      "sch_789"
    );
    expect(result).toBe("sch_789");
  });

  it("throws for USER without schoolId", () => {
    expect(() =>
      resolveSchoolId({ role: "USER", schoolId: null })
    ).toThrow("User has no school");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/lib/tenant.test.ts
```

Expected: FAIL — `resolveSchoolId` not found.

- [ ] **Step 3: Write tenant resolution implementation**

Write `src/lib/tenant.ts`:

```typescript
import { Role } from "@prisma/client";

type UserContext = {
  role: Role | string;
  schoolId: string | null;
};

export function resolveSchoolId(
  user: UserContext,
  explicitSchoolId?: string
): string {
  if (user.role === "SUPER_ADMIN") {
    if (explicitSchoolId) return explicitSchoolId;
    throw new Error("schoolId required for super admin operations");
  }

  if (!user.schoolId) {
    throw new Error("User has no school assigned");
  }

  return user.schoolId;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/lib/tenant.test.ts
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tenant.ts tests/lib/tenant.test.ts
git commit -m "feat: add tenant resolution with schoolId isolation"
```

---

## Task 5: Items API

**Files:**
- Create: `src/app/api/items/route.ts`
- Create: `src/app/api/items/[itemId]/route.ts`
- Create: `src/app/api/items/[itemId]/move/route.ts`
- Test: `tests/api/items.test.ts`

- [ ] **Step 1: Write failing test for items list endpoint**

Write `tests/api/items.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth-guard", () => ({
  requireSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    item: {
      findMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    moveLogEntry: {
      create: vi.fn(),
    },
  },
}));

import { requireSession } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { GET, POST } from "@/app/api/items/route";

describe("GET /api/items", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns items scoped to user school", async () => {
    (requireSession as any).mockResolvedValue({
      id: "user1",
      role: "SCHOOL_ADMIN",
      schoolId: "sch_1",
    });

    const mockItems = [
      {
        id: "item1",
        schoolId: "sch_1",
        label: "P01",
        type: "Projector",
        status: "Operational",
        faults: [],
        repairs: [],
        loanHistory: [],
        moveLog: [],
      },
    ];

    (prisma.item.findMany as any).mockResolvedValue(mockItems);

    const req = new Request("http://localhost/api/items");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].label).toBe("P01");
    expect(prisma.item.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { schoolId: "sch_1" },
      })
    );
  });
});

describe("POST /api/items", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects USER role from creating items", async () => {
    (requireSession as any).mockResolvedValue({
      id: "user1",
      role: "USER",
      schoolId: "sch_1",
    });

    const req = new Request("http://localhost/api/items", {
      method: "POST",
      body: JSON.stringify({ label: "P01", type: "Projector" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(403);
  });

  it("allows SCHOOL_ADMIN to create items", async () => {
    (requireSession as any).mockResolvedValue({
      id: "user1",
      role: "SCHOOL_ADMIN",
      schoolId: "sch_1",
    });

    const mockItem = {
      id: "item_new",
      schoolId: "sch_1",
      label: "New Projector",
      type: "Projector",
    };
    (prisma.item.create as any).mockResolvedValue(mockItem);

    const req = new Request("http://localhost/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: "New Projector",
        type: "Projector",
        brand: "Epson",
        locationName: "HALL",
      }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.label).toBe("New Projector");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/api/items.test.ts
```

Expected: FAIL — modules not found.

- [ ] **Step 3: Implement GET and POST /api/items**

Write `src/app/api/items/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isAdmin } from "@/lib/auth-guard";
import { resolveSchoolId } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    const user = await requireSession();
    const schoolId = resolveSchoolId(
      user,
      req.nextUrl.searchParams.get("schoolId") || undefined
    );

    const items = await prisma.item.findMany({
      where: { schoolId },
      include: {
        faults: { orderBy: { createdAt: "desc" } },
        repairs: { orderBy: { createdAt: "desc" } },
        loanHistory: { orderBy: { dateOut: "desc" } },
        moveLog: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { label: "asc" },
    });

    return NextResponse.json(items);
  } catch (e: any) {
    if (e.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireSession();

    if (!isAdmin(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const schoolId = resolveSchoolId(
      user,
      req.nextUrl.searchParams.get("schoolId") || undefined
    );
    const body = await req.json();

    const item = await prisma.item.create({
      data: {
        schoolId,
        label: body.label,
        assetCode: body.assetCode || null,
        type: body.type || "Projector",
        brand: body.brand || null,
        model: body.model || null,
        serial: body.serial || null,
        locationName: body.locationName || "Spare",
        cost: body.cost ? parseFloat(body.cost) : null,
        warrantyEnd: body.warrantyEnd ? new Date(body.warrantyEnd) : null,
        status: body.status || "Operational",
        statusNote: body.statusNote || null,
        loanable: body.loanable || false,
        remark: body.remark || null,
        comment: body.comment || null,
        sheet: body.sheet || null,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (e: any) {
    if (e.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (e.message === "Forbidden")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
```

- [ ] **Step 4: Implement single-item CRUD /api/items/[itemId]**

Write `src/app/api/items/[itemId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isAdmin, canAccess } from "@/lib/auth-guard";
import { CONDEMNED_SECTION } from "@/lib/constants";

type Params = { params: Promise<{ itemId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = await requireSession();
    const { itemId } = await params;

    const item = await prisma.item.findFirst({
      where: { id: itemId },
      include: {
        faults: { orderBy: { createdAt: "desc" } },
        repairs: { orderBy: { createdAt: "desc" } },
        loanHistory: { orderBy: { dateOut: "desc" } },
        moveLog: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!canAccess(user, item.schoolId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(item);
  } catch (e: any) {
    if (e.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const user = await requireSession();
    if (!isAdmin(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { itemId } = await params;
    const existing = await prisma.item.findFirst({ where: { id: itemId } });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!canAccess(user, existing.schoolId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const data: any = {};

    const fields = [
      "label",
      "assetCode",
      "type",
      "brand",
      "model",
      "serial",
      "locationName",
      "status",
      "statusNote",
      "loanable",
      "isLoaned",
      "loanedTo",
      "remark",
      "comment",
      "sheet",
    ];
    for (const f of fields) {
      if (body[f] !== undefined) data[f] = body[f];
    }
    if (body.cost !== undefined)
      data.cost = body.cost ? parseFloat(body.cost) : null;
    if (body.warrantyEnd !== undefined)
      data.warrantyEnd = body.warrantyEnd
        ? new Date(body.warrantyEnd)
        : null;

    // Auto-route condemned
    if (
      data.status === "Waiting for Condemnation" &&
      existing.locationName !== CONDEMNED_SECTION
    ) {
      data.prevLocation = existing.locationName;
      data.locationName = CONDEMNED_SECTION;
    }
    if (
      data.status &&
      data.status !== "Waiting for Condemnation" &&
      existing.status === "Waiting for Condemnation"
    ) {
      data.locationName = existing.prevLocation || "Spare";
      data.prevLocation = null;
    }

    const item = await prisma.item.update({
      where: { id: itemId },
      data,
      include: {
        faults: { orderBy: { createdAt: "desc" } },
        repairs: { orderBy: { createdAt: "desc" } },
        loanHistory: { orderBy: { dateOut: "desc" } },
        moveLog: { orderBy: { createdAt: "desc" } },
      },
    });

    return NextResponse.json(item);
  } catch (e: any) {
    if (e.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const user = await requireSession();
    if (!isAdmin(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { itemId } = await params;
    const existing = await prisma.item.findFirst({ where: { id: itemId } });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!canAccess(user, existing.schoolId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.item.delete({ where: { id: itemId } });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
```

- [ ] **Step 5: Implement move endpoint**

Write `src/app/api/items/[itemId]/move/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, canAccess } from "@/lib/auth-guard";

type Params = { params: Promise<{ itemId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await requireSession();
    const { itemId } = await params;
    const body = await req.json();

    const item = await prisma.item.findFirst({ where: { id: itemId } });
    if (!item)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!canAccess(user, item.schoolId))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const [updated, logEntry] = await prisma.$transaction([
      prisma.item.update({
        where: { id: itemId },
        data: { locationName: body.toLocation },
      }),
      prisma.moveLogEntry.create({
        data: {
          schoolId: item.schoolId,
          itemId,
          itemLabel: item.label,
          fromLoc: item.locationName,
          toLoc: body.toLocation,
          reason: body.reason || null,
          movedBy: body.movedBy || user.name,
        },
      }),
    ]);

    return NextResponse.json({ item: updated, logEntry });
  } catch (e: any) {
    if (e.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
```

- [ ] **Step 6: Run tests**

```bash
npx vitest run tests/api/items.test.ts
```

Expected: All tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/items tests/api/items.test.ts
git commit -m "feat: add items CRUD API with tenant-scoped queries and move endpoint"
```

---

## Task 6: Sections & Rooms API

**Files:**
- Create: `src/app/api/sections/route.ts`
- Create: `src/app/api/sections/[sectionId]/route.ts`
- Create: `src/app/api/sections/[sectionId]/rooms/route.ts`

- [ ] **Step 1: Implement sections list and create**

Write `src/app/api/sections/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isAdmin } from "@/lib/auth-guard";
import { resolveSchoolId } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    const user = await requireSession();
    const schoolId = resolveSchoolId(
      user,
      req.nextUrl.searchParams.get("schoolId") || undefined
    );

    const sections = await prisma.section.findMany({
      where: { schoolId },
      include: { rooms: { orderBy: { sortOrder: "asc" } } },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(sections);
  } catch (e: any) {
    if (e.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireSession();
    if (!isAdmin(user.role))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const schoolId = resolveSchoolId(user);
    const body = await req.json();

    const maxOrder = await prisma.section.aggregate({
      where: { schoolId },
      _max: { sortOrder: true },
    });

    const section = await prisma.section.create({
      data: {
        schoolId,
        name: body.name,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
        isProtected: body.isProtected || false,
      },
      include: { rooms: true },
    });

    return NextResponse.json(section, { status: 201 });
  } catch (e: any) {
    if (e.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Implement single section update and delete**

Write `src/app/api/sections/[sectionId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isAdmin, canAccess } from "@/lib/auth-guard";

type Params = { params: Promise<{ sectionId: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const user = await requireSession();
    if (!isAdmin(user.role))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { sectionId } = await params;
    const section = await prisma.section.findFirst({
      where: { id: sectionId },
    });
    if (!section)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!canAccess(user, section.schoolId))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const oldName = section.name;

    const updated = await prisma.section.update({
      where: { id: sectionId },
      data: {
        name: body.name ?? section.name,
        sortOrder: body.sortOrder ?? section.sortOrder,
      },
      include: { rooms: true },
    });

    // Update item locations if section was renamed
    if (body.name && body.name !== oldName) {
      await prisma.item.updateMany({
        where: { schoolId: section.schoolId, locationName: oldName },
        data: { locationName: body.name },
      });
    }

    return NextResponse.json(updated);
  } catch (e: any) {
    if (e.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const user = await requireSession();
    if (!isAdmin(user.role))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { sectionId } = await params;
    const section = await prisma.section.findFirst({
      where: { id: sectionId },
      include: { rooms: true },
    });
    if (!section)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!canAccess(user, section.schoolId))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (section.isProtected)
      return NextResponse.json(
        { error: "Cannot delete protected section" },
        { status: 400 }
      );

    // Move items in this section's rooms to "Spare"
    const roomNames = section.rooms.map((r) => r.name);
    if (roomNames.length > 0) {
      await prisma.item.updateMany({
        where: {
          schoolId: section.schoolId,
          locationName: { in: roomNames },
        },
        data: { locationName: "Spare" },
      });
    }

    await prisma.section.delete({ where: { id: sectionId } });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Implement rooms management**

Write `src/app/api/sections/[sectionId]/rooms/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isAdmin, canAccess } from "@/lib/auth-guard";

type Params = { params: Promise<{ sectionId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await requireSession();
    if (!isAdmin(user.role))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { sectionId } = await params;
    const section = await prisma.section.findFirst({
      where: { id: sectionId },
    });
    if (!section)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!canAccess(user, section.schoolId))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();

    const maxOrder = await prisma.room.aggregate({
      where: { sectionId },
      _max: { sortOrder: true },
    });

    const room = await prisma.room.create({
      data: {
        sectionId,
        name: body.name,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });

    return NextResponse.json(room, { status: 201 });
  } catch (e: any) {
    if (e.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const user = await requireSession();
    if (!isAdmin(user.role))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { sectionId } = await params;
    const body = await req.json();

    const section = await prisma.section.findFirst({
      where: { id: sectionId },
    });
    if (!section)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!canAccess(user, section.schoolId))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const room = await prisma.room.findFirst({
      where: { id: body.roomId, sectionId },
    });
    if (!room)
      return NextResponse.json({ error: "Room not found" }, { status: 404 });

    const oldName = room.name;
    const updated = await prisma.room.update({
      where: { id: body.roomId },
      data: {
        name: body.name ?? room.name,
        sortOrder: body.sortOrder ?? room.sortOrder,
      },
    });

    if (body.name && body.name !== oldName) {
      await prisma.item.updateMany({
        where: { schoolId: section.schoolId, locationName: oldName },
        data: { locationName: body.name },
      });
    }

    return NextResponse.json(updated);
  } catch (e: any) {
    if (e.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const user = await requireSession();
    if (!isAdmin(user.role))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { sectionId } = await params;
    const body = await req.json();

    const section = await prisma.section.findFirst({
      where: { id: sectionId },
    });
    if (!section)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!canAccess(user, section.schoolId))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const room = await prisma.room.findFirst({
      where: { id: body.roomId, sectionId },
    });
    if (!room)
      return NextResponse.json({ error: "Room not found" }, { status: 404 });

    await prisma.item.updateMany({
      where: { schoolId: section.schoolId, locationName: room.name },
      data: { locationName: "Spare" },
    });

    await prisma.room.delete({ where: { id: body.roomId } });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/sections
git commit -m "feat: add sections and rooms CRUD API with tenant isolation"
```

---

## Task 7: Faults API

**Files:**
- Create: `src/app/api/items/[itemId]/faults/route.ts`
- Create: `src/app/api/faults/route.ts`
- Create: `src/app/api/faults/[faultId]/route.ts`

- [ ] **Step 1: Implement item-scoped faults endpoint**

Write `src/app/api/items/[itemId]/faults/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, canAccess } from "@/lib/auth-guard";

type Params = { params: Promise<{ itemId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await requireSession();
    const { itemId } = await params;

    const item = await prisma.item.findFirst({ where: { id: itemId } });
    if (!item)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!canAccess(user, item.schoolId))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();

    const fault = await prisma.fault.create({
      data: {
        itemId,
        faultType: body.faultType,
        severity: body.severity || "Medium",
        description: body.description || null,
        reportedBy: body.reportedBy || user.name,
        photos: body.photos || [],
      },
    });

    // Auto-escalate item status based on severity
    const newStatus = ["High", "Critical"].includes(body.severity)
      ? "Faulty"
      : item.status === "Operational"
        ? "Under Maintenance"
        : item.status;

    if (newStatus !== item.status) {
      await prisma.item.update({
        where: { id: itemId },
        data: { status: newStatus },
      });
    }

    return NextResponse.json(fault, { status: 201 });
  } catch (e: any) {
    if (e.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Implement school-wide faults dashboard endpoint**

Write `src/app/api/faults/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-guard";
import { resolveSchoolId } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    const user = await requireSession();
    const schoolId = resolveSchoolId(
      user,
      req.nextUrl.searchParams.get("schoolId") || undefined
    );

    const faults = await prisma.fault.findMany({
      where: { item: { schoolId } },
      include: {
        item: {
          select: {
            id: true,
            label: true,
            locationName: true,
            type: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(faults);
  } catch (e: any) {
    if (e.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Implement fault status update**

Write `src/app/api/faults/[faultId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, canAccess } from "@/lib/auth-guard";

type Params = { params: Promise<{ faultId: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const user = await requireSession();
    const { faultId } = await params;

    const fault = await prisma.fault.findFirst({
      where: { id: faultId },
      include: { item: true },
    });
    if (!fault)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!canAccess(user, fault.item.schoolId))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const updated = await prisma.fault.update({
      where: { id: faultId },
      data: {
        status: body.status ?? fault.status,
        resolvedBy: body.resolvedBy ?? fault.resolvedBy,
        resolutionNote: body.resolutionNote ?? fault.resolutionNote,
      },
    });

    // If all faults on item are resolved, revert to Operational
    if (body.status === "Resolved") {
      const openFaults = await prisma.fault.count({
        where: { itemId: fault.itemId, status: { not: "Resolved" } },
      });
      if (openFaults === 0) {
        await prisma.item.update({
          where: { id: fault.itemId },
          data: { status: "Operational" },
        });
      }
    }

    return NextResponse.json(updated);
  } catch (e: any) {
    if (e.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/items/*/faults src/app/api/faults
git commit -m "feat: add faults API with auto-escalation and school-wide dashboard"
```

---

## Task 8: Loans API

**Files:**
- Create: `src/app/api/items/[itemId]/loans/route.ts`
- Create: `src/app/api/loans/route.ts`

- [ ] **Step 1: Implement loan-out and return**

Write `src/app/api/items/[itemId]/loans/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, canAccess } from "@/lib/auth-guard";

type Params = { params: Promise<{ itemId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await requireSession();
    const { itemId } = await params;
    const body = await req.json();

    const item = await prisma.item.findFirst({ where: { id: itemId } });
    if (!item)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!canAccess(user, item.schoolId))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    if (body.action === "loan-out") {
      const [updatedItem, loanEntry] = await prisma.$transaction([
        prisma.item.update({
          where: { id: itemId },
          data: {
            isLoaned: true,
            loanedTo: body.borrowerName,
            locationName: body.borrowerName,
          },
        }),
        prisma.loanEntry.create({
          data: {
            itemId,
            borrowerName: body.borrowerName,
            borrowerId: body.borrowerId || null,
            issuedBy: body.issuedBy || user.name,
            expectedReturn: body.expectedReturn
              ? new Date(body.expectedReturn)
              : null,
            notes: body.notes || null,
            signature: body.signature || null,
          },
        }),
      ]);

      return NextResponse.json({ item: updatedItem, loan: loanEntry });
    }

    if (body.action === "return") {
      const activeLoan = await prisma.loanEntry.findFirst({
        where: { itemId, status: "Active" },
        orderBy: { dateOut: "desc" },
      });

      const updates: any[] = [
        prisma.item.update({
          where: { id: itemId },
          data: {
            isLoaned: false,
            loanedTo: null,
            locationName: body.returnLocation || "Spare",
          },
        }),
      ];

      if (activeLoan) {
        updates.push(
          prisma.loanEntry.update({
            where: { id: activeLoan.id },
            data: {
              status: "Returned",
              dateIn: new Date(),
              receivedBy: body.receivedBy || user.name,
              condition: body.condition || "Good",
              returnLocation: body.returnLocation || "Spare",
            },
          })
        );
      }

      const results = await prisma.$transaction(updates);
      return NextResponse.json({ item: results[0] });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e: any) {
    if (e.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Implement school-wide loans list**

Write `src/app/api/loans/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-guard";
import { resolveSchoolId } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    const user = await requireSession();
    const schoolId = resolveSchoolId(
      user,
      req.nextUrl.searchParams.get("schoolId") || undefined
    );

    const loanedItems = await prisma.item.findMany({
      where: { schoolId, isLoaned: true },
      include: {
        loanHistory: {
          where: { status: "Active" },
          orderBy: { dateOut: "desc" },
          take: 1,
        },
      },
      orderBy: { loanedTo: "asc" },
    });

    return NextResponse.json(loanedItems);
  } catch (e: any) {
    if (e.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/items/*/loans src/app/api/loans
git commit -m "feat: add loans API with loan-out, return, and school-wide list"
```

---

## Task 9: Repairs & Move Log API

**Files:**
- Create: `src/app/api/items/[itemId]/repairs/route.ts`
- Create: `src/app/api/move-log/route.ts`

- [ ] **Step 1: Implement repairs endpoint**

Write `src/app/api/items/[itemId]/repairs/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, canAccess } from "@/lib/auth-guard";

type Params = { params: Promise<{ itemId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await requireSession();
    const { itemId } = await params;

    const item = await prisma.item.findFirst({ where: { id: itemId } });
    if (!item)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!canAccess(user, item.schoolId))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const repair = await prisma.repair.create({
      data: {
        itemId,
        description: body.description,
        startDate: body.startDate ? new Date(body.startDate) : null,
        completeDate: body.completeDate ? new Date(body.completeDate) : null,
        technician: body.technician || null,
        cost: body.cost ? parseFloat(body.cost) : null,
        notes: body.notes || null,
      },
    });

    return NextResponse.json(repair, { status: 201 });
  } catch (e: any) {
    if (e.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Implement move log endpoint**

Write `src/app/api/move-log/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-guard";
import { resolveSchoolId } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    const user = await requireSession();
    const schoolId = resolveSchoolId(
      user,
      req.nextUrl.searchParams.get("schoolId") || undefined
    );

    const log = await prisma.moveLogEntry.findMany({
      where: { schoolId },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    return NextResponse.json(log);
  } catch (e: any) {
    if (e.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/items/*/repairs src/app/api/move-log
git commit -m "feat: add repairs and move-log API endpoints"
```

---

## Task 10: File Upload API

**Files:**
- Create: `src/lib/upload.ts`
- Create: `src/app/api/upload/route.ts`

- [ ] **Step 1: Create upload helper**

Write `src/lib/upload.ts`:

```typescript
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

const s3 = new S3Client({
  region: process.env.S3_REGION || "us-east-1",
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || "",
    secretAccessKey: process.env.S3_SECRET_KEY || "",
  },
});

const BUCKET = process.env.S3_BUCKET || "investory-uploads";

export async function uploadFile(
  buffer: Buffer,
  contentType: string,
  folder: string = "photos"
): Promise<string> {
  const ext = contentType.split("/")[1] || "bin";
  const key = `${folder}/${uuidv4()}.${ext}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  return `${process.env.S3_ENDPOINT}/${BUCKET}/${key}`;
}

export async function deleteFile(url: string): Promise<void> {
  const key = url.split(`/${BUCKET}/`)[1];
  if (!key) return;

  await s3.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  );
}
```

- [ ] **Step 2: Create upload route**

Write `src/app/api/upload/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-guard";
import { uploadFile } from "@/lib/upload";

export async function POST(req: NextRequest) {
  try {
    await requireSession();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large (max 5MB)" },
        { status: 400 }
      );
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const folder = (formData.get("folder") as string) || "photos";
    const url = await uploadFile(buffer, file.type, folder);

    return NextResponse.json({ url });
  } catch (e: any) {
    if (e.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Install S3 SDK**

```bash
npm install @aws-sdk/client-s3
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/upload.ts src/app/api/upload
git commit -m "feat: add S3-compatible file upload API for photos and signatures"
```

---

## Task 11: CSV Import/Export & Reports API

**Files:**
- Create: `src/app/api/import/route.ts`
- Create: `src/app/api/export/route.ts`
- Create: `src/app/api/reports/route.ts`

- [ ] **Step 1: Implement CSV import endpoint**

Write `src/app/api/import/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, isAdmin } from "@/lib/auth-guard";
import { resolveSchoolId } from "@/lib/tenant";

export async function POST(req: NextRequest) {
  try {
    const user = await requireSession();
    if (!isAdmin(user.role))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const schoolId = resolveSchoolId(user);
    const body = await req.json();
    const rows: any[] = body.items;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 });
    }

    const created = await prisma.item.createMany({
      data: rows.map((r: any) => ({
        schoolId,
        label: r.label || "Unnamed",
        assetCode: r.assetCode || null,
        type: r.type || "Projector",
        brand: r.brand || null,
        model: r.model || null,
        serial: r.serial || null,
        locationName: r.location || r.locationName || "Spare",
        cost: r.cost ? parseFloat(r.cost) : null,
        warrantyEnd: r.warrantyEnd ? new Date(r.warrantyEnd) : null,
        status: r.status || "Operational",
        loanable: r.loanable === true || r.loanable === "Yes",
        remark: r.remark || null,
        comment: r.comment || null,
      })),
    });

    return NextResponse.json({ imported: created.count }, { status: 201 });
  } catch (e: any) {
    if (e.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Implement CSV export endpoint**

Write `src/app/api/export/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-guard";
import { resolveSchoolId } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    const user = await requireSession();
    const schoolId = resolveSchoolId(
      user,
      req.nextUrl.searchParams.get("schoolId") || undefined
    );

    const items = await prisma.item.findMany({
      where: { schoolId },
      include: {
        faults: { where: { status: { not: "Resolved" } } },
        repairs: true,
      },
      orderBy: { label: "asc" },
    });

    const headers = [
      "ID", "Label", "AssetCode", "Type", "Brand", "Model", "Serial",
      "Location", "Cost", "WarrantyEnd", "Status", "Loanable", "LoanedTo",
      "Remark", "Comment", "OpenFaults", "Repairs",
    ];

    const rows = items.map((i) => [
      i.id, i.label, i.assetCode || "", i.type, i.brand || "", i.model || "",
      i.serial || "", i.locationName, i.cost?.toString() || "",
      i.warrantyEnd?.toISOString().slice(0, 10) || "", i.status,
      i.loanable ? "Yes" : "No", i.loanedTo || "", i.remark || "",
      i.comment || "", i.faults.length.toString(), i.repairs.length.toString(),
    ]);

    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="InvestoryMap_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (e: any) {
    if (e.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Implement reports summary endpoint**

Write `src/app/api/reports/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-guard";
import { resolveSchoolId } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    const user = await requireSession();
    const schoolId = resolveSchoolId(
      user,
      req.nextUrl.searchParams.get("schoolId") || undefined
    );

    const [items, openFaults] = await Promise.all([
      prisma.item.findMany({
        where: { schoolId },
        select: {
          id: true,
          type: true,
          brand: true,
          status: true,
          isLoaned: true,
          warrantyEnd: true,
          label: true,
          model: true,
          locationName: true,
        },
      }),
      prisma.fault.count({
        where: { item: { schoolId }, status: { not: "Resolved" } },
      }),
    ]);

    const now = new Date();
    const stats = {
      total: items.length,
      operational: items.filter((i) => i.status === "Operational").length,
      faulty: items.filter((i) => i.status === "Faulty").length,
      maintenance: items.filter((i) => i.status === "Under Maintenance").length,
      condemned: items.filter((i) => i.status === "Waiting for Condemnation").length,
      loaned: items.filter((i) => i.isLoaned).length,
      openFaults,
      warrantyExpired: items.filter(
        (i) => i.warrantyEnd && i.warrantyEnd < now
      ).length,
      expiringSoon: items.filter((i) => {
        if (!i.warrantyEnd) return false;
        const diff = (i.warrantyEnd.getTime() - now.getTime()) / 86400000;
        return diff > 0 && diff < 90;
      }).length,
    };

    const byType: Record<string, number> = {};
    const byBrand: Record<string, number> = {};
    items.forEach((i) => {
      byType[i.type] = (byType[i.type] || 0) + 1;
      byBrand[i.brand || "Unknown"] = (byBrand[i.brand || "Unknown"] || 0) + 1;
    });

    const warrantyExpired = items
      .filter((i) => i.warrantyEnd && i.warrantyEnd < now)
      .map((i) => ({
        label: i.label,
        brand: i.brand,
        model: i.model,
        location: i.locationName,
        warrantyEnd: i.warrantyEnd,
      }));

    return NextResponse.json({ stats, byType, byBrand, warrantyExpired });
  } catch (e: any) {
    if (e.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/import src/app/api/export src/app/api/reports
git commit -m "feat: add CSV import/export and reports summary API"
```

---

## Task 12: Super Admin API

**Files:**
- Create: `src/app/api/super-admin/schools/route.ts`
- Create: `src/app/api/super-admin/schools/[schoolId]/route.ts`
- Create: `src/app/api/super-admin/schools/[schoolId]/users/route.ts`
- Create: `src/app/api/super-admin/stats/route.ts`

- [ ] **Step 1: Implement school listing and creation**

Write `src/app/api/super-admin/schools/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth-guard";
import bcrypt from "bcryptjs";
import { CONDEMNED_SECTION } from "@/lib/constants";

export async function GET() {
  try {
    await requireSuperAdmin();

    const schools = await prisma.school.findMany({
      include: {
        _count: { select: { items: true, users: true } },
      },
      orderBy: { name: "asc" },
    });

    const schoolsWithStats = await Promise.all(
      schools.map(async (s) => {
        const [operational, faulty, openFaults] = await Promise.all([
          prisma.item.count({ where: { schoolId: s.id, status: "Operational" } }),
          prisma.item.count({ where: { schoolId: s.id, status: "Faulty" } }),
          prisma.fault.count({
            where: { item: { schoolId: s.id }, status: { not: "Resolved" } },
          }),
        ]);
        return {
          ...s,
          stats: { operational, faulty, openFaults },
        };
      })
    );

    return NextResponse.json(schoolsWithStats);
  } catch (e: any) {
    if (e.message === "Unauthorized" || e.message === "Forbidden")
      return NextResponse.json({ error: e.message }, { status: 403 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin();
    const body = await req.json();

    const school = await prisma.school.create({
      data: {
        name: body.name,
        code: body.code,
        address: body.address || null,
        sections: {
          create: {
            name: CONDEMNED_SECTION,
            sortOrder: 999,
            isProtected: true,
            rooms: {
              create: { name: CONDEMNED_SECTION, sortOrder: 0 },
            },
          },
        },
      },
    });

    // Create the school admin user
    if (body.adminEmail && body.adminPassword && body.adminName) {
      const hash = await bcrypt.hash(body.adminPassword, 12);
      await prisma.user.create({
        data: {
          email: body.adminEmail,
          passwordHash: hash,
          name: body.adminName,
          role: "SCHOOL_ADMIN",
          schoolId: school.id,
        },
      });
    }

    return NextResponse.json(school, { status: 201 });
  } catch (e: any) {
    if (e.message === "Unauthorized" || e.message === "Forbidden")
      return NextResponse.json({ error: e.message }, { status: 403 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Implement single school detail with full stats**

Write `src/app/api/super-admin/schools/[schoolId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth-guard";

type Params = { params: Promise<{ schoolId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    await requireSuperAdmin();
    const { schoolId } = await params;

    const school = await prisma.school.findFirst({
      where: { id: schoolId },
      include: {
        users: {
          select: { id: true, name: true, email: true, role: true, createdAt: true },
        },
        sections: {
          include: { rooms: { orderBy: { sortOrder: "asc" } } },
          orderBy: { sortOrder: "asc" },
        },
        _count: { select: { items: true } },
      },
    });

    if (!school)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const items = await prisma.item.findMany({
      where: { schoolId },
      select: {
        id: true, type: true, brand: true, status: true,
        isLoaned: true, warrantyEnd: true,
      },
    });

    const now = new Date();
    const stats = {
      total: items.length,
      operational: items.filter((i) => i.status === "Operational").length,
      faulty: items.filter((i) => i.status === "Faulty").length,
      maintenance: items.filter((i) => i.status === "Under Maintenance").length,
      condemned: items.filter((i) => i.status === "Waiting for Condemnation").length,
      loaned: items.filter((i) => i.isLoaned).length,
      warrantyExpired: items.filter(
        (i) => i.warrantyEnd && i.warrantyEnd < now
      ).length,
    };

    return NextResponse.json({ ...school, stats });
  } catch (e: any) {
    if (e.message === "Unauthorized" || e.message === "Forbidden")
      return NextResponse.json({ error: e.message }, { status: 403 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Implement user management per school**

Write `src/app/api/super-admin/schools/[schoolId]/users/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth-guard";
import bcrypt from "bcryptjs";

type Params = { params: Promise<{ schoolId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    await requireSuperAdmin();
    const { schoolId } = await params;
    const body = await req.json();

    const school = await prisma.school.findFirst({ where: { id: schoolId } });
    if (!school)
      return NextResponse.json({ error: "School not found" }, { status: 404 });

    const hash = await bcrypt.hash(body.password, 12);
    const user = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash: hash,
        name: body.name,
        role: body.role || "USER",
        schoolId,
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (e: any) {
    if (e.message === "Unauthorized" || e.message === "Forbidden")
      return NextResponse.json({ error: e.message }, { status: 403 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
```

- [ ] **Step 4: Implement aggregate stats endpoint**

Write `src/app/api/super-admin/stats/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth-guard";

export async function GET() {
  try {
    await requireSuperAdmin();

    const [schoolCount, userCount, itemCount, openFaults, activeLoans] =
      await Promise.all([
        prisma.school.count(),
        prisma.user.count(),
        prisma.item.count(),
        prisma.fault.count({ where: { status: { not: "Resolved" } } }),
        prisma.item.count({ where: { isLoaned: true } }),
      ]);

    return NextResponse.json({
      schools: schoolCount,
      users: userCount,
      totalAssets: itemCount,
      openFaults,
      activeLoans,
    });
  } catch (e: any) {
    if (e.message === "Unauthorized" || e.message === "Forbidden")
      return NextResponse.json({ error: e.message }, { status: 403 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/super-admin
git commit -m "feat: add super admin API — school CRUD, user management, aggregate stats"
```

---

## Task 13: Database Seed Script

**Files:**
- Create: `prisma/seed.ts`

- [ ] **Step 1: Write seed script that imports RAW_ITEMS from DamaiIMS.jsx**

Write `prisma/seed.ts`:

```typescript
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const CONDEMNED_SECTION = "Condemned / Pending Disposal";

const INITIAL_SECTIONS: Record<string, string[]> = {
  "PAC & Ground": [
    "HALL", "D1-05 PAC Lobby", "D1-01 Dance Studio", "D1-02 PAL Room 1",
    "D1-02 PAL Room 2", "E1-01 Music Room 1", "E1-02 Band Room",
    "E1-03 Music Room 2", "Conference Room", "B2-06 Teaching Lab", "ITLR",
    "Learning Room 1", "Learning Lab 1", "Learning Lab 2", "Learning Lab 3",
    "LSP", "LSM", "Art Room 1", "Art Room 2", "Science Lab 1", "Science Lab 2", "Spare",
  ],
  "Floor 2": ["F2-01", "F2-02", "F2-03", "G2-01", "G2-02", "G2-03"],
  "Floor 3": [
    "E3-02 SBB Room 1", "E3-03 SBB Room 2", "E3-04 Math Room",
    "F3-01", "F3-02", "G3-01", "G3-02", "G3-03", "G3-04", "G3-05", "G3-06",
  ],
  "Floor 4": ["E4-01", "E4-02", "E4-03", "F4-01", "F4-02", "F4-03", "G4-01", "G4-02", "G4-03"],
  "Floor 5": ["E5-01", "E5-02", "E5-03", "F5-01", "F5-02", "F5-03", "G5-01", "G5-02", "G5-03"],
  "Floor 6": ["E6-01", "E6-02", "E6-03", "F6-01", "F6-02", "F6-03"],
  "Floor 7": ["E7-01", "E7-02", "E7-03", "F7-01", "F7-02", "F7-03"],
  iPad: ["Cart 1", "Cart 2", "Cart 3", "Cart 4", "Cart 5", "6th Floor", "7th Floor", "iPad Cart PE"],
  Others: ["ITLR", "A2-03 STAFF RESOURCE", "Lab Store", "Jeff (Custody)"],
  [CONDEMNED_SECTION]: [CONDEMNED_SECTION],
};

async function main() {
  console.log("Seeding database...");

  // 1. Create super admin
  const superAdminHash = await bcrypt.hash("admin123", 12);
  const superAdmin = await prisma.user.upsert({
    where: { email: "admin@investorymap.sg" },
    update: {},
    create: {
      email: "admin@investorymap.sg",
      passwordHash: superAdminHash,
      name: "Super Admin",
      role: Role.SUPER_ADMIN,
    },
  });
  console.log(`Super admin: ${superAdmin.email}`);

  // 2. Create demo school
  const school = await prisma.school.upsert({
    where: { code: "DMPS" },
    update: {},
    create: {
      name: "Damai Primary School",
      code: "DMPS",
      address: "1 Bedok South Ave 3, Singapore 469270",
    },
  });
  console.log(`School: ${school.name} (${school.id})`);

  // 3. Create school admin
  const schoolAdminHash = await bcrypt.hash("ict123", 12);
  await prisma.user.upsert({
    where: { email: "ict@dmps.edu.sg" },
    update: {},
    create: {
      email: "ict@dmps.edu.sg",
      passwordHash: schoolAdminHash,
      name: "ICT Manager",
      role: Role.SCHOOL_ADMIN,
      schoolId: school.id,
    },
  });

  // 4. Create teacher user
  const teacherHash = await bcrypt.hash("teacher123", 12);
  await prisma.user.upsert({
    where: { email: "teacher@dmps.edu.sg" },
    update: {},
    create: {
      email: "teacher@dmps.edu.sg",
      passwordHash: teacherHash,
      name: "Teacher User",
      role: Role.USER,
      schoolId: school.id,
    },
  });

  // 5. Create sections and rooms
  let sectionOrder = 0;
  for (const [sectionName, rooms] of Object.entries(INITIAL_SECTIONS)) {
    const section = await prisma.section.upsert({
      where: { schoolId_name: { schoolId: school.id, name: sectionName } },
      update: {},
      create: {
        schoolId: school.id,
        name: sectionName,
        sortOrder: sectionOrder++,
        isProtected: sectionName === CONDEMNED_SECTION,
      },
    });

    for (let i = 0; i < rooms.length; i++) {
      await prisma.room.upsert({
        where: { sectionId_name: { sectionId: section.id, name: rooms[i] } },
        update: {},
        create: {
          sectionId: section.id,
          name: rooms[i],
          sortOrder: i,
        },
      });
    }
  }

  console.log(`Created ${Object.keys(INITIAL_SECTIONS).length} sections`);

  // 6. Check if items already exist
  const existingItems = await prisma.item.count({ where: { schoolId: school.id } });
  if (existingItems > 0) {
    console.log(`${existingItems} items already exist — skipping item seed`);
  } else {
    console.log("Import items via CSV or add them through the UI");
  }

  console.log("\n--- Seed complete ---");
  console.log("Login credentials:");
  console.log("  Super Admin: admin@investorymap.sg / admin123");
  console.log("  School Admin: ict@dmps.edu.sg / ict123");
  console.log("  Teacher: teacher@dmps.edu.sg / teacher123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Add seed config to package.json**

Add to `package.json`:

```json
{
  "prisma": {
    "seed": "npx tsx prisma/seed.ts"
  }
}
```

- [ ] **Step 3: Run the seed**

```bash
npx prisma db seed
```

Expected output:
```
Seeding database...
Super admin: admin@investorymap.sg
School: Damai Primary School (clxxxxxx)
Created 10 sections
--- Seed complete ---
```

- [ ] **Step 4: Commit**

```bash
git add prisma/seed.ts package.json
git commit -m "feat: add database seed script with demo school and 3 user roles"
```

---

## Task 14: Frontend — API Client & Auth Context

**Files:**
- Create: `src/lib/api-client.ts`

- [ ] **Step 1: Create typed API client**

Write `src/lib/api-client.ts`:

```typescript
type FetchOptions = RequestInit & {
  schoolId?: string;
};

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { schoolId, ...fetchOptions } = options;
  const url = new URL(path, window.location.origin);
  if (schoolId) url.searchParams.set("schoolId", schoolId);

  const res = await fetch(url.toString(), {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      ...fetchOptions.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  if (res.headers.get("content-type")?.includes("text/csv")) {
    return (await res.text()) as unknown as T;
  }

  return res.json();
}

// Items
export const api = {
  items: {
    list: (schoolId?: string) =>
      apiFetch<any[]>("/api/items", { schoolId }),
    get: (id: string) =>
      apiFetch<any>(`/api/items/${id}`),
    create: (data: any) =>
      apiFetch<any>("/api/items", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      apiFetch<any>(`/api/items/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) =>
      apiFetch<any>(`/api/items/${id}`, { method: "DELETE" }),
    move: (id: string, data: { toLocation: string; reason?: string; movedBy?: string }) =>
      apiFetch<any>(`/api/items/${id}/move`, { method: "POST", body: JSON.stringify(data) }),
    addFault: (id: string, data: any) =>
      apiFetch<any>(`/api/items/${id}/faults`, { method: "POST", body: JSON.stringify(data) }),
    addRepair: (id: string, data: any) =>
      apiFetch<any>(`/api/items/${id}/repairs`, { method: "POST", body: JSON.stringify(data) }),
    loanOut: (id: string, data: any) =>
      apiFetch<any>(`/api/items/${id}/loans`, {
        method: "POST",
        body: JSON.stringify({ action: "loan-out", ...data }),
      }),
    returnItem: (id: string, data: any) =>
      apiFetch<any>(`/api/items/${id}/loans`, {
        method: "POST",
        body: JSON.stringify({ action: "return", ...data }),
      }),
  },

  sections: {
    list: (schoolId?: string) =>
      apiFetch<any[]>("/api/sections", { schoolId }),
    create: (data: { name: string }) =>
      apiFetch<any>("/api/sections", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      apiFetch<any>(`/api/sections/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) =>
      apiFetch<any>(`/api/sections/${id}`, { method: "DELETE" }),
    addRoom: (sectionId: string, name: string) =>
      apiFetch<any>(`/api/sections/${sectionId}/rooms`, {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    renameRoom: (sectionId: string, roomId: string, name: string) =>
      apiFetch<any>(`/api/sections/${sectionId}/rooms`, {
        method: "PUT",
        body: JSON.stringify({ roomId, name }),
      }),
    deleteRoom: (sectionId: string, roomId: string) =>
      apiFetch<any>(`/api/sections/${sectionId}/rooms`, {
        method: "DELETE",
        body: JSON.stringify({ roomId }),
      }),
  },

  faults: {
    list: (schoolId?: string) =>
      apiFetch<any[]>("/api/faults", { schoolId }),
    update: (id: string, data: any) =>
      apiFetch<any>(`/api/faults/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  },

  loans: {
    list: (schoolId?: string) =>
      apiFetch<any[]>("/api/loans", { schoolId }),
  },

  moveLog: {
    list: (schoolId?: string) =>
      apiFetch<any[]>("/api/move-log", { schoolId }),
  },

  reports: {
    get: (schoolId?: string) =>
      apiFetch<any>("/api/reports", { schoolId }),
  },

  import: {
    csv: (items: any[]) =>
      apiFetch<{ imported: number }>("/api/import", {
        method: "POST",
        body: JSON.stringify({ items }),
      }),
  },

  upload: {
    file: async (file: File, folder?: string): Promise<string> => {
      const formData = new FormData();
      formData.append("file", file);
      if (folder) formData.append("folder", folder);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      return data.url;
    },
  },

  superAdmin: {
    schools: {
      list: () => apiFetch<any[]>("/api/super-admin/schools"),
      get: (id: string) => apiFetch<any>(`/api/super-admin/schools/${id}`),
      create: (data: any) =>
        apiFetch<any>("/api/super-admin/schools", {
          method: "POST",
          body: JSON.stringify(data),
        }),
      addUser: (schoolId: string, data: any) =>
        apiFetch<any>(`/api/super-admin/schools/${schoolId}/users`, {
          method: "POST",
          body: JSON.stringify(data),
        }),
    },
    stats: () => apiFetch<any>("/api/super-admin/stats"),
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/api-client.ts
git commit -m "feat: add typed API client covering all endpoints"
```

---

## Task 15: Frontend — Dashboard Shell

**Files:**
- Create: `src/app/dashboard/layout.tsx`
- Create: `src/app/dashboard/page.tsx`
- Create: `src/components/Header.tsx`
- Create: `src/components/StatsBar.tsx`
- Create: `src/components/TabNav.tsx`

This task migrates the App() component skeleton from DamaiIMS.jsx (lines 227-524) into the dashboard page, replacing localStorage with API calls. The subagent implementing this task should:

1. Read `DamaiIMS.jsx` lines 227-524 for the App() component structure
2. Create `src/app/dashboard/layout.tsx` — auth-guarded layout that fetches session and redirects if unauthenticated
3. Create `src/app/dashboard/page.tsx` — the main dashboard "use client" component that:
   - Fetches items, sections, moveLog from API on mount using `api.items.list()`, `api.sections.list()`, `api.moveLog.list()`
   - Maintains same state variables as App() (tab, activeSection, selectedItem, detailTab, dragItem, etc.)
   - Replaces all localStorage persistence (useEffect lines 246-248) with API mutation calls
   - Replaces all inline CRUD functions (updateItem, deleteItem, addItem, moveItem, loanOut, returnItem, addFault, updateFault, addRepair) with API calls via the `api` client
   - Renders Header, StatsBar, TabNav, and conditionally renders SectionsView/ListView/FaultsView/LoansView
   - Renders modals and lightbox same as current App()
4. Extract `<Header>` from lines 432-443 — receives `stats`, `onExport`, `onModal` props, adds user name + logout button
5. Extract `<StatsBar>` from lines 445-463 — receives `stats` prop, renders 9 counter cards
6. Extract `<TabNav>` from lines 466-470 — receives `tab` and `setTab` props
7. Conditionally hide admin-only actions (Settings, Import, Delete) when `session.user.role === "USER"`

The visual design (inline styles, colors, fonts) should be preserved exactly from DamaiIMS.jsx.

- [ ] **Step 1: Create dashboard layout**

```tsx
// src/app/dashboard/layout.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  if ((session.user as any).role === "SUPER_ADMIN") {
    redirect("/super-admin");
  }

  return <>{children}</>;
}
```

- [ ] **Step 2: Create Header, StatsBar, TabNav components**

The subagent should extract these from DamaiIMS.jsx lines 432-470, converting to TypeScript with props interfaces. Add a user avatar + logout button to the Header. Gate admin-only buttons behind a `role` prop check.

- [ ] **Step 3: Create the main dashboard page**

The subagent should create `src/app/dashboard/page.tsx` as a "use client" component that mirrors the App() function from DamaiIMS.jsx lines 227-524, but:
- Uses `useEffect` + `api` client to fetch data instead of localStorage
- Uses `api` client for all mutations (create, update, delete, move, loan, fault, repair)
- Passes data and callbacks to child components the same way App() does
- Includes loading state while data fetches

- [ ] **Step 4: Verify dev server renders dashboard**

```bash
npm run dev
```

Navigate to http://localhost:3000/login, log in with `ict@dmps.edu.sg` / `ict123`. Should redirect to /dashboard showing the header, stats, and tab navigation.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard src/components/Header.tsx src/components/StatsBar.tsx src/components/TabNav.tsx
git commit -m "feat: add dashboard shell with Header, StatsBar, TabNav and API data fetching"
```

---

## Tasks 16-20: Frontend Component Migration

These tasks migrate each view component from DamaiIMS.jsx into separate TypeScript files under `src/components/`. Each task follows the same pattern:

1. Read the corresponding section of DamaiIMS.jsx (line numbers noted in File Structure above)
2. Create a TypeScript component file with a props interface
3. Replace localStorage reads with props passed from the dashboard page
4. Replace CRUD calls with callback props (the dashboard page handles API calls)
5. Preserve all inline styles and visual design exactly
6. For FaultModal's photo upload: use `api.upload.file()` instead of base64 FileReader

**Task 16: SectionsView + ItemChip** — migrate lines 526-590. Props: items, sections, activeSection, callbacks for drag/drop/select/add/move.

**Task 17: ListView** — migrate lines 592-633. Props: items, search, filters, onSelectItem.

**Task 18: FaultsView** — migrate lines 635-679. Props: items, onSelectItem, onUpdateFault, setLightbox.

**Task 19: LoansView** — migrate lines 681-739. Props: items, onSelectItem, onReturn, onLoanOut.

**Task 20: DetailPanel + Modals** — migrate lines 741-1321. This is the largest migration:
- DetailPanel (lines 741-926) with all 4 tabs
- RemarkCommentDisplay, RemarkCommentFields (lines 928-962)
- All 9 modals: MoveModal, FaultModal, LoanOutModal, ReturnModal, ReportModal, MoveLogModal, AddItemModal, ImportModal, SettingsModal
- FaultModal must upload photos to S3 via `api.upload.file()` instead of reading to base64
- LoanOutModal's signature canvas can upload the canvas.toDataURL() blob via `api.upload.file()` for the signature field
- ImportModal should parse CSV client-side and call `api.import.csv()` with the parsed rows

Each task ends with a commit. These 5 tasks (16-20) can be parallelized across subagents since the components are independent.

---

## Task 21: Super Admin Dashboard UI

**Files:**
- Create: `src/app/super-admin/layout.tsx`
- Create: `src/app/super-admin/page.tsx`
- Create: `src/app/super-admin/schools/[schoolId]/page.tsx`
- Create: `src/app/super-admin/onboard/page.tsx`

- [ ] **Step 1: Create super admin layout**

```tsx
// src/app/super-admin/layout.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if ((session.user as any).role !== "SUPER_ADMIN") redirect("/dashboard");

  return (
    <div
      style={{
        fontFamily: "'DM Mono','Courier New',monospace",
        background: "#080b12",
        minHeight: "100vh",
        color: "#e2e8f0",
      }}
    >
      <div
        style={{
          background: "#0d1117",
          borderBottom: "1px solid #1e2432",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            fontFamily: "'Space Grotesk',sans-serif",
            fontWeight: 600,
            fontSize: 17,
            color: "#818cf8",
          }}
        >
          ◈ Investory Map — HQ
        </div>
        <div style={{ fontSize: 10, color: "#374151", flexGrow: 1 }}>
          Super Admin Dashboard
        </div>
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}
```

- [ ] **Step 2: Create schools overview page**

The subagent should create `src/app/super-admin/page.tsx` as a "use client" component that:
- Fetches `api.superAdmin.stats()` and `api.superAdmin.schools.list()` on mount
- Renders aggregate stat cards (total schools, total assets, open faults, active loans)
- Renders a grid of school cards, each showing: school name, code, asset count, user count, health indicators (operational %, fault count)
- Clicking a school card navigates to `/super-admin/schools/[schoolId]`
- Has an "Onboard New School" button linking to `/super-admin/onboard`
- Uses the same dark theme visual style as the main dashboard

- [ ] **Step 3: Create school drill-down page**

The subagent should create `src/app/super-admin/schools/[schoolId]/page.tsx` that:
- Fetches `api.superAdmin.schools.get(schoolId)` on mount
- Shows full school detail: name, code, address, created date
- Shows stats grid (same 9 counters as StatsBar)
- Shows user list with role badges
- Has an "Add User" form (name, email, password, role dropdown)
- Has a "View as School Admin" link that opens `/dashboard?schoolId=X` (future enhancement)

- [ ] **Step 4: Create school onboarding wizard**

The subagent should create `src/app/super-admin/onboard/page.tsx` as a multi-step form:
1. School details (name, code, address)
2. Admin account (name, email, password)
3. Review & confirm
4. Calls `api.superAdmin.schools.create()` with all data
5. On success, redirects to `/super-admin`

- [ ] **Step 5: Commit**

```bash
git add src/app/super-admin
git commit -m "feat: add super admin dashboard with school overview, drill-down, and onboarding"
```

---

## Task 22: Final Integration & Smoke Test

- [ ] **Step 1: Start PostgreSQL and run migrations**

```bash
npx prisma db push
npx prisma db seed
```

- [ ] **Step 2: Start dev server**

```bash
npm run dev
```

- [ ] **Step 3: Test Super Admin flow**

1. Navigate to http://localhost:3000/login
2. Login as `admin@investorymap.sg` / `admin123`
3. Verify redirect to `/super-admin`
4. Verify school list shows "Damai Primary School"
5. Click school → verify drill-down page shows stats and users
6. Test "Onboard New School" wizard

- [ ] **Step 4: Test School Admin flow**

1. Login as `ict@dmps.edu.sg` / `ict123`
2. Verify redirect to `/dashboard`
3. Verify sections/rooms render correctly
4. Test: add item, edit item, move item, report fault, loan out, return
5. Test: CSV import, CSV export
6. Test: settings (add/rename/delete sections and rooms)
7. Verify all admin actions are visible

- [ ] **Step 5: Test Teacher flow**

1. Login as `teacher@dmps.edu.sg` / `teacher123`
2. Verify redirect to `/dashboard`
3. Verify admin-only actions are hidden (no Settings, no Import, no Delete)
4. Test: report fault (should work)
5. Test: view sections, list, faults, loans (all read access should work)

- [ ] **Step 6: Test tenant isolation**

1. As super admin, onboard a second school "Test School"
2. Login as Test School's admin
3. Verify zero items — no data from Damai Primary School visible
4. Add an item to Test School
5. Login as Damai Primary School admin — verify Test School's item is not visible

- [ ] **Step 7: Run test suite**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: integration test pass — all user flows and tenant isolation verified"
```

---

## Summary of All Tasks

| # | Task | Depends On | Parallelizable With |
|---|------|-----------|-------------------|
| 1 | Project Scaffold | — | — |
| 2 | Database Schema | 1 | — |
| 3 | Authentication | 2 | — |
| 4 | Tenant Middleware | 2 | 3 |
| 5 | Items API | 3, 4 | 6, 7, 8, 9, 10 |
| 6 | Sections API | 3, 4 | 5, 7, 8, 9, 10 |
| 7 | Faults API | 3, 4 | 5, 6, 8, 9, 10 |
| 8 | Loans API | 3, 4 | 5, 6, 7, 9, 10 |
| 9 | Repairs & Move Log API | 3, 4 | 5, 6, 7, 8, 10 |
| 10 | File Upload API | 3, 4 | 5, 6, 7, 8, 9 |
| 11 | CSV Import/Export & Reports | 3, 4 | 5-10 |
| 12 | Super Admin API | 3, 4 | 5-11 |
| 13 | Database Seed | 2 | 5-12 |
| 14 | API Client | 5-12 | — |
| 15 | Dashboard Shell | 14 | — |
| 16 | SectionsView | 15 | 17, 18, 19 |
| 17 | ListView | 15 | 16, 18, 19 |
| 18 | FaultsView | 15 | 16, 17, 19 |
| 19 | LoansView | 15 | 16, 17, 18 |
| 20 | DetailPanel & Modals | 15 | 16-19 |
| 21 | Super Admin UI | 14 | 15-20 |
| 22 | Integration Test | All | — |
