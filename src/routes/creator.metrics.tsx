import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { PlatformBadge } from "@/components/swiss";
import { formatDate } from "@/lib/kontenpro";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export const Route = createFileRoute("/creator/metrics")({
  component: MetricsPage,
});

type Row = {
  id: string; title: string; platforms: string[]; scheduled_date: string;
  likes: number; views: number; shares: number; engagement_rate: number; post_url: string | null; platform_metrics: any;
};

function MetricsPage() {
  const auth = useAuth();
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

  const total = {
    n: data.length,
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

  return (
    <div>
      <div className="label-caps text-muted-foreground">Creator</div>
      <h2 className="text-4xl font-bold tracking-tight mt-1">Metrik Personal</h2>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-0 mt-6 border border-ink/15">
        <Metric label="Published" value={total.n} />
        <Metric label="Likes" value={total.likes.toLocaleString("id-ID")} />
        <Metric label="Views" value={total.views.toLocaleString("id-ID")} />
        <Metric label="Shares" value={total.shares.toLocaleString("id-ID")} />
        <Metric label="Engagement" value={`${total.er.toFixed(2)}%`} />
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
