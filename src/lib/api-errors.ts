import { NextResponse } from "next/server";

// Known client-input errors that should become 400 (from resolveSchoolId etc.).
// Match by substring because underlying messages include extra context
// ("schoolId required for super admin operations", "User has no school assigned").
const CLIENT_ERROR_PATTERNS = [
  "schoolId required",
  "User has no school",
];

/**
 * Centralised error handler for API route catch-blocks.
 *
 * - Maps sentinel errors thrown by auth/tenant helpers to 401/403/400.
 * - Swallows unexpected errors into a generic 500 and logs the raw error
 *   server-side, so internal details (stack traces, DB errors, etc.) never
 *   leak to the client.
 *
 * Usage:
 *   try { ... } catch (e: unknown) { return handleApiError(e); }
 */
export function handleApiError(e: unknown): NextResponse {
  if (e instanceof Error) {
    if (e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (e.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (CLIENT_ERROR_PATTERNS.some((p) => e.message.includes(p))) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
  }
  console.error("[api] unexpected error:", e);
  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 }
  );
}
