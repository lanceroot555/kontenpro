import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, FileText, Table2 } from "lucide-react";

export const Route = createFileRoute("/admin/export")({
  component: ExportPage,
});

type Brand = { id: string; name: string; color: string };
type Content = {
  id: string; title: string; brand_name: string | null; status: string;
  platforms: string[]; scheduled_date: string; created_at: string;
  caption: string | null; likes: number; views: number; shares: number;
  engagement_rate: number; post_url: string | null;
  creator: { full_name: string } | null;
  brands: { name: string; color: string } | null;
};

const STATUS_ID: Record<string, string> = {
  draft: "Draft", submitted: "Submitted", revision: "Revision",
  approved: "Approved", published: "Published",
};

const STATUS_HEX: Record<string, string> = {
  draft: "#6B6B6B", submitted: "#F5A623", revision: "#E8741D",
  approved: "#00A651", published: "#0057B8",
};

function ExportPage() {
  const today = new Date().toISOString().slice(0, 10);
  const firstOfMonth = today.slice(0, 7) + "-01";

  const [brandId, setBrandId] = useState("all");
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(today);
  const [statusFilter, setStatusFilter] = useState("all");
  const [generating, setGenerating] = useState(false);

  const { data: brands = [] } = useQuery({
    queryKey: ["brands-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("brands").select("id,name,color").order("name");
      if (error) throw error;
      return (data as Brand[]) ?? [];
    },
  });

  async function fetchContents(): Promise<Content[]> {
    let q = supabase
      .from("contents")
      .select("id,title,brand_name,status,platforms,scheduled_date,created_at,caption,likes,views,shares,engagement_rate,post_url,creator:profiles!contents_creator_id_fkey(full_name),brands(name,color)")
      .gte("scheduled_date", dateFrom)
      .lte("scheduled_date", dateTo)
      .order("scheduled_date", { ascending: true });
    if (brandId !== "all") q = q.eq("brand_id", brandId);
    if (statusFilter !== "all") q = q.eq("status", statusFilter);
    const { data, error } = await q;
    if (error) throw error;
    return (data as unknown as Content[]) ?? [];
  }

  // ─── PDF ──────────────────────────────────────────────────────────────────
  async function exportPDF() {
    setGenerating(true);
    try {
      const rows = await fetchContents();
      const brand = brands.find(b => b.id === brandId);
      const brandName = brand?.name || "Semua Brand";
      const dateLabel = `${formatTgl(dateFrom)} – ${formatTgl(dateTo)}`;
      const generatedAt = new Date().toLocaleString("id-ID");

      const summaryByStatus: Record<string, number> = {};
      let totalViews = 0, totalLikes = 0, totalShares = 0;
      for (const c of rows) {
        summaryByStatus[c.status] = (summaryByStatus[c.status] || 0) + 1;
        totalViews += c.views || 0;
        totalLikes += c.likes || 0;
        totalShares += c.shares || 0;
      }

      const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"/>
<title>Laporan Konten – ${brandName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #1a1a1a; background: #fff; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none; }
    @page { margin: 18mm 15mm; size: A4 landscape; }
  }
  .no-print { text-align: center; padding: 20px; background: #f5f5f0; }
  .no-print button { padding: 10px 28px; background: #E8001D; color: #fff; border: none; cursor: pointer; font-size: 14px; border-radius: 4px; }

  .page { max-width: 1050px; margin: 0 auto; padding: 24px; }

  /* Header */
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1a1a1a; padding-bottom: 12px; margin-bottom: 20px; }
  .logo { display: flex; align-items: center; gap: 8px; }
  .logo-box { width: 22px; height: 22px; background: #E8001D; }
  .logo-text { font-weight: 800; font-size: 15px; letter-spacing: 0.1em; }
  .header-meta { text-align: right; }
  .header-meta .report-title { font-size: 18px; font-weight: 700; letter-spacing: -0.02em; }
  .header-meta .sub { font-size: 10px; color: #666; margin-top: 2px; letter-spacing: 0.04em; text-transform: uppercase; }

  /* Info bar */
  .infobar { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: #1a1a1a; border: 1px solid #1a1a1a; margin-bottom: 20px; }
  .info-cell { background: #fff; padding: 10px 14px; }
  .info-cell .label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; color: #888; }
  .info-cell .value { font-size: 13px; font-weight: 700; margin-top: 2px; }

  /* Summary cards */
  .summary-title { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #888; margin-bottom: 8px; font-weight: 600; }
  .summary-grid { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
  .summary-card { flex: 1; min-width: 80px; border: 1px solid #e0e0e0; padding: 10px 12px; }
  .summary-card .sc-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em; color: #888; }
  .summary-card .sc-value { font-size: 22px; font-weight: 800; margin-top: 2px; }
  .summary-card.accent { border-left: 4px solid; }

  /* Table */
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  thead tr { background: #1a1a1a; color: #fff; }
  th { padding: 8px 10px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.07em; font-weight: 600; }
  td { padding: 7px 10px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
  tr:nth-child(even) td { background: #fafaf8; }
  .status-pill { display: inline-block; padding: 2px 8px; font-size: 9px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: #fff; }
  .platform-tags { display: flex; flex-wrap: wrap; gap: 3px; }
  .platform-tag { font-size: 8px; text-transform: uppercase; padding: 1px 5px; border: 1px solid #ccc; color: #555; letter-spacing: 0.04em; }
  .num { font-variant-numeric: tabular-nums; text-align: right; }

  /* Footer */
  .footer { margin-top: 24px; border-top: 1px solid #e0e0e0; padding-top: 10px; display: flex; justify-content: space-between; font-size: 9px; color: #999; text-transform: uppercase; letter-spacing: 0.06em; }
</style>
</head>
<body>
<div class="no-print">
  <button onclick="window.print()">🖨️ Print / Simpan sebagai PDF</button>
  <p style="margin-top:8px;font-size:12px;color:#666">Gunakan printer dialog → "Save as PDF" untuk menyimpan file PDF</p>
</div>
<div class="page">
  <!-- Header -->
  <div class="header">
    <div class="logo">
      <div class="logo-box"></div>
      <span class="logo-text">KONTENPRO</span>
    </div>
    <div class="header-meta">
      <div class="report-title">Laporan Konten</div>
      <div class="sub">${brandName} &nbsp;·&nbsp; ${dateLabel}</div>
    </div>
  </div>

  <!-- Info bar -->
  <div class="infobar">
    <div class="info-cell">
      <div class="label">Brand / Klien</div>
      <div class="value">${brandName}</div>
    </div>
    <div class="info-cell">
      <div class="label">Periode</div>
      <div class="value">${dateLabel}</div>
    </div>
    <div class="info-cell">
      <div class="label">Total Konten</div>
      <div class="value">${rows.length}</div>
    </div>
    <div class="info-cell">
      <div class="label">Dibuat</div>
      <div class="value" style="font-size:11px">${generatedAt}</div>
    </div>
  </div>

  <!-- Summary -->
  <div class="summary-title">Ringkasan Performa</div>
  <div class="summary-grid">
    ${Object.entries(summaryByStatus).map(([s, n]) => `
      <div class="summary-card accent" style="border-left-color:${STATUS_HEX[s] || '#999'}">
        <div class="sc-label">${STATUS_ID[s] || s}</div>
        <div class="sc-value" style="color:${STATUS_HEX[s] || '#333'}">${n}</div>
      </div>`).join("")}
    <div class="summary-card">
      <div class="sc-label">Total Views</div>
      <div class="sc-value">${totalViews.toLocaleString("id-ID")}</div>
    </div>
    <div class="summary-card">
      <div class="sc-label">Total Likes</div>
      <div class="sc-value">${totalLikes.toLocaleString("id-ID")}</div>
    </div>
    <div class="summary-card">
      <div class="sc-label">Total Shares</div>
      <div class="sc-value">${totalShares.toLocaleString("id-ID")}</div>
    </div>
    <div class="summary-card">
      <div class="sc-label">Avg. Engagement</div>
      <div class="sc-value">${rows.length ? (rows.reduce((a, c) => a + (c.engagement_rate || 0), 0) / rows.length).toFixed(2) : "0"}%</div>
    </div>
  </div>

  <!-- Table -->
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Judul Konten</th>
        <th>Creator</th>
        <th>Brand</th>
        <th>Platform</th>
        <th>Tgl Tayang</th>
        <th>Status</th>
        <th class="num">Views</th>
        <th class="num">Likes</th>
        <th class="num">Shares</th>
        <th class="num">Eng. %</th>
      </tr>
    </thead>
    <tbody>
      ${rows.map((c, idx) => `
      <tr>
        <td style="color:#999">${idx + 1}</td>
        <td style="max-width:200px;font-weight:600">${c.title}</td>
        <td>${c.creator?.full_name || "—"}</td>
        <td style="color:${c.brands?.color || '#333'};font-weight:600">${c.brands?.name || c.brand_name || "—"}</td>
        <td><div class="platform-tags">${c.platforms.map(p => `<span class="platform-tag">${p}</span>`).join("")}</div></td>
        <td style="white-space:nowrap">${formatTgl(c.scheduled_date)}</td>
        <td><span class="status-pill" style="background:${STATUS_HEX[c.status] || '#999'}">${STATUS_ID[c.status] || c.status}</span></td>
        <td class="num">${(c.views || 0).toLocaleString("id-ID")}</td>
        <td class="num">${(c.likes || 0).toLocaleString("id-ID")}</td>
        <td class="num">${(c.shares || 0).toLocaleString("id-ID")}</td>
        <td class="num">${(c.engagement_rate || 0).toFixed(2)}%</td>
      </tr>`).join("")}
    </tbody>
  </table>

  <!-- Footer -->
  <div class="footer">
    <span>KontenPro · Laporan Otomatis</span>
    <span>${generatedAt}</span>
    <span>Rahasia &amp; Konfidensial</span>
  </div>
</div>
</body>
</html>`;

      const win = window.open("", "_blank", "width=1200,height=900");
      if (!win) { toast.error("Pop-up diblokir browser. Izinkan pop-up untuk domain ini."); return; }
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 800);
      toast.success("Laporan PDF siap di-print / disimpan");
    } catch (e) {
      toast.error((e as Error).message || "Gagal generate PDF");
    } finally {
      setGenerating(false);
    }
  }

  // ─── EXCEL (CSV) ──────────────────────────────────────────────────────────
  async function exportExcel() {
    setGenerating(true);
    try {
      const rows = await fetchContents();
      const brand = brands.find(b => b.id === brandId);
      const brandName = brand?.name || "Semua Brand";

      const headers = ["No", "Judul Konten", "Creator", "Brand", "Platform", "Tgl Tayang", "Status", "Views", "Likes", "Shares", "Engagement %", "Link Post"];
      const csvRows = [
        [`Laporan Konten KontenPro`],
        [`Brand: ${brandName}`],
        [`Periode: ${formatTgl(dateFrom)} – ${formatTgl(dateTo)}`],
        [`Digenerate: ${new Date().toLocaleString("id-ID")}`],
        [],
        headers,
        ...rows.map((c, i) => [
          i + 1,
          c.title,
          c.creator?.full_name || "",
          c.brands?.name || c.brand_name || "",
          c.platforms.join(", "),
          formatTgl(c.scheduled_date),
          STATUS_ID[c.status] || c.status,
          c.views || 0,
          c.likes || 0,
          c.shares || 0,
          `${(c.engagement_rate || 0).toFixed(2)}%`,
          c.post_url || "",
        ]),
        [],
        ["", "TOTAL", "", "", "", "", "", rows.reduce((a, c) => a + (c.views || 0), 0), rows.reduce((a, c) => a + (c.likes || 0), 0), rows.reduce((a, c) => a + (c.shares || 0), 0)],
      ];

      const csv = csvRows.map(r =>
        (r as (string | number)[]).map(v => {
          const s = String(v ?? "");
          return s.includes(",") || s.includes('"') || s.includes("\n")
            ? `"${s.replace(/"/g, '""')}"` : s;
        }).join(",")
      ).join("\r\n");

      const BOM = "﻿"; // UTF-8 BOM agar Excel baca karakter Indonesia
      const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Laporan_${brandName.replace(/\s+/g, "_")}_${dateFrom}_${dateTo}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("File Excel (.csv) berhasil diunduh");
    } catch (e) {
      toast.error((e as Error).message || "Gagal generate Excel");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="label-caps text-muted-foreground">Admin</div>
      <h2 className="text-4xl font-bold tracking-tight mt-1">Export Laporan</h2>
      <p className="text-sm text-muted-foreground mt-2">Generate laporan konten profesional dalam format PDF atau Excel.</p>

      <div className="mt-8 bg-white border border-ink/15 p-6 space-y-6">
        {/* Brand */}
        <div>
          <label className="label-caps block mb-2">Brand / Klien</label>
          <select value={brandId} onChange={e => setBrandId(e.target.value)} className="w-full border border-ink p-3 text-sm bg-white cursor-pointer">
            <option value="all">Semua Brand</option>
            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>

        {/* Date range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-caps block mb-2">Dari Tanggal</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full border border-ink p-3 text-sm" />
          </div>
          <div>
            <label className="label-caps block mb-2">Sampai Tanggal</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full border border-ink p-3 text-sm" />
          </div>
        </div>

        {/* Status filter */}
        <div>
          <label className="label-caps block mb-2">Filter Status (opsional)</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full border border-ink p-3 text-sm bg-white cursor-pointer">
            <option value="all">Semua Status</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="revision">Revision</option>
            <option value="approved">Approved</option>
            <option value="published">Published</option>
          </select>
        </div>

        {/* Preview info */}
        <div className="bg-[#F5F5F0] border border-ink/10 p-4 text-sm space-y-1">
          <div className="font-medium text-xs uppercase tracking-[0.06em] mb-2">Isi Laporan</div>
          <div className="text-muted-foreground">✓ Ringkasan performa (total per status, views, likes, shares, engagement)</div>
          <div className="text-muted-foreground">✓ Tabel detail setiap konten dengan creator & platform</div>
          <div className="text-muted-foreground">✓ Header profesional dengan branding KontenPro</div>
          <div className="text-muted-foreground">✓ Footer laporan + timestamp generate</div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 pt-2 border-t border-ink/10">
          <button
            disabled={generating}
            onClick={exportPDF}
            className="flex items-center gap-2 bg-ink text-white px-6 py-3 text-[12px] uppercase tracking-[0.06em] font-medium hover:bg-[#333] disabled:opacity-50"
          >
            <FileText className="h-4 w-4" />
            {generating ? "Generating..." : "Export PDF"}
          </button>
          <button
            disabled={generating}
            onClick={exportExcel}
            className="flex items-center gap-2 border border-ink bg-white px-6 py-3 text-[12px] uppercase tracking-[0.06em] font-medium hover:bg-[#F5F5F0] disabled:opacity-50"
          >
            <Table2 className="h-4 w-4" />
            {generating ? "Generating..." : "Export Excel (.csv)"}
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          <strong>PDF:</strong> Akan membuka jendela baru → klik "Print" → pilih "Save as PDF" di dialog printer.<br />
          <strong>Excel:</strong> File .csv langsung terunduh, bisa dibuka di Microsoft Excel atau Google Sheets.
        </p>
      </div>
    </div>
  );
}

function formatTgl(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}
