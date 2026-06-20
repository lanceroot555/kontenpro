import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth-callback")({
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [email, setEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    // Parse the URL hash — Supabase puts tokens/errors here
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);

    const error = params.get("error");
    const errorDescription = params.get("error_description");

    if (error) {
      const msg =
        errorDescription?.replace(/\+/g, " ") ||
        "Link verifikasi tidak valid atau sudah kedaluwarsa.";
      setErrorMsg(msg);
      setStatus("error");
      // Clean up the ugly hash from the URL without reload
      history.replaceState(null, "", window.location.pathname);
      return;
    }

    // No error — Supabase JS client auto-detects the session from the hash
    // Wait briefly then redirect based on role
    const t = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        // Fallback: session not set yet, listen for it
        const { data: listener } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (session) {
              listener.subscription.unsubscribe();
              await redirectByRole(session.user.id);
            }
          }
        );
        // If nothing in 4s, send them to /auth
        setTimeout(() => {
          listener.subscription.unsubscribe();
          navigate({ to: "/auth" });
        }, 4000);
        return;
      }
      await redirectByRole(data.session.user.id);
    }, 600);

    return () => clearTimeout(t);
  }, [navigate]);

  async function redirectByRole(userId: string) {
    toast.success("Email berhasil diverifikasi! Akun kamu sedang menunggu persetujuan.");
    navigate({ to: "/pending" });
  }

  async function resendVerification() {
    if (!email.trim()) return;
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth-callback`,
      },
    });
    setResending(false);
    if (error) {
      toast.error(error.message);
    } else {
      setResent(true);
      toast.success("Email verifikasi baru sudah dikirim! Cek inbox kamu.");
    }
  }

  /* ── Loading ── */
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F0]">
        <div className="text-center">
          <div className="h-6 w-6 border-2 border-ink border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">Memverifikasi akun...</p>
        </div>
      </div>
    );
  }

  /* ── Error ── */
  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-[#F5F5F0]">
      <div className="w-full max-w-md">
        <div className="label-caps text-primary mb-3">Verifikasi Gagal</div>
        <h1 className="text-4xl font-bold tracking-tight leading-tight">Link Sudah<br />Kedaluwarsa</h1>
        <p className="mt-4 text-muted-foreground leading-relaxed text-sm">
          {errorMsg}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Link verifikasi hanya berlaku selama 24 jam. Masukkan email yang kamu daftarkan untuk mendapatkan link baru.
        </p>

        {resent ? (
          <div className="mt-8 bg-white border border-ink/15 p-5">
            <div className="label-caps text-primary">Email Terkirim!</div>
            <p className="text-sm text-muted-foreground mt-2">
              Cek inbox kamu. Link baru berlaku 24 jam.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Tidak ada email? Cek folder Spam.
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-3">
            <div>
              <label className="label-caps block mb-2">Email yang Didaftarkan</label>
              <input
                type="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && resendVerification()}
                placeholder="nama@email.com"
                className="w-full border border-ink bg-white px-4 py-3 text-[15px] focus:outline-none focus:border-primary"
              />
            </div>
            <button
              onClick={resendVerification}
              disabled={!email.trim() || resending}
              className="w-full bg-primary text-white py-3 text-[12px] uppercase tracking-[0.06em] font-medium hover:bg-[#c20019] disabled:opacity-50 transition-colors"
            >
              {resending ? "Mengirim..." : "Kirim Ulang Email Verifikasi"}
            </button>
          </div>
        )}

        <Link
          to="/auth"
          className="mt-4 w-full block text-center border border-ink py-3 text-[12px] uppercase tracking-[0.06em] font-medium hover:bg-ink hover:text-white transition-colors"
        >
          Kembali ke Login
        </Link>
      </div>
    </div>
  );
}
