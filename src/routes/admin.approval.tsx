import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { StatusBadge, PlatformBadge } from "@/components/swiss";
import { FilePreview, getContentFileUrl } from "@/components/file-preview";
import { formatDate, notify } from "@/lib/kontenpro";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/approval")({
  component: ApprovalQueue,
});

type Row = {
  id: string; title: string; brand_name: string | null; caption: string | null; status: "submitted"|"revision";
  platforms: string[]; scheduled_date: string; revision_comments: string | null;
  hashtags: string[];
  file_url: string | null; post_url: string | null; platform_metrics: any;
  creator: { id: string; full_name: string; user_id: string } | null;
  brands: { name: string; color: string } | null;
};


function ApprovalQueue() {
  const auth = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all"|"submitted"|"revision">("submitted");
  const [reviseId, setReviseId] = useState<string | null>(null);
  const [reviseText, setReviseText] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: rows = [] } = useQuery({
    queryKey: ["approval-queue", filter],
    queryFn: async () => {
      let q = supabase.from("contents")
        .select("id,title,brand_name,caption,status,platforms,scheduled_date,revision_comments,hashtags,file_url,post_url,platform_metrics,creator:profiles!contents_creator_id_fkey(id,full_name,user_id),brands(name,color)")
        .order("scheduled_date", { ascending: true });
      if (filter === "all") q = q.in("status", ["submitted","revision"]);
      else q = q.eq("status", filter);
      const { data, error } = await q;
      if (error) throw error;
      return (data as unknown as Row[]) ?? [];
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel("approval-queue")
      .on("postgres_changes", { event: "*", schema: "public", table: "contents" },
        () => qc.invalidateQueries({ queryKey: ["approval-queue"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  async function approve(r: Row) {
    const { error } = await supabase.from("contents").update({ status: "approved" }).eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    if (r.creator) await notify(r.creator.user_id, "content_approved", `Konten '${r.title}' telah disetujui!`, r.id);
    await supabase.from("revision_history").insert({ content_id: r.id, admin_id: auth.profile?.id, comment: "Approved", status_before: r.status, status_after: "approved" });
    toast.success("Konten di-approve");
    qc.invalidateQueries({ queryKey: ["approval-queue"] });
    qc.invalidateQueries({ queryKey: ["admin-pending-count"] });
  }

  async function submitRevision() {
    if (!reviseId || !reviseText.trim()) return;
    const r = rows.find((x) => x.id === reviseId);
    if (!r) return;
    const { error } = await supabase.from("contents").update({ status: "revision", revision_comments: reviseText.trim() }).eq("id", reviseId);
    if (error) { toast.error(error.message); return; }
    await supabase.from("revision_history").insert({ content_id: reviseId, admin_id: auth.profile?.id, comment: reviseText.trim(), status_before: r.status, status_after: "revision" });
    if (r.creator) await notify(r.creator.user_id, "revision_requested", `Konten '${r.title}' perlu direvisi. Lihat komentar dari Admin.`, reviseId);
    toast.success("Permintaan revisi terkirim");
    setReviseId(null); setReviseText("");
    qc.invalidateQueries({ queryKey: ["approval-queue"] });
    qc.invalidateQueries({ queryKey: ["admin-pending-count"] });
  }

  return (
    <div>
      <div className="label-caps text-muted-foreground">Admin</div>
      <h2 className="text-4xl font-bold tracking-tight mt-1">Approval Queue</h2>

      <div className="flex gap-2 mt-6">
        {(["submitted","revision","all"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 text-sm border ${filter === f ? "bg-ink text-white border-ink" : "bg-white border-ink/30"}`}>
            {f === "all" ? "Semua" : f.charAt(0).toUpperCase()+f.slice(1)}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="mt-6 text-center text-muted-foreground py-12 border border-dashed border-ink/20">
          Tidak ada konten menunggu review. Tim sedang on track. ✓
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="bg-white border border-ink/15 p-5">
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold">{r.title}</h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    {(r.brands || r.brand_name) && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: r.brands?.color || '#000' }} />}
                    <div className="text-sm font-semibold" style={{ color: r.brands?.color || 'inherit' }}>{r.brands?.name || r.brand_name || "Unknown Brand"}</div>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">Kreator: {r.creator?.full_name ?? "—"}</div>
                  <div className="mt-2 flex gap-1 flex-wrap">{r.platforms.map((p) => <PlatformBadge key={p} platform={p} />)}</div>
                  <div className="text-sm text-muted-foreground mt-2">Tayang: {formatDate(r.scheduled_date)}</div>
                  {r.caption && <p className="text-sm mt-3 line-clamp-2">{r.caption.slice(0, 200)}</p>}
                  {r.hashtags?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {r.hashtags.map((tag) => (
                        <span key={tag} className="text-[11px] bg-ink/5 border border-ink/15 px-2 py-0.5 text-primary font-medium">
                          {tag.startsWith("#") ? tag : `#${tag}`}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <StatusBadge status={r.status} />
              </div>

              {r.file_url && <div className="mt-4"><FilePreview path={r.file_url} /></div>}


              {r.file_url && <div className="mt-4"><FileLinkButton path={r.file_url} /></div>}

              <div className="mt-4 flex gap-2 flex-wrap">
                <button onClick={() => approve(r)} className="bg-primary text-white px-5 py-2 text-[12px] uppercase tracking-[0.06em] font-medium">Approve</button>
                <button onClick={() => { setReviseId(r.id); setReviseText(""); }} className="border border-ink px-5 py-2 text-[12px] uppercase tracking-[0.06em] font-medium hover:bg-ink hover:text-white">Minta Revisi</button>
                <button onClick={() => setExpandedId(expandedId === r.id ? null : r.id)} className="label-caps underline ml-auto">History</button>
              </div>

              {expandedId === r.id && <RevisionHistory contentId={r.id} />}
            </div>
          ))}
        </div>
      )}

      {reviseId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setReviseId(null)}>
          <div className="bg-white border border-ink w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-ink/10 label-caps">Minta Revisi</div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-muted-foreground">Tulis komentar revisi untuk Creator.</p>
              <textarea autoFocus rows={5} value={reviseText} onChange={(e) => setReviseText(e.target.value)}
                className="w-full border border-ink p-3 text-[15px]" placeholder="Contoh: Hook awalnya kurang menarik, coba ubah kalimat pertama..." />
            </div>
            <div className="p-5 border-t border-ink/10 flex justify-end gap-2">
              <button onClick={() => setReviseId(null)} className="border border-ink px-5 py-2 text-[12px] uppercase tracking-[0.06em] font-medium">Batal</button>
              <button onClick={submitRevision} disabled={!reviseText.trim()} className="bg-primary text-white px-5 py-2 text-[12px] uppercase tracking-[0.06em] font-medium disabled:opacity-50">Kirim Revisi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FileLinkButton({ path }: { path: string }) {
  const { data: url } = useQuery({
    queryKey: ["approval-file-link", path],
    staleTime: 1000 * 60 * 50,
    queryFn: async () => {
      return getContentFileUrl(path);
    },
  });

  return (
    <a href={url ?? "#"} target="_blank" rel="noreferrer" aria-disabled={!url}
      className={`border border-ink px-5 py-2 text-[12px] uppercase tracking-[0.06em] font-medium hover:bg-ink hover:text-white ${!url ? "pointer-events-none opacity-50" : ""}`}>
      Buka Gambar
    </a>
  );
}

function RevisionHistory({ contentId }: { contentId: string }) {
  const { data = [] } = useQuery({
    queryKey: ["revision-history", contentId],
    queryFn: async () => {
      const { data } = await supabase.from("revision_history")
        .select("id,comment,status_before,status_after,created_at,admin:profiles!revision_history_admin_id_fkey(full_name)")
        .eq("content_id", contentId).order("created_at", { ascending: false });
      return (data as unknown as { id: string; comment: string; status_before: string; status_after: string; created_at: string; admin: { full_name: string } | null }[]) ?? [];
    },
  });
  return (
    <div className="mt-4 border-t border-ink/10 pt-4 space-y-2">
      {data.length === 0 ? <div className="text-sm text-muted-foreground">Belum ada history.</div> :
        data.map((h) => (
          <div key={h.id} className="border-l-2 border-ink/30 pl-3 py-1">
            <div className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{h.admin?.full_name ?? "Admin"} · {h.status_before} → {h.status_after} · {new Date(h.created_at).toLocaleString("id-ID")}</div>
            <div className="text-sm mt-1">{h.comment}</div>
          </div>
        ))}
    </div>
  );
}
