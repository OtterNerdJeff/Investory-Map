"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";

interface OnboardData {
  name: string;
  code: string;
  address: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}

const inputStyle: React.CSSProperties = {
  background: "#111827",
  border: "1px solid #1e2432",
  borderRadius: 6,
  color: "#e2e8f0",
  padding: "8px 12px",
  fontSize: 13,
  fontFamily: "'DM Mono','Courier New',monospace",
  width: "100%",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#64748b",
  display: "block",
  marginBottom: 5,
  textTransform: "uppercase",
  letterSpacing: 0.5,
};

const fieldStyle: React.CSSProperties = {
  marginBottom: 14,
};

export default function OnboardPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardData>({
    name: "",
    code: "",
    address: "",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [createdName, setCreatedName] = useState("");

  function update(field: keyof OnboardData, value: string) {
    setData((prev) => ({ ...prev, [field]: value }));
  }

  function validateStep1() {
    return data.name.trim() !== "" && data.code.trim() !== "";
  }

  function validateStep2() {
    return data.adminName.trim() !== "" && data.adminEmail.trim() !== "" && data.adminPassword.trim() !== "";
  }

  async function handleConfirm() {
    setSubmitError(null);
    setSubmitting(true);
    try {
      await api.superAdmin.schools.create({
        name: data.name,
        code: data.code,
        address: data.address || undefined,
        adminName: data.adminName,
        adminEmail: data.adminEmail,
        adminPassword: data.adminPassword,
      });
      setCreatedName(data.name);
      setSuccess(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create school");
    } finally {
      setSubmitting(false);
    }
  }

  const totalSteps = 3;

  // Step indicator
  const StepIndicator = () => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
      {[1, 2, 3].map((s) => (
        <React.Fragment key={s}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: s === step ? "#818cf8" : s < step ? "#4ade80" : "#1e2432",
            color: s === step ? "#080b12" : s < step ? "#080b12" : "#64748b",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 700,
            flexShrink: 0,
          }}>
            {s < step ? "✓" : s}
          </div>
          {s < totalSteps && (
            <div style={{ height: 1, flex: 1, background: s < step ? "#4ade80" : "#1e2432" }} />
          )}
        </React.Fragment>
      ))}
      <div style={{ fontSize: 11, color: "#64748b", marginLeft: 8, whiteSpace: "nowrap" }}>
        Step {step}/{totalSteps}
      </div>
    </div>
  );

  if (success) {
    return (
      <div style={{ maxWidth: 480, margin: "40px auto", background: "#0d1117", border: "1px solid #1e2432", borderRadius: 10, padding: 32, textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>✓</div>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 20, color: "#4ade80", marginBottom: 8 }}>
          School Onboarded
        </div>
        <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 24 }}>
          <strong style={{ color: "#e2e8f0" }}>{createdName}</strong> has been created successfully with an admin account.
        </div>
        <button
          onClick={() => router.push("/super-admin")}
          style={{
            background: "#818cf8",
            color: "#080b12",
            border: "none",
            borderRadius: 6,
            padding: "10px 24px",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            fontFamily: "'DM Mono','Courier New',monospace",
          }}
        >
          ← Back to HQ
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480, margin: "32px auto" }}>
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
          marginBottom: 20,
          fontFamily: "'DM Mono','Courier New',monospace",
        }}
      >
        ← All Schools
      </button>

      <div style={{ background: "#0d1117", border: "1px solid #1e2432", borderRadius: 10, padding: 28 }}>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 18, color: "#e2e8f0", marginBottom: 4 }}>
          Onboard New School
        </div>
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 20 }}>
          Set up a new school tenant on the platform.
        </div>

        <StepIndicator />

        {/* Step 1: School Details */}
        {step === 1 && (
          <div>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 14, color: "#818cf8", marginBottom: 16 }}>
              School Details
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>School Name *</label>
              <input
                style={inputStyle}
                value={data.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="e.g. Damansara High School"
                autoFocus
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>School Code *</label>
              <input
                style={inputStyle}
                value={data.code}
                onChange={(e) => update("code", e.target.value.toUpperCase())}
                placeholder="e.g. DHS"
                maxLength={10}
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Address (optional)</label>
              <input
                style={inputStyle}
                value={data.address}
                onChange={(e) => update("address", e.target.value)}
                placeholder="Full address"
              />
            </div>
            <button
              onClick={() => setStep(2)}
              disabled={!validateStep1()}
              style={{
                background: validateStep1() ? "#818cf8" : "#1e2432",
                color: validateStep1() ? "#080b12" : "#64748b",
                border: "none",
                borderRadius: 6,
                padding: "9px 22px",
                fontWeight: 700,
                fontSize: 13,
                cursor: validateStep1() ? "pointer" : "not-allowed",
                fontFamily: "'DM Mono','Courier New',monospace",
                marginTop: 4,
              }}
            >
              Next →
            </button>
          </div>
        )}

        {/* Step 2: Admin Account */}
        {step === 2 && (
          <div>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 14, color: "#818cf8", marginBottom: 16 }}>
              Admin Account
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Admin Name *</label>
              <input
                style={inputStyle}
                value={data.adminName}
                onChange={(e) => update("adminName", e.target.value)}
                placeholder="Full name"
                autoFocus
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Admin Email *</label>
              <input
                style={inputStyle}
                type="email"
                value={data.adminEmail}
                onChange={(e) => update("adminEmail", e.target.value)}
                placeholder="admin@school.edu"
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Admin Password *</label>
              <input
                style={inputStyle}
                type="password"
                value={data.adminPassword}
                onChange={(e) => update("adminPassword", e.target.value)}
                placeholder="Min 8 characters"
              />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button
                onClick={() => setStep(1)}
                style={{
                  background: "none",
                  border: "1px solid #1e2432",
                  color: "#94a3b8",
                  borderRadius: 6,
                  padding: "9px 18px",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: "'DM Mono','Courier New',monospace",
                }}
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!validateStep2()}
                style={{
                  background: validateStep2() ? "#818cf8" : "#1e2432",
                  color: validateStep2() ? "#080b12" : "#64748b",
                  border: "none",
                  borderRadius: 6,
                  padding: "9px 22px",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: validateStep2() ? "pointer" : "not-allowed",
                  fontFamily: "'DM Mono','Courier New',monospace",
                }}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Confirm */}
        {step === 3 && (
          <div>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 14, color: "#818cf8", marginBottom: 16 }}>
              Review & Confirm
            </div>

            <div style={{ background: "#111827", borderRadius: 8, padding: 16, marginBottom: 16, fontSize: 13 }}>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
                School
              </div>
              {[
                { label: "Name", value: data.name },
                { label: "Code", value: data.code },
                ...(data.address ? [{ label: "Address", value: data.address }] : []),
              ].map((r) => (
                <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #1e2432" }}>
                  <span style={{ color: "#64748b" }}>{r.label}</span>
                  <span style={{ color: "#e2e8f0" }}>{r.value}</span>
                </div>
              ))}
            </div>

            <div style={{ background: "#111827", borderRadius: 8, padding: 16, marginBottom: 20, fontSize: 13 }}>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
                Admin Account
              </div>
              {[
                { label: "Name", value: data.adminName },
                { label: "Email", value: data.adminEmail },
                { label: "Password", value: "••••••••" },
                { label: "Role", value: "SCHOOL_ADMIN" },
              ].map((r) => (
                <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #1e2432" }}>
                  <span style={{ color: "#64748b" }}>{r.label}</span>
                  <span style={{ color: "#e2e8f0" }}>{r.value}</span>
                </div>
              ))}
            </div>

            {submitError && (
              <div style={{ color: "#f87171", fontSize: 12, marginBottom: 12, background: "#1a0a0a", border: "1px solid #7f1d1d", borderRadius: 6, padding: "8px 12px" }}>
                {submitError}
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setStep(2)}
                disabled={submitting}
                style={{
                  background: "none",
                  border: "1px solid #1e2432",
                  color: "#94a3b8",
                  borderRadius: 6,
                  padding: "9px 18px",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: submitting ? "not-allowed" : "pointer",
                  fontFamily: "'DM Mono','Courier New',monospace",
                }}
              >
                ← Back
              </button>
              <button
                onClick={handleConfirm}
                disabled={submitting}
                style={{
                  background: submitting ? "#374151" : "#4ade80",
                  color: "#080b12",
                  border: "none",
                  borderRadius: 6,
                  padding: "9px 22px",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: submitting ? "not-allowed" : "pointer",
                  fontFamily: "'DM Mono','Courier New',monospace",
                }}
              >
                {submitting ? "Creating…" : "Confirm & Create"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
