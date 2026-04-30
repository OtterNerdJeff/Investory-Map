"use client";

import React, { useState } from "react";

interface BulkMoveModalProps {
  count: number;
  allLocations: string[];
  onMove: (toLocation: string, reason: string, movedBy: string) => void;
  onClose: () => void;
}

export default function BulkMoveModal({ count, allLocations, onMove, onClose }: BulkMoveModalProps) {
  const [loc, setLoc] = useState<string>(allLocations.includes("Spare") ? "Spare" : allLocations[0] ?? "");
  const [reason, setReason] = useState("");
  const [by, setBy] = useState("");

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, color: "#4f46e5", marginBottom: 12 }}>
          Move {count} Items
        </div>
        <div style={{ fontSize: 11, color: "#64748b", marginBottom: 12 }}>
          All {count} selected items will be moved to the same destination.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <div>
            <label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 3 }}>Destination *</label>
            <select value={loc} onChange={(e) => setLoc(e.target.value)}>
              {allLocations.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 3 }}>Reason *</label>
            <textarea
              rows={2}
              placeholder="e.g. Bulk relocation for event..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div>
            <label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 3 }}>Moved By</label>
            <input placeholder="Your name" value={by} onChange={(e) => setBy(e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn btn-primary"
              style={{ flex: 1 }}
              onClick={() => {
                if (!reason.trim()) {
                  alert("Please enter a reason.");
                  return;
                }
                onMove(loc, reason, by);
              }}
            >
              Confirm Move All
            </button>
            <button className="btn" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
