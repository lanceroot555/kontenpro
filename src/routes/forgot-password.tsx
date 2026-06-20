import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPassword,
});

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) setErr(error.message); else setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-[#F5F5F0]">
      <div className="w-full max-w-md">
        <Link to="/auth" className="label-caps text-muted-foreground hover:underline">← Kembali ke login</Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Reset Password</h1>
        {sent ? (
          <p className="mt-6 text-sm">Cek email kamu. Kami sudah mengirim link untuk reset password.</p>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="label-caps block mb-2">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-ink bg-white px-4 py-3 text-[15px]" />
            </div>
            {err && <p className="text-sm text-primary">{err}</p>}
            <button className="w-full bg-primary text-white py-4 text-[14px] uppercase tracking-[0.06em] font-medium">Kirim Link Reset</button>
          </form>
        )}
      </div>
    </div>
  );
}
