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
  onClickStat: (key: string) => void;
}

export default function StatsBar({ stats, onClickStat }: StatsBarProps) {
  const counters: Array<{ label: string; v: number; c: string }> = [
    { label: "Total", v: stats.total, c: "#4f46e5" },
    { label: "OK", v: stats.operational, c: "#16a34a" },
    { label: "Faulty", v: stats.faulty, c: "#dc2626" },
    { label: "Maint.", v: stats.maintenance, c: "#d97706" },
    { label: "Condemned", v: stats.condemned, c: "#c2410c" },
    { label: "On Loan", v: stats.loaned, c: "#7c3aed" },
    { label: "Open Faults", v: stats.openFaults, c: "#c2410c" },
    { label: "Expiring ⚠", v: stats.expiringSoon, c: "#d97706" },
    { label: "Expired ✗", v: stats.warrantyExpired, c: "#ef4444" },
  ];

  return (
    <div style={{ padding: "10px 16px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(78px,1fr))", gap: 6, flexShrink: 0 }}>
      {counters.map(s => (
        <div
          key={s.label}
          onClick={() => onClickStat(s.label)}
          title={`Click to filter by ${s.label}`}
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 6,
            padding: "7px 8px",
            textAlign: "center",
            cursor: "pointer",
            transition: "border .15s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = s.c + "88"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#e2e8f0"; }}
        >
          <div style={{ fontSize: 17, fontWeight: 500, color: s.c, fontFamily: "'Space Grotesk',sans-serif", lineHeight: 1 }}>{s.v}</div>
          <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 2 }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}
