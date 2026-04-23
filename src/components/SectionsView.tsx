"use client";

import React from "react";
import ItemChip, { Item } from "./ItemChip";

interface SectionsViewProps {
  items: Item[];
  sections: Record<string, string[]>;
  activeSection: string;
  setActiveSection: (s: string) => void;
  onSelectItem: (item: Item) => void;
  onAddItem: (location: string) => void;
  onDragItemStart: (e: React.DragEvent, item: Item) => void;
  onDragItemEnd: () => void;
  onRoomDragOver: (e: React.DragEvent, room: string) => void;
  onRoomDrop: (e: React.DragEvent, room: string) => void;
  dragOverRoom: string | null;
  onRoomCardDragStart: (e: React.DragEvent, room: string) => void;
  onRoomCardDrop: (e: React.DragEvent, room: string, section: string) => void;
  onMoveItem: (item: Item) => void;
  dragItem: Item | null;
  dragRoom: string | null;
  selectedItems: Set<string>;
  onToggleSelect: (id: string, shiftHeld: boolean) => void;
}

export default function SectionsView({
  items,
  sections,
  activeSection,
  setActiveSection,
  onSelectItem,
  onAddItem,
  onDragItemStart,
  onDragItemEnd,
  onRoomDragOver,
  onRoomDrop,
  dragOverRoom,
  onRoomCardDragStart,
  onRoomCardDrop,
  onMoveItem,
  dragItem,
  dragRoom,
  selectedItems,
  onToggleSelect,
}: SectionsViewProps) {
  const rooms = sections[activeSection] || [];

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
          marginBottom: 14,
          alignItems: "center",
        }}
      >
        {Object.keys(sections).map((s) => (
          <button
            key={s}
            className={`sec-btn${activeSection === s ? " active" : ""}`}
            onClick={() => setActiveSection(s)}
          >
            {s}
          </button>
        ))}
      </div>

      <div style={{ fontSize: 10, color: "#374151", marginBottom: 10 }}>
        Shift+click items to multi-select · drag chips or room headers to reorder
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))",
          gap: 10,
        }}
      >
        {rooms.map((room) => {
          const roomItems = items.filter((i) => i.location === room);
          const hasIssue = roomItems.some((i) => i.status === "Faulty");
          const hasMaint = roomItems.some((i) =>
            ["Under Maintenance"].includes(i.status)
          );
          const isCondemned = roomItems.some(
            (i) => i.status === "Waiting for Condemnation"
          );
          const openF = roomItems.reduce(
            (n, i) =>
              n + (i.faults || []).filter((f) => f.status !== "Resolved").length,
            0
          );
          const isDropTarget = dragOverRoom === room;

          return (
            <div
              key={room}
              className={`room-card${isDropTarget ? " drop-target" : ""}`}
              style={{
                background: isDropTarget ? "#1a1d2e" : "#0d1117",
                border: `1px solid ${
                  hasIssue
                    ? "#dc2626"
                    : hasMaint
                    ? "#f59e0b"
                    : isCondemned
                    ? "#f97316"
                    : "#1e2432"
                }`,
                padding: 10,
              }}
              draggable
              onDragStart={(e) => onRoomCardDragStart(e, room)}
              onDragOver={(e) => {
                onRoomDragOver(e, room);
                e.preventDefault();
              }}
              onDrop={(e) => {
                if (dragItem) {
                  onRoomDrop(e, room);
                } else if (dragRoom && dragRoom !== room) {
                  const fi = rooms.indexOf(dragRoom);
                  const ti = rooms.indexOf(room);
                  if (fi >= 0 && ti >= 0) {
                    onRoomCardDrop(e, room, activeSection);
                  }
                }
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: "#818cf8",
                    fontFamily: "'Space Grotesk',sans-serif",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: "75%",
                  }}
                  title={room}
                >
                  ⠿ {room}
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 4,
                    alignItems: "center",
                    flexShrink: 0,
                  }}
                >
                  {openF > 0 && (
                    <span
                      className="badge"
                      style={{
                        background: "#7f1d1d",
                        color: "#fca5a5",
                        fontSize: 9,
                      }}
                    >
                      ⚠{openF}
                    </span>
                  )}
                  <button
                    onClick={() => onAddItem(room)}
                    style={{
                      background: "#1a1d2e",
                      border: "1px solid #2d3748",
                      color: "#818cf8",
                      width: 18,
                      height: 18,
                      borderRadius: 3,
                      cursor: "pointer",
                      fontSize: 12,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    +
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 3,
                  minHeight: 24,
                }}
              >
                {roomItems.length === 0 && (
                  <div
                    style={{
                      fontSize: 10,
                      color: "#1e2432",
                      textAlign: "center",
                      padding: "6px 0",
                    }}
                  >
                    empty
                  </div>
                )}
                {roomItems.map((item) => (
                  <ItemChip
                    key={item.id}
                    item={item}
                    onSelect={(e) => {
                      if (e?.shiftKey) onToggleSelect(item.id, true);
                      else onSelectItem(item);
                    }}
                    onDragStart={onDragItemStart}
                    onDragEnd={onDragItemEnd}
                    onMove={() => onMoveItem(item)}
                    isSelected={selectedItems.has(item.id)}
                    onToggleSelect={onToggleSelect}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
