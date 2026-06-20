import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { PLATFORMS, notifyAdmins, type PlatformKey } from "@/lib/kontenpro";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";

export const Route = createFileRoute("/creator/new")({
  validateSearch: z.object({ date: z.string().optional() }),
  component: NewContent,
});

const schema = z.object({
  brand_id: z.string().uuid("Pilih Klien / Brand"),
  title: z.string().trim().min(1, "Judul wajib diisi").max(100),
  platforms: z.array(z.string()).min(1, "Pilih min. 1 platform"),
  scheduled_date: z.string().min(1, "Tanggal wajib diisi"),
  caption: z.string().trim().min(1, "Caption wajib diisi").max(2000),
  copywriting: z.string().trim().min(1, "Copywriting wajib diisi").max(1000),
  hashtags: z.array(z.string()).max(30),
  notes: z.string().max(500).optional(),
});

const ACCEPT = "image/jpeg,image/png,image/gif,video/mp4,video/quicktime,video/webm";
const MAX = 50 * 1024 * 1024;

function NewContent() {
  const navigate = useNavigate();
  const auth = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const { date: prefilledDate } = Route.useSearch();

  const { data: myBrands = [] } = useQuery({
    queryKey: ["my-brands", auth.profile?.id],
    enabled: !!auth.profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brand_members")
        .select("brands(id, name, color, default_hashtags)")
        .eq("user_id", auth.profile!.id);
      if (error) throw error;
      return (data as any[]).map(d => d.brands) ?? [];
    }
  });

  const [brandId, setBrandId] = useState("");
  const [title, setTitle] = useState("");
  const [platforms, setPlatforms] = useState<PlatformKey[]>([]);
  const [scheduledDate, setScheduledDate] = useState(prefilledDate && prefilledDate >= today ? prefilledDate : today);
  const [caption, setCaption] = useState("");
  const [copywriting, setCopywriting] = useState("");
  const [hashtagInput, setHashtagInput] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);

  // Auto-fill hashtag dari brand yang dipilih
  function handleBrandChange(id: string) {
    setBrandId(id);
    const brand = myBrands.find((b: any) => b.id === id);
    if (brand?.default_hashtags?.length) {
      setHashtags(brand.default_hashtags);
    }
  }
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileErr, setFileErr] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function addHashtag(raw: string) {
    const tags = raw.split(/[,\n]/).map((s) => s.trim().replace(/^#/, "")).filter(Boolean);
    if (!tags.length) return;
    setHashtags((prev) => [...new Set([...prev, ...tags])].slice(0, 30));
    setHashtagInput("");
  }

  function onFile(f: File | undefined | null) {
    setFileErr(null);
    if (!f) return;
    if (f.size > MAX) { setFileErr("File terlalu besar (maks 50MB)"); return; }
    if (!ACCEPT.split(",").includes(f.type)) { setFileErr("Format tidak didukung"); return; }
    setFile(f);
    setFilePreview(URL.createObjectURL(f));
  }

  async function uploadIfAny(contentId: string): Promise<string | null> {
    if (!file || !auth.user) return null;
    const ext = file.name.split(".").pop();
    const path = `${auth.user.id}/${contentId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("content-files").upload(path, file, { upsert: false });
    if (error) throw error;
    return path;
  }

  async function submit(status: "draft" | "submitted") {
    setErrors({});
    if (!auth.profile) { toast.error("Sesi tidak valid"); return; }
    const parsed = schema.safeParse({ brand_id: brandId, title, platforms, scheduled_date: scheduledDate, caption, copywriting, hashtags, notes });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) errs[issue.path[0] as string] = issue.message;
      setErrors(errs); return;
    }

    const selectedBrand = myBrands.find(b => b.id === brandId);

    setSaving(true);
    try {
      const { data: inserted, error } = await supabase.from("contents").insert({
        creator_id: auth.profile.id,
        brand_id: brandId,
        brand_name: selectedBrand?.name,
        title, caption, copywriting, hashtags, platforms,
        scheduled_date: scheduledDate, notes: notes || null, status,
      }).select("id").single();
      if (error) throw error;

      let fileUrl: string | null = null;
      if (file) {
        const path = await uploadIfAny(inserted.id);
        if (path) {
          fileUrl = path;
          await supabase.from("contents").update({ file_url: path }).eq("id", inserted.id);
        }
      }

      if (status === "submitted") {
        await notifyAdmins("content_submitted", `Konten baru '${title}' menunggu approval kamu.`, inserted.id);
      }
      toast.success(status === "draft" ? "Draft disimpan" : "Konten dikirim ke Admin");
      navigate({ to: "/creator/status" });
    } catch (e) {
      toast.error((e as Error).message || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="label-caps text-muted-foreground">Creator</div>
      <h2 className="text-4xl font-bold tracking-tight mt-1">Buat Konten Baru</h2>

      <div className="mt-8 bg-white border border-ink/15 p-6 space-y-6">
        <Field label="Brand / Klien" error={errors.brand_id}>
          <select value={brandId} onChange={(e) => handleBrandChange(e.target.value)} className="input bg-white cursor-pointer">
            <option value="" disabled>Pilih Brand yang ditugaskan ke Anda...</option>
            {myBrands.map((b: any) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          {myBrands.length === 0 && <div className="text-xs text-primary mt-2">Belum ada Brand yang di-assign ke Anda. Hubungi Admin.</div>}
        </Field>

        <Field label="Judul Konten" error={errors.title}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} className="input" />
          <Counter v={title.length} max={100} />
        </Field>

        <Field label="Platform Target" error={errors.platforms}>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => {
              const on = platforms.includes(p.key);
              return (
                <button key={p.key} type="button" onClick={() => setPlatforms((prev) => on ? prev.filter((x) => x !== p.key) : [...prev, p.key])}
                  className={`px-4 py-2 text-sm border ${on ? "bg-ink text-white border-ink" : "bg-white border-ink/40"}`}>
                  {p.label}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Tanggal Tayang" error={errors.scheduled_date}>
          <input type="date" min={today} value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="input" />
        </Field>

        <Field label="Caption" error={errors.caption}>
          <textarea rows={4} value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={2000} className="input resize-y" />
          <Counter v={caption.length} max={2000} />
        </Field>

        <Field label="Copywriting / Hook" error={errors.copywriting}>
          <textarea rows={3} value={copywriting} onChange={(e) => setCopywriting(e.target.value)} maxLength={1000} className="input resize-y" />
          <Counter v={copywriting.length} max={1000} />
        </Field>

        <Field label="Hashtag (Enter atau koma)">
          <input value={hashtagInput}
            onChange={(e) => setHashtagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addHashtag(hashtagInput); } }}
            onBlur={() => hashtagInput && addHashtag(hashtagInput)}
            placeholder="contoh: marketing, launch"
            className="input" />
          {hashtags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {hashtags.map((t) => (
                <span key={t} className="bg-ink/5 border border-ink/20 px-2 py-1 text-xs inline-flex items-center gap-1">
                  #{t}<button onClick={() => setHashtags((h) => h.filter((x) => x !== t))}><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          )}
        </Field>

        <Field label="Upload File (opsional)">
          <label className="block border-2 border-dashed border-ink/30 p-6 text-center cursor-pointer hover:border-ink">
            <input type="file" accept={ACCEPT} className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            {filePreview && file?.type.startsWith("image/") ? (
              <img src={filePreview} className="max-h-40 mx-auto" />
            ) : file ? (
              <div className="text-sm">{file.name}</div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                <Upload className="h-6 w-6" />
                Klik atau drop file (JPG/PNG/GIF/MP4/MOV, maks 50MB)
              </div>
            )}
          </label>
          {fileErr && <p className="text-sm text-primary mt-1">{fileErr}</p>}
        </Field>

        <Field label="Catatan Tambahan (opsional)">
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} className="input resize-y" />
          <Counter v={notes.length} max={500} />
        </Field>

        <div className="flex flex-wrap gap-3 pt-2 border-t border-ink/10">
          <button disabled={saving} onClick={() => submit("draft")} className="border border-ink px-6 py-3 text-[12px] uppercase tracking-[0.06em] font-medium hover:bg-ink hover:text-white disabled:opacity-50">
            Simpan Draft
          </button>
          <button disabled={saving} onClick={() => submit("submitted")} className="bg-primary text-white px-6 py-3 text-[12px] uppercase tracking-[0.06em] font-medium hover:bg-[#c20019] disabled:opacity-50">
            {saving ? "Mengirim..." : "Submit ke Admin"}
          </button>
        </div>
      </div>

      <style>{`.input { width:100%; border:1px solid #6B6B6B; background:#fff; padding:12px 16px; font-size:15px; outline:none; }
        .input:focus { border-color:#E8001D; }`}</style>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label-caps block mb-2">{label}</label>
      {children}
      {error && <p className="text-sm text-primary mt-1">{error}</p>}
    </div>
  );
}
function Counter({ v, max }: { v: number; max: number }) {
  return <div className="text-[11px] text-muted-foreground mt-1 text-right">{v} / {max}</div>;
}
