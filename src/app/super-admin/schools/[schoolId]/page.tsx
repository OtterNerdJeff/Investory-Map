"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";

interface SchoolUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface SchoolDetail {
  id: string;
  name: string;
  code: string;
  address?: string;
  createdAt: string;
  users: SchoolUser[];
  _count: { items: number };
  stats: {
    total: number;
    operational: number;
    faulty: number;
    maintenance: number;
    condemned: number;
    loaned: number;
    warrantyExpired: number;
  };
}

interface AddUserForm {
  name: string;
  email: string;
  password: string;
  role: "SCHOOL_ADMIN" | "USER";
}

const cardStyle: React.CSSProperties = {
  background: "#0d1117",
  border: "1px solid #1e2432",
  borderRadius: 8,
  padding: 16,
};

const inputStyle: React.CSSProperties = {
  background: "#111827",
  border: "1px solid #1e2432",
  borderRadius: 6,
  color: "#e2e8f0",
  padding: "7px 10px",
  fontSize: 13,
  fontFamily: "'DM Mono','Courier New',monospace",
  width: "100%",
  boxSizing: "border-box",
};

const ROLE_BADGE_COLOR: Record<string, string> = {
  SUPER_ADMIN: "#818cf8",
  SCHOOL_ADMIN: "#34d399",
  USER: "#94a3b8",
};

export default function SchoolDetailPage({ params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = React.use(params);
  const router = useRouter();
  const [school, setSchool] = useState<SchoolDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [addForm, setAddForm] = useState<AddUserForm>({ name: "", email: "", password: "", role: "USER" });
  const [addError, setAddError] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);

  async function loadSchool() {
    try {
      const data = await api.superAdmin.schools.get(schoolId);
      setSchool(data as SchoolDetail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load school");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSchool();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);
    setAddSuccess(false);
    if (!addForm.name || !addForm.email || !addForm.password) {
      setAddError("Name, email and password are required.");
      return;
    }
    setAddLoading(true);
    try {
      await api.superAdmin.schools.addUser(schoolId, addForm);
      setAddForm({ name: "", email: "", password: "", role: "USER" });
      setAddSuccess(true);
      setLoading(true);
      await loadSchool();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add user");
    } finally {
      setAddLoading(false);
    }
  }

  if (loading) {
    return <div style={{ color: "#818cf8", fontSize: 14, padding: 32 }}>Loading…</div>;
  }

  if (error || !school) {
    return <div style={{ color: "#f87171", fontSize: 14, padding: 32 }}>Error: {error ?? "School not found"}</div>;
  }

  const statItems = [
    { label: "Total", value: school.stats.total, color: "#818cf8" },
    { label: "Operational", value: school.stats.operational, color: "#4ade80" },
    { label: "Faulty", value: school.stats.faulty, color: "#f87171" },
    { label: "Maintenance", value: school.stats.maintenance, color: "#fbbf24" },
    { label: "Condemned", value: school.stats.condemned, color: "#94a3b8" },
    { label: "On Loan", value: school.stats.loaned, color: "#60a5fa" },
    { label: "Warranty Expired", value: school.stats.warrantyExpired, color: "#fb923c" },
  ];

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      {/* Back link */}
      <button
        onClick={() => router.push("/super-admin")}
        style={{
          background: "none",
          border: "none",
          color: "#818cf8",
          cursor: "pointer",
          fontSize: 13,
          padding: 0,
          marginBottom: 16,
          fontFamily: "'DM Mono','Courier New',monospace",
        }}
      >
        ← All Schools
      </button>

      {/* School header */}
      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 22, color: "#e2e8f0" }}>
          {school.name}
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "#64748b" }}>Code: <span style={{ color: "#94a3b8" }}>{school.code}</span></span>
          {school.address && (
            <span style={{ fontSize: 12, color: "#64748b" }}>Address: <span style={{ color: "#94a3b8" }}>{school.address}</span></span>
          )}
          <span style={{ fontSize: 12, color: "#64748b" }}>
            Created: <span style={{ color: "#94a3b8" }}>{new Date(school.createdAt).toLocaleDateString()}</span>
          </span>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(110px,1fr))", gap: 10, marginBottom: 20 }}>
        {statItems.map((s) => (
          <div key={s.label} style={{ ...cardStyle, textAlign: "center", padding: "12px 8px" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color, fontFamily: "'Space Grotesk',sans-serif" }}>
              {s.value}
            </div>
            <div style={{ fontSize: 10, color: "#64748b", marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* User list */}
      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 14, color: "#94a3b8", marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>
          Users ({school.users.length})
        </div>
        {school.users.length === 0 ? (
          <div style={{ color: "#64748b", fontSize: 13 }}>No users yet.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1e2432" }}>
                {["Name", "Email", "Role", "Created"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "6px 8px", color: "#64748b", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {school.users.map((u) => (
                <tr key={u.id} style={{ borderBottom: "1px solid #111827" }}>
                  <td style={{ padding: "8px 8px", color: "#e2e8f0" }}>{u.name}</td>
                  <td style={{ padding: "8px 8px", color: "#94a3b8" }}>{u.email}</td>
                  <td style={{ padding: "8px 8px" }}>
                    <span style={{
                      fontSize: 11,
                      padding: "2px 7px",
                      borderRadius: 4,
                      background: "#111827",
                      color: ROLE_BADGE_COLOR[u.role] ?? "#94a3b8",
                      border: `1px solid ${ROLE_BADGE_COLOR[u.role] ?? "#94a3b8"}33`,
                      fontWeight: 600,
                    }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding: "8px 8px", color: "#64748b", fontSize: 12 }}>
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Add User form */}
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #1e2432" }}>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 13, color: "#818cf8", marginBottom: 12 }}>
            Add User
          </div>
          <form onSubmit={handleAddUser}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 4 }}>Name *</label>
                <input
                  style={inputStyle}
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  placeholder="Full name"
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 4 }}>Email *</label>
                <input
                  style={inputStyle}
                  type="email"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  placeholder="user@school.edu"
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 4 }}>Password *</label>
                <input
                  style={inputStyle}
                  type="password"
                  value={addForm.password}
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  placeholder="Min 8 characters"
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 4 }}>Role</label>
                <select
                  style={inputStyle}
                  value={addForm.role}
                  onChange={(e) => setAddForm({ ...addForm, role: e.target.value as AddUserForm["role"] })}
                >
                  <option value="USER">USER</option>
                  <option value="SCHOOL_ADMIN">SCHOOL_ADMIN</option>
                </select>
              </div>
            </div>
            {addError && <div style={{ color: "#f87171", fontSize: 12, marginBottom: 8 }}>{addError}</div>}
            {addSuccess && <div style={{ color: "#4ade80", fontSize: 12, marginBottom: 8 }}>User added successfully.</div>}
            <button
              type="submit"
              disabled={addLoading}
              style={{
                background: addLoading ? "#374151" : "#818cf8",
                color: "#080b12",
                border: "none",
                borderRadius: 6,
                padding: "8px 18px",
                fontWeight: 700,
                fontSize: 13,
                cursor: addLoading ? "not-allowed" : "pointer",
                fontFamily: "'DM Mono','Courier New',monospace",
              }}
            >
              {addLoading ? "Adding…" : "Add User"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
