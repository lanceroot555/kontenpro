import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  component: ResetPassword,
});

function ResetPassword() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setErr(error.message); return; }
    toast.success("Password berhasil diubah");
    navigate({ to: "/auth" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-[#F5F5F0]">
      <form onSubmit={onSubmit} className="w-full max-w-md space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Password Baru</h1>
        <div>
          <label className="label-caps block mb-2">Password Baru</label>
          <div className="relative">
            <input type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border border-ink bg-white px-4 py-3 pr-12 text-[15px]" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-ink">
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>
        {err && <p className="text-sm text-primary">{err}</p>}
        <button className="w-full bg-primary text-white py-4 text-[14px] uppercase tracking-[0.06em] font-medium">Simpan Password</button>
      </form>
    </div>
  );
}
