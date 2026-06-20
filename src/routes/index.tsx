import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckSquare, Calendar, BarChart3, Globe, Bell, Users, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KontenPro — Kelola Konten Tim Tanpa Spreadsheet" },
      { name: "description", content: "Platform manajemen konten tim sosial media: kreasi, approval dengan revisi, kalender, dan analitik dalam satu tempat." },
      { property: "og:title", content: "KontenPro — Kelola Konten Tim Tanpa Spreadsheet" },
      { property: "og:description", content: "Satu platform untuk kreasi, approval, jadwal, dan analitik konten tim sosial media kamu." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-[#F5F5F0] text-ink">
      <Nav />
      <Hero />
      <Problem />
      <Features />
      <How />
      <Testimonial />
      <FinalCta />
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <header className="border-b border-ink/10 bg-[#F5F5F0]/90 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto max-w-[1280px] px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-6 w-6 bg-primary" />
          <span className="font-bold text-lg tracking-tight">KONTENPRO</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm">
          <a href="#features" className="hover:underline">Fitur</a>
          <a href="#how" className="hover:underline">Cara Kerja</a>
          <Link to="/auth" className="hover:underline">Login</Link>
        </nav>
        <Link to="/auth" search={{ mode: "signup" }} className="bg-primary text-white px-5 py-2.5 text-[12px] uppercase tracking-[0.06em] font-medium">
          Daftar
        </Link>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="border-b border-ink/10">
      <div className="mx-auto max-w-[1280px] px-8 py-20 md:py-28 grid md:grid-cols-5 gap-12 items-center">
        <div className="md:col-span-3 kp-fade-up">
          <div className="inline-block bg-primary text-white px-3 py-1 text-[11px] uppercase tracking-[0.08em] font-medium mb-8">
            Platform Manajemen Konten
          </div>
          <h1 className="text-5xl md:text-7xl font-bold leading-[1.02] tracking-[-0.02em]">
            Kelola Konten Tim.<br />
            <span className="text-primary">Tanpa Spreadsheet.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
            KontenPro menyatukan kreasi, approval, penjadwalan, dan analitik konten tim kamu dalam satu platform yang rapi.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link to="/auth" search={{ mode: "signup" }} className="bg-primary text-white px-8 py-4 text-[14px] uppercase tracking-[0.06em] font-medium hover:bg-[#c20019] inline-flex items-center gap-2">
              Mulai Gratis <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#how" className="border border-ink px-8 py-4 text-[14px] uppercase tracking-[0.06em] font-medium hover:bg-ink hover:text-white">
              Lihat Demo
            </a>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">Gratis untuk tim hingga 5 orang. Tidak perlu kartu kredit.</p>
        </div>
        <div className="md:col-span-2">
          <HeroMock />
        </div>
      </div>
    </section>
  );
}

function HeroMock() {
  return (
    <div className="relative">
      <div className="absolute inset-0 swiss-grid-bg -m-8 opacity-60" />
      <div className="relative bg-white border border-ink p-6 kp-fade-up" style={{ animationDelay: "0.1s" }}>
        <div className="flex items-center justify-between mb-4">
          <span className="label-caps text-muted-foreground">Approval Queue</span>
          <span className="bg-primary text-white px-2 py-0.5 text-[11px] font-medium">3</span>
        </div>
        <div className="space-y-3">
          {[
            { t: "Launch teaser IG Reels", s: "Submitted", c: "#F5A623" },
            { t: "Twitter thread peluncuran", s: "Revision", c: "#E8741D" },
            { t: "LinkedIn announcement", s: "Approved", c: "#00A651" },
          ].map((x, i) => (
            <div key={i} className="border border-ink/15 p-3 flex items-center justify-between">
              <span className="text-sm font-medium">{x.t}</span>
              <span className="text-[11px] uppercase tracking-[0.08em] font-medium border-2 px-2 py-[2px] rounded-[4px]" style={{ color: x.c, borderColor: x.c, backgroundColor: `${x.c}22` }}>
                {x.s}
              </span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3 mt-6 border-t border-ink/15 pt-4">
          {[
            { l: "Likes", v: "12.4K" },
            { l: "Views", v: "284K" },
            { l: "Engage", v: "4.8%" },
          ].map((m, i) => (
            <div key={i}>
              <div className="label-caps text-muted-foreground">{m.l}</div>
              <div className="text-2xl font-bold tracking-tight kp-count">{m.v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Problem() {
  const items = [
    { n: "01", t: "File spreadsheet berantakan", d: "Tim pakai Google Sheet berbeda-beda. Tidak ada yang tahu versi mana yang benar." },
    { n: "02", t: "Approval lewat WhatsApp", d: "Feedback approval tenggelam di chat. Tidak ada rekam jejak revisi yang jelas." },
    { n: "03", t: "Konten mana yang perform?", d: "Statistik dikumpulkan manual, tidak ada analitik terpusat per creator." },
  ];
  return (
    <section className="bg-ink text-white border-b border-ink">
      <div className="mx-auto max-w-[1280px] px-8 py-24">
        <h2 className="text-4xl md:text-5xl font-bold text-center tracking-tight">Masalah yang Kamu Kenal.</h2>
        <div className="grid md:grid-cols-3 gap-12 mt-16">
          {items.map((x) => (
            <div key={x.n}>
              <div className="text-primary text-5xl font-bold tracking-tight">{x.n}</div>
              <div className="mt-4 text-xl font-semibold">{x.t}</div>
              <p className="mt-2 text-white/70 leading-relaxed">{x.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const items = [
    { Icon: Users,      t: "Role-Based Dashboard",     d: "Admin dan Creator punya tampilan berbeda sesuai peran masing-masing." },
    { Icon: CheckSquare,t: "Approval + Revisi Loop",   d: "Admin bisa approve atau minta revisi berulang dengan komentar terstruktur." },
    { Icon: Calendar,   t: "Kalender Konten",          d: "Lihat semua jadwal konten bulan ini dalam calendar view yang bersih." },
    { Icon: BarChart3,  t: "Analytics Performa",       d: "Likes, views, shares, dan engagement rate tersentralisasi per konten dan creator." },
    { Icon: Globe,      t: "Multi-Platform",           d: "Instagram, TikTok, Twitter/X, YouTube, dan LinkedIn dalam satu form." },
    { Icon: Bell,       t: "Notifikasi Real-Time",     d: "Tim langsung tahu ketika ada konten baru, revisi, atau approval." },
  ];
  return (
    <section id="features" className="border-b border-ink/10">
      <div className="mx-auto max-w-[1280px] px-8 py-24">
        <div className="text-primary label-caps">Fitur Utama</div>
        <h2 className="text-4xl md:text-5xl font-bold mt-3 max-w-2xl tracking-tight">Semua yang Dibutuhkan Tim Konten Modern.</h2>
        <div className="grid md:grid-cols-3 gap-0 mt-12 border border-ink">
          {items.map(({ Icon, t, d }, i) => (
            <div key={t} className={`bg-white p-8 border-ink ${i % 3 !== 2 ? "md:border-r" : ""} ${i < 3 ? "md:border-b" : ""}`}>
              <Icon className="h-7 w-7 text-primary" />
              <h3 className="mt-6 text-xl font-semibold">{t}</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function How() {
  const steps = [
    { n: "01", t: "Buat & Submit", d: "Creator isi form lengkap, upload aset, dan submit ke Admin." },
    { n: "02", t: "Review & Revisi", d: "Admin review, beri feedback terstruktur, atau langsung approve." },
    { n: "03", t: "Tayang & Analisis", d: "Konten live, statistik diinput dan analitik tersentralisasi." },
  ];
  return (
    <section id="how" className="bg-ink text-white border-b border-ink">
      <div className="mx-auto max-w-[1280px] px-8 py-24">
        <div className="text-primary label-caps">Cara Kerja</div>
        <h2 className="text-4xl md:text-5xl font-bold mt-3 tracking-tight">Tiga Langkah. Satu Platform.</h2>
        <div className="grid md:grid-cols-3 gap-8 mt-16 relative">
          <div className="hidden md:block absolute top-10 left-[16%] right-[16%] h-px bg-primary/40" />
          {steps.map((s) => (
            <div key={s.n} className="relative bg-ink">
              <div className="text-primary text-7xl font-bold tracking-tight">{s.n}</div>
              <div className="mt-4 text-2xl font-semibold">{s.t}</div>
              <p className="mt-2 text-white/70 leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonial() {
  return (
    <section className="border-b border-ink/10">
      <div className="mx-auto max-w-[900px] px-8 py-24 text-center">
        <p className="text-2xl md:text-3xl italic leading-snug tracking-tight">
          "KontenPro mengubah cara kami bekerja. Approval yang dulu 3 hari lewat WhatsApp, sekarang selesai dalam hitungan jam."
        </p>
        <p className="mt-6 label-caps">— Sarah Amalia, Social Media Manager</p>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="bg-primary text-white">
      <div className="mx-auto max-w-[1280px] px-8 py-24 text-center">
        <h2 className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.02]">Mulai Sekarang.<br />Gratis.</h2>
        <p className="mt-6 text-white/90">Tidak perlu kartu kredit. Setup dalam 2 menit.</p>
        <Link to="/auth" search={{ mode: "signup" }} className="mt-10 inline-block bg-white text-ink px-10 py-4 text-[14px] uppercase tracking-[0.06em] font-medium hover:bg-ink hover:text-white">
          Daftar Sekarang
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-ink text-white">
      <div className="mx-auto max-w-[1280px] px-8 py-12 grid md:grid-cols-3 gap-8 items-start">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 bg-primary" />
            <span className="font-bold text-lg tracking-tight">KONTENPRO</span>
          </div>
          <p className="mt-2 text-white/60 text-sm">Manajemen konten tim, tanpa spreadsheet.</p>
        </div>
        <div className="flex gap-8 text-sm">
          <a href="#features" className="hover:underline">Fitur</a>
          <a href="#how" className="hover:underline">Cara Kerja</a>
          <Link to="/auth" className="hover:underline">Login</Link>
          <Link to="/auth" search={{ mode: "signup" }} className="hover:underline">Daftar</Link>
        </div>
        <div className="text-sm text-white/60 md:text-right">© 2026 KontenPro. All rights reserved.</div>
      </div>
    </footer>
  );
}
