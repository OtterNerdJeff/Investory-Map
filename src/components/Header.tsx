"use client";

import { signOut } from "next-auth/react";

interface HeaderProps {
  moveLogCount: number;
  isAdmin: boolean;
  onReport: () => void;
  onExportCSV: () => void;
  onImport: () => void;
  onMoveLog: () => void;
  onSettings: () => void;
  userName: string;
}

const APP_TITLE = "Inventory Map";
const APP_SUBTITLE = "Room-based Asset & Inventory Manager";

export default function Header({
  moveLogCount, isAdmin, onReport, onExportCSV, onImport, onMoveLog, onSettings, userName,
}: HeaderProps) {
  return (
    <div style={{ background: "#0a0d18", borderBottom: "1px solid #1a1f35", padding: "10px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#4f46e5,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, boxShadow: "0 0 12px rgba(99,102,241,0.4)" }}>◈</div>
        <div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 16, color: "#a5b4fc", letterSpacing: "-.3px" }}>{APP_TITLE}</div>
          <div style={{ fontSize: 9, color: "#374151" }}>{APP_SUBTITLE}</div>
        </div>
      </div>
      <div style={{ flexGrow: 1 }} />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <button className="btn" onClick={onReport} style={{ color: "#a5b4fc" }}>📊 Report</button>
        <button className="btn" onClick={onExportCSV}>⬇ CSV</button>
        {isAdmin && <button className="btn" onClick={onImport}>⬆ Import</button>}
        <button className="btn" onClick={onMoveLog}>📋 Log ({moveLogCount})</button>
        {isAdmin && <button className="btn" onClick={onSettings}>⚙ Sections</button>}
        {userName && <span style={{ fontSize: 11, color: "#4b5563", marginLeft: 4 }}>{userName}</span>}
        <button className="btn" onClick={() => signOut({ callbackUrl: "/login" })} style={{ color: "#ef4444" }}>Sign Out</button>
      </div>
    </div>
  );
}
