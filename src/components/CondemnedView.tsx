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

interface CondemnedViewProps {
  items: CondemnedItem[];
  isAdmin: boolean;
  onSelectItem: (item: CondemnedItem) => void;
  onChanged: () => Promise<void> | void;
  typeIcons?: Record<string, string>;
}

function keptUntil(condemnedAt: string | null): string {
  if (!condemnedAt) return "—";
  const d = new Date(condemnedAt);
  d.setFullYear(d.getFullYear() + CONDEMNED_RETENTION_YEARS);
  return fmtDate(d.toISOString());
}

export default function CondemnedView({ items, isAdmin, onSelectItem, onChanged, typeIcons }: CondemnedViewProps) {
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const attachFor = useRef<string | null>(null);

  const q = search.trim().toLowerCase();
  const filtered = items.filter(i =>
    !q ||
    [i.label, i.type, i.brand, i.model, i.serial, i.assetCode, i.location]
      .some(v => (v ?? "").toLowerCase().includes(q))
  );

  const pickPdf = (itemId: string) => {
    attachFor.current = itemId;
    setError("");
    fileInput.current?.click();
  };

  const onFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const itemId = attachFor.current;
    e.target.value = "";
    if (!file || !itemId) return;
    setBusyId(itemId);
    try {
      const url = await api.upload.file(file, "documents");
      await api.condemned.addDoc(itemId, { url, fileName: file.name });
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not attach the PDF");
    } finally {
      setBusyId(null);
    }
  };

  const removeDoc = async (itemId: string, doc: CondemnDoc) => {
    if (!confirm(`Remove "${doc.fileName}"? This cannot be undone.`)) return;
    setBusyId(itemId);
    setError("");
    try {
      await api.condemned.deleteDoc(doc.id);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove the PDF");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <input ref={fileInput} type="file" accept="application/pdf" onChange={onFileChosen} style={{ display: "none" }} />

      <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, color: "#4f46e5" }}>
          {items.length} condemned item{items.length === 1 ? "" : "s"}
        </div>
        <input
          placeholder="Search label, type, serial, room..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: "1 1 200px", minWidth: 0, maxWidth: 320, marginLeft: "auto" }}
        />
      </div>

      <div style={{ fontSize: 10, color: "#64748b", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 6, padding: "6px 10px", marginBottom: 10 }}>
        Records and attached PDFs are kept for {CONDEMNED_RETENTION_YEARS} years after an item is condemned, then removed automatically.
        To bring an item back, click its row and change its status.
      </div>

      {error && (
        <div style={{ fontSize: 11, color: "#dc2626", background: "#fee2e2", borderRadius: 6, padding: "6px 10px", marginBottom: 10 }}>
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <div style={{ color: "#94a3b8", fontSize: 12, padding: 24, textAlign: "center", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8 }}>
          No condemned items. Set an item&apos;s status to &quot;Condemned&quot; to move it here.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                {["Label", "Type", "Asset Code", "Serial", "Removed From", "Condemned On", "Kept Until", "Proof (PDF)"].map(h => (
                  <th key={h} style={{ padding: "5px 7px", textAlign: "left", color: "#94a3b8", fontWeight: 400, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr
                  key={item.id}
                  onClick={() => onSelectItem(item)}
                  style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer", verticalAlign: "top" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#ffffff")}
                  onMouseLeave={e => (e.currentTarget.style.background = "")}
                >
                  <td style={{ padding: "5px 7px", color: "#4f46e5" }}>{item.label}</td>
                  <td style={{ padding: "5px 7px", color: "#64748b", whiteSpace: "nowrap" }}>
                    <span style={{ fontSize: 16 }}>{typeIcons?.[item.type] || getTypeIcon(item.type)}</span> {item.type}
                  </td>
                  <td style={{ padding: "5px 7px", color: "#64748b" }}>{item.assetCode || "—"}</td>
                  <td style={{ padding: "5px 7px", color: "#64748b" }}>{item.serial || "—"}</td>
                  <td style={{ padding: "5px 7px", color: "#475569" }}>{item.location}</td>
                  <td style={{ padding: "5px 7px", color: "#475569", whiteSpace: "nowrap" }}>{item.condemnedAt ? fmtDate(item.condemnedAt) : "—"}</td>
                  <td style={{ padding: "5px 7px", color: "#94a3b8", whiteSpace: "nowrap" }}>{keptUntil(item.condemnedAt)}</td>
                  <td style={{ padding: "5px 7px" }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-start" }}>
                      {item.condemnDocs.map(doc => (
                        <span key={doc.id} style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                          <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{ color: "#4f46e5", textDecoration: "none" }}>
                            📄 {doc.fileName}
                          </a>
                          {isAdmin && (
                            <button
                              className="btn"
                              title="Remove PDF"
                              disabled={busyId === item.id}
                              onClick={() => removeDoc(item.id, doc)}
                              style={{ padding: "0 5px", fontSize: 10, lineHeight: "16px" }}
                            >
                              ✕
                            </button>
                          )}
                        </span>
                      ))}
                      {isAdmin && (
                        <button
                          className="btn"
                          disabled={busyId === item.id}
                          onClick={() => pickPdf(item.id)}
                          style={{ padding: "2px 8px", fontSize: 10 }}
                        >
                          {busyId === item.id ? "Uploading..." : "📎 Attach PDF"}
                        </button>
                      )}
                      {!isAdmin && item.condemnDocs.length === 0 && <span style={{ color: "#94a3b8" }}>—</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div style={{ color: "#94a3b8", fontSize: 11, padding: 12 }}>No condemned items match your search.</div>
          )}
        </div>
      )}
    </div>
  );
}
