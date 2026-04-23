import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");
  if ((session.user as { role?: string }).role !== "SUPER_ADMIN") redirect("/dashboard");

  return (
    <div style={{ fontFamily: "'DM Mono','Courier New',monospace", background: "#080b12", minHeight: "100vh", color: "#e2e8f0" }}>
      <div style={{ background: "#0d1117", borderBottom: "1px solid #1e2432", padding: "10px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 17, color: "#818cf8" }}>
          ◈ Investory Map — HQ
        </div>
        <div style={{ fontSize: 10, color: "#374151", flexGrow: 1 }}>Super Admin Dashboard</div>
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}
