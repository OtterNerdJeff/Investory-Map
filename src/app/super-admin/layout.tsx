import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "SUPER_ADMIN") redirect("/dashboard");

  return (
    <div style={{ fontFamily: "'DM Mono','Courier New',monospace", background: "#f8fafc", minHeight: "100vh", color: "#1e293b" }}>
      <div style={{ background: "#ffffff", borderBottom: "1px solid #e2e8f0", padding: "10px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 17, color: "#4f46e5" }}>
          ◈ Investory Map — HQ
        </div>
        <div style={{ fontSize: 10, color: "#94a3b8", flexGrow: 1 }}>Super Admin Dashboard</div>
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}
