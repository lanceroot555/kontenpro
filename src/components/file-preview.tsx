import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const IMAGE_EXT = ["png", "jpg", "jpeg", "gif", "webp", "avif", "svg"];
const VIDEO_EXT = ["mp4", "webm", "mov", "m4v"];

function normalizeStoragePath(value: string) {
  if (!/^https?:\/\//i.test(value)) return value;

  try {
    const url = new URL(value);
    const marker = "/content-files/";
    const index = url.pathname.indexOf(marker);
    if (index === -1) return value;
    return decodeURIComponent(url.pathname.slice(index + marker.length));
  } catch {
    return value;
  }
}

function ext(path: string) {
  const clean = path.split("?")[0] ?? path;
  return clean.split(".").pop()?.toLowerCase() ?? "";
}

export async function getContentFileUrl(value: string) {
  const storagePath = normalizeStoragePath(value);
  if (/^https?:\/\//i.test(storagePath)) return storagePath;

  const { data, error } = await supabase.storage.from("content-files").createSignedUrl(storagePath, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

export function FilePreview({ path, className = "" }: { path: string | null | undefined; className?: string }) {
  const { data: url, isLoading, error } = useQuery({
    queryKey: ["signed-url", path],
    enabled: !!path,
    staleTime: 1000 * 60 * 50,
    queryFn: async () => {
      return getContentFileUrl(path!);
    },
  });

  if (!path) return null;
  if (isLoading) return <div className={`border border-ink/15 bg-[#F5F5F0] p-4 text-xs text-muted-foreground ${className}`}>Memuat lampiran…</div>;
  if (error || !url) return <div className={`border border-primary/40 bg-primary/5 p-4 text-xs text-primary ${className}`}>Gagal memuat lampiran.</div>;

  const storagePath = normalizeStoragePath(path);
  const e = ext(storagePath);
  const name = storagePath.split("/").pop() ?? storagePath;
  const openLabel = IMAGE_EXT.includes(e) ? "Buka gambar" : VIDEO_EXT.includes(e) ? "Buka video" : "Unduh lampiran";
  const toolbar = (
    <div className="flex items-center justify-between gap-3 border-b border-ink/15 bg-white px-3 py-2">
      <span className="min-w-0 truncate text-[11px] uppercase tracking-[0.06em] text-muted-foreground">{name}</span>
      <a href={url} target="_blank" rel="noreferrer" className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.06em] underline underline-offset-4">
        {openLabel}
      </a>
    </div>
  );

  if (IMAGE_EXT.includes(e)) {
    return (
      <div className={`border border-ink/15 bg-[#F5F5F0] ${className}`}>
        {toolbar}
        <img src={url} alt={name} className="w-full h-auto max-h-[480px] object-contain" loading="lazy" />
      </div>
    );
  }
  if (VIDEO_EXT.includes(e)) {
    return <div className={className}>{toolbar}<video src={url} controls className="w-full max-h-[480px] border border-ink/15 bg-black" /></div>;
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" className={`inline-block border border-ink px-4 py-2 text-[12px] uppercase tracking-[0.06em] hover:bg-ink hover:text-white ${className}`}>
      Unduh lampiran: {name}
    </a>
  );
}
