import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPassword,
});

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      setErr(error.message);
    } else {
      setSent(true);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-[#F5F5F0]">
      <div className="w-full max-w-md">
        <Link to="/auth" className="label-caps text-muted-foreground hover:underline">
          ← Kembali ke login
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Reset Password</h1>

        {sent ? (
          <div className="mt-6 space-y-3">
            <div className="bg-[#10A37F]/10 border border-[#10A37F]/30 p-4">
              <p className="text-sm font-medium text-[#10A37F]">Email terkirim!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Cek inbox (dan folder Spam) untuk <strong>{email}</strong>. Klik link di email untuk membuat password baru.
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Tidak menerima email?{" "}
              <button
                onClick={() => { setSent(false); setErr(null); }}
                className="underline hover:text-ink"
              >
                Coba kirim ulang
              </button>
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Masukkan email akunmu dan kami akan mengirim link untuk reset password.
            </p>
            <div>
              <label className="label-caps block mb-2">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-ink bg-white px-4 py-3 text-[15px] focus:outline-none focus:border-primary"
                placeholder="email@kamu.com"
              />
            </div>
            {err && (
              <p className="text-sm text-primary bg-primary/5 border border-primary/20 px-3 py-2">
                {err}
              </p>
            )}
            <button
              disabled={loading}
              className="w-full bg-primary text-white py-4 text-[14px] uppercase tracking-[0.06em] font-medium hover:bg-[#c20019] disabled:opacity-50"
            >
              {loading ? "Mengirim..." : "Kirim Link Reset"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
