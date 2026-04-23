"use client";

import React, { useState } from "react";
import type { Item } from "@/components/ItemChip";

interface MoveModalProps {
  item: Item;
  pendingLocation: string | null;
  allLocations: string[];
  onMove: (toLocation: string, reason: string, movedBy: string) => void;
  onClose: () => void;
}

export default function MoveModal({ item, pendingLocation, allLocations, onMove, onClose }: MoveModalProps) {
  const [loc, setLoc] = useState<string>(pendingLocation || item.location);
  const [reason, setReason] = useState("");
  const [by, setBy] = useState("");

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, color: "#818cf8", marginBottom: 12 }}>
          Move — {item.label}
        </div>
        <div style={{ fontSize: 11, color: "#374151", marginBottom: 12 }}>
          From: <span style={{ color: "#9ca3af" }}>{item.location}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <div>
            <label style={{ fontSize: 10, color: "#4b5563", display: "block", marginBottom: 3 }}>New Location *</label>
            <select value={loc} onChange={(e) => setLoc(e.target.value)}>
              {allLocations.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 10, color: "#4b5563", display: "block", marginBottom: 3 }}>Reason *</label>
            <textarea
              rows={2}
              placeholder="e.g. Fault, event relocation..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div>
            <label style={{ fontSize: 10, color: "#4b5563", display: "block", marginBottom: 3 }}>Moved By</label>
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
                if (loc === item.location) return onClose();
                onMove(loc, reason, by);
              }}
            >
              Confirm Move
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
