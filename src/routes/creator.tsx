import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/creator")({
  ssr: false,
  component: CreatorLayout,
});

function CreatorLayout() {
  return (
    <AppShell
      role="creator"
      navItems={[
        { to: "/creator/new",           label: "Buat Konten" },
        { to: "/creator/calendar",      label: "Kalender" },
        { to: "/creator/status",        label: "Status Kontenku" },
        { to: "/creator/metrics",       label: "Metrik Personal" },
        { to: "/creator/notifications", label: "Notifikasi" },
        { to: "/creator/settings",      label: "Pengaturan Akun" },
      ]}
    >
      <Outlet />
    </AppShell>
  );
}
