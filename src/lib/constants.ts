// App-wide constants migrated from InventoryMap.jsx (canonical source).
// Keep in sync with that file until the full migration is complete.

export const APP_TITLE = "Inventory Map";
export const APP_SUBTITLE = "Room-based Asset & Inventory Manager";

export const STATUS_LIST = [
  "Operational",
  "Spare",
  "Under Maintenance",
  "Waiting for Condemnation",
  "Others",
] as const;

// Full set of acceptable status strings for server-side validation.
// Includes "Faulty" — not user-selectable in create forms, but auto-derived
// by fault-escalation logic (see CLAUDE.md "Fault auto-escalation") and
// therefore must round-trip through PUT.
export const STATUS_ENUM_FOR_VALIDATION = [
  ...STATUS_LIST,
  "Faulty",
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
  "Patch Panel": "🔌",
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
