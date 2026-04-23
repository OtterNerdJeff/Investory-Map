"use client";

import React from "react";
import { getTypeIcon, getStatusColor, isExpired } from "@/lib/constants";

export interface Item {
  id: string;
  label: string;
  type: string;
  brand: string;
  model: string;
  status: string;
  location: string;
  isLoaned: boolean;
  warrantyEnd: string | null;
  faults: Array<{ status: string }>;
  [key: string]: unknown;
}

interface ItemChipProps {
  item: Item;
  onSelect: (e: React.MouseEvent) => void;
  onDragStart: (e: React.DragEvent, item: Item) => void;
  onDragEnd: () => void;
  onMove: () => void;
  isSelected: boolean;
  onToggleSelect: (id: string, shiftHeld: boolean) => void;
}

export default function ItemChip({
  item,
  onSelect,
  onDragStart,
  onDragEnd,
  onMove,
  isSelected,
  onToggleSelect,
}: ItemChipProps) {
  const s = getStatusColor(item.status);
  const openF = (item.faults || []).filter((f) => f.status !== "Resolved").length;

  return (
    <div
      className="chip"
      draggable
      onDragStart={(e) => onDragStart(e, item)}
      onDragEnd={onDragEnd}
      style={{
        background: isSelected ? "#1e2240" : "#080b12",
        border: `1px solid ${isSelected ? "#6366f1" : s.border}`,
        padding: "3px 6px",
        display: "flex",
        alignItems: "center",
        gap: 4,
        outline: isSelected ? "2px solid #6366f1" : undefined,
        outlineOffset: -1,
      }}
    >
      <span style={{ fontSize: 10, flexShrink: 0 }}>{getTypeIcon(item.type)}</span>
      <div
        style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
        onClick={(e) => onSelect(e)}
      >
        <div
          style={{
            fontSize: 10,
            color: isSelected ? "#a5b4fc" : "#e2e8f0",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {item.label}
        </div>
        <div style={{ fontSize: 9, color: "#374151" }}>
          {item.brand} {item.model}
        </div>
      </div>
      {openF > 0 && (
        <span style={{ fontSize: 9, color: "#fca5a5", flexShrink: 0 }}>⚠{openF}</span>
      )}
      {item.isLoaned && (
        <span style={{ fontSize: 9, color: "#c084fc", flexShrink: 0 }}>📤</span>
      )}
      {isExpired(item.warrantyEnd) && (
        <span style={{ fontSize: 9, color: "#ef4444", flexShrink: 0 }}>W!</span>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect(item.id, true);
        }}
        title="Shift+click or tap ✓ to multi-select"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: isSelected ? "#6366f1" : "#1e2432",
          fontSize: 10,
          padding: "0 1px",
          flexShrink: 0,
        }}
      >
        ✓
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onMove();
        }}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#374151",
          fontSize: 10,
          padding: "0 1px",
          flexShrink: 0,
        }}
      >
        ⇄
      </button>
    </div>
  );
}
