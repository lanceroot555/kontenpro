import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";

export const Route = createFileRoute("/admin/brands")({
  component: BrandsPage,
});

type Brand = { id: string; name: string; color: string; created_at: string; default_hashtags: string[] };
type Profile = { id: string; full_name: string; user_id: string };

function BrandsPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#000000");
  const [saving, setSaving] = useState(false);

  const { data: brands = [] } = useQuery({
    queryKey: ["admin-brands"],
    queryFn: async () => {
      const { data, error } = await supabase.from("brands").select("*").order("name");
      if (error) throw error;
      return (data as Brand[]) ?? [];
    },
  });

  const { data: creators = [] } = useQuery({
    queryKey: ["admin-creators"],
    queryFn: async () => {
      const { data: roles, error: rErr } = await supabase
        .from("user_roles").select("user_id").eq("role", "creator");
      if (rErr) throw rErr;
      const creatorIds = roles.map((r) => r.user_id);
      if (creatorIds.length === 0) return [];
      const { data, error } = await supabase
        .from("profiles").select("*").in("user_id", creatorIds).order("full_name");
      if (error) throw error;
      return (data as Profile[]) ?? [];
    },
  });

  const { data: memberships = [] } = useQuery({
    queryKey: ["admin-brand-members"],
    queryFn: async () => {
      const { data, error } = await supabase.from("brand_members").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });

  async function createBrand(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("brands").insert({ name: name.trim(), color });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Brand dibuat");
    setName(""); setColor("#000000");
    qc.invalidateQueries({ queryKey: ["admin-brands"] });
  }

  async function deleteBrand(id: string) {
    if (!confirm("Hapus brand ini beserta aksesnya? (Konten lama tetap ada namun kehilangan relasi)")) return;
    const { error } = await supabase.from("brands").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Brand dihapus");
      qc.invalidateQueries({ queryKey: ["admin-brands"] });
      qc.invalidateQueries({ queryKey: ["admin-brand-members"] });
    }
  }

  async function toggleMember(brandId: string, profileId: string, isMember: boolean) {
    if (isMember) {
      await supabase.from("brand_members").delete().match({ brand_id: brandId, user_id: profileId });
    } else {
      await supabase.from("brand_members").insert({ brand_id: brandId, user_id: profileId });
    }
    qc.invalidateQueries({ queryKey: ["admin-brand-members"] });
  }

  return (
    <div>
      <div className="label-caps text-muted-foreground">Admin</div>
      <h2 className="text-4xl font-bold tracking-tight mt-1">Manajemen Klien</h2>

      <div className="grid md:grid-cols-[300px_1fr] gap-8 mt-6">
        <div>
          <div className="bg-white border border-ink/15 p-5 sticky top-6">
            <h3 className="font-semibold mb-4">Buat Brand Baru</h3>
            <form onSubmit={createBrand} className="space-y-4">
              <div>
                <label className="label-caps block mb-1">Nama Klien / Brand</label>
                <input required value={name} onChange={e => setName(e.target.value)} className="w-full border border-ink p-2 text-sm" placeholder="Contoh: Klinik Estetika" />
              </div>
              <div>
                <label className="label-caps block mb-1">Warna Label</label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-10 h-10 border border-ink p-1 cursor-pointer" />
                  <div className="text-xs font-mono uppercase border border-ink p-2 px-3">{color}</div>
                </div>
              </div>
              <button type="submit" disabled={saving || !name.trim()} className="w-full bg-primary text-white p-3 text-[12px] uppercase tracking-[0.06em] font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Tambah Klien
              </button>
            </form>
          </div>
        </div>

        <div className="space-y-4">
          {brands.length === 0 && (
            <div className="text-center text-muted-foreground py-12 border border-dashed border-ink/20">
              Belum ada Brand/Klien yang terdaftar.
            </div>
          )}

          {brands.map(brand => (
            <BrandCard
              key={brand.id}
              brand={brand}
              creators={creators}
              memberships={memberships}
              onDelete={deleteBrand}
              onToggle={toggleMember}
              onUpdate={() => qc.invalidateQueries({ queryKey: ["admin-brands"] })}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function BrandCard({
  brand, creators, memberships, onDelete, onToggle, onUpdate
}: {
  brand: Brand;
  creators: Profile[];
  memberships: any[];
  onDelete: (id: string) => void;
  onToggle: (brandId: string, profileId: string, isMember: boolean) => void;
  onUpdate: () => void;
}) {
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(brand.default_hashtags ?? []);
  const [savingTags, setSavingTags] = useState(false);

  function addTag(raw: string) {
    const list = raw.split(/[,\s]+/).map(s => s.trim().replace(/^#/, "")).filter(Boolean);
    if (!list.length) return;
    setTags(prev => [...new Set([...prev, ...list])]);
    setTagInput("");
  }

  function removeTag(t: string) {
    setTags(prev => prev.filter(x => x !== t));
  }

  async function saveTags() {
    setSavingTags(true);
    const { error } = await supabase.from("brands").update({ default_hashtags: tags }).eq("id", brand.id);
    setSavingTags(false);
    if (error) toast.error(error.message);
    else { toast.success("Hashtag default tersimpan"); onUpdate(); }
  }

  const isDirty = JSON.stringify(tags) !== JSON.stringify(brand.default_hashtags ?? []);

  return (
    <div className="bg-white border border-ink/15 overflow-hidden">
      <div className="p-4 border-b border-ink/10 flex justify-between items-center" style={{ borderLeft: `6px solid ${brand.color}` }}>
        <div>
          <h3 className="text-xl font-bold tracking-tight">{brand.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: brand.color }} />
            <span className="text-xs text-muted-foreground uppercase font-mono">{brand.color}</span>
          </div>
        </div>
        <button onClick={() => onDelete(brand.id)} className="text-primary hover:bg-primary/10 p-2 rounded-full transition-colors" title="Hapus Brand">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Hashtag Library */}
      <div className="p-4 border-b border-ink/10">
        <div className="label-caps mb-2 text-muted-foreground">Hashtag Default</div>
        <div className="flex gap-2">
          <input
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInput); } }}
            onBlur={() => tagInput && addTag(tagInput)}
            placeholder="Tambah hashtag, pisah dengan Enter atau koma"
            className="flex-1 border border-ink/30 p-2 text-sm focus:border-ink outline-none"
          />
          {isDirty && (
            <button onClick={saveTags} disabled={savingTags} className="bg-ink text-white px-4 py-2 text-[11px] uppercase tracking-[0.06em] font-medium disabled:opacity-50 whitespace-nowrap">
              {savingTags ? "..." : "Simpan"}
            </button>
          )}
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {tags.map(t => (
              <span key={t} className="inline-flex items-center gap-1 bg-ink/5 border border-ink/15 px-2 py-0.5 text-xs">
                #{t}
                <button onClick={() => removeTag(t)} className="text-muted-foreground hover:text-primary">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        {tags.length === 0 && (
          <p className="text-xs text-muted-foreground mt-1">Belum ada hashtag default. Creator bisa tambah manual saat buat konten.</p>
        )}
      </div>

      {/* Assign Creators */}
      <div className="p-4 bg-[#F5F5F0]/50">
        <div className="label-caps mb-3 text-muted-foreground">Assign ke Kreator</div>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
          {creators.map(c => {
            const isMember = memberships.some(m => m.brand_id === brand.id && m.user_id === c.id);
            return (
              <label key={c.id} className={`flex items-center gap-3 p-3 border cursor-pointer transition-colors ${isMember ? "border-ink bg-white" : "border-ink/10 bg-white/50 opacity-70 hover:opacity-100"}`}>
                <input
                  type="checkbox"
                  checked={isMember}
                  onChange={() => onToggle(brand.id, c.id, isMember)}
                  className="w-4 h-4 accent-ink"
                />
                <span className="text-sm font-medium">{c.full_name}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
