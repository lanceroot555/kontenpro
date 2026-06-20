import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Bell, LogOut, Menu, X } from "lucide-react";
import { useAuth, type AppRole } from "@/lib/use-auth";
import { toast } from "sonner";
import { GlobalSearch } from "@/components/global-search";

type NavItem = { to: string; label: string; badge?: number };

export function AppShell({
  role,
  navItems,
  children,
}: {
  role: AppRole;
  navItems: NavItem[];
  children: React.ReactNode;
}) {
  const auth = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Role gate
  useEffect(() => {
    if (auth.loading) return;
    if (!auth.user) { router.navigate({ to: "/auth" }); return; }
    if (auth.profile?.account_status !== "approved") {
      router.navigate({ to: "/pending" });
      return;
    }
    if (auth.role && auth.role !== role) {
      if (auth.role === "superadmin") router.navigate({ to: "/superadmin/dashboard" });
      else if (auth.role === "admin") router.navigate({ to: "/admin/dashboard" });
      else router.navigate({ to: "/creator/new" });
    }
  }, [auth.loading, auth.user, auth.role, auth.profile?.account_status, role, router]);

  // Unread notifications count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["notifications-unread", auth.user?.id],
    enabled: !!auth.user,
    queryFn: async () => {
      const { count } = await supabase
        .from("notifications").select("id", { count: "exact", head: true })
        .eq("user_id", auth.user!.id).eq("is_read", false);
      return count ?? 0;
    },
  });

  // Realtime notifications
  useEffect(() => {
    if (!auth.user) return;
    const ch = supabase
      .channel(`notif-${auth.user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${auth.user.id}` }, (payload) => {
        qc.invalidateQueries({ queryKey: ["notifications-unread"] });
        qc.invalidateQueries({ queryKey: ["notifications"] });
        if (payload.eventType === "INSERT") {
          const msg = (payload.new as { message?: string })?.message;
          if (msg) toast(msg);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [auth.user, qc]);

  async function handleLogout() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  if (auth.loading || !auth.user) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">Memuat...</div>;
  }

  const initials = (auth.profile?.full_name || auth.user.email || "U").split(" ").map((s) => s[0]).slice(0,2).join("").toUpperCase();

  return (
    <div className="min-h-screen flex bg-[#F5F5F0]">
      {/* Sidebar */}
      <aside className={`${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 fixed md:sticky top-0 z-50 md:z-auto w-60 h-screen bg-ink text-white flex flex-col transition-transform`}>
        <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-5 w-5 bg-primary" />
            <span className="font-bold tracking-tight">KONTENPRO</span>
          </Link>
          <button className="md:hidden" onClick={() => setMobileOpen(false)}><X className="h-5 w-5" /></button>
        </div>
        <nav className="flex-1 py-4">
          {navItems.map((item) => {
            const active = pathname === item.to || pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={`block px-5 py-3 text-sm border-l-2 ${active ? "border-primary bg-white/5 text-white" : "border-transparent text-white/70 hover:text-white hover:bg-white/5"}`}
              >
                <span className="flex items-center justify-between">
                  <span>{item.label}</span>
                  {item.badge ? <span className="bg-primary text-white px-1.5 py-0.5 text-[10px] font-bold">{item.badge}</span> : null}
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            {auth.profile?.avatar_url ? (
              <img src={auth.profile.avatar_url} alt="avatar" className="h-8 w-8 object-cover flex-shrink-0" />
            ) : (
              <div className="h-8 w-8 bg-primary flex items-center justify-center text-[11px] font-bold flex-shrink-0">{initials}</div>
            )}
            <div className="text-sm min-w-0">
              <div className="font-medium truncate max-w-[140px]">{auth.profile?.full_name}</div>
              <div className="text-[10px] uppercase tracking-[0.08em] text-white/50">{role}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full text-left text-sm text-white/70 hover:text-white flex items-center gap-2">
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="bg-white border-b border-ink/10 h-14 flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button className="md:hidden" onClick={() => setMobileOpen(true)}><Menu className="h-5 w-5" /></button>
            <h1 className="text-sm uppercase tracking-[0.08em] font-medium">
              {navItems.find((n) => pathname === n.to || pathname.startsWith(n.to + "/"))?.label || "Dashboard"}
            </h1>
          </div>
          <GlobalSearch role={role} />
          <Link
            to={role === "superadmin" ? "/superadmin/notifications" : role === "admin" ? "/admin/notifications" : "/creator/notifications"}
            className="relative"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-bold h-4 min-w-4 px-1 flex items-center justify-center">{unreadCount}</span>
            )}
          </Link>
        </header>
        <main className="flex-1 p-6 md:p-10">{children}</main>
      </div>
    </div>
  );
}
