"use client";

import React, { useState } from "react";
import { CONDEMNED_SECTION } from "@/lib/constants";

export interface RoomData {
  id: string;
  name: string;
}

export interface SectionData {
  id: string;
  name: string;
  isProtected: boolean;
  rooms: RoomData[];
}

interface SettingsModalProps {
  sectionsData: SectionData[];
  onAddSection: (name: string) => void;
  onRenameSection: (sectionId: string, name: string, currentName: string) => void;
  onDeleteSection: (sectionId: string, sectionName: string) => void;
  onAddRoom: (sectionId: string, name: string) => void;
  onRenameRoom: (sectionId: string, roomId: string, name: string) => void;
  onDeleteRoom: (sectionId: string, roomId: string, redirectTo: string) => void;
  onMoveRoom: (fromSectionId: string, toSectionId: string, roomId: string) => void;
  onClose: () => void;
}

export default function SettingsModal({
  sectionsData,
  onAddSection,
  onRenameSection,
  onDeleteSection,
  onAddRoom,
  onRenameRoom,
  onDeleteRoom,
  onMoveRoom,
  onClose,
}: SettingsModalProps) {
  const [selSecId, setSelSecId] = useState<string>(sectionsData[0]?.id ?? "");
  const [newSec, setNewSec] = useState("");
  const [newRoom, setNewRoom] = useState("");
  const [editSecName, setEditSecName] = useState("");
  const [movingRoom, setMovingRoom] = useState<RoomData | null>(null);
  const [moveRoomTarget, setMoveRoomTarget] = useState("");

  const selectedSection = sectionsData.find((s) => s.id === selSecId) ?? null;
  const otherSections = sectionsData.filter((s) => s.id !== selSecId);

  const handleDeleteRoom = (room: RoomData) => {
    const redirect = window.prompt(
      `Items in "${room.name}" will be moved to which room?\n(Leave blank for "Spare")`,
      "Spare"
    );
    if (redirect === null) return;
    onDeleteRoom(selSecId, room.id, redirect.trim() || "Spare");
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: "min(580px,100%)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, color: "#818cf8" }}>
            Manage Sections & Rooms
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#4b5563", fontSize: 20 }}
          >
            ✕
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 12, minHeight: 300 }}>
          <div>
            <div style={{ fontSize: 10, color: "#4b5563", marginBottom: 6 }}>SECTIONS</div>
            {sectionsData.map((s) => (
              <div
                key={s.id}
                onClick={() => {
                  setSelSecId(s.id);
                  setEditSecName("");
                  setMovingRoom(null);
                }}
                style={{
                  padding: "5px 8px",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 11,
                  marginBottom: 3,
                  background: selSecId === s.id ? "#1a1d2e" : "transparent",
                  color: selSecId === s.id ? "#a5b4fc" : "#9ca3af",
                  border: `1px solid ${selSecId === s.id ? "#374151" : "transparent"}`,
                }}
              >
                {s.name}
              </div>
            ))}
            <div style={{ marginTop: 8, display: "flex", gap: 5 }}>
              <input
                placeholder="New section..."
                value={newSec}
                onChange={(e) => setNewSec(e.target.value)}
                style={{ fontSize: 10 }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newSec.trim()) {
                    onAddSection(newSec.trim());
                    setNewSec("");
                  }
                }}
              />
              <button
                className="btn"
                onClick={() => {
                  if (newSec.trim()) {
                    onAddSection(newSec.trim());
                    setNewSec("");
                  }
                }}
                style={{ padding: "4px 8px" }}
              >
                +
              </button>
            </div>
          </div>
          <div>
            {selectedSection && (
              <>
                <div style={{ display: "flex", gap: 6, marginBottom: 10, alignItems: "center" }}>
                  <input
                    value={editSecName || selectedSection.name}
                    onChange={(e) => setEditSecName(e.target.value)}
                    style={{ fontSize: 11, flex: 1 }}
                  />
                  <button
                    className="btn"
                    onClick={() => {
                      if (editSecName && editSecName !== selectedSection.name) {
                        onRenameSection(selectedSection.id, editSecName, selectedSection.name);
                        setEditSecName("");
                      }
                    }}
                    style={{ padding: "4px 8px" }}
                  >
                    Rename
                  </button>
                  {selectedSection.name !== CONDEMNED_SECTION && !selectedSection.isProtected && (
                    <button
                      className="btn btn-danger"
                      onClick={() => {
                        if (
                          confirm(
                            `Delete section "${selectedSection.name}"? All rooms within will be removed.`
                          )
                        ) {
                          onDeleteSection(selectedSection.id, selectedSection.name);
                          setSelSecId(sectionsData[0]?.id ?? "");
                        }
                      }}
                      style={{ padding: "4px 8px" }}
                    >
                      Del
                    </button>
                  )}
                </div>

                {movingRoom && (
                  <div
                    style={{
                      background: "#1a1d2e",
                      border: "1px solid #6366f1",
                      borderRadius: 6,
                      padding: 10,
                      marginBottom: 10,
                    }}
                  >
                    <div style={{ fontSize: 11, color: "#a5b4fc", marginBottom: 6 }}>
                      Move &quot;{movingRoom.name}&quot; to:
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <select
                        value={moveRoomTarget}
                        onChange={(e) => setMoveRoomTarget(e.target.value)}
                        style={{ flex: 1, fontSize: 11 }}
                      >
                        <option value="">— pick section —</option>
                        {otherSections.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                      <button
                        className="btn btn-primary"
                        style={{ padding: "4px 8px", fontSize: 11 }}
                        onClick={() => {
                          if (moveRoomTarget) {
                            onMoveRoom(selSecId, moveRoomTarget, movingRoom.id);
                            setMovingRoom(null);
                            setMoveRoomTarget("");
                          }
                        }}
                      >
                        Move
                      </button>
                      <button
                        className="btn"
                        style={{ padding: "4px 8px", fontSize: 11 }}
                        onClick={() => setMovingRoom(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ fontSize: 10, color: "#4b5563", marginBottom: 6 }}>
                  ROOMS{" "}
                  <span style={{ color: "#2d3748" }}>
                    · rename inline · ↗ move to section · × delete
                  </span>
                </div>
                <div
                  style={{
                    maxHeight: 240,
                    overflow: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    marginBottom: 8,
                  }}
                >
                  {selectedSection.rooms.length === 0 && (
                    <div style={{ fontSize: 11, color: "#2d3748", padding: "10px 0", textAlign: "center" }}>
                      No rooms yet — add one below
                    </div>
                  )}
                  {selectedSection.rooms.map((room) => (
                    <div key={room.id} style={{ display: "flex", gap: 5, alignItems: "center" }}>
                      <input
                        defaultValue={room.name}
                        style={{ fontSize: 10, flex: 1 }}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v && v !== room.name) onRenameRoom(selSecId, room.id, v);
                        }}
                      />
                      <button
                        title="Move to another section"
                        onClick={() => {
                          setMovingRoom(room);
                          setMoveRoomTarget(otherSections[0]?.id ?? "");
                        }}
                        style={{
                          background: "none",
                          border: "1px solid #374151",
                          cursor: "pointer",
                          color: "#818cf8",
                          fontSize: 11,
                          padding: "2px 6px",
                          borderRadius: 3,
                          flexShrink: 0,
                        }}
                      >
                        ↗
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleDeleteRoom(room)}
                        style={{ padding: "3px 7px", fontSize: 10, flexShrink: 0 }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 5 }}>
                  <input
                    placeholder="New room name..."
                    value={newRoom}
                    onChange={(e) => setNewRoom(e.target.value)}
                    style={{ fontSize: 10, flex: 1 }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newRoom.trim()) {
                        onAddRoom(selSecId, newRoom.trim());
                        setNewRoom("");
                      }
                    }}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      if (newRoom.trim()) {
                        onAddRoom(selSecId, newRoom.trim());
                        setNewRoom("");
                      }
                    }}
                    style={{ padding: "4px 8px" }}
                  >
                    Add
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
