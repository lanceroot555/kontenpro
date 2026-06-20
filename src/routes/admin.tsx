import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";

export const Route = createFileRoute("/admin")({
  ssr: false,
  component: AdminLayout,
});

function AdminLayout() {
  const auth = useAuth();
  const { data: pending = 0 } = useQuery({
    queryKey: ["admin-pending-count"],
    enabled: !!auth.user && auth.role === "admin",
    queryFn: async () => {
      const { count } = await supabase
        .from("contents").select("id", { count: "exact", head: true })
        .eq("status", "submitted");
      return count ?? 0;
    },
    refetchInterval: 15000,
  });

  return (
    <AppShell
      role="admin"
      navItems={[
        { to: "/admin/dashboard",     label: "Overview" },
        { to: "/admin/brands",        label: "Manajemen Klien" },
        { to: "/admin/approval",      label: "Approval Queue", badge: pending },
        { to: "/admin/contents",      label: "Konten Tim" },
        { to: "/admin/calendar",      label: "Kalender" },
        { to: "/admin/notifications", label: "Notifikasi" },
      ]}
    >
      <Outlet />
    </AppShell>
  );
}
