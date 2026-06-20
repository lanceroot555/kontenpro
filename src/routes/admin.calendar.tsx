import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge, PlatformBadge } from "@/components/swiss";
import { formatDate } from "@/lib/kontenpro";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { FilePreview } from "@/components/file-preview";

export const Route = createFileRoute("/admin/calendar")({
  component: AdminCalendarPage,
});

type ContentType = "viral" | "related" | "evergreen";

const CONTENT_TYPE_CONFIG: Record<ContentType, { label: string; color: string }> = {
  viral:     { label: "🔥 Viral",    color: "bg-orange-100 text-orange-700 border-orange-200" },
  related:   { label: "🎯 Related",  color: "bg-blue-100 text-blue-700 border-blue-200" },
  evergreen: { label: "🌿 Evergreen",color: "bg-green-100 text-green-700 border-green-200" },
};

type Content = {
  id: string; title: string; brand_name: string | null; status: "draft"|"submitted"|"revision"|"approved"|"published";
  platforms: string[]; scheduled_date: string; caption: string | null; revision_comments: string | null;
  hashtags: string[]; content_type: ContentType | null;
  file_url: string | null; post_url: string | null; platform_metrics: any;
  creator: { full_name: string } | null;
  brands: { name: string; color: string } | null;
};

const STATUS_COLOR: Record<string, string> = {
  draft: "#6B6B6B", submitted: "#F5A623", revision: "#E8741D", approved: "#00A651", published: "#0057B8",
};

const DAYS = ["Sen","Sel","Rab","Kam","Jum","Sab","Min"];

function AdminCalendarPage() {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [openContent, setOpenContent] = useState<Content | null>(null);

  const m1 = useMemo(() => new Date(year, month, 1), [year, month]);
  const m2 = useMemo(() => new Date(year, month + 1, 1), [year, month]);
  const rangeStart = m1.toISOString().slice(0, 10);
  const rangeEnd = new Date(year, month + 2, 0).toISOString().slice(0, 10);

  const { data: contents = [] } = useQuery({
    queryKey: ["admin-calendar", year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contents")
        .select("id,title,brand_name,status,platforms,scheduled_date,caption,revision_comments,hashtags,content_type,file_url,post_url,platform_metrics,creator:profiles!contents_creator_id_fkey(full_name),brands(name,color)")
        .gte("scheduled_date", rangeStart)
        .lte("scheduled_date", rangeEnd);
      if (error) throw error;
      return (data as unknown as Content[]) ?? [];
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

  return (
    <div>
      <div className="label-caps text-muted-foreground">Admin</div>
      <div className="flex items-end justify-between mt-1 flex-wrap gap-3">
        <h2 className="text-4xl font-bold tracking-tight">Kalender Global</h2>
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
        <AdminMonthGrid year={year} month={month} byDay={byDay} todayStr={todayStr} selectedDay={selectedDay} onDayClick={setSelectedDay} />
        <AdminMonthGrid year={m2.getFullYear()} month={m2.getMonth()} byDay={byDay} todayStr={todayStr} selectedDay={selectedDay} onDayClick={setSelectedDay} />
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-muted-foreground">
        {Object.entries(STATUS_COLOR).map(([s, c]) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm inline-block" style={{ backgroundColor: c }} />
            <span className="capitalize">{s}</span>
          </span>
        ))}
      </div>

      {selectedDay && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4" onClick={() => setSelectedDay(null)}>
          <div className="bg-white border border-ink w-full max-w-lg max-h-[70vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-ink/10 flex justify-between items-center bg-ink text-white sticky top-0">
              <div className="font-semibold text-lg">{formatDate(selectedDay)}</div>
              <button onClick={() => setSelectedDay(null)} className="label-caps hover:text-primary">Tutup</button>
            </div>
            <div className="p-5 space-y-3">
              {(byDay[selectedDay] ?? []).length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-4">Tidak ada jadwal konten di tanggal ini.</div>
              )}
              {(byDay[selectedDay] ?? []).map((c) => (
                <button key={c.id} onClick={() => { setOpenContent(c); setSelectedDay(null); }} className="w-full text-left border border-ink/15 p-4 hover:bg-[#F5F5F0]" style={c.brands ? { borderLeft: `6px solid ${c.brands.color}` } : {}}>
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-medium text-base">{c.title}</div>
                        {c.content_type && CONTENT_TYPE_CONFIG[c.content_type] && (
                          <span className={`text-[10px] uppercase tracking-[0.06em] font-semibold px-1.5 py-0.5 border ${CONTENT_TYPE_CONFIG[c.content_type].color}`}>
                            {CONTENT_TYPE_CONFIG[c.content_type].label}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Oleh: {c.creator?.full_name || "Unknown"}</div>
                      <div className="text-xs mt-0.5" style={{ color: c.brands?.color || "inherit" }}>Brand: {c.brands?.name || c.brand_name || "Unknown"}</div>
                    </div>
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">{c.platforms.map((p) => <PlatformBadge key={p} platform={p} />)}</div>
                  {c.hashtags?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {c.hashtags.slice(0, 5).map((tag) => (
                        <span key={tag} className="text-[10px] bg-ink/5 border border-ink/15 px-1.5 py-0.5 text-primary font-medium">
                          {tag.startsWith("#") ? tag : `#${tag}`}
                        </span>
                      ))}
                      {c.hashtags.length > 5 && <span className="text-[10px] text-muted-foreground">+{c.hashtags.length - 5}</span>}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {openContent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setOpenContent(null)}>
          <div className="bg-white border border-ink w-full max-w-2xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-ink/10 flex justify-between items-center sticky top-0 bg-white z-10">
              <StatusBadge status={openContent.status} />
              <button onClick={() => setOpenContent(null)} className="label-caps hover:text-primary">Tutup</button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <h3 className="text-3xl font-bold tracking-tight">{openContent.title}</h3>
                <div className="text-sm text-muted-foreground mt-1">
                  Creator: {openContent.creator?.full_name || "Unknown"}
                  <span className="mx-2">•</span>
                  Brand: <span className="font-semibold" style={{ color: openContent.brands?.color || "inherit" }}>{openContent.brands?.name || openContent.brand_name || "Unknown"}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex gap-1 flex-wrap">{openContent.platforms.map((p) => <PlatformBadge key={p} platform={p} />)}</div>
                {openContent.content_type && CONTENT_TYPE_CONFIG[openContent.content_type] && (
                  <span className={`text-[11px] uppercase tracking-[0.06em] font-semibold px-2 py-1 border ${CONTENT_TYPE_CONFIG[openContent.content_type].color}`}>
                    {CONTENT_TYPE_CONFIG[openContent.content_type].label}
                  </span>
                )}
              </div>
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
              {openContent.hashtags?.length > 0 && (
                <div>
                  <div className="label-caps text-muted-foreground mb-2">Hashtag</div>
                  <div className="flex flex-wrap gap-1.5">
                    {openContent.hashtags.map((tag) => (
                      <span key={tag} className="text-[12px] bg-ink/5 border border-ink/15 px-2.5 py-1 text-primary font-medium">
                        {tag.startsWith("#") ? tag : `#${tag}`}
                      </span>
                    ))}
                  </div>
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

function AdminMonthGrid({
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
          const isSelected = dateStr === selectedDay;

          return (
            <button
              key={i}
              disabled={!day}
              onClick={() => day && onDayClick(dateStr)}
              title={items.length > 0 ? `${items.length} konten` : undefined}
              className={[
                "min-h-[68px] p-1.5 border-r border-b border-ink/8 last:border-r-0 text-left transition-colors",
                !day ? "bg-[#fafaf8] cursor-default" : "hover:bg-[#F5F5F0] cursor-pointer",
                isSelected ? "bg-[#eeeee8] ring-1 ring-inset ring-ink/20" : "",
              ].join(" ")}
            >
              {day && (
                <>
                  <div className={[
                    "text-[11px] font-semibold w-5 h-5 flex items-center justify-center",
                    isToday ? "bg-primary text-white rounded-sm" : "text-ink",
                  ].join(" ")}>{day}</div>
                  <div className="mt-0.5 flex flex-col gap-0.5">
                    {items.slice(0, 3).map((c) => (
                      <div key={c.id} className="flex items-center gap-1 overflow-hidden">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-sm" style={{ backgroundColor: c.brands?.color || STATUS_COLOR[c.status] }} />
                        <span className="text-[9px] truncate leading-tight" style={{ color: c.brands?.color || "inherit" }}>{c.title}</span>
                      </div>
                    ))}
                    {items.length > 3 && (
                      <span className="text-[9px] text-muted-foreground font-bold">+{items.length - 3} lagi</span>
                    )}
                  </div>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
