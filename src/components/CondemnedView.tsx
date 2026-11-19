"use client";

import React, { useRef, useState } from "react";
import { api } from "@/lib/api-client";
import { CONDEMNED_RETENTION_YEARS, fmtDate, getTypeIcon } from "@/lib/constants";

export interface CondemnDoc {
  id: string;
  url: string;
  fileName: string;
  uploadedBy?: string | null;
  createdAt: string;
}

export interface CondemnedItem {
  id: string;
  label: string;
  type: string;
  brand?: string | null;
  model?: string | null;
  serial?: string | null;
  assetCode?: string | null;
  location: string;
  prevLocation?: string | null;
  condemnedAt: string | null;
  condemnDocs: CondemnDoc[];
}

// An item waiting for its condemnation document.
export interface PendingCondemnItem {
  id: string;
  label: string;
  type: string;
  brand?: string | null;
  model?: string | null;
  serial?: string | null;
  assetCode?: string | null;
  location: string;
  prevLocation?: string | null;
}

interface CondemnedViewProps {
  pending: PendingCondemnItem[];
  items: CondemnedItem[];
  isAdmin: boolean;
  onSelectItem: (item: { id: string }) => void;
  onChanged: () => Promise<void> | void;
  onPutBack: (ids: string[]) => Promise<void> | void;
  onShowRoom?: () => void;
  typeIcons?: Record<string, string>;
}

const DOC_ACCEPT = "application/pdf,image/jpeg,image/png";
const DOC_HINT = "PDF or photo (JPG, PNG), up to 10MB";

function keptUntil(condemnedAt: string | null): string {
  if (!condemnedAt) return "—";
  const d = new Date(condemnedAt);
  d.setFullYear(d.getFullYear() + CONDEMNED_RETENTION_YEARS);
  return fmtDate(d.toISOString());
}

// ── Sorting ─────────────────────────────────────────────────────────────────
type SortKey = "label" | "type" | "assetCode" | "serial" | "room" | "condemnedAt";
interface Sort { key: SortKey; asc: boolean }

const SORT_LABELS: Record<SortKey, string> = {
  label: "Label",
  type: "Type",
  assetCode: "Asset code",
  serial: "Serial",
  room: "Room",
  condemnedAt: "Condemned date",
};

/**
 * Sorts a copy of `rows`. Text compares the way people read it ("P2" before
 * "P10"). Rows with nothing in the sorted column always go last. Ties fall
 * back to the label so the order stays steady.
 */
function sortRows<T extends { label: string }>(
  rows: T[],
  sort: Sort,
  value: (row: T, key: SortKey) => string | null | undefined
): T[] {
  const text = (a: string, b: string) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
  return [...rows].sort((a, b) => {
    const va = (value(a, sort.key) ?? "").trim();
    const vb = (value(b, sort.key) ?? "").trim();
    if (!va && vb) return 1;
    if (va && !vb) return -1;
    const main = sort.asc ? text(va, vb) : text(vb, va);
    return main || text(a.label, b.label);
  });
}

/** "Sort by" dropdown plus a direction button. Easy to reach on a phone. */
function SortControl({ sort, setSort, keys }: { sort: Sort; setSort: (s: Sort) => void; keys: SortKey[] }) {
  const isDate = sort.key === "condemnedAt";
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
      <span style={{ fontSize: 11, color: "#64748b" }}>Sort by</span>
      <select
        aria-label="Sort by"
        value={sort.key}
        onChange={e => setSort({ key: e.target.value as SortKey, asc: e.target.value !== "condemnedAt" })}
        style={{ width: "auto", padding: "5px 8px", fontSize: 11 }}
      >
        {keys.map(k => <option key={k} value={k}>{SORT_LABELS[k]}</option>)}
      </select>
      <button
        className="btn"
        onClick={() => setSort({ ...sort, asc: !sort.asc })}
        title="Switch the order"
        style={{ fontSize: 11, padding: "5px 10px" }}
      >
        {isDate ? (sort.asc ? "Oldest first" : "Newest first") : (sort.asc ? "A → Z" : "Z → A")} ⇅
      </button>
    </div>
  );
}

/** Column heading that sorts when clicked. */
function SortTh({ label, k, sort, setSort }: { label: string; k: SortKey; sort: Sort; setSort: (s: Sort) => void }) {
  const active = sort.key === k;
  return (
    <th
      onClick={() => setSort(active ? { key: k, asc: !sort.asc } : { key: k, asc: k !== "condemnedAt" })}
      title={`Sort by ${label}`}
      aria-sort={active ? (sort.asc ? "ascending" : "descending") : undefined}
      style={{ ...th, cursor: "pointer", userSelect: "none", color: active ? "#4f46e5" : th.color }}
    >
      {label} {active ? (sort.asc ? "▲" : "▼") : ""}
    </th>
  );
}

const PENDING_SORT_KEYS: SortKey[] = ["label", "type", "room", "assetCode", "serial"];
const CONFIRMED_SORT_KEYS: SortKey[] = ["condemnedAt", "label", "type", "room", "assetCode", "serial"];

const th: React.CSSProperties = { padding: "5px 7px", textAlign: "left", color: "#94a3b8", fontWeight: 400, whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "5px 7px", color: "#64748b" };
const card: React.CSSProperties = { background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 12, marginBottom: 14 };
const heading: React.CSSProperties = { fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, color: "#4f46e5" };
const emptyBox: React.CSSProperties = { color: "#94a3b8", fontSize: 12, padding: 18, textAlign: "center" };

export default function CondemnedView({
  pending, items, isAdmin, onSelectItem, onChanged, onPutBack, onShowRoom, typeIcons,
}: CondemnedViewProps) {
  const [search, setSearch] = useState("");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [error, setError] = useState("");
  const [pendingSort, setPendingSort] = useState<Sort>({ key: "label", asc: true });
  const [confirmedSort, setConfirmedSort] = useState<Sort>({ key: "condemnedAt", asc: false });
  const fileInput = useRef<HTMLInputElement>(null);
  // Which items the next chosen file is for.
  const attachFor = useRef<{ ids: string[]; bulk: boolean } | null>(null);

  const q = search.trim().toLowerCase();
  const matches = (i: PendingCondemnItem) =>
    !q ||
    [i.label, i.type, i.brand, i.model, i.serial, i.assetCode, i.location, i.prevLocation]
      .some(v => (v ?? "").toLowerCase().includes(q));
  // "Room" means the room the item came from.
  const pendingShown = sortRows(pending.filter(matches), pendingSort, (i, k) =>
    k === "room" ? i.prevLocation : k === "condemnedAt" ? null : i[k]
  );
  const confirmedShown = sortRows(items.filter(matches), confirmedSort, (i, k) =>
    k === "room" ? i.location : i[k]
  );

  // Only count ticks for items that are still pending.
  const pendingIds = new Set(pending.map(i => i.id));
  const selectedIds = [...checked].filter(id => pendingIds.has(id));
  const allShownChecked = pendingShown.length > 0 && pendingShown.every(i => checked.has(i.id));

  const toggle = (id: string) =>
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAllShown = () =>
    setChecked(prev => {
      const next = new Set(prev);
      if (allShownChecked) pendingShown.forEach(i => next.delete(i.id));
      else pendingShown.forEach(i => next.add(i.id));
      return next;
    });

  const pickFile = (ids: string[], bulk: boolean) => {
    if (ids.length === 0) return;
    attachFor.current = { ids, bulk };
    setError("");
    fileInput.current?.click();
  };

  const onFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const target = attachFor.current;
    e.target.value = "";
    if (!file || !target) return;
    if (target.bulk) setBulkBusy(true);
    else setBusyId(target.ids[0]);
    try {
      // The file is uploaded once; every chosen item is linked to it.
      const url = await api.upload.file(file, "documents");
      await api.condemned.confirm(target.ids, { url, fileName: file.name });
      if (target.bulk) setChecked(new Set());
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not attach the document");
    } finally {
      setBulkBusy(false);
      setBusyId(null);
    }
  };

  const removeDoc = async (item: CondemnedItem, doc: CondemnDoc) => {
    const last = item.condemnDocs.length === 1;
    const msg = last
      ? `Remove "${doc.fileName}" from ${item.label}?\n\nThis is its only document, so the item will go back to "Waiting for document".`
      : `Remove "${doc.fileName}" from ${item.label}?`;
    if (!confirm(msg)) return;
    setBusyId(item.id);
    setError("");
    try {
      await api.condemned.deleteDoc(doc.id);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove the document");
    } finally {
      setBusyId(null);
    }
  };

  const putBack = async (ids: string[]) => {
    setError("");
    setBulkBusy(true);
    try {
      await onPutBack(ids);
      setChecked(prev => {
        const next = new Set(prev);
        ids.forEach(id => next.delete(id));
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not put the item back");
    } finally {
      setBulkBusy(false);
    }
  };

  const typeCell = (type: string) => (
    <td style={{ ...td, whiteSpace: "nowrap" }}>
      <span style={{ fontSize: 16 }}>{typeIcons?.[type] || getTypeIcon(type)}</span> {type}
    </td>
  );

  return (
    <div>
      <input ref={fileInput} type="file" accept={DOC_ACCEPT} onChange={onFileChosen} style={{ display: "none" }} />

      <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center", flexWrap: "wrap" }}>
        {onShowRoom && (
          <button className="btn" onClick={onShowRoom} style={{ fontSize: 11 }}>
            🗺 Show condemned room
          </button>
        )}
        <input
          placeholder="Search label, type, serial, room..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: "1 1 200px", minWidth: 0, maxWidth: 320, marginLeft: "auto" }}
        />
      </div>

      {error && (
        <div style={{ fontSize: 11, color: "#dc2626", background: "#fee2e2", borderRadius: 6, padding: "6px 10px", marginBottom: 10 }}>
          {error}
        </div>
      )}

      {/* ── Step 1: waiting for a document ─────────────────────────────── */}
      <div style={{ ...card, borderColor: pending.length > 0 ? "#fcd34d" : "#e2e8f0" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
          <div style={heading}>⏳ Waiting for document ({pending.length})</div>
          {isAdmin && pending.length > 0 && (
            <div style={{ marginLeft: "auto", display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: selectedIds.length ? "#4338ca" : "#94a3b8" }}>
                {selectedIds.length} selected
              </span>
              <button
                className="btn btn-primary"
                disabled={selectedIds.length === 0 || bulkBusy}
                onClick={() => pickFile(selectedIds, true)}
                title={DOC_HINT}
                style={{ fontSize: 11, opacity: selectedIds.length === 0 || bulkBusy ? 0.5 : 1 }}
              >
                {bulkBusy ? "Working..." : selectedIds.length > 0 ? `📎 Upload 1 document for ${selectedIds.length} item${selectedIds.length === 1 ? "" : "s"}` : "📎 Upload document"}
              </button>
              <button
                className="btn"
                disabled={selectedIds.length === 0 || bulkBusy}
                onClick={() => putBack(selectedIds)}
                title="Not condemning these after all. Return them to their rooms."
                style={{ fontSize: 11, opacity: selectedIds.length === 0 || bulkBusy ? 0.5 : 1 }}
              >
                ↩ Put back
              </button>
            </div>
          )}
        </div>
        <div style={{ fontSize: 10, color: "#64748b", marginBottom: 8 }}>
          {isAdmin
            ? `Tick the items covered by one document, then upload it once (${DOC_HINT}). Items with a document become confirmed.`
            : "These items are waiting for a condemnation document."}
        </div>

        {pending.length === 0 ? (
          <div style={emptyBox}>
            Nothing is waiting. To start, open an item and click &quot;🗑 Condemn&quot;.
          </div>
        ) : (
          <>
          <SortControl sort={pendingSort} setSort={setPendingSort} keys={PENDING_SORT_KEYS} />
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                  {isAdmin && (
                    <th style={{ ...th, width: 28 }}>
                      <input
                        type="checkbox"
                        aria-label="Select all"
                        title="Select all"
                        checked={allShownChecked}
                        onChange={toggleAllShown}
                        style={{ width: 15, height: 15, cursor: "pointer" }}
                      />
                    </th>
                  )}
                  <SortTh label="Label" k="label" sort={pendingSort} setSort={setPendingSort} />
                  <SortTh label="Type" k="type" sort={pendingSort} setSort={setPendingSort} />
                  <SortTh label="Asset Code" k="assetCode" sort={pendingSort} setSort={setPendingSort} />
                  <SortTh label="Serial" k="serial" sort={pendingSort} setSort={setPendingSort} />
                  <SortTh label="Came From" k="room" sort={pendingSort} setSort={setPendingSort} />
                  <th style={th} />
                </tr>
              </thead>
              <tbody>
                {pendingShown.map(item => {
                  const isChecked = checked.has(item.id);
                  return (
                    <tr
                      key={item.id}
                      onClick={() => onSelectItem(item)}
                      style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer", background: isChecked ? "#ede9fe" : undefined }}
                    >
                      {isAdmin && (
                        <td style={td} onClick={e => { e.stopPropagation(); toggle(item.id); }}>
                          <input
                            type="checkbox"
                            aria-label={`Select ${item.label}`}
                            checked={isChecked}
                            onChange={() => { /* handled by the cell click */ }}
                            style={{ width: 15, height: 15, cursor: "pointer" }}
                          />
                        </td>
                      )}
                      <td style={{ ...td, color: "#4f46e5" }}>{item.label}</td>
                      {typeCell(item.type)}
                      <td style={td}>{item.assetCode || "—"}</td>
                      <td style={td}>{item.serial || "—"}</td>
                      <td style={{ ...td, color: "#475569" }}>{item.prevLocation || "—"}</td>
                      <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }} onClick={e => e.stopPropagation()}>
                        {isAdmin && (
                          <button
                            className="btn"
                            disabled={bulkBusy || busyId === item.id}
                            onClick={() => pickFile([item.id], false)}
                            title={DOC_HINT}
                            style={{ padding: "2px 8px", fontSize: 10 }}
                          >
                            {busyId === item.id ? "Uploading..." : "📎 Upload"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {pendingShown.length === 0 && (
              <div style={{ color: "#94a3b8", fontSize: 11, padding: 12 }}>No waiting items match your search.</div>
            )}
          </div>
          </>
        )}
      </div>

      {/* ── Step 2: confirmed ──────────────────────────────────────────── */}
      <div style={card}>
        <div style={{ ...heading, marginBottom: 6 }}>✅ Confirmed condemned ({items.length})</div>
        <div style={{ fontSize: 10, color: "#64748b", marginBottom: 8 }}>
          Records and documents are kept for {CONDEMNED_RETENTION_YEARS} years after an item is condemned, then removed automatically.
          To bring an item back, click its row and change its status.
        </div>

        {items.length === 0 ? (
          <div style={emptyBox}>No confirmed items yet.</div>
        ) : (
          <>
          <SortControl sort={confirmedSort} setSort={setConfirmedSort} keys={CONFIRMED_SORT_KEYS} />
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <SortTh label="Label" k="label" sort={confirmedSort} setSort={setConfirmedSort} />
                  <SortTh label="Type" k="type" sort={confirmedSort} setSort={setConfirmedSort} />
                  <SortTh label="Asset Code" k="assetCode" sort={confirmedSort} setSort={setConfirmedSort} />
                  <SortTh label="Serial" k="serial" sort={confirmedSort} setSort={setConfirmedSort} />
                  <SortTh label="Removed From" k="room" sort={confirmedSort} setSort={setConfirmedSort} />
                  <SortTh label="Condemned On" k="condemnedAt" sort={confirmedSort} setSort={setConfirmedSort} />
                  <th style={th}>Kept Until</th>
                  <th style={th}>Document</th>
                </tr>
              </thead>
              <tbody>
                {confirmedShown.map(item => (
                  <tr
                    key={item.id}
                    onClick={() => onSelectItem(item)}
                    style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer", verticalAlign: "top" }}
                  >
                    <td style={{ ...td, color: "#4f46e5" }}>{item.label}</td>
                    {typeCell(item.type)}
                    <td style={td}>{item.assetCode || "—"}</td>
                    <td style={td}>{item.serial || "—"}</td>
                    <td style={{ ...td, color: "#475569" }}>{item.location}</td>
                    <td style={{ ...td, color: "#475569", whiteSpace: "nowrap" }}>{item.condemnedAt ? fmtDate(item.condemnedAt) : "—"}</td>
                    <td style={{ ...td, color: "#94a3b8", whiteSpace: "nowrap" }}>{keptUntil(item.condemnedAt)}</td>
                    <td style={td} onClick={e => e.stopPropagation()}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-start" }}>
                        {item.condemnDocs.map(doc => (
                          <span key={doc.id} style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                            <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{ color: "#4f46e5", textDecoration: "none" }}>
                              📄 {doc.fileName}
                            </a>
                            {isAdmin && (
                              <button
                                className="btn"
                                title="Remove document"
                                disabled={busyId === item.id}
                                onClick={() => removeDoc(item, doc)}
                                style={{ padding: "0 5px", fontSize: 10, lineHeight: "16px" }}
                              >
                                ✕
                              </button>
                            )}
                          </span>
                        ))}
                        {item.condemnDocs.length === 0 && (
                          <span style={{ color: "#d97706" }}>No document</span>
                        )}
                        {isAdmin && (
                          <button
                            className="btn"
                            disabled={busyId === item.id}
                            onClick={() => pickFile([item.id], false)}
                            title={DOC_HINT}
                            style={{ padding: "2px 8px", fontSize: 10 }}
                          >
                            {busyId === item.id ? "Uploading..." : "📎 Add document"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {confirmedShown.length === 0 && (
              <div style={{ color: "#94a3b8", fontSize: 11, padding: 12 }}>No confirmed items match your search.</div>
            )}
          </div>
          </>
        )}
      </div>
    </div>
  );
}
