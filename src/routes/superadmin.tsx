import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/superadmin")({
  ssr: false,
  component: SuperadminLayout,
});

function SuperadminLayout() {
  return (
    <AppShell
      role="superadmin"
      navItems={[
        { to: "/superadmin/dashboard", label: "User Approval" },
        { to: "/superadmin/settings",  label: "Pengaturan Akun" },
      ]}
    >
      <Outlet />
    </AppShell>
  );
}
