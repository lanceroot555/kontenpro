import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/lib/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/pending")({
  component: PendingPage,
});

function PendingPage() {
  const auth = useAuth();
  const router = useRouter();

  if (auth.loading) return <div className="min-h-screen flex items-center justify-center">Memuat...</div>;

  if (!auth.user) {
    router.navigate({ to: "/auth", replace: true });
    return null;
  }

  if (auth.profile?.account_status === "approved") {
    if (auth.role === "superadmin") router.navigate({ to: "/superadmin/dashboard", replace: true });
    else if (auth.role === "admin") router.navigate({ to: "/admin/dashboard", replace: true });
    else router.navigate({ to: "/creator/new", replace: true });
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          {auth.profile?.account_status === "rejected" ? "Akses Ditolak" : "Menunggu Persetujuan"}
        </h1>
        <p className="text-muted-foreground mb-6">
          {auth.profile?.account_status === "rejected" 
            ? "Pendaftaran akun Anda telah ditolak oleh Administrator."
            : "Akun Anda telah berhasil didaftarkan. Saat ini sedang menunggu persetujuan dari Super Administrator untuk dapat menggunakan aplikasi."}
        </p>
        <button
          onClick={() => {
            supabase.auth.signOut().then(() => router.navigate({ to: "/auth" }));
          }}
          className="border border-ink bg-white px-6 py-3 text-[12px] uppercase tracking-[0.06em] hover:bg-ink hover:text-white"
        >
          Keluar / Logout
        </button>
      </div>
    </div>
  );
}
