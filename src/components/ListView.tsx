"use client";

import React from "react";
import { Item } from "@/components/ItemChip";
import {
  getStatusColor,
  getTypeIcon,
  isExpired,
  expiringSoon,
  fmtDate,
} from "@/lib/constants";

interface ListViewProps {
  items: Item[];
  search: string;
  setSearch: (v: string) => void;
  filterType: string;
  setFilterType: (v: string) => void;
  filterStatus: string;
  setFilterStatus: (v: string) => void;
  onSelectItem: (item: Item) => void;
}

export default function ListView({
  items,
  search,
  setSearch,
  filterType,
  setFilterType,
  filterStatus,
  setFilterStatus,
  onSelectItem,
}: ListViewProps) {
  const types = ["All", ...new Set(items.map((i) => i.type).filter(Boolean))];
  const filtered = items.filter((i) => {
    const q = search.toLowerCase();
    const mq =
      !q ||
      [
        i.label,
        i.brand,
        i.model,
        i.serial as string,
        i.location,
        i.assetCode as string,
        i.type,
      ].some((v) => v?.toLowerCase().includes(q));
    const typeMatch = filterType === "All" || i.type === filterType;
    let statusMatch: boolean;
    if (filterStatus === "All") statusMatch = true;
    else if (filterStatus === "__expiring__") statusMatch = expiringSoon(i.warrantyEnd);
    else if (filterStatus === "__expired__") statusMatch = isExpired(i.warrantyEnd);
    else statusMatch = i.status === filterStatus;
    return mq && typeMatch && statusMatch;
  });

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <input
          placeholder="🔍 Search label, serial, brand, model, location..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 0 }}
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{ flex: "1 1 110px", minWidth: 0 }}
        >
          {types.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ flex: "1 1 130px", minWidth: 0 }}
        >
          <option value="All">All Status</option>
          {[
            "Operational",
            "Spare",
            "Waiting for Condemnation",
            "Under Maintenance",
            "Faulty",
            "Others",
          ].map((s) => (
            <option key={s}>{s}</option>
          ))}
          <option value="__expiring__">⚠ Warranty Expiring Soon</option>
          <option value="__expired__">✗ Warranty Expired</option>
        </select>
      </div>
      <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 6 }}>
        {filtered.length} items — click any row to open floating detail window
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
              {["Label", "Type", "Brand", "Model", "Serial", "Location", "Cost", "Warranty", "Status", "Loan"].map(
                (h) => (
                  <th
                    key={h}
                    style={{
                      padding: "5px 7px",
                      textAlign: "left",
                      color: "#94a3b8",
                      fontWeight: 400,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => {
              const s2 = getStatusColor(item.status);
              const openF = (item.faults || []).filter(
                (f) => f.status !== "Resolved"
              ).length;
              return (
                <tr
                  key={item.id}
                  onClick={() => onSelectItem(item)}
                  style={{
                    borderBottom: "1px solid #ffffff",
                    cursor: "pointer",
                    transition: "background .1s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#ffffff")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "")
                  }
                >
                  <td style={{ padding: "4px 7px", color: "#4f46e5" }}>
                    {item.label}
                    {openF > 0 && (
                      <span style={{ color: "#dc2626", marginLeft: 4, fontSize: 9 }}>
                        ⚠{openF}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "4px 7px", color: "#94a3b8", whiteSpace: "nowrap" }}>
                    {getTypeIcon(item.type)} {item.type}
                  </td>
                  <td style={{ padding: "4px 7px" }}>{item.brand}</td>
                  <td style={{ padding: "4px 7px", color: "#64748b" }}>{item.model}</td>
                  <td
                    style={{
                      padding: "4px 7px",
                      color: "#cbd5e1",
                      fontFamily: "monospace",
                      fontSize: 10,
                    }}
                  >
                    {item.serial as string}
                  </td>
                  <td style={{ padding: "4px 7px", color: "#475569" }}>{item.location}</td>
                  <td style={{ padding: "4px 7px", color: "#16a34a" }}>
                    {item.cost
                      ? `$${Number(item.cost as string).toLocaleString()}`
                      : "—"}
                  </td>
                  <td
                    style={{
                      padding: "4px 7px",
                      color: isExpired(item.warrantyEnd)
                        ? "#ef4444"
                        : expiringSoon(item.warrantyEnd)
                        ? "#d97706"
                        : "#94a3b8",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {fmtDate(item.warrantyEnd)}
                  </td>
                  <td style={{ padding: "4px 7px" }}>
                    <span
                      className="badge"
                      style={{ background: s2.badge, color: s2.text }}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td style={{ padding: "4px 7px" }}>
                    {item.isLoaned && (
                      <span
                        style={{
                          color: "#7c3aed",
                          fontSize: 10,
                          whiteSpace: "nowrap",
                        }}
                      >
                        📤 {item.loanedTo as string}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
