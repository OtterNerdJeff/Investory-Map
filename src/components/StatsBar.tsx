interface Stats {
  total: number;
  operational: number;
  faulty: number;
  maintenance: number;
  condemned: number;
  loaned: number;
  openFaults: number;
  expiringSoon: number;
  warrantyExpired: number;
}

interface StatsBarProps {
  stats: Stats;
  onClickTotal: () => void;
}

export default function StatsBar({ stats, onClickTotal }: StatsBarProps) {
  const counters: Array<{ label: string; v: number; c: string; click?: () => void }> = [
    { label: "Total", v: stats.total, c: "#818cf8", click: onClickTotal },
    { label: "OK", v: stats.operational, c: "#4ade80" },
    { label: "Faulty", v: stats.faulty, c: "#f87171" },
    { label: "Maint.", v: stats.maintenance, c: "#fcd34d" },
    { label: "Condemned", v: stats.condemned, c: "#fb923c" },
    { label: "On Loan", v: stats.loaned, c: "#c084fc" },
    { label: "Open Faults", v: stats.openFaults, c: "#f97316" },
    { label: "Expiring ⚠", v: stats.expiringSoon, c: "#facc15" },
    { label: "Expired ✗", v: stats.warrantyExpired, c: "#ef4444" },
  ];

  return (
    <div style={{ padding: "10px 16px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(78px,1fr))", gap: 6, flexShrink: 0 }}>
      {counters.map(s => (
        <div key={s.label} onClick={s.click}
          style={{ background: "#0d1117", border: "1px solid #1e2432", borderRadius: 6, padding: "7px 8px", textAlign: "center", cursor: s.click ? "pointer" : "default", transition: "border .15s" }}
          onMouseEnter={s.click ? (e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "#6366f1"; } : undefined}
          onMouseLeave={s.click ? (e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "#1e2432"; } : undefined}>
          <div style={{ fontSize: 17, fontWeight: 500, color: s.c, fontFamily: "'Space Grotesk',sans-serif", lineHeight: 1 }}>{s.v}</div>
          <div style={{ fontSize: 9, color: "#374151", marginTop: 2 }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}
