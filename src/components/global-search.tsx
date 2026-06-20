import { useState, useRef, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/lib/use-auth";
import { Search, X } from "lucide-react";

type Result = {
  id: string;
  title: string;
  status: string;
  brand_name: string | null;
  scheduled_date: string;
  creator_profile?: { full_name: string } | null;
};

const STATUS_COLOR: Record<string, string> = {
  draft: "#6B6B6B",
  submitted: "#F5A623",
  revision: "#E8741D",
  approved: "#00A651",
  published: "#0057B8",
};

export function GlobalSearch({ role }: { role: AppRole }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.length < 2) { setResults([]); setOpen(false); return; }
    const timer = setTimeout(async () => {
      if (!auth.profile && !auth.user) return;
      setLoading(true);
      let q = supabase
        .from("contents")
        .select("id,title,status,brand_name,scheduled_date")
        .ilike("title", `%${query}%`)
        .limit(8);

      if (role === "creator") {
        q = q.eq("creator_id", auth.profile!.id);
      }

      const { data } = await q.order("scheduled_date", { ascending: false });
      setResults((data as Result[]) ?? []);
      setOpen(true);
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, role, auth.profile, auth.user]);

  function goTo(r: Result) {
    setQuery("");
    setOpen(false);
    if (role === "creator") {
      navigate({ to: "/creator/status" });
    } else {
      navigate({ to: "/admin/contents" });
    }
  }

  function clear() {
    setQuery("");
    setResults([]);
    setOpen(false);
    inputRef.current?.focus();
  }

  if (role === "superadmin") return null;

  return (
    <div ref={wrapRef} className="relative hidden md:block">
      <div className="flex items-center border border-ink/20 bg-[#F5F5F0] px-3 py-1.5 gap-2 w-64 focus-within:border-ink/50 transition-colors">
        <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Cari konten..."
          className="bg-transparent text-sm outline-none flex-1 placeholder:text-muted-foreground/60 w-full"
        />
        {query && (
          <button onClick={clear} className="text-muted-foreground hover:text-ink">
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-96 bg-white border border-ink/15 shadow-lg z-50 max-h-80 overflow-auto">
          {loading && (
            <div className="px-4 py-3 text-sm text-muted-foreground">Mencari...</div>
          )}
          {!loading && results.length === 0 && (
            <div className="px-4 py-3 text-sm text-muted-foreground">Tidak ada hasil untuk "{query}"</div>
          )}
          {!loading && results.map((r) => (
            <button
              key={r.id}
              onClick={() => goTo(r)}
              className="w-full text-left px-4 py-3 hover:bg-[#F5F5F0] border-b border-ink/5 last:border-b-0 flex items-start gap-3"
            >
              <span
                className="mt-1 h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: STATUS_COLOR[r.status] || "#999" }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{r.title}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5 flex gap-2">
                  {r.brand_name && <span>{r.brand_name}</span>}
                  <span className="uppercase tracking-wide">{r.status}</span>
                  <span>{new Date(r.scheduled_date).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
