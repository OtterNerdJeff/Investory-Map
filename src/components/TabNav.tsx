interface TabNavProps {
  tab: string;
  setTab: (t: string) => void;
}

const TABS: [string, string][] = [
  ["sections", "🗺 Sections"],
  ["list", "📋 List"],
  ["faults", "⚠ Faults"],
  ["loans", "🔄 Loans"],
];

export default function TabNav({ tab, setTab }: TabNavProps) {
  return (
    <div style={{ borderBottom: "1px solid #e2e8f0", padding: "0 16px", display: "flex", gap: 2, flexShrink: 0, overflowX: "auto" }}>
      {TABS.map(([k, l]) => (
        <button key={k} className="tab-btn" onClick={() => setTab(k)}
          style={{ padding: "8px 14px", fontSize: 12, color: tab === k ? "#4338ca" : "#64748b", borderBottom: tab === k ? "2px solid #6366f1" : "2px solid transparent" }}>
          {l}
        </button>
      ))}
    </div>
  );
}
