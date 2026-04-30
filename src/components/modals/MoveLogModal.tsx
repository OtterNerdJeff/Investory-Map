"use client";

import React from "react";
import { fmtDate } from "@/lib/constants";

export interface MoveEntry {
  id: string;
  itemLabel: string;
  from: string;
  to: string;
  reason: string;
  movedBy?: string;
  date: string;
}

interface MoveLogModalProps {
  log: MoveEntry[];
  onClose: () => void;
}

export default function MoveLogModal({ log, onClose }: MoveLogModalProps) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, color: "#4f46e5" }}>
            Movement Log
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: 20 }}
          >
            ×
          </button>
        </div>
        {log.length === 0 && (
          <div style={{ color: "#94a3b8", textAlign: "center", padding: 24, fontSize: 12 }}>No movements yet</div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {log.map((l) => (
            <div
              key={l.id}
              style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 5, padding: 9 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontSize: 12, color: "#4f46e5" }}>{l.itemLabel}</span>
                <span style={{ fontSize: 10, color: "#94a3b8" }}>{fmtDate(l.date)}</span>
              </div>
              <div style={{ fontSize: 11, color: "#475569" }}>
                {l.from} → {l.to}
              </div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Reason: {l.reason}</div>
              {l.movedBy && <div style={{ fontSize: 10, color: "#94a3b8" }}>By: {l.movedBy}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
