"use client";

import React from "react";
import { APP_TITLE, fmtDate, getTypeIcon, isExpired } from "@/lib/constants";
import type { Item } from "@/components/ItemChip";

interface ReportModalProps {
  items: Item[];
  onClose: () => void;
}

export default function ReportModal({ items, onClose }: ReportModalProps) {
  const byType: Record<string, number> = {};
  const byBrand: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  items.forEach((i) => {
    byType[i.type] = (byType[i.type] || 0) + 1;
    const brand = i.brand || "Unknown";
    byBrand[brand] = (byBrand[brand] || 0) + 1;
    byStatus[i.status] = (byStatus[i.status] || 0) + 1;
  });
  const expired = items.filter((i) => isExpired(i.warrantyEnd));

  const printReport = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const typeRows = Object.entries(byType)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`)
      .join("");
    const brandRows = Object.entries(byBrand)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`)
      .join("");
    const statusRows = Object.entries(byStatus)
      .map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`)
      .join("");
    const expiredRows = expired
      .map(
        (i) =>
          `<tr><td>${i.label}</td><td>${i.brand}</td><td>${i.model}</td><td>${i.location}</td><td>${fmtDate(
            i.warrantyEnd
          )}</td></tr>`
      )
      .join("");
    w.document.write(
      `<html><head><title>${APP_TITLE} — Report</title><style>body{font-family:monospace;padding:20px;color:#000}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:6px 10px;font-size:12px}th{background:#f0f0f0}h2{margin-top:20px}@media print{button{display:none}}</style></head><body>`
    );
    w.document.write(
      `<h1>${APP_TITLE} — Inventory Report</h1><p>Generated: ${new Date().toLocaleString(
        "en-SG"
      )}</p><p>Total items: ${items.length}</p>`
    );
    w.document.write(`<h2>By Type</h2><table><tr><th>Type</th><th>Count</th></tr>${typeRows}</table>`);
    w.document.write(`<h2>By Brand</h2><table><tr><th>Brand</th><th>Count</th></tr>${brandRows}</table>`);
    w.document.write(`<h2>By Status</h2><table><tr><th>Status</th><th>Count</th></tr>${statusRows}</table>`);
    w.document.write(
      `<h2>Warranty Expired (${expired.length})</h2><table><tr><th>Label</th><th>Brand</th><th>Model</th><th>Location</th><th>Expired</th></tr>${expiredRows}</table>`
    );
    w.document.write(`<br><button onclick="window.print()">Print</button></body></html>`);
    w.document.close();
  };

  const summaryRows: Array<[string, number, string]> = [
    ["Total", items.length, "#818cf8"],
    ["Operational", items.filter((i) => i.status === "Operational").length, "#4ade80"],
    ["On Loan", items.filter((i) => i.isLoaned).length, "#c084fc"],
    ["Expired Warranty", expired.length, "#ef4444"],
    [
      "Open Faults",
      items.reduce((n, i) => n + (i.faults || []).filter((f) => f.status !== "Resolved").length, 0),
      "#f97316",
    ],
    ["Condemned", items.filter((i) => i.status === "Waiting for Condemnation").length, "#fb923c"],
  ];

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: "min(600px,100%)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14, alignItems: "center" }}>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, color: "#818cf8" }}>
            {APP_TITLE} — Inventory Report
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn" onClick={printReport}>
              🖨 Print
            </button>
            <button
              onClick={onClose}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#4b5563", fontSize: 20 }}
            >
              ×
            </button>
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(90px,1fr))",
            gap: 8,
            marginBottom: 14,
          }}
        >
          {summaryRows.map(([l, v, c]) => (
            <div
              key={l}
              style={{
                background: "#080b12",
                border: "1px solid #1e2432",
                borderRadius: 6,
                padding: "8px 10px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 500,
                  color: c,
                  fontFamily: "'Space Grotesk',sans-serif",
                }}
              >
                {v}
              </div>
              <div style={{ fontSize: 9, color: "#374151", marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: "#818cf8", marginBottom: 6 }}>By Type</div>
            {Object.entries(byType)
              .sort((a, b) => b[1] - a[1])
              .map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "3px 0",
                    borderBottom: "1px solid #0d1117",
                    fontSize: 11,
                  }}
                >
                  <span style={{ color: "#9ca3af" }}>
                    {getTypeIcon(k)} {k}
                  </span>
                  <span style={{ color: "#e2e8f0" }}>{v}</span>
                </div>
              ))}
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#818cf8", marginBottom: 6 }}>By Brand</div>
            {Object.entries(byBrand)
              .sort((a, b) => b[1] - a[1])
              .map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "3px 0",
                    borderBottom: "1px solid #0d1117",
                    fontSize: 11,
                  }}
                >
                  <span style={{ color: "#9ca3af" }}>{k}</span>
                  <span style={{ color: "#e2e8f0" }}>{v}</span>
                </div>
              ))}
          </div>
        </div>
        {expired.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 11, color: "#ef4444", marginBottom: 6 }}>Warranty Expired ({expired.length})</div>
            <div style={{ maxHeight: 140, overflow: "auto" }}>
              {expired.map((i) => (
                <div
                  key={i.id}
                  style={{
                    display: "flex",
                    gap: 8,
                    fontSize: 10,
                    padding: "2px 0",
                    borderBottom: "1px solid #0d1117",
                  }}
                >
                  <span style={{ color: "#818cf8", minWidth: 80 }}>{i.label}</span>
                  <span style={{ color: "#9ca3af", flex: 1 }}>
                    {i.brand} {i.model}
                  </span>
                  <span style={{ color: "#374151" }}>{i.location}</span>
                  <span style={{ color: "#ef4444" }}>{fmtDate(i.warrantyEnd)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
