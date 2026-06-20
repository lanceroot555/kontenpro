import { useState, useEffect } from "react";
import { X, ArrowRight, ChevronRight } from "lucide-react";
import type { AppRole } from "@/lib/use-auth";

type Step = {
  icon: string;
  title: string;
  desc: string;
  tip?: string;
};

const TOUR_ADMIN: Step[] = [
  {
    icon: "👋",
    title: "Selamat datang di KontenPro!",
    desc: "Kamu login sebagai Admin. Panduan singkat ini akan membantu kamu mengenal semua fitur yang tersedia.",
    tip: "Bisa dilewati kapan saja — dan bisa diulang dari Pengaturan Akun.",
  },
  {
    icon: "📊",
    title: "Dashboard Overview",
    desc: "Pantau statistik konten tim secara real-time: total konten, yang menunggu approval, sudah published, dan engagement rata-rata.",
    tip: "Sidebar kiri → Overview",
  },
  {
    icon: "🏷️",
    title: "Manajemen Klien",
    desc: "Buat dan kelola brand/klien. Assign creator ke masing-masing brand, set warna label, dan atur hashtag default per brand — otomatis terisi saat creator buat konten.",
    tip: "Sidebar kiri → Manajemen Klien",
  },
  {
    icon: "✅",
    title: "Approval Queue",
    desc: "Semua konten yang disubmit creator muncul di sini. Kamu bisa Approve langsung atau kirim komentar Revisi. Badge angka di sidebar menunjukkan jumlah yang menunggu.",
    tip: "Sidebar kiri → Approval Queue",
  },
  {
    icon: "📋",
    title: "Konten Tim",
    desc: "Lihat seluruh konten dari semua creator. Filter by status, brand, atau platform. Klik konten untuk melihat detail lengkap termasuk caption, file, dan metrik.",
    tip: "Sidebar kiri → Konten Tim",
  },
  {
    icon: "📅",
    title: "Kalender Global",
    desc: "Tampilan 2 bulan sekaligus — lihat jadwal tayang semua konten tim lintas creator dan brand. Klik tanggal untuk melihat daftar konten di hari tersebut.",
    tip: "Sidebar kiri → Kalender",
  },
  {
    icon: "📄",
    title: "Export Laporan",
    desc: "Generate laporan profesional dalam format PDF atau Excel. Pilih brand, rentang tanggal, dan filter status — laporan mencakup ringkasan performa dan detail setiap konten.",
    tip: "Sidebar kiri → Export Laporan",
  },
  {
    icon: "🔔",
    title: "Notifikasi Real-time",
    desc: "Setiap kali creator submit atau resubmit konten, kamu langsung dapat notifikasi. Badge merah di icon lonceng menunjukkan jumlah notifikasi belum dibaca.",
    tip: "Icon lonceng di header kanan atas",
  },
  {
    icon: "🚀",
    title: "Siap digunakan!",
    desc: "Kamu sudah kenal semua fitur utama. Mulai dengan membuat Brand pertama di Manajemen Klien, lalu assign creator ke brand tersebut.",
    tip: "Tour ini bisa diulang dari menu Pengaturan Akun.",
  },
];

const TOUR_CREATOR: Step[] = [
  {
    icon: "👋",
    title: "Selamat datang di KontenPro!",
    desc: "Kamu login sebagai Creator. Panduan singkat ini akan membantu kamu mengenal semua fitur yang tersedia.",
    tip: "Bisa dilewati kapan saja — dan bisa diulang dari Pengaturan Akun.",
  },
  {
    icon: "✏️",
    title: "Buat Konten Baru",
    desc: "Mulai dari sini untuk membuat konten baru. Isi judul, pilih brand yang ditugaskan ke kamu, platform target, tanggal tayang, caption, dan upload file visual.",
    tip: "Sidebar kiri → Buat Konten",
  },
  {
    icon: "🏷️",
    title: "Hashtag Otomatis",
    desc: "Saat kamu memilih brand, hashtag default yang sudah diset Admin akan otomatis muncul di field Hashtag. Kamu bisa tambah atau hapus sesuai kebutuhan konten.",
    tip: "Di halaman Buat Konten → pilih Brand",
  },
  {
    icon: "📅",
    title: "Kalender Konten",
    desc: "Lihat jadwal kontenmu dalam tampilan 2 bulan. Klik tanggal yang kosong untuk langsung buat konten baru dengan tanggal tersebut otomatis terisi. Tanggal lampau dikunci.",
    tip: "Sidebar kiri → Kalender",
  },
  {
    icon: "📊",
    title: "Status Kontenku",
    desc: "Pantau semua kontenmu — dari Draft, Submitted, Revision, Approved, sampai Published. Filter by status, platform, atau rentang tanggal tayang. Maksimal 10 konten per halaman.",
    tip: "Sidebar kiri → Status Kontenku",
  },
  {
    icon: "🔁",
    title: "Alur Revisi",
    desc: "Jika Admin meminta revisi, kontenmu akan berstatus 'Revision' dengan komentar dari Admin. Klik tombol 'Revisi' untuk edit konten dan kirim ulang.",
    tip: "Status Kontenku → tombol Revisi pada konten berstatus Revision",
  },
  {
    icon: "📈",
    title: "Update Metrik",
    desc: "Setelah konten published, kamu bisa input Views, Likes, Shares, dan Link Post per platform. Data ini otomatis menghitung engagement rate.",
    tip: "Status Kontenku → kolom Views/Likes/Shares pada konten Published",
  },
  {
    icon: "🔔",
    title: "Notifikasi Real-time",
    desc: "Kamu akan dapat notifikasi langsung saat Admin approve atau meminta revisi kontenmu. Badge merah di lonceng menunjukkan notifikasi belum dibaca.",
    tip: "Icon lonceng di header kanan atas",
  },
  {
    icon: "🚀",
    title: "Siap berkarya!",
    desc: "Mulai dengan buat konten pertamamu. Pastikan kamu sudah di-assign ke brand oleh Admin sebelum bisa submit konten.",
    tip: "Tour ini bisa diulang dari menu Pengaturan Akun.",
  },
];

const TOUR_SUPERADMIN: Step[] = [
  {
    icon: "👋",
    title: "Selamat datang, Superadmin!",
    desc: "Kamu memegang kendali penuh atas platform KontenPro. Panduan ini menjelaskan tugas utama superadmin.",
    tip: "Bisa dilewati kapan saja.",
  },
  {
    icon: "👥",
    title: "User Approval",
    desc: "Setiap user baru yang mendaftar butuh persetujuan kamu sebelum bisa mengakses platform. Di sini kamu bisa Approve atau Tolak pendaftaran, dan mengubah role user (admin / creator).",
    tip: "Sidebar kiri → User Approval",
  },
  {
    icon: "🔔",
    title: "Notifikasi Sistem",
    desc: "Kamu menerima notifikasi setiap ada submit konten baru dari creator — sama seperti admin. Badge lonceng di header menampilkan notifikasi yang belum dibaca.",
    tip: "Icon lonceng di header kanan atas",
  },
  {
    icon: "🚀",
    title: "Siap mengelola!",
    desc: "Mulai dengan approve user yang sudah mendaftar agar mereka bisa menggunakan platform.",
    tip: "Tour ini bisa diulang dari menu Pengaturan Akun.",
  },
];

const STORAGE_KEY = (role: string) => `kontenpro_tour_done_${role}`;

export function ProductTour({ role }: { role: AppRole }) {
  const steps = role === "admin" ? TOUR_ADMIN : role === "creator" ? TOUR_CREATOR : TOUR_SUPERADMIN;
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY(role));
    if (!done) {
      const t = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(t);
    }
  }, [role]);

  function finish() {
    localStorage.setItem(STORAGE_KEY(role), "1");
    setVisible(false);
  }

  function next() {
    if (step < steps.length - 1) setStep(s => s + 1);
    else finish();
  }

  if (!visible) return null;

  const current = steps[step];
  const isLast = step === steps.length - 1;
  const progress = ((step + 1) / steps.length) * 100;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-[1px]"
        onClick={finish}
      />

      {/* Card */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-md bg-white border border-ink/15 shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Progress bar */}
          <div className="h-1 bg-ink/10">
            <div
              className="h-1 bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-0">
            <span className="label-caps text-muted-foreground">
              Panduan {step + 1} / {steps.length}
            </span>
            <button
              onClick={finish}
              className="text-muted-foreground hover:text-ink p-1"
              title="Lewati panduan"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="px-5 pt-5 pb-4">
            <div className="text-5xl mb-4 select-none">{current.icon}</div>
            <h3 className="text-2xl font-bold tracking-tight leading-tight">{current.title}</h3>
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{current.desc}</p>

            {current.tip && (
              <div className="mt-4 bg-[#F5F5F0] border border-ink/10 px-3 py-2 flex items-start gap-2">
                <ChevronRight className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
                <span className="text-xs text-muted-foreground">{current.tip}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 pb-5 flex items-center justify-between gap-3">
            <button
              onClick={finish}
              className="text-sm text-muted-foreground hover:text-ink underline"
            >
              Lewati semua
            </button>

            {/* Dots */}
            <div className="flex items-center gap-1 flex-1 justify-center">
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className={`rounded-full transition-all ${i === step ? "w-4 h-2 bg-primary" : "w-2 h-2 bg-ink/20 hover:bg-ink/40"}`}
                />
              ))}
            </div>

            <button
              onClick={next}
              className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 text-[12px] uppercase tracking-[0.06em] font-medium hover:bg-[#c20019]"
            >
              {isLast ? "Mulai" : "Lanjut"}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/** Panggil ini dari halaman Pengaturan Akun agar user bisa ulang tour */
export function resetTour(role: AppRole) {
  localStorage.removeItem(STORAGE_KEY(role));
  window.location.reload();
}
