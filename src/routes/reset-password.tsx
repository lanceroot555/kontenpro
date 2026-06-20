import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  component: ResetPassword,
});

function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // ready = true setelah Supabase memproses token dari URL hash dan mengembalikan PASSWORD_RECOVERY event
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        setReady(true);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setErr("Password minimal 6 karakter");
      return;
    }
    if (password !== confirmPassword) {
      setErr("Konfirmasi password tidak cocok");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setErr(error.message);
      return;
    }
    toast.success("Password berhasil diubah. Silakan login.");
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-[#F5F5F0]">
        <div className="w-full max-w-md text-center space-y-3">
          <h1 className="text-2xl font-bold tracking-tight">Memverifikasi Link...</h1>
          <p className="text-sm text-muted-foreground">
            Sedang memproses link reset password dari email kamu.
          </p>
          <p className="text-xs text-muted-foreground">
            Jika halaman ini tidak berubah dalam beberapa detik, link mungkin sudah kadaluarsa.{" "}
            <a href="/forgot-password" className="underline hover:text-ink">
              Minta link baru
            </a>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-[#F5F5F0]">
      <form onSubmit={onSubmit} className="w-full max-w-md space-y-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Buat Password Baru</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Masukkan password baru untuk akunmu.
          </p>
        </div>
        <div>
          <label className="label-caps block mb-2">Password Baru (min. 6 karakter)</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-ink bg-white px-4 py-3 pr-12 text-[15px] focus:outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-ink"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>
        <div>
          <label className="label-caps block mb-2">Konfirmasi Password Baru</label>
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full border border-ink bg-white px-4 py-3 text-[15px] focus:outline-none focus:border-primary"
          />
        </div>
        {err && <p className="text-sm text-primary">{err}</p>}
        <button
          disabled={loading}
          className="w-full bg-primary text-white py-4 text-[14px] uppercase tracking-[0.06em] font-medium hover:bg-[#c20019] disabled:opacity-50"
        >
          {loading ? "Menyimpan..." : "Simpan Password Baru"}
        </button>
      </form>
    </div>
  );
}
