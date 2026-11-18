interface TabNavProps {
  tab: string;
  setTab: (t: string) => void;
  faultReportCount?: number;
  condemnedCount?: number;
}

const TABS: [string, string][] = [
  ["sections", "🗺 Sections"],
  ["list", "📋 List"],
  ["faults", "⚠ Faults"],
  ["loans", "🔄 Loans"],
  ["condemned", "🗑 Condemned Items"],
];

export default function TabNav({ tab, setTab, faultReportCount, condemnedCount }: TabNavProps) {
  return (
    <div style={{ borderBottom: "1px solid #e2e8f0", padding: "0 16px", display: "flex", gap: 2, flexShrink: 0, overflowX: "auto" }}>
      {TABS.map(([k, l]) => (
        <button key={k} className="tab-btn" onClick={() => setTab(k)}
          style={{ padding: "8px 14px", fontSize: 12, color: tab === k ? "#4338ca" : "#64748b", borderBottom: tab === k ? "2px solid #6366f1" : "2px solid transparent", position: "relative" }}>
          {l}
          {k === "faults" && faultReportCount !== undefined && faultReportCount > 0 && (
            <span style={{
              marginLeft: 4,
              background: "#f59e0b",
              color: "#ffffff",
              fontSize: 9,
              fontWeight: 700,
              padding: "1px 5px",
              borderRadius: 99,
              verticalAlign: "top",
            }}>
              {faultReportCount}
            </span>
          )}
          {k === "condemned" && condemnedCount !== undefined && condemnedCount > 0 && (
            <span style={{ marginLeft: 4, color: "#94a3b8", fontSize: 10 }}>
              ({condemnedCount})
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
