"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

function safeCallback(raw: string | null): string {
  if (!raw) return "/dashboard";
  if (!raw.startsWith("/")) return "/dashboard";
  if (raw.startsWith("//")) return "/dashboard";
  if (raw.includes("\\")) return "/dashboard";
  return raw;
}

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password");
      return;
    }

    const callbackUrl = safeCallback(searchParams.get("callbackUrl"));
    router.push(callbackUrl);
    router.refresh();
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8fafc",
        fontFamily: "'DM Mono','Courier New',monospace",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          padding: 32,
          width: "min(400px, 90vw)",
          boxShadow: "0 4px 24px rgba(15,23,42,0.08)",
        }}
      >
        <div
          style={{
            fontFamily: "'Space Grotesk',sans-serif",
            fontWeight: 600,
            fontSize: 20,
            color: "#4f46e5",
            marginBottom: 4,
            textAlign: "center",
          }}
        >
          ◈ Investory Map
        </div>
        <div
          style={{
            fontSize: 11,
            color: "#64748b",
            textAlign: "center",
            marginBottom: 24,
          }}
        >
          School Asset Management
        </div>

        {error && (
          <div
            style={{
              background: "#fee2e2",
              border: "1px solid #ef4444",
              borderRadius: 6,
              padding: "8px 12px",
              color: "#dc2626",
              fontSize: 12,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label
            style={{
              fontSize: 10,
              color: "#64748b",
              display: "block",
              marginBottom: 4,
            }}
          >
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              background: "#f8fafc",
              border: "1px solid #cbd5e1",
              color: "#1e293b",
              borderRadius: 5,
              padding: "9px 12px",
              fontFamily: "inherit",
              fontSize: 13,
              width: "100%",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label
            style={{
              fontSize: 10,
              color: "#64748b",
              display: "block",
              marginBottom: 4,
            }}
          >
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              background: "#f8fafc",
              border: "1px solid #cbd5e1",
              color: "#1e293b",
              borderRadius: 5,
              padding: "9px 12px",
              fontFamily: "inherit",
              fontSize: 13,
              width: "100%",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            background: "#3730a3",
            border: "1px solid #6366f1",
            color: "#fff",
            padding: "10px 16px",
            borderRadius: 6,
            cursor: loading ? "wait" : "pointer",
            fontFamily: "inherit",
            fontSize: 13,
            fontWeight: 500,
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}
