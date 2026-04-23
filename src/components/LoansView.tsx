"use client";

import React, { useState } from "react";
import { getTypeIcon } from "@/lib/constants";
import type { Item } from "@/components/ItemChip";

interface LoansViewProps {
  items: Item[];
  onSelectItem: (item: Item) => void;
  onReturn: (item: Item) => void;
  onLoanOut: (item: Item) => void;
}

export default function LoansView({ items, onSelectItem, onReturn, onLoanOut }: LoansViewProps) {
  const [showAll, setShowAll] = useState(false);

  const loaned = items.filter(i => i.isLoaned);
  const byPerson: Record<string, Item[]> = {};
  loaned.forEach(i => {
    const p = (i.loanedTo as string) || "Unknown";
    if (!byPerson[p]) byPerson[p] = [];
    byPerson[p].push(i);
  });
  const sorted = Object.entries(byPerson).sort((a, b) => a[0].localeCompare(b[0]));
  const loanable = items.filter(i => Boolean(i.loanable) && !i.isLoaned);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, color: "#818cf8" }}>
          {loaned.length} items on loan · {sorted.length} people
        </div>
        <button className="btn" onClick={() => setShowAll(!showAll)} style={{ marginLeft: "auto" }}>
          {showAll ? "Hide" : "Show"} available ({loanable.length})
        </button>
      </div>

      {showAll && (
        <div style={{ marginBottom: 16, background: "#0d1117", border: "1px solid #1e2432", borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 11, color: "#818cf8", marginBottom: 8 }}>Available loanable items</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {loanable.map(i => (
              <div key={i.id} style={{ background: "#080b12", border: "1px solid #1e2432", borderRadius: 4, padding: "4px 8px", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 10 }}>{getTypeIcon(i.type)}</span>
                <span style={{ fontSize: 11, color: "#e2e8f0", cursor: "pointer" }} onClick={() => onSelectItem(i)}>{i.label}</span>
                <span style={{ fontSize: 10, color: "#374151" }}>{i.location}</span>
                <button className="btn" onClick={() => onLoanOut(i)} style={{ padding: "2px 6px", fontSize: 10 }}>Loan</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10 }}>
        {sorted.map(([person, pitems]) => {
          const isJeff = person === "Jeff (Custody)";
          return (
            <div key={person} style={{ background: "#0d1117", border: `1px solid ${isJeff ? "#6366f1" : "#1e2432"}`, borderRadius: 8, padding: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: isJeff ? "#1e2240" : "#1a1d2e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#818cf8", fontWeight: 500, flexShrink: 0 }}>
                  {person.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: isJeff ? "#818cf8" : "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{person}</div>
                  <div style={{ fontSize: 9, color: "#374151" }}>{pitems.length} item{pitems.length !== 1 ? "s" : ""}{isJeff ? " · custody" : ""}</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {pitems.map(item => (
                  <div key={item.id} style={{ background: "#080b12", border: "1px solid #1e2432", borderRadius: 4, padding: "3px 7px", display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ fontSize: 10, flexShrink: 0 }}>{getTypeIcon(item.type)}</span>
                    <span style={{ fontSize: 10, color: "#e2e8f0", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer" }} onClick={() => onSelectItem(item)}>{item.label}</span>
                    <button onClick={() => onReturn(item)} style={{ background: "none", border: "none", cursor: "pointer", color: "#4ade80", fontSize: 9, flexShrink: 0 }} title="Return">↩</button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
