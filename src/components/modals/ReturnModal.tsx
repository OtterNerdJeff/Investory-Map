"use client";

import React, { useState } from "react";
import type { Item } from "@/components/ItemChip";

interface ReturnForm {
  returnLocation: string;
  condition: string;
  returnedBy: string;
  notes: string;
}

interface ReturnModalProps {
  item: Item;
  allLocations: string[];
  onSubmit: (data: ReturnForm) => void;
  onClose: () => void;
}

export default function ReturnModal({ item, allLocations, onSubmit, onClose }: ReturnModalProps) {
  const [form, setForm] = useState<ReturnForm>({
    returnLocation: "Spare",
    condition: "Good",
    returnedBy: "",
    notes: "",
  });

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, color: "#818cf8", marginBottom: 12 }}>
          Return — {item.label}
        </div>
        <div style={{ fontSize: 11, color: "#374151", marginBottom: 12 }}>
          With: <span style={{ color: "#9ca3af" }}>{item.loanedTo}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <div>
            <label style={{ fontSize: 10, color: "#4b5563", display: "block", marginBottom: 3 }}>Return to Location</label>
            <select
              value={form.returnLocation}
              onChange={(e) => setForm((f) => ({ ...f, returnLocation: e.target.value }))}
            >
              {allLocations.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 10, color: "#4b5563", display: "block", marginBottom: 3 }}>Condition</label>
            <select value={form.condition} onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value }))}>
              {["Good", "Fair", "Damaged", "Missing Parts"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 10, color: "#4b5563", display: "block", marginBottom: 3 }}>Received By</label>
            <input
              placeholder="Your name"
              value={form.returnedBy}
              onChange={(e) => setForm((f) => ({ ...f, returnedBy: e.target.value }))}
            />
          </div>
          <div>
            <label style={{ fontSize: 10, color: "#4b5563", display: "block", marginBottom: 3 }}>Notes</label>
            <textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => onSubmit(form)}>
              Confirm Return
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
