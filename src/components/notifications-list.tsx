import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { timeAgo } from "@/lib/kontenpro";

type Notif = { id: string; type: string; message: string; content_id: string | null; is_read: boolean; created_at: string };

export function NotificationsList({ scope }: { scope: "admin" | "creator" }) {
  const auth = useAuth();
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["notifications", auth.user?.id],
    enabled: !!auth.user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications").select("*").eq("user_id", auth.user!.id)
        .order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return (data as Notif[]) ?? [];
    },
  });

  async function markAllRead() {
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", auth.user!.id).eq("is_read", false);
    qc.invalidateQueries({ queryKey: ["notifications"] });
    qc.invalidateQueries({ queryKey: ["notifications-unread"] });
  }
  async function markOne(id: string) {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["notifications"] });
    qc.invalidateQueries({ queryKey: ["notifications-unread"] });
  }

  return (
    <div className="max-w-3xl">
      <div className="label-caps text-muted-foreground">{scope}</div>
      <div className="flex justify-between items-end mt-1">
        <h2 className="text-4xl font-bold tracking-tight">Notifikasi</h2>
        <button onClick={markAllRead} className="label-caps underline">Tandai semua sudah dibaca</button>
      </div>

      {data.length === 0 ? (
        <div className="mt-6 text-center text-muted-foreground py-12 border border-dashed border-ink/20">
          Semua notifikasi sudah dibaca.
        </div>
      ) : (
        <div className="mt-6 bg-white border border-ink/15 divide-y divide-ink/10">
          {data.map((n) => (
            <button key={n.id} onClick={() => markOne(n.id)} className={`w-full text-left p-4 flex items-start justify-between gap-3 hover:bg-[#F5F5F0] ${!n.is_read ? "bg-primary/5" : ""}`}>
              <div>
                <div className="text-sm">{n.message}</div>
                <div className="label-caps text-muted-foreground mt-1">{n.type}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!n.is_read && <span className="h-2 w-2 bg-primary inline-block" />}
                <span className="text-xs text-muted-foreground">{timeAgo(n.created_at)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
