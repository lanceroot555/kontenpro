import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDate } from "@/lib/kontenpro";

export const Route = createFileRoute("/superadmin/dashboard")({
  component: SuperAdminDashboard,
});

type UserRow = {
  id: string;
  user_id: string;
  full_name: string;
  account_status: "pending" | "approved" | "rejected";
  created_at: string;
  role: "admin" | "creator";
  email: string;
};

function SuperAdminDashboard() {
  const qc = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["superadmin-users"],
    queryFn: async () => {
      // We need to fetch profiles and join with user_roles
      // Also get email if possible, but profiles doesn't have email. 
      // Supabase Edge Functions or admin client is usually needed for auth.users email.
      // But we can just show what's in profiles and roles.
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, account_status, created_at")
        .order("created_at", { ascending: false });
      
      if (pErr) throw pErr;

      const { data: roles, error: rErr } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .neq("role", "superadmin");

      if (rErr) throw rErr;

      const roleMap = new Map(roles.map(r => [r.user_id, r.role]));

      return profiles
        .filter(p => roleMap.has(p.user_id))
        .map(p => ({
          ...p,
          role: roleMap.get(p.user_id) as "admin" | "creator",
        })) as UserRow[];
    }
  });

  async function updateStatus(userId: string, status: "approved" | "rejected") {
    const { error } = await supabase
      .from("profiles")
      .update({ account_status: status })
      .eq("user_id", userId);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`User berhasil di-${status}`);
      qc.invalidateQueries({ queryKey: ["superadmin-users"] });
    }
  }

  if (isLoading) return <div className="text-sm text-muted-foreground">Memuat daftar user...</div>;

  const pending = users.filter(u => u.account_status === "pending");
  const others = users.filter(u => u.account_status !== "pending");

  return (
    <div>
      <div className="label-caps text-muted-foreground">Super Administrator</div>
      <h2 className="text-4xl font-bold tracking-tight mt-1">User Approval</h2>

      <div className="mt-8 space-y-8">
        {/* PENDING TABLE */}
        <section>
          <h3 className="text-xl font-bold mb-4">Menunggu Persetujuan ({pending.length})</h3>
          {pending.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-ink/20 text-muted-foreground text-sm">
              Tidak ada antrean pendaftar baru.
            </div>
          ) : (
            <div className="bg-white border border-ink/15 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-ink text-white">
                  <tr>
                    <th className="label-caps p-3 text-left font-medium">Nama Lengkap</th>
                    <th className="label-caps p-3 text-left font-medium">Tipe Akun</th>
                    <th className="label-caps p-3 text-left font-medium">Tanggal Daftar</th>
                    <th className="label-caps p-3 text-right font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map((u) => (
                    <tr key={u.id} className="border-b border-ink/10 last:border-b-0">
                      <td className="p-3 font-medium">{u.full_name}</td>
                      <td className="p-3"><span className="bg-ink/5 px-2 py-1 text-[11px] uppercase tracking-wider font-bold">{u.role}</span></td>
                      <td className="p-3">{formatDate(u.created_at)}</td>
                      <td className="p-3 text-right space-x-2">
                        <button onClick={() => updateStatus(u.user_id, "approved")} className="bg-[#10A37F] text-white px-3 py-1.5 text-[11px] uppercase tracking-[0.06em] hover:bg-[#0E906F]">
                          Approve
                        </button>
                        <button onClick={() => updateStatus(u.user_id, "rejected")} className="bg-primary text-white px-3 py-1.5 text-[11px] uppercase tracking-[0.06em] hover:bg-[#c20019]">
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* OTHER USERS TABLE */}
        <section>
          <h3 className="text-xl font-bold mb-4">Daftar Pengguna ({others.length})</h3>
          {others.length === 0 ? null : (
            <div className="bg-white border border-ink/15 overflow-x-auto">
              <table className="w-full text-sm opacity-80 hover:opacity-100 transition-opacity">
                <thead className="bg-ink/5 border-b border-ink/15">
                  <tr>
                    <th className="label-caps p-3 text-left font-medium">Nama Lengkap</th>
                    <th className="label-caps p-3 text-left font-medium">Tipe Akun</th>
                    <th className="label-caps p-3 text-left font-medium">Status</th>
                    <th className="label-caps p-3 text-right font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {others.map((u) => (
                    <tr key={u.id} className="border-b border-ink/10 last:border-b-0">
                      <td className="p-3">{u.full_name}</td>
                      <td className="p-3"><span className="bg-ink/5 px-2 py-1 text-[11px] uppercase tracking-wider font-bold">{u.role}</span></td>
                      <td className="p-3">
                        <span className={`px-2 py-1 text-[11px] uppercase tracking-wider font-bold ${u.account_status === "approved" ? "text-[#10A37F]" : "text-primary"}`}>
                          {u.account_status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {u.account_status === "approved" ? (
                          <button onClick={() => updateStatus(u.user_id, "rejected")} className="border border-ink px-3 py-1 text-[10px] uppercase tracking-wider hover:bg-ink hover:text-white">Cabut Akses</button>
                        ) : (
                          <button onClick={() => updateStatus(u.user_id, "approved")} className="border border-ink px-3 py-1 text-[10px] uppercase tracking-wider hover:bg-ink hover:text-white">Pulihkan Akses</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
