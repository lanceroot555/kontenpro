import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { StatusBadge, PlatformBadge } from "@/components/swiss";
import { formatDate } from "@/lib/kontenpro";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { FilePreview } from "@/components/file-preview";

export const Route = createFileRoute("/creator/calendar")({
  component: CalendarPage,
});

type Content = {
  id: string; title: string; status: "draft"|"submitted"|"revision"|"approved"|"published";
  platforms: string[]; scheduled_date: string; caption: string | null; revision_comments: string | null;
  file_url: string | null; post_url: string | null; platform_metrics: any;
  brands: { name: string; color: string } | null; brand_name: string | null;
};

const STATUS_COLOR: Record<string, string> = {
  draft: "#6B6B6B", submitted: "#F5A623", revision: "#E8741D", approved: "#00A651", published: "#0057B8",
};

const DAYS = ["Sen","Sel","Rab","Kam","Jum","Sab","Min"];

function CalendarPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const todayStr = new Date().toISOString().slice(0, 10);
  const today = new Date();

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [openContent, setOpenContent] = useState<Content | null>(null);

  const m1 = useMemo(() => new Date(year, month, 1), [year, month]);
  const m2 = useMemo(() => new Date(year, month + 1, 1), [year, month]);
  const rangeStart = m1.toISOString().slice(0, 10);
  const rangeEnd = new Date(year, month + 2, 0).toISOString().slice(0, 10);

  const { data: contents = [] } = useQuery({
    queryKey: ["creator-calendar", auth.profile?.id, year, month],
    enabled: !!auth.profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contents")
        .select("id,title,status,platforms,scheduled_date,caption,revision_comments,file_url,post_url,platform_metrics,brand_name,brands(name,color)")
        .eq("creator_id", auth.profile!.id)
        .gte("scheduled_date", rangeStart)
        .lte("scheduled_date", rangeEnd);
      if (error) throw error;
      return (data as Content[]) ?? [];
    },
  });

  const byDay = useMemo(() => {
    const m: Record<string, Content[]> = {};
    for (const c of contents) (m[c.scheduled_date] ||= []).push(c);
    return m;
  }, [contents]);

  function prev() { const d = new Date(year, month - 1, 1); setYear(d.getFullYear()); setMonth(d.getMonth()); }
  function next() { const d = new Date(year, month + 1, 1); setYear(d.getFullYear()); setMonth(d.getMonth()); }

  const years = Array.from({ length: 11 }, (_, i) => today.getFullYear() - 5 + i);
  const m1Label = m1.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  const m2Label = m2.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  function handleDayClick(dateStr: string) {
    if (!dateStr || dateStr < todayStr) return;
    const items = byDay[dateStr] ?? [];
    if (items.length > 0) setSelectedDay(dateStr);
    else navigate({ to: "/creator/new", search: { date: dateStr } });
  }

  return (
    <div>
      <div className="label-caps text-muted-foreground">Creator</div>
      <div className="flex items-end justify-between mt-1 flex-wrap gap-3">
        <h2 className="text-4xl font-bold tracking-tight">Kalender Konten</h2>
        <div className="flex items-center gap-2">
          <button onClick={prev} className="border border-ink p-2 hover:bg-[#F5F5F0]"><ChevronLeft className="h-4 w-4" /></button>
          <div className="px-3 py-2 border border-ink text-sm uppercase tracking-[0.06em] font-medium text-center min-w-[130px]">{m1Label}</div>
          <span className="text-muted-foreground">→</span>
          <div className="px-3 py-2 border border-ink/40 text-sm uppercase tracking-[0.06em] font-medium text-center min-w-[130px] text-muted-foreground">{m2Label}</div>
          <button onClick={next} className="border border-ink p-2 hover:bg-[#F5F5F0]"><ChevronRight className="h-4 w-4" /></button>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="border border-ink p-2 bg-white text-sm cursor-pointer">
            {years.map((y) => <option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="mt-5 grid md:grid-cols-2 gap-4">
        <MonthGrid year={year} month={month} byDay={byDay} todayStr={todayStr} selectedDay={selectedDay} onDayClick={handleDayClick} />
        <MonthGrid year={m2.getFullYear()} month={m2.getMonth()} byDay={byDay} todayStr={todayStr} selectedDay={selectedDay} onDayClick={handleDayClick} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
        {Object.entries(STATUS_COLOR).map(([s, c]) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm inline-block" style={{ backgroundColor: c }} />
            <span className="capitalize">{s}</span>
          </span>
        ))}
        <span className="ml-auto italic opacity-60">Klik tanggal kosong → Buat Konten otomatis terisi</span>
      </div>

      {selectedDay && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4" onClick={() => setSelectedDay(null)}>
          <div className="bg-white border border-ink w-full max-w-lg max-h-[70vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-ink/10 flex justify-between items-center">
              <div className="font-semibold">{formatDate(selectedDay)}</div>
              <button onClick={() => setSelectedDay(null)} className="label-caps">Tutup</button>
            </div>
            <div className="p-5 space-y-3">
              {(byDay[selectedDay] ?? []).map((c) => (
                <button key={c.id} onClick={() => { setOpenContent(c); setSelectedDay(null); }} className="w-full text-left border border-ink/15 p-3 hover:bg-[#F5F5F0]" style={c.brands ? { borderLeft: `6px solid ${c.brands.color}` } : {}}>
                  <div className="flex justify-between items-start gap-2">
                    <div className="font-medium">{c.title}</div>
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="text-xs mt-1" style={{ color: c.brands?.color || "inherit" }}>{c.brands?.name || c.brand_name || "Unknown Brand"}</div>
                  <div className="mt-2 flex flex-wrap gap-1">{c.platforms.map((p) => <PlatformBadge key={p} platform={p} />)}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {openContent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setOpenContent(null)}>
          <div className="bg-white border border-ink w-full max-w-xl max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-ink/10 flex justify-between items-center">
              <StatusBadge status={openContent.status} />
              <button onClick={() => setOpenContent(null)} className="label-caps">Tutup</button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <h3 className="text-3xl font-bold tracking-tight">{openContent.title}</h3>
                <div className="text-sm font-semibold mt-1" style={{ color: openContent.brands?.color || "inherit" }}>{openContent.brands?.name || openContent.brand_name || "Unknown Brand"}</div>
              </div>
              <div className="flex gap-1 flex-wrap">{openContent.platforms.map((p) => <PlatformBadge key={p} platform={p} />)}</div>
              <div className="grid grid-cols-2 gap-4 border border-ink/10 p-4 bg-[#F5F5F0]">
                <div>
                  <div className="label-caps text-muted-foreground">Tayang</div>
                  <div className="font-medium mt-1">{formatDate(openContent.scheduled_date)}</div>
                </div>
                {openContent.status === "published" && (
                  <div>
                    <div className="label-caps text-muted-foreground">Link Post</div>
                    <div className="mt-1 flex flex-col gap-1">
                      {openContent.platforms.map((p, i) => {
                        const url = openContent.platform_metrics?.[p]?.url || (i === 0 ? openContent.post_url : null);
                        return url ? <a key={p} href={url} target="_blank" rel="noreferrer" className="underline hover:text-primary text-xs font-bold uppercase">{p}</a> : null;
                      })}
                    </div>
                  </div>
                )}
              </div>
              {openContent.file_url && (
                <div>
                  <div className="label-caps text-muted-foreground mb-2">Media / Visual</div>
                  <div className="border border-ink/10 p-1"><FilePreview path={openContent.file_url} /></div>
                </div>
              )}
              {openContent.caption && (
                <div>
                  <div className="label-caps text-muted-foreground mb-1">Caption</div>
                  <p className="text-[15px] whitespace-pre-wrap leading-relaxed">{openContent.caption}</p>
                </div>
              )}
              {openContent.status === "revision" && openContent.revision_comments && (
                <div className="border-l-4 border-primary bg-primary/5 p-4">
                  <div className="label-caps text-primary">Komentar Admin</div>
                  <p className="text-[15px] mt-2">{openContent.revision_comments}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MonthGrid({
  year, month, byDay, todayStr, selectedDay, onDayClick,
}: {
  year: number; month: number;
  byDay: Record<string, Content[]>;
  todayStr: string; selectedDay: string | null;
  onDayClick: (dateStr: string) => void;
}) {
  const start = new Date(year, month, 1);
  const totalDays = new Date(year, month + 1, 0).getDate();
  const firstWeekday = (start.getDay() + 6) % 7;
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  while (cells.length % 7) cells.push(null);

  const monthLabel = start.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  return (
    <div className="bg-white border border-ink/15 overflow-hidden">
      <div className="px-3 py-2 bg-ink text-white text-center text-[11px] uppercase tracking-[0.08em] font-medium">{monthLabel}</div>
      <div className="grid grid-cols-7 border-b border-ink/10">
        {DAYS.map((d) => (
          <div key={d} className="text-[10px] font-medium text-muted-foreground text-center py-1.5 border-r border-ink/8 last:border-r-0">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          const dateStr = day
            ? `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
            : "";
          const items = day ? byDay[dateStr] ?? [] : [];
          const isToday = dateStr === todayStr;
          const isPast = day ? dateStr < todayStr : false;
          const isSelected = dateStr === selectedDay;

          return (
            <button
              key={i}
              disabled={!day || isPast}
              onClick={() => day && !isPast && onDayClick(dateStr)}
              title={!day ? undefined : isPast ? "Tanggal sudah lewat" : items.length === 0 ? "Klik untuk buat konten" : `${items.length} konten`}
              className={[
                "min-h-[68px] p-1.5 border-r border-b border-ink/8 last:border-r-0 text-left transition-colors",
                !day ? "bg-[#fafaf8]" : "",
                isPast ? "bg-[#f0f0ec] opacity-50 cursor-not-allowed" : day ? "hover:bg-[#F5F5F0] cursor-pointer" : "",
                isSelected ? "bg-[#eeeee8] ring-1 ring-inset ring-ink/20" : "",
              ].join(" ")}
            >
              {day && (
                <>
                  <div className={[
                    "text-[11px] font-semibold w-5 h-5 flex items-center justify-center",
                    isToday ? "bg-primary text-white rounded-sm" : isPast ? "text-muted-foreground/40" : "text-ink",
                  ].join(" ")}>{day}</div>
                  <div className="mt-0.5 flex flex-wrap gap-0.5">
                    {items.slice(0, 6).map((c) => (
                      <span
                        key={c.id}
                        className="h-2 w-2 rounded-sm inline-block shrink-0"
                        style={{ backgroundColor: c.brands?.color || STATUS_COLOR[c.status] }}
                        title={c.title}
                      />
                    ))}
                    {items.length > 6 && <span className="text-[9px] text-muted-foreground leading-tight">+{items.length - 6}</span>}
                  </div>
                  {items.length === 0 && !isPast && (
                    <div className="text-[9px] text-muted-foreground/40 mt-0.5 leading-tight">+ buat</div>
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
