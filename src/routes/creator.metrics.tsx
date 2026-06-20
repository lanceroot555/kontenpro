import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { PlatformBadge } from "@/components/swiss";
import { formatDate } from "@/lib/kontenpro";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  AreaChart, Area, PieChart, Pie, Cell, Legend,
} from "recharts";

export const Route = createFileRoute("/creator/metrics")({
  component: MetricsPage,
});

type Row = {
  id: string; title: string; platforms: string[]; scheduled_date: string;
  likes: number; views: number; shares: number; engagement_rate: number;
  post_url: string | null; platform_metrics: any;
};

type AllRow = {
  id: string; status: string; scheduled_date: string; created_at: string;
};

const STATUS_COLORS: Record<string, string> = {
  published: "#22c55e", submitted: "#3b82f6",
  approved: "#8b5cf6", revision: "#f59e0b", draft: "#9ca3af",
};
const STATUS_LABEL: Record<string, string> = {
  published: "Published", submitted: "Submitted",
  approved: "Approved", revision: "Revision", draft: "Draft",
};

function MetricsPage() {
  const auth = useAuth();
  const [trendView, setTrendView] = useState<"monthly" | "weekly">("monthly");

  /* ─── Published content (for platform stats & table) ─── */
  const { data = [] } = useQuery({
    queryKey: ["creator-metrics", auth.profile?.id],
    enabled: !!auth.profile,
    queryFn: async () => {
      const { data, error } = await supabase.from("contents")
        .select("id,title,platforms,scheduled_date,likes,views,shares,engagement_rate,post_url,platform_metrics")
        .eq("creator_id", auth.profile!.id).eq("status", "published")
        .order("scheduled_date", { ascending: false });
      if (error) throw error;
      return (data as Row[]) ?? [];
    },
  });

  /* ─── All content (for trend + status distribution) ─── */
  const { data: allContent = [] } = useQuery({
    queryKey: ["creator-all-content", auth.profile?.id],
    enabled: !!auth.profile,
    queryFn: async () => {
      const { data, error } = await supabase.from("contents")
        .select("id,status,scheduled_date,created_at")
        .eq("creator_id", auth.profile!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data as AllRow[]) ?? [];
    },
  });

  const total = {
    n: data.length,
    all: allContent.length,
    likes: data.reduce((s, x) => s + x.likes, 0),
    views: data.reduce((s, x) => s + x.views, 0),
    shares: data.reduce((s, x) => s + x.shares, 0),
    er: data.length ? data.reduce((s, x) => s + Number(x.engagement_rate), 0) / data.length : 0,
  };

  const platforms = ["instagram","tiktok","twitter","youtube","linkedin"];
  const platformStats = platforms.map((p) => {
    const pubC = data.filter(c => c.platforms?.includes(p));
    const views = pubC.reduce((s, x) => s + x.views, 0);
    const er = pubC.length ? pubC.reduce((s, x) => s + Number(x.engagement_rate), 0) / pubC.length : 0;
    return { name: p, views, er: Number(er.toFixed(2)) };
  });

  /* ─── Monthly trend (last 6 months) ─── */
  const monthlyData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const label = d.toLocaleString("id-ID", { month: "short" }) + " '" + String(d.getFullYear()).slice(2);
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const dibuat = allContent.filter(c => (c.created_at || "").startsWith(monthStr)).length;
      const tayang = allContent.filter(c => c.status === "published" && (c.scheduled_date || "").startsWith(monthStr)).length;
      return { bulan: label, Dibuat: dibuat, Tayang: tayang };
    });
  }, [allContent]);

  /* ─── Weekly trend (last 8 weeks) ─── */
  const weeklyData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 8 }, (_, i) => {
      const base = new Date(now); base.setDate(now.getDate() - (7 - i) * 7);
      const wStart = new Date(base); wStart.setDate(base.getDate() - base.getDay());
      const wEnd = new Date(wStart); wEnd.setDate(wStart.getDate() + 7);
      const konten = allContent.filter(c => {
        const d = new Date(c.created_at || c.scheduled_date);
        return d >= wStart && d < wEnd;
      }).length;
      return { minggu: `${wStart.getDate()}/${wStart.getMonth() + 1}`, Konten: konten };
    });
  }, [allContent]);

  /* ─── Status distribution (donut) ─── */
  const statusDist = useMemo(() =>
    ["published","submitted","approved","revision","draft"]
      .map(s => ({ name: STATUS_LABEL[s], value: allContent.filter(c => c.status === s).length, color: STATUS_COLORS[s] }))
      .filter(s => s.value > 0),
  [allContent]);

  const trendData = trendView === "monthly" ? monthlyData : weeklyData;
  const trendKey  = trendView === "monthly" ? "bulan" : "minggu";

  return (
    <div>
      <div className="label-caps text-muted-foreground">Creator</div>
      <h2 className="text-4xl font-bold tracking-tight mt-1">Metrik Personal</h2>

      {/* ── Summary ── */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-0 mt-6 border border-ink/15">
        <Metric label="Total Konten" value={total.all} />
        <Metric label="Published" value={total.n} />
        <Metric label="Likes" value={total.likes.toLocaleString("id-ID")} />
        <Metric label="Views" value={total.views.toLocaleString("id-ID")} />
        <Metric label="Shares" value={total.shares.toLocaleString("id-ID")} />
        <Metric label="Engagement" value={`${total.er.toFixed(2)}%`} />
      </div>

      {/* ── Trend + Status donut ── */}
      <div className="grid md:grid-cols-3 gap-6 mt-6">
        {/* Area trend – 2/3 width */}
        <div className="md:col-span-2 bg-white border border-ink/15 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="label-caps">Perkembangan Konten</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {trendView === "monthly" ? "6 bulan terakhir" : "8 minggu terakhir"}
              </div>
            </div>
            <div className="flex border border-ink/20 overflow-hidden">
              {(["monthly","weekly"] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setTrendView(v)}
                  className={`px-3 py-1.5 text-[11px] uppercase tracking-[0.06em] font-medium transition-colors ${
                    trendView === v ? "bg-ink text-white" : "text-muted-foreground hover:bg-ink/5"
                  }`}
                >
                  {v === "monthly" ? "Bulanan" : "Mingguan"}
                </button>
              ))}
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradDibuat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#0A0A0A" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#0A0A0A" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradTayang" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#E8001D" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#E8001D" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" />
                <XAxis dataKey={trendKey} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                {trendView === "monthly" ? (
                  <>
                    <Area type="monotone" dataKey="Dibuat" stroke="#0A0A0A" strokeWidth={2}
                      fill="url(#gradDibuat)" dot={{ fill: "#0A0A0A", r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                    <Area type="monotone" dataKey="Tayang" stroke="#E8001D" strokeWidth={2}
                      fill="url(#gradTayang)" dot={{ fill: "#E8001D", r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                  </>
                ) : (
                  <Area type="monotone" dataKey="Konten" stroke="#0A0A0A" strokeWidth={2}
                    fill="url(#gradDibuat)" dot={{ fill: "#E8001D", r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status donut – 1/3 width */}
        <div className="bg-white border border-ink/15 p-5">
          <div className="label-caps">Distribusi Status</div>
          <div className="text-xs text-muted-foreground mt-0.5 mb-2">Semua konten ({total.all})</div>
          {statusDist.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Belum ada konten</div>
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

      {/* ── Platform charts ── */}
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
                <Bar dataKey="er" name="Engagement %" fill="#0A0A0A" radius={[2,2,0,0]} />
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

      {data.length === 0 ? (
        <div className="mt-6 text-center text-muted-foreground py-12 border border-dashed border-ink/20">
          Belum ada konten yang tayang. Statistik akan muncul setelah konten published.
        </div>
      ) : (
        <div className="mt-6 bg-white border border-ink/15 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink text-white">
              <tr>{["Judul","Platform","Tayang","Likes","Views","Shares","Engagement","Link"].map((h) => (
                <th key={h} className="label-caps text-left p-3 font-medium">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.id} className="border-b border-ink/10 last:border-b-0">
                  <td className="p-3 font-medium">{r.title}</td>
                  <td className="p-3"><div className="flex gap-1 flex-wrap">{r.platforms.map((p) => <PlatformBadge key={p} platform={p} />)}</div></td>
                  <td className="p-3">{formatDate(r.scheduled_date)}</td>
                  <td className="p-3">{r.likes.toLocaleString("id-ID")}</td>
                  <td className="p-3">{r.views.toLocaleString("id-ID")}</td>
                  <td className="p-3">{r.shares.toLocaleString("id-ID")}</td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
