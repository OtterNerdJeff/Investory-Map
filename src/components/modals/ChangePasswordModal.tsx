"use client";

import React, { useState } from "react";

interface ChangePasswordModalProps {
  onClose: () => void;
}

export default function ChangePasswordModal({ onClose }: ChangePasswordModalProps) {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.next.length < 8) { setError("New password must be at least 8 characters."); return; }
    if (form.next !== form.confirm) { setError("New passwords do not match."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: form.current, newPassword: form.next }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { setError(data.error ?? "Failed to update password"); return; }
      setSuccess(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 15, color: "#4338ca" }}>
            🔑 Change Password
          </span>
          <button className="btn" onClick={onClose} style={{ padding: "2px 8px" }}>✕</button>
        </div>

        {success ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
            <div style={{ color: "#16a34a", fontSize: 13, marginBottom: 20 }}>Password updated successfully.</div>
            <button className="btn btn-primary" onClick={onClose}>Done</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 4 }}>Current Password</label>
              <input
                type="password"
                value={form.current}
                onChange={e => setForm(f => ({ ...f, current: e.target.value }))}
                placeholder="Your current password"
                required
                autoFocus
              />
            </div>
            <div>
              <label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 4 }}>New Password</label>
              <input
                type="password"
                value={form.next}
                onChange={e => setForm(f => ({ ...f, next: e.target.value }))}
                placeholder="Min 8 characters"
                required
              />
            </div>
            <div>
              <label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 4 }}>Confirm New Password</label>
              <input
                type="password"
                value={form.confirm}
                onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                placeholder="Repeat new password"
                required
              />
            </div>
            {error && (
              <div style={{ background: "#fee2e2", border: "1px solid #ef4444", borderRadius: 5, padding: "8px 12px", color: "#dc2626", fontSize: 12 }}>
                {error}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button type="submit" disabled={loading} className="btn btn-primary" style={{ flex: 1 }}>
                {loading ? "Updating..." : "Change Password"}
              </button>
              <button type="button" className="btn" onClick={onClose}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
