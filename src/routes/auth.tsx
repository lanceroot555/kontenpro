import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

const searchSchema = z.object({ mode: z.enum(["login", "signup"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Login / Daftar — KontenPro" },
      { name: "description", content: "Masuk ke akun KontenPro atau daftar sebagai Admin atau Creator." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const [tab, setTab] = useState<"login" | "signup">(mode ?? "login");

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <aside className="hidden md:flex flex-col justify-between bg-ink text-white p-12 swiss-grid-bg">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-6 w-6 bg-primary" />
          <span className="font-bold text-lg tracking-tight">KONTENPRO</span>
        </Link>
        <div>
          <h1 className="text-5xl font-bold tracking-tight leading-[1.05]">Kelola Konten Tim.<br /><span className="text-primary">Tanpa Spreadsheet.</span></h1>
          <p className="mt-4 text-white/70 max-w-md">Satu platform untuk kreasi, approval, jadwal, dan analitik konten sosial media tim.</p>
        </div>
        <div className="text-[11px] uppercase tracking-[0.08em] text-white/40">© 2026 KontenPro</div>
      </aside>

      <main className="flex items-center justify-center p-8 bg-[#F5F5F0]">
        <div className="w-full max-w-md">
          <div className="flex border border-ink mb-8">
            <button onClick={() => setTab("login")} className={`flex-1 py-3 text-[12px] uppercase tracking-[0.06em] font-medium ${tab === "login" ? "bg-ink text-white" : "bg-white text-ink"}`}>Login</button>
            <button onClick={() => setTab("signup")} className={`flex-1 py-3 text-[12px] uppercase tracking-[0.06em] font-medium ${tab === "signup" ? "bg-ink text-white" : "bg-white text-ink"}`}>Daftar</button>
          </div>
          {tab === "login" ? <LoginForm /> : <SignupForm />}
        </div>
      </main>
    </div>
  );
}

function LoginForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setErr(error.message); return; }
    if (data.user) {
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
      const role = roles?.[0]?.role;
      toast.success("Berhasil masuk");
      navigate({ to: role === "admin" ? "/admin/dashboard" : "/creator/new" });
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <h2 className="text-3xl font-bold tracking-tight">Selamat Datang Kembali</h2>
      <div>
        <label className="label-caps block mb-2">Email</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-ink bg-white px-4 py-3 text-[15px] focus:outline-none focus:border-primary" />
      </div>
      <div>
        <label className="label-caps block mb-2">Password</label>
        <div className="relative">
          <input type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border border-ink bg-white px-4 py-3 pr-12 text-[15px] focus:outline-none focus:border-primary" />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-ink">
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
      </div>
      {err && <p className="text-sm text-primary">{err}</p>}
      <button type="submit" disabled={loading} className="w-full bg-primary text-white py-4 text-[14px] uppercase tracking-[0.06em] font-medium hover:bg-[#c20019] disabled:opacity-50">
        {loading ? "Masuk..." : "Masuk"}
      </button>
      <div className="flex justify-between text-sm">
        <Link to="/forgot-password" className="underline">Lupa password?</Link>
        <Link to="/" className="text-muted-foreground hover:underline">← Beranda</Link>
      </div>
    </form>
  );
}

function SignupForm() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"admin" | "creator">("creator");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (password.length < 6) { setErr("Password minimal 6 karakter"); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: fullName, role },
      },
    });
    setLoading(false);
    if (error) { setErr(error.message); return; }
    if (data.session) {
      toast.success("Akun berhasil dibuat");
      navigate({ to: role === "admin" ? "/admin/dashboard" : "/creator/new" });
    } else {
      navigate({ to: "/verify-email" });
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <h2 className="text-3xl font-bold tracking-tight">Buat Akun Baru</h2>

      <div className="mt-8">
        <div className="grid grid-cols-2 gap-0 border border-ink">
          <button type="button" onClick={() => setRole("admin")} className={`p-4 text-left ${role === "admin" ? "bg-ink text-white" : "bg-white"}`}>
            <div className="text-[11px] uppercase tracking-[0.08em] font-medium">Admin</div>
            <div className="text-sm mt-1 opacity-80">Saya supervisor / atasan tim konten</div>
          </button>
          <button type="button" onClick={() => setRole("creator")} className={`p-4 text-left border-l border-ink ${role === "creator" ? "bg-ink text-white" : "bg-white"}`}>
            <div className="text-[11px] uppercase tracking-[0.08em] font-medium">Creator</div>
            <div className="text-sm mt-1 opacity-80">Saya PIC / produser konten</div>
          </button>
        </div>
      </div>

      <div>
        <label className="label-caps block mb-2">Nama Lengkap</label>
        <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full border border-ink bg-white px-4 py-3 text-[15px] focus:outline-none focus:border-primary" />
      </div>
      <div>
        <label className="label-caps block mb-2">Email</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-ink bg-white px-4 py-3 text-[15px] focus:outline-none focus:border-primary" />
      </div>
      <div>
        <label className="label-caps block mb-2">Password (min. 6)</label>
        <div className="relative">
          <input type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border border-ink bg-white px-4 py-3 pr-12 text-[15px] focus:outline-none focus:border-primary" />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-ink">
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
      </div>
      {err && <p className="text-sm text-primary">{err}</p>}
      <button type="submit" disabled={loading} className="w-full bg-primary text-white py-4 text-[14px] uppercase tracking-[0.06em] font-medium hover:bg-[#c20019] disabled:opacity-50">
        {loading ? "Mendaftar..." : "Daftar Sekarang"}
      </button>
    </form>
  );
}
