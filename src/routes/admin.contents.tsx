import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge, PlatformBadge } from "@/components/swiss";
import { FilePreview } from "@/components/file-preview";
import { formatDate } from "@/lib/kontenpro";

export const Route = createFileRoute("/admin/contents")({
  component: AllContents,
});

type Row = {
  id: string; title: string; brand_name: string | null; status: "draft"|"submitted"|"revision"|"approved"|"published";
  platforms: string[]; scheduled_date: string; created_at: string;
  caption: string | null; copywriting: string | null; notes: string | null;
  post_url: string | null; revision_comments: string | null;
  file_url: string | null;
  creator: { full_name: string } | null;
  brands: { name: string; color: string } | null;
};


function AllContents() {
  const [status, setStatus] = useState("all");
  const [platform, setPlatform] = useState("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Row | null>(null);

  const { data: rows = [] } = useQuery({
    queryKey: ["admin-contents"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contents")
        .select("id,title,brand_name,status,platforms,scheduled_date,created_at,caption,copywriting,notes,post_url,revision_comments,file_url,creator:profiles!contents_creator_id_fkey(full_name),brands(name,color)")
        .order("scheduled_date", { ascending: false });
      if (error) throw error;
      return (data as unknown as Row[]) ?? [];
    },
  });

  const filtered = rows.filter((r) =>
    (status === "all" || r.status === status) &&
    (platform === "all" || r.platforms.includes(platform)) &&
    (q === "" || r.title.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div>
      <div className="label-caps text-muted-foreground">Admin</div>
      <h2 className="text-4xl font-bold tracking-tight mt-1">Konten Tim</h2>

      <div className="flex flex-wrap gap-3 mt-6">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari judul..." className="border border-ink p-2 bg-white text-sm flex-1 min-w-[200px]" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="border border-ink p-2 bg-white text-sm">
          <option value="all">Semua Status</option>
          {["draft","submitted","revision","approved","published"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="border border-ink p-2 bg-white text-sm">
          <option value="all">Semua Platform</option>
          {["instagram","tiktok","twitter","youtube","linkedin"].map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6 text-center text-muted-foreground py-12 border border-dashed border-ink/20">
          Belum ada konten yang dibuat.
        </div>
      ) : (
        <div className="mt-6 bg-white border border-ink/15 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink text-white">
              <tr>{["#","Judul","Creator","Platform","Tayang","Status","Created"].map((h) => (
                <th key={h} className="label-caps text-left p-3 font-medium">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.id} className="border-b border-ink/10 last:border-b-0 hover:bg-[#F5F5F0] cursor-pointer" onClick={() => setOpen(r)}>
                  <td className="p-3 text-muted-foreground">{i + 1}</td>
                  <td className="p-3">
                    <div className="font-medium">{r.title}</div>
                    <div className="flex items-center gap-1.5 mt-1">
                      {(r.brands || r.brand_name) && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: r.brands?.color || '#000' }} />}
                      <div className="text-xs font-semibold" style={{ color: r.brands?.color || 'inherit' }}>{r.brands?.name || r.brand_name || "Unknown Brand"}</div>
                    </div>
                  </td>
                  <td className="p-3">{r.creator?.full_name ?? "—"}</td>
                  <td className="p-3"><div className="flex gap-1 flex-wrap">{r.platforms.map((p) => <PlatformBadge key={p} platform={p} />)}</div></td>
                  <td className="p-3">{formatDate(r.scheduled_date)}</td>
                  <td className="p-3"><StatusBadge status={r.status} /></td>
                  <td className="p-3 text-muted-foreground">{formatDate(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end" onClick={() => setOpen(null)}>
          <div className="bg-white w-full max-w-lg h-full overflow-auto border-l border-ink" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-ink/10 flex justify-between items-center">
              <StatusBadge status={open.status} />
              <button onClick={() => setOpen(null)} className="label-caps">Tutup</button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <h3 className="text-2xl font-bold tracking-tight">{open.title}</h3>
              <div className="label-caps text-muted-foreground">Creator</div><div>{open.creator?.full_name}</div>
              <div className="label-caps text-muted-foreground">Platform</div><div className="flex gap-1 flex-wrap">{open.platforms.map((p) => <PlatformBadge key={p} platform={p} />)}</div>
              <div className="label-caps text-muted-foreground">Tayang</div><div>{formatDate(open.scheduled_date)}</div>
              {open.caption && <><div className="label-caps text-muted-foreground">Caption</div><p className="whitespace-pre-wrap">{open.caption}</p></>}
              {open.copywriting && <><div className="label-caps text-muted-foreground">Copywriting</div><p className="whitespace-pre-wrap">{open.copywriting}</p></>}
              {open.file_url && <><div className="label-caps text-muted-foreground">Lampiran</div><FilePreview path={open.file_url} /></>}
              {open.notes && <><div className="label-caps text-muted-foreground">Catatan</div><p className="whitespace-pre-wrap">{open.notes}</p></>}
              {open.revision_comments && <><div className="label-caps text-primary">Komentar Revisi</div><p className="whitespace-pre-wrap">{open.revision_comments}</p></>}
              {open.post_url && <><div className="label-caps text-muted-foreground">Link Post</div><a href={open.post_url} target="_blank" rel="noreferrer" className="underline break-all">{open.post_url}</a></>}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
