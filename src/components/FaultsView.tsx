"use client";

import React, { useState } from "react";
import type { Item } from "@/components/ItemChip";
import { SEV_COLORS, fmtDate } from "@/lib/constants";

interface FaultWithItem {
  id: string;
  faultType: string;
  severity: string;
  description?: string | null;
  reportedBy?: string | null;
  resolvedBy?: string | null;
  photos?: string[];
  date: string;
  status: string;
  item: Item;
}

interface FaultsViewProps {
  items: Item[];
  onSelectItem: (item: Item) => void;
  onUpdateFault: (itemId: string, faultId: string, patch: { status: string }) => void;
  setLightbox: (src: string) => void;
}

export default function FaultsView({ items, onSelectItem, onUpdateFault, setLightbox }: FaultsViewProps) {
  const [sf, setSf] = useState("Open");
  const [sv, setSv] = useState("All");

  const all = items
    .flatMap(i =>
      ((i.faults || []) as unknown as FaultWithItem[]).map(f => ({ ...f, item: i }))
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filtered = all.filter(
    f => (sf === "All" || f.status === sf) && (sv === "All" || f.severity === sv)
  );

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
        {["All", "Open", "In Progress", "Resolved"].map(s => (
          <button
            key={s}
            className="btn"
            onClick={() => setSf(s)}
            style={sf === s ? { background: "#ede9fe", borderColor: "#6366f1", color: "#4338ca" } : {}}
          >
            {s}
          </button>
        ))}
        <select
          value={sv}
          onChange={e => setSv(e.target.value)}
          style={{ width: 120, marginLeft: "auto" }}
        >
          <option value="All">All Severity</option>
          {["Low", "Medium", "High", "Critical"].map(s => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 6 }}>{filtered.length} faults</div>
      {filtered.length === 0 && (
        <div style={{ textAlign: "center", color: "#94a3b8", padding: 40, fontSize: 13 }}>
          No faults matching filter
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map(f => {
          const sc2 = SEV_COLORS[f.severity] ?? SEV_COLORS.Low;
          return (
            <div
              key={f.id}
              style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 7, padding: "10px 12px" }}
            >
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
                    <span className="badge" style={{ background: sc2.bg, color: sc2.text }}>
                      {f.severity}
                    </span>
                    <span
                      style={{ fontSize: 12, color: "#4f46e5", cursor: "pointer" }}
                      onClick={() => onSelectItem(f.item)}
                    >
                      {f.item.label}
                    </span>
                    <span style={{ fontSize: 10, color: "#94a3b8" }}>@ {f.item.location}</span>
                    <span style={{ fontSize: 10, color: "#94a3b8", marginLeft: "auto" }}>
                      {fmtDate(f.date)}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 3 }}>{f.faultType}</div>
                  {f.description && (
                    <div style={{ fontSize: 11, color: "#475569", marginBottom: 4 }}>{f.description}</div>
                  )}
                  {f.reportedBy && (
                    <div style={{ fontSize: 10, color: "#94a3b8" }}>By: {f.reportedBy}</div>
                  )}
                  {f.resolvedBy && (
                    <div style={{ fontSize: 10, color: "#16a34a", marginTop: 2 }}>
                      Resolved by {f.resolvedBy}
                    </div>
                  )}
                  {(f.photos || []).length > 0 && (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                      {(f.photos || []).map((p, i) => (
                        <img
                          key={i}
                          src={p}
                          alt=""
                          style={{
                            width: 52,
                            height: 52,
                            objectFit: "cover",
                            borderRadius: 4,
                            cursor: "pointer",
                            border: "1px solid #cbd5e1",
                          }}
                          onClick={() => setLightbox(p)}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <select
                  value={f.status}
                  onChange={e => onUpdateFault(f.item.id, f.id, { status: e.target.value })}
                  style={{ width: 120, fontSize: 10, padding: "3px 6px" }}
                >
                  <option>Open</option>
                  <option>In Progress</option>
                  <option>Resolved</option>
                </select>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
