import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/verify-email")({
  component: VerifyEmail,
});

function VerifyEmail() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-[#F5F5F0]">
      <div className="max-w-md text-center">
        <div className="label-caps text-primary">Cek Inbox</div>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">Verifikasi Email Kamu</h1>
        <p className="mt-4 text-muted-foreground">Kami sudah mengirim link verifikasi ke email kamu. Klik link tersebut untuk mengaktifkan akun.</p>
        <Link to="/auth" className="mt-8 inline-block border border-ink px-6 py-3 text-[12px] uppercase tracking-[0.06em] hover:bg-ink hover:text-white">
          Kembali ke Login
        </Link>
      </div>
    </div>
  );
}
