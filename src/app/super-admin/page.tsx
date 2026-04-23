"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";

interface SuperAdminStats {
  schools: number;
  users: number;
  totalAssets: number;
  openFaults: number;
  activeLoans: number;
}

interface SchoolCard {
  id: string;
  name: string;
  code: string;
  address?: string;
  _count: { items: number; users: number };
  stats: { operational: number; faulty: number; openFaults: number };
}

const cardStyle: React.CSSProperties = {
  background: "#0d1117",
  border: "1px solid #1e2432",
  borderRadius: 8,
  padding: 16,
};

export default function SuperAdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<SuperAdminStats | null>(null);
  const [schools, setSchools] = useState<SchoolCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [statsData, schoolsData] = await Promise.all([
          api.superAdmin.stats(),
          api.superAdmin.schools.list(),
        ]);
        setStats(statsData as SuperAdminStats);
        setSchools(schoolsData as SchoolCard[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div style={{ color: "#818cf8", fontSize: 14, padding: 32 }}>Loading…</div>
    );
  }

  if (error) {
    return (
      <div style={{ color: "#f87171", fontSize: 14, padding: 32 }}>Error: {error}</div>
    );
  }

  const statCards = [
    { label: "Schools", value: stats?.schools ?? 0 },
    { label: "Total Assets", value: stats?.totalAssets ?? 0 },
    { label: "Open Faults", value: stats?.openFaults ?? 0 },
    { label: "Active Loans", value: stats?.activeLoans ?? 0 },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 20, color: "#e2e8f0" }}>
          Platform Overview
        </div>
        <button
          onClick={() => router.push("/super-admin/onboard")}
          style={{
            background: "#818cf8",
            color: "#080b12",
            border: "none",
            borderRadius: 6,
            padding: "8px 16px",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            fontFamily: "'DM Mono','Courier New',monospace",
          }}
        >
          + Onboard New School
        </button>
      </div>

      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 12, marginBottom: 24 }}>
        {statCards.map((s) => (
          <div key={s.label} style={{ ...cardStyle, textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#818cf8", fontFamily: "'Space Grotesk',sans-serif" }}>
              {s.value}
            </div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Schools Grid */}
      <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 14, color: "#94a3b8", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>
        Schools ({schools.length})
      </div>
      {schools.length === 0 ? (
        <div style={{ ...cardStyle, color: "#64748b", fontSize: 13, textAlign: "center", padding: 32 }}>
          No schools onboarded yet.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
          {schools.map((school) => {
            const total = school._count.items;
            const opPct = total > 0 ? Math.round((school.stats.operational / total) * 100) : 0;
            return (
              <div
                key={school.id}
                onClick={() => router.push(`/super-admin/schools/${school.id}`)}
                style={{
                  ...cardStyle,
                  cursor: "pointer",
                  transition: "border-color 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#818cf8")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#1e2432")}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                  <div>
                    <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 15, color: "#e2e8f0" }}>
                      {school.name}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{school.code}</div>
                  </div>
                  <div style={{ fontSize: 10, color: "#374151", background: "#111827", border: "1px solid #1e2432", borderRadius: 4, padding: "2px 6px" }}>
                    →
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div style={{ background: "#111827", borderRadius: 6, padding: "8px 10px" }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#818cf8" }}>{total}</div>
                    <div style={{ fontSize: 10, color: "#64748b" }}>Assets</div>
                  </div>
                  <div style={{ background: "#111827", borderRadius: 6, padding: "8px 10px" }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#818cf8" }}>{school._count.users}</div>
                    <div style={{ fontSize: 10, color: "#64748b" }}>Users</div>
                  </div>
                  <div style={{ background: "#111827", borderRadius: 6, padding: "8px 10px" }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: school.stats.openFaults > 0 ? "#f87171" : "#4ade80" }}>
                      {school.stats.openFaults}
                    </div>
                    <div style={{ fontSize: 10, color: "#64748b" }}>Open Faults</div>
                  </div>
                  <div style={{ background: "#111827", borderRadius: 6, padding: "8px 10px" }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: opPct >= 80 ? "#4ade80" : opPct >= 50 ? "#fbbf24" : "#f87171" }}>
                      {opPct}%
                    </div>
                    <div style={{ fontSize: 10, color: "#64748b" }}>Operational</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
