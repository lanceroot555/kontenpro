import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PlatformBadge, StatusBadge } from "@/components/swiss";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  AreaChart, Area, PieChart, Pie, Cell, Legend,
} from "recharts";

export const Route = createFileRoute("/admin/dashboard")({
  component: AdminOverview,
});

const STATUS_COLORS: Record<string, string> = {
  published: "#22c55e", submitted: "#3b82f6",
  approved: "#8b5cf6", revision: "#f59e0b", draft: "#9ca3af",
};
const STATUS_LABEL: Record<string, string> = {
  published: "Published", submitted: "Submitted",
  approved: "Approved", revision: "Revision", draft: "Draft",
};

type Row = {
  id: string; title: string; brand_name: string | null; platforms: string[]; status: string;
  likes: number; views: number; shares: number; engagement_rate: number;
  scheduled_date: string; created_at: string; post_url: string | null; platform_metrics: any;
  creator: { full_name: string } | null;
  brands: { name: string; color: string } | null;
};

function AdminOverview() {
  const [trendView, setTrendView] = useState<"monthly" | "weekly">("monthly");

  const { data: published = [] } = useQuery({
    queryKey: ["admin-published"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contents")
        .select("id,title,brand_name,platforms,status,likes,views,shares,engagement_rate,scheduled_date,created_at,post_url,platform_metrics,creator:profiles!contents_creator_id_fkey(full_name),brands(name,color)")
        .eq("status", "published");
      if (error) throw error;
      return (data as unknown as Row[]) ?? [];
    },
  });

  const { data: all = [] } = useQuery({
    queryKey: ["admin-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contents")
        .select("id,platforms,status,created_at,scheduled_date")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const totalPub = published.length;
  const totalLikes = published.reduce((s, x) => s + x.likes, 0);
  const totalViews = published.reduce((s, x) => s + x.views, 0);
  const avgER = published.length ? published.reduce((s, x) => s + Number(x.engagement_rate), 0) / published.length : 0;

  const platforms = ["instagram","tiktok","twitter","youtube","linkedin"];
  const perPlatform = platforms.map((p) => ({
    name: p, count: (all as { platforms: string[] | null; status: string }[]).filter((c) => c.platforms?.includes(p) && c.status === "published").length,
  }));

  const platformStats = platforms.map((p) => {
    const pubC = published.filter(c => c.platforms?.includes(p));
    const views = pubC.reduce((s, x) => s + x.views, 0);
    const er = pubC.length ? pubC.reduce((s, x) => s + Number(x.engagement_rate), 0) / pubC.length : 0;
    return { name: p, views, er: Number(er.toFixed(2)) };
  });

  /* ─── Weekly trend (12 weeks) ─── */
  const weeklyData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const w = new Date(now); w.setDate(w.getDate() - (11 - i) * 7);
      const wStart = new Date(w); wStart.setDate(w.getDate() - w.getDay());
      const wEnd = new Date(wStart); wEnd.setDate(wStart.getDate() + 7);
      const dibuat = (all as { created_at: string }[]).filter(c => {
        const d = new Date(c.created_at); return d >= wStart && d < wEnd;
      }).length;
      const tayang = (all as { status: string; scheduled_date: string }[]).filter(c => {
        const d = new Date(c.scheduled_date); return c.status === "published" && d >= wStart && d < wEnd;
      }).length;
      return { period: `${wStart.getDate()}/${wStart.getMonth()+1}`, Dibuat: dibuat, Tayang: tayang };
    });
  }, [all]);

  /* ─── Monthly trend (6 months) ─── */
  const monthlyData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const label = d.toLocaleString("id-ID", { month: "short" }) + " '" + String(d.getFullYear()).slice(2);
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const dibuat = (all as { created_at: string }[]).filter(c => (c.created_at || "").startsWith(monthStr)).length;
      const tayang = (all as { status: string; scheduled_date: string }[]).filter(c =>
        c.status === "published" && (c.scheduled_date || "").startsWith(monthStr)
      ).length;
      return { period: label, Dibuat: dibuat, Tayang: tayang };
    });
  }, [all]);

  /* ─── Status distribution ─── */
  const statusDist = useMemo(() =>
    ["published","submitted","approved","revision","draft"]
      .map(s => ({ name: STATUS_LABEL[s], value: (all as { status: string }[]).filter(c => c.status === s).length, color: STATUS_COLORS[s] }))
      .filter(s => s.value > 0),
  [all]);

  /* ─── Per-creator performance ─── */
  const creatorPerf = useMemo(() => {
    const map: Record<string, { name: string; tayang: number; views: number }> = {};
    published.forEach(r => {
      const name = r.creator?.full_name ?? "Unknown";
      if (!map[name]) map[name] = { name, tayang: 0, views: 0 };
      map[name].tayang++;
      map[name].views += r.views;
    });
    return Object.values(map).sort((a, b) => b.tayang - a.tayang).slice(0, 8);
  }, [published]);

  const trendData = trendView === "monthly" ? monthlyData : weeklyData;

  const top5 = [...published].sort((a, b) => Number(b.engagement_rate) - Number(a.engagement_rate)).slice(0, 5);

  return (
    <div>
      <div className="label-caps text-muted-foreground">Admin</div>
      <h2 className="text-4xl font-bold tracking-tight mt-1">Overview</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-0 mt-6 border border-ink/15">
        <Metric label="Konten Published" value={totalPub} />
        <Metric label="Total Likes" value={totalLikes.toLocaleString("id-ID")} />
        <Metric label="Total Views" value={totalViews.toLocaleString("id-ID")} />
        <Metric label="Avg. Engagement" value={`${avgER.toFixed(2)}%`} />
      </div>

      {/* ── Row 1: Trend AreaChart + Status Donut ── */}
      <div className="grid md:grid-cols-3 gap-6 mt-6">
        {/* Trend – 2/3 */}
        <div className="md:col-span-2 bg-white border border-ink/15 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="label-caps">Tren Pembuatan Konten Tim</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {trendView === "monthly" ? "6 bulan terakhir" : "12 minggu terakhir"}
              </div>
            </div>
            <div className="flex border border-ink/20 overflow-hidden">
              {(["monthly","weekly"] as const).map(v => (
                <button key={v} onClick={() => setTrendView(v)}
                  className={`px-3 py-1.5 text-[11px] uppercase tracking-[0.06em] font-medium transition-colors ${
                    trendView === v ? "bg-ink text-white" : "text-muted-foreground hover:bg-ink/5"
                  }`}>
                  {v === "monthly" ? "Bulanan" : "Mingguan"}
                </button>
              ))}
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gadminDibuat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#0A0A0A" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#0A0A0A" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gadminTayang" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="Dibuat" stroke="#0A0A0A" strokeWidth={2}
                  fill="url(#gadminDibuat)" dot={{ fill: "#0A0A0A", r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                <Area type="monotone" dataKey="Tayang" stroke="#22c55e" strokeWidth={2}
                  fill="url(#gadminTayang)" dot={{ fill: "#22c55e", r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status donut – 1/3 */}
        <div className="bg-white border border-ink/15 p-5">
          <div className="label-caps">Distribusi Status</div>
          <div className="text-xs text-muted-foreground mt-0.5 mb-2">Semua konten ({all.length})</div>
          {statusDist.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Belum ada data</div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusDist} cx="50%" cy="42%" innerRadius={48} outerRadius={74}
                    paddingAngle={3} dataKey="value">
                    {statusDist.map(entry => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(val: number, name) => [`${val} konten`, name]} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* ── Row 2: Per-creator + Per-platform ── */}
      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <div className="bg-white border border-ink/15 p-5">
          <div className="label-caps">Konten Tayang / Creator</div>
          <div className="text-xs text-muted-foreground mt-0.5 mb-1">Top 8 creator</div>
          <div className="h-64 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={creatorPerf} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={90} />
                <Tooltip />
                <Bar dataKey="tayang" name="Konten Tayang" fill="#E8001D" radius={[0,2,2,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white border border-ink/15 p-5">
          <div className="label-caps">Konten Published / Platform</div>
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={perPlatform} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name="Konten" fill="#0A0A0A" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Row 3: Engagement + Views per platform ── */}
      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <div className="bg-white border border-ink/15 p-5">
          <div className="label-caps">Avg. Engagement / Platform (%)</div>
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={platformStats} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="er" name="Engagement %" fill="#8b5cf6" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white border border-ink/15 p-5">
          <div className="label-caps">Total Views / Platform</div>
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={platformStats} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="views" name="Views" fill="#E8001D" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white border border-ink/15">
        <div className="p-4 border-b border-ink/15"><div className="label-caps">Top 5 Performing</div></div>
        {top5.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Belum ada data performa.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-ink text-white">
              <tr>{["Judul","Creator","Platform","Link","Likes","Views","Shares","Engagement","Status"].map((h) => (
                <th key={h} className="label-caps p-3 text-left font-medium">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {top5.map((r) => (
                <tr key={r.id} className="border-b border-ink/10 last:border-b-0">
                  <td className="p-3 font-medium">
                    <div>{r.title}</div>
                    <div className="flex items-center gap-1.5 mt-1">
                      {(r.brands || r.brand_name) && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: r.brands?.color || '#000' }} />}
                      <div className="text-xs font-semibold" style={{ color: r.brands?.color || 'inherit' }}>{r.brands?.name || r.brand_name || "Unknown Brand"}</div>
                    </div>
                  </td>
                  <td className="p-3">{r.creator?.full_name ?? "—"}</td>
                  <td className="p-3"><div className="flex gap-1 flex-wrap">{r.platforms.map((p) => <PlatformBadge key={p} platform={p} />)}</div></td>
                  <td className="p-3">
                    <div className="flex flex-col gap-1">
                      {r.platforms.map((p, i) => {
                        const url = (r.platform_metrics?.[p]?.url || (i === 0 ? r.post_url : null))?.trim();
                        if (!url) return <span key={p} className="text-[10px] text-muted-foreground uppercase">{p}: -</span>;
                        const href = url.startsWith('http') ? url : `https://${url}`;
                        return <a key={p} href={href} target="_blank" rel="noreferrer" className="underline hover:text-primary text-[10px] font-bold uppercase">{p}</a>;
                      })}
                      {!r.platforms.length && r.post_url && <a href={r.post_url.startsWith('http') ? r.post_url : `https://${r.post_url}`} target="_blank" rel="noreferrer" className="underline hover:text-primary text-[10px] font-bold uppercase">Buka</a>}
                    </div>
                  </td>
                  <td className="p-3">{r.likes.toLocaleString("id-ID")}</td>
                  <td className="p-3">{r.views.toLocaleString("id-ID")}</td>
                  <td className="p-3">{r.shares.toLocaleString("id-ID")}</td>
                  <td className="p-3">{Number(r.engagement_rate).toFixed(2)}%</td>
                  <td className="p-3"><StatusBadge status="published" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white p-5 border-r border-ink/15 last:border-r-0">
      <div className="label-caps text-muted-foreground">{label}</div>
      <div className="text-3xl font-bold tracking-tight mt-2">{value}</div>
    </div>
  );
}
