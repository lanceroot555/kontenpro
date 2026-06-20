import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PlatformBadge, StatusBadge } from "@/components/swiss";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from "recharts";

export const Route = createFileRoute("/admin/dashboard")({
  component: AdminOverview,
});

type Row = {
  id: string; title: string; brand_name: string | null; platforms: string[]; status: string;
  likes: number; views: number; shares: number; engagement_rate: number;
  scheduled_date: string; created_at: string; post_url: string | null; platform_metrics: any;
  creator: { full_name: string } | null;
  brands: { name: string; color: string } | null;
};

function AdminOverview() {
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
        .select("id,platforms,status,created_at,scheduled_date");
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

  const weeks: { week: string; count: number }[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const w = new Date(now); w.setDate(w.getDate() - i * 7);
    const wStart = new Date(w); wStart.setDate(w.getDate() - w.getDay());
    const wEnd = new Date(wStart); wEnd.setDate(wStart.getDate() + 7);
    const count = (all as { status: string; scheduled_date: string }[]).filter((c) => {
      const d = new Date(c.scheduled_date);
      return c.status === "published" && d >= wStart && d < wEnd;
    }).length;
    weeks.push({ week: `${wStart.getDate()}/${wStart.getMonth()+1}`, count });
  }

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

      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <div className="bg-white border border-ink/15 p-5">
          <div className="label-caps">Konten Published / Platform</div>
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={perPlatform}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#E8001D" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white border border-ink/15 p-5">
          <div className="label-caps">Published / Minggu (12W)</div>
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeks}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#0A0A0A" strokeWidth={2} dot={{ fill: "#E8001D" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <div className="bg-white border border-ink/15 p-5">
          <div className="label-caps">Avg. Engagement / Platform (%)</div>
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={platformStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="er" fill="#0A0A0A" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white border border-ink/15 p-5">
          <div className="label-caps">Total Views / Platform</div>
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={platformStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="views" fill="#E8001D" />
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
