import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { StatusBadge, PlatformBadge } from "@/components/swiss";
import { formatDate, notifyAdmins, PLATFORMS } from "@/lib/kontenpro";
import { toast } from "sonner";
import { FilePreview } from "@/components/file-preview";
import { Upload, X, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/creator/status")({
  component: StatusPage,
});

type ContentType = "viral" | "related" | "evergreen";

const CONTENT_TYPE_CONFIG: Record<ContentType, { label: string; color: string }> = {
  viral:     { label: "Viral",    color: "bg-orange-100 text-orange-700 border-orange-200" },
  related:   { label: "Related",  color: "bg-blue-100 text-blue-700 border-blue-200" },
  evergreen: { label: "Evergreen",color: "bg-green-100 text-green-700 border-green-200" },
};

export type Content = {
  id: string; title: string; brand_name: string | null; status: "draft"|"submitted"|"revision"|"approved"|"published";
  platforms: string[]; scheduled_date: string; created_at: string; updated_at: string;
  caption: string | null; copywriting: string | null; notes: string | null; hashtags: string[];
  post_url: string | null; revision_comments: string | null; file_url: string | null;
  likes: number; views: number; shares: number; engagement_rate: number; platform_metrics: any;
  content_type: ContentType | null;
  brands: { name: string; color: string } | null;
};

function StatusPage() {
  const auth = useAuth();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  const [open, setOpen] = useState<Content | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Edit form states
  const [editTitle, setEditTitle] = useState("");
  const [editPlatforms, setEditPlatforms] = useState<string[]>([]);
  const [editScheduledDate, setEditScheduledDate] = useState("");
  const [editCaption, setEditCaption] = useState("");
  const [editCopywriting, setEditCopywriting] = useState("");
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editFileErr, setEditFileErr] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Update Stats states
  const [editingStats, setEditingStats] = useState<Content | null>(null);
  const [statsForm, setStatsForm] = useState({ post_url: "", likes: 0, views: 0, shares: 0 });
  const [savingStats, setSavingStats] = useState(false);

  const { data: contents = [] } = useQuery({
    queryKey: ["creator-status", auth.profile?.id],
    enabled: !!auth.profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contents")
        .select("*,brands(name,color)")
        .eq("creator_id", auth.profile!.id)
        .order("scheduled_date", { ascending: false });
      if (error) throw error;
      return (data as Content[]) ?? [];
    },
  });

  // Realtime
  useEffect(() => {
    if (!auth.profile) return;
    const ch = supabase
      .channel(`status-${auth.profile.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "contents", filter: `creator_id=eq.${auth.profile.id}` },
        () => qc.invalidateQueries({ queryKey: ["creator-status"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [auth.profile, qc]);

  const filtered = contents.filter((c) =>
    (statusFilter === "all" || c.status === statusFilter) &&
    (platformFilter === "all" || c.platforms.includes(platformFilter)) &&
    (!dateFrom || c.scheduled_date >= dateFrom) &&
    (!dateTo || c.scheduled_date <= dateTo)
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  function startEdit(c: Content) {
    setEditTitle(c.title);
    setEditPlatforms(c.platforms);
    setEditScheduledDate(c.scheduled_date);
    setEditCaption(c.caption || "");
    setEditCopywriting(c.copywriting || "");
    setEditFile(null);
    setEditFileErr(null);
    setEditMode(true);
  }

  function startUpdateStats(c: Content) {
    setEditingStats(c);
    setStatsForm({ post_url: c.post_url ?? "", likes: c.likes, views: c.views, shares: c.shares });
  }

  async function saveStats() {
    if (!editingStats) return;
    setSavingStats(true);
    try {
      const er = statsForm.views > 0 ? ((statsForm.likes + statsForm.shares) / statsForm.views) * 100 : 0;
      const { error } = await supabase.from("contents").update({
        post_url: statsForm.post_url || null,
        likes: statsForm.likes, views: statsForm.views, shares: statsForm.shares,
        engagement_rate: Number(er.toFixed(2)),
      }).eq("id", editingStats.id);
      if (error) throw error;
      toast.success("Statistik tersimpan");
      setEditingStats(null);
      qc.invalidateQueries({ queryKey: ["creator-status"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setSavingStats(false); }
  }

  async function resubmit() {
    if (!open) return;
    setIsUploading(true);
    let newFileUrl = open.file_url;
    if (editFile && auth.user) {
      const ext = editFile.name.split(".").pop();
      const path = `${auth.user.id}/${open.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("content-files").upload(path, editFile, { upsert: false });
      if (uploadErr) { toast.error("Gagal upload lampiran: " + uploadErr.message); setIsUploading(false); return; }
      newFileUrl = path;
    }

    const { error } = await supabase.from("contents").update({ 
      title: editTitle,
      platforms: editPlatforms,
      scheduled_date: editScheduledDate,
      caption: editCaption,
      copywriting: editCopywriting,
      file_url: newFileUrl,
      status: "submitted" 
    }).eq("id", open.id);
    
    if (error) { toast.error(error.message); setIsUploading(false); return; }
    await notifyAdmins("content_resubmitted", `Konten '${editTitle}' telah direvisi dan menunggu review ulang.`, open.id);
    toast.success("Konten direvisi dan dikirim ulang ke Admin");
    qc.invalidateQueries({ queryKey: ["creator-status"] });
    setOpen(null);
    setEditMode(false);
    setIsUploading(false);
  }

  return (
    <div>
      <div className="label-caps text-muted-foreground">Creator</div>
      <h2 className="text-4xl font-bold tracking-tight mt-1">Status Kontenku</h2>

      <div className="flex gap-3 mt-6">
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="border border-ink p-2 bg-white text-sm">
          <option value="all">Semua Status</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="revision">Revision</option>
          <option value="approved">Approved</option>
          <option value="published">Published</option>
        </select>
        <select value={platformFilter} onChange={(e) => { setPlatformFilter(e.target.value); setPage(1); }} className="border border-ink p-2 bg-white text-sm">
          <option value="all">Semua Platform</option>
          <option value="instagram">Instagram</option>
          <option value="tiktok">TikTok</option>
          <option value="twitter">Twitter</option>
          <option value="youtube">YouTube</option>
          <option value="linkedin">LinkedIn</option>
        </select>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Tayang:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="border border-ink p-2 bg-white text-sm"
          />
          <span className="text-xs text-muted-foreground">–</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="border border-ink p-2 bg-white text-sm"
          />
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(""); setDateTo(""); setPage(1); }}
              className="text-xs text-primary underline whitespace-nowrap"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6 text-center text-muted-foreground py-12 border border-dashed border-ink/20">
          Kamu belum punya konten. Mulai buat konten pertamamu.
        </div>
      ) : (
        <div className="mt-6 bg-white border border-ink/15 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink text-white">
              <tr>
                <th className="label-caps p-3 text-left font-medium">Judul Konten & Brand</th>
                <th className="label-caps p-3 text-left font-medium">Tayang</th>
                <th className="label-caps p-3 text-left font-medium">Status</th>
                <th className="label-caps p-3 text-left font-medium">Link Post</th>
                <th className="label-caps p-3 text-left font-medium">
                  <div className="flex items-center gap-1.5 group relative w-fit">
                    Views
                    <AlertCircle className="w-3.5 h-3.5 text-white/70 hover:text-white cursor-help" />
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 p-2.5 bg-white text-ink text-[11px] leading-relaxed text-center rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none z-50 normal-case tracking-normal shadow-xl border border-ink/10 font-medium">
                      Harap di isi perkembangan konten secara rutin agar dapat termonitoring
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-[1px] border-4 border-transparent border-b-white"></div>
                    </div>
                  </div>
                </th>
                <th className="label-caps p-3 text-left font-medium">Likes</th>
                <th className="label-caps p-3 text-left font-medium">Shares</th>
                <th className="label-caps p-3 text-left font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((c) => (
                <StatusRow
                  key={c.id}
                  c={c}
                  qc={qc}
                  onDetail={() => { setOpen(c); setEditMode(false); }}
                  onRevisi={() => { setOpen(c); startEdit(c); }}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="border border-ink px-4 py-2 text-[12px] uppercase tracking-[0.06em] font-medium hover:bg-ink hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← Prev
          </button>
          <span className="text-sm text-muted-foreground">
            Halaman {page} dari {totalPages} &nbsp;·&nbsp; {filtered.length} konten
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="border border-ink px-4 py-2 text-[12px] uppercase tracking-[0.06em] font-medium hover:bg-ink hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      )}

      {/* Existing Detail/Edit Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end" onClick={() => setOpen(null)}>
          <div className="bg-white w-full max-w-lg h-full overflow-auto border-l border-ink" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-ink/10 flex justify-between items-center sticky top-0 bg-white z-10">
              <StatusBadge status={open.status} />
              <button onClick={() => setOpen(null)} className="label-caps">Tutup</button>
            </div>
            
            <div className="p-5 space-y-4 text-sm">
              {open.status === "revision" && open.revision_comments && (
                <div className="border-l-4 border-primary bg-primary/5 p-3 mb-4">
                  <div className="label-caps text-primary">Revisi dari Admin</div>
                  <p className="text-sm mt-1">{open.revision_comments}</p>
                </div>
              )}

              {!editMode ? (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-2xl font-bold tracking-tight">{open.title}</h3>
                    {open.content_type && CONTENT_TYPE_CONFIG[open.content_type] && (
                      <span className={`text-[11px] uppercase tracking-[0.06em] font-semibold px-2 py-1 border ${CONTENT_TYPE_CONFIG[open.content_type].color}`}>
                        {CONTENT_TYPE_CONFIG[open.content_type].label}
                      </span>
                    )}
                  </div>
                  {open.brand_name && <><div className="label-caps text-muted-foreground">Brand</div><div>{open.brand_name}</div></>}
                  <div className="label-caps text-muted-foreground">Platform</div><div className="flex gap-1 flex-wrap">{open.platforms.map((p) => <PlatformBadge key={p} platform={p} />)}</div>
                  <div className="label-caps text-muted-foreground">Tayang</div><div>{formatDate(open.scheduled_date)}</div>
                  {open.caption && <><div className="label-caps text-muted-foreground">Caption</div><p className="whitespace-pre-wrap">{open.caption}</p></>}
                  {open.copywriting && <><div className="label-caps text-muted-foreground">Copywriting</div><p className="whitespace-pre-wrap">{open.copywriting}</p></>}
                  {open.hashtags?.length > 0 && <><div className="label-caps text-muted-foreground">Hashtags</div><div className="flex flex-wrap gap-1">{open.hashtags.map(t => <span key={t} className="bg-ink/5 px-2 py-1 text-xs">#{t}</span>)}</div></>}
                  {open.file_url && <><div className="label-caps text-muted-foreground">Lampiran</div><FilePreview path={open.file_url} /></>}
                  {open.notes && <><div className="label-caps text-muted-foreground">Catatan</div><p className="whitespace-pre-wrap">{open.notes}</p></>}
                  {open.post_url && <><div className="label-caps text-muted-foreground">Link Post</div><a href={open.post_url} target="_blank" rel="noreferrer" className="underline break-all">{open.post_url}</a></>}
                  
                  {open.status === "revision" && (
                    <div className="pt-4 border-t border-ink/10">
                      <button onClick={() => startEdit(open)} className="w-full bg-primary text-white py-3 text-[12px] uppercase tracking-[0.06em] font-medium hover:bg-[#c20019]">
                        Edit & Resubmit
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <div className="label-caps text-primary mb-4 border-b border-ink/10 pb-2">Mode Revisi</div>
                  
                  <div>
                    <label className="label-caps block mb-1">Judul Konten</label>
                    <input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="w-full border border-ink p-2" />
                  </div>
                  
                  <div>
                    <label className="label-caps block mb-1">Platform</label>
                    <div className="flex flex-wrap gap-2">
                      {PLATFORMS.map((p) => {
                        const on = editPlatforms.includes(p.key);
                        return (
                          <button key={p.key} type="button" onClick={() => setEditPlatforms((prev) => on ? prev.filter((x) => x !== p.key) : [...prev, p.key])}
                            className={`px-3 py-1 text-xs border ${on ? "bg-ink text-white border-ink" : "bg-white border-ink/40"}`}>
                            {p.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="label-caps block mb-1">Tanggal Tayang</label>
                    <input type="date" value={editScheduledDate} onChange={e => setEditScheduledDate(e.target.value)} className="w-full border border-ink p-2" />
                  </div>

                  <div>
                    <label className="label-caps block mb-1">Caption</label>
                    <textarea rows={4} value={editCaption} onChange={e => setEditCaption(e.target.value)} className="w-full border border-ink p-2 resize-y" />
                  </div>

                  <div>
                    <label className="label-caps block mb-1">Copywriting / Hook</label>
                    <textarea rows={3} value={editCopywriting} onChange={e => setEditCopywriting(e.target.value)} className="w-full border border-ink p-2 resize-y" />
                  </div>

                  <div>
                    <label className="label-caps block mb-1">Ganti Lampiran (opsional)</label>
                    <label className="block border-2 border-dashed border-ink/30 p-4 text-center cursor-pointer hover:border-ink">
                      <input type="file" accept="image/jpeg,image/png,image/gif,video/mp4,video/quicktime,video/webm" className="hidden" onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          if (f.size > 50 * 1024 * 1024) setEditFileErr("File terlalu besar (maks 50MB)");
                          else { setEditFile(f); setEditFileErr(null); }
                        }
                      }} />
                      {editFile ? (
                        <div className="text-sm">{editFile.name}</div>
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-sm text-muted-foreground">
                          <Upload className="h-5 w-5" />
                          <span>Klik atau drop file baru</span>
                        </div>
                      )}
                    </label>
                    {editFileErr && <p className="text-sm text-primary mt-1">{editFileErr}</p>}
                    {!editFile && open.file_url && <p className="text-xs text-muted-foreground mt-1">Biarkan kosong jika tidak ingin mengubah lampiran saat ini.</p>}
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-ink/10">
                    <button onClick={() => setEditMode(false)} disabled={isUploading} className="flex-1 border border-ink py-3 text-[12px] uppercase tracking-[0.06em] font-medium hover:bg-ink hover:text-white disabled:opacity-50">Batal</button>
                    <button onClick={resubmit} disabled={isUploading} className="flex-1 bg-primary text-white py-3 text-[12px] uppercase tracking-[0.06em] font-medium hover:bg-[#c20019] disabled:opacity-50">
                      {isUploading ? "Menyimpan..." : "Simpan & Resubmit"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusRow({ c, onDetail, onRevisi, qc }: { c: Content, onDetail: ()=>void, onRevisi: ()=>void, qc: any }) {
  const isPublished = c.status === "published";
  
  const [metrics, setMetrics] = useState<Record<string, { likes: number; views: number; shares: number; url: string }>>(() => {
    const init = c.platform_metrics || {};
    const state: any = {};
    const isLegacy = Object.keys(init).length === 0 && (c.views > 0 || c.likes > 0 || c.shares > 0 || !!c.post_url);
    
    c.platforms.forEach((p, idx) => {
      if (isLegacy && idx === 0) {
        state[p] = {
          likes: c.likes || 0,
          views: c.views || 0,
          shares: c.shares || 0,
          url: c.post_url || ""
        };
      } else {
        state[p] = {
          likes: init[p]?.likes || 0,
          views: init[p]?.views || 0,
          shares: init[p]?.shares || 0,
          url: init[p]?.url || ""
        };
      }
    });
    return state;
  });

  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    let totalViews = 0;
    let totalLikes = 0;
    let totalShares = 0;
    
    Object.values(metrics).forEach(m => {
      totalViews += m.views;
      totalLikes += m.likes;
      totalShares += m.shares;
    });

    const er = totalViews > 0 ? ((totalLikes + totalShares) / totalViews) * 100 : 0;
    
    const { error } = await supabase.from("contents").update({
      platform_metrics: metrics,
      views: totalViews,
      likes: totalLikes,
      shares: totalShares,
      engagement_rate: Number(er.toFixed(2)),
      post_url: c.platforms.length > 0 ? metrics[c.platforms[0]]?.url || null : null
    }).eq("id", c.id);
    
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Statistik tersimpan");
    qc.invalidateQueries({ queryKey: ["creator-status"] });
  }

  async function markPublished(e: React.MouseEvent) {
    e.stopPropagation();
    setSaving(true);
    const { error } = await supabase.from("contents").update({
      status: "published"
    }).eq("id", c.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Konten berhasil ditandai sebagai tayang (Published)!");
    qc.invalidateQueries({ queryKey: ["creator-status"] });
  }

  return (
    <tr className="border-b border-ink/10 last:border-b-0 hover:bg-[#F5F5F0]">
      <td className="p-3 cursor-pointer" onClick={onDetail}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium">{c.title}</span>
          {c.content_type && CONTENT_TYPE_CONFIG[c.content_type] && (
            <span className={`text-[10px] uppercase tracking-[0.06em] font-semibold px-1.5 py-0.5 border ${CONTENT_TYPE_CONFIG[c.content_type].color}`}>
              {CONTENT_TYPE_CONFIG[c.content_type].label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-1">
           {(c.brands || c.brand_name) && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.brands?.color || '#000' }} />}
           <div className="text-xs font-semibold" style={{ color: c.brands?.color || 'inherit' }}>{c.brands?.name || c.brand_name || "Unknown Brand"}</div>
        </div>
        <div className="flex gap-1 flex-wrap mt-2">{c.platforms.map((p) => <PlatformBadge key={p} platform={p} />)}</div>
        {c.status === "revision" && c.revision_comments && <div className="text-primary text-xs mt-1">Revisi diminta.</div>}
      </td>
      <td className="p-3 whitespace-nowrap">{formatDate(c.scheduled_date)}</td>
      <td className="p-3"><StatusBadge status={c.status} /></td>
      
      {isPublished ? (
        <>
          <td className="p-3 space-y-2">
            {c.platforms.map(p => (
              <div key={p} className="flex gap-2 items-center">
                 <div className="w-16 truncate text-[10px] font-bold uppercase text-muted-foreground" title={p}>{p}</div>
                 <input value={metrics[p].url} onChange={e => setMetrics({...metrics, [p]: {...metrics[p], url: e.target.value}})} placeholder="https..." className="w-24 border border-ink p-1.5 text-xs bg-white" />
              </div>
            ))}
          </td>
          <td className="p-3 space-y-2">
            {c.platforms.map(p => (
              <input key={p} type="number" min={0} value={metrics[p].views} onChange={e => setMetrics({...metrics, [p]: {...metrics[p], views: Number(e.target.value)}})} className="w-16 block border border-ink p-1.5 text-xs bg-white" />
            ))}
          </td>
          <td className="p-3 space-y-2">
            {c.platforms.map(p => (
              <input key={p} type="number" min={0} value={metrics[p].likes} onChange={e => setMetrics({...metrics, [p]: {...metrics[p], likes: Number(e.target.value)}})} className="w-16 block border border-ink p-1.5 text-xs bg-white" />
            ))}
          </td>
          <td className="p-3 space-y-2">
            {c.platforms.map(p => (
              <input key={p} type="number" min={0} value={metrics[p].shares} onChange={e => setMetrics({...metrics, [p]: {...metrics[p], shares: Number(e.target.value)}})} className="w-16 block border border-ink p-1.5 text-xs bg-white" />
            ))}
          </td>
        </>
      ) : (
        <>
          <td className="p-3 text-muted-foreground text-center">—</td>
          <td className="p-3 text-muted-foreground text-center">—</td>
          <td className="p-3 text-muted-foreground text-center">—</td>
          <td className="p-3 text-muted-foreground text-center">—</td>
        </>
      )}

      <td className="p-3 flex gap-2 items-center">
        <button onClick={onDetail} className="border border-ink bg-white px-3 py-1.5 text-[11px] uppercase tracking-[0.06em] hover:bg-ink hover:text-white">Detail</button>
        {c.status === "revision" && (
          <button onClick={(e) => { e.stopPropagation(); onRevisi(); }} className="bg-primary text-white px-3 py-1.5 text-[11px] uppercase tracking-[0.06em] hover:bg-[#c20019]">Revisi</button>
        )}
        {c.status === "approved" && (
          <button onClick={markPublished} disabled={saving} className="bg-[#10A37F] text-white px-3 py-1.5 text-[11px] uppercase tracking-[0.06em] hover:bg-[#0E906F] disabled:opacity-50">
            {saving ? "..." : "Tandai Tayang"}
          </button>
        )}
        {isPublished && (
          <button onClick={save} disabled={saving} className="bg-ink text-white px-3 py-1.5 text-[11px] uppercase tracking-[0.06em] hover:bg-[#333] disabled:opacity-50">
            {saving ? "..." : "Simpan"}
          </button>
        )}
      </td>
    </tr>
  );
}
