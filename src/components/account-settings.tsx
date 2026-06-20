import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/lib/use-auth";
import { toast } from "sonner";
import { Camera, Lock, User } from "lucide-react";

const ROLE_LABELS: Record<AppRole, string> = {
  superadmin: "Super Administrator",
  admin: "Admin",
  creator: "Creator",
};

export function AccountSettings() {
  const auth = useAuth();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(auth.profile?.full_name ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const avatarUrl = auth.profile?.avatar_url ?? null;
  const initials = (auth.profile?.full_name || auth.user?.email || "U")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  /* ─── Save profile name ─── */
  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!auth.user) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim() })
      .eq("user_id", auth.user.id);
    setSavingProfile(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Profil berhasil disimpan");
      qc.invalidateQueries({ queryKey: ["auth"] });
    }
  }

  /* ─── Upload avatar ─── */
  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !auth.user) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran foto maksimal 2 MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar");
      return;
    }

    setUploadingAvatar(true);
    const ext = file.name.split(".").pop();
    const path = `${auth.user.id}/avatar.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (upErr) {
      toast.error("Gagal upload foto: " + upErr.message);
      setUploadingAvatar(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = urlData.publicUrl + "?t=" + Date.now();

    const { error: dbErr } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("user_id", auth.user.id);

    setUploadingAvatar(false);
    if (dbErr) {
      toast.error(dbErr.message);
    } else {
      toast.success("Foto profil berhasil diperbarui");
      qc.invalidateQueries({ queryKey: ["auth"] });
      // Force reload auth state
      window.location.reload();
    }
  }

  /* ─── Change password ─── */
  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("Password baru minimal 6 karakter");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Konfirmasi password tidak cocok");
      return;
    }

    setSavingPassword(true);
    // Re-authenticate with current password first
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: auth.user!.email!,
      password: currentPassword,
    });

    if (signInErr) {
      toast.error("Password saat ini salah");
      setSavingPassword(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password berhasil diubah");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <div className="label-caps text-muted-foreground">Akun</div>
        <h2 className="text-4xl font-bold tracking-tight mt-1">Pengaturan Akun</h2>
      </div>

      {/* ── Profil ── */}
      <section className="bg-white border border-ink/15 p-8">
        <div className="flex items-center gap-2 mb-6">
          <User className="h-4 w-4" />
          <h3 className="text-base font-bold uppercase tracking-[0.06em]">Informasi Profil</h3>
        </div>

        {/* Avatar */}
        <div className="flex items-center gap-6 mb-8">
          <div className="relative">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="h-20 w-20 object-cover border border-ink/20"
              />
            ) : (
              <div className="h-20 w-20 bg-primary flex items-center justify-center text-white text-xl font-bold">
                {initials}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute -bottom-2 -right-2 bg-ink text-white h-7 w-7 flex items-center justify-center hover:bg-primary disabled:opacity-50"
              title="Ganti foto"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <div>
            <p className="text-sm font-medium">{auth.profile?.full_name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{auth.user?.email}</p>
            <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground mt-1">
              {uploadingAvatar ? "Mengupload..." : "Klik ikon kamera untuk ganti foto (maks. 2 MB)"}
            </p>
          </div>
        </div>

        {/* Role badge */}
        <div className="mb-6 flex items-center gap-3">
          <div className="label-caps text-muted-foreground">Role Akun</div>
          <span className="bg-ink text-white px-3 py-1 text-[11px] uppercase tracking-[0.08em] font-bold">
            {auth.role ? ROLE_LABELS[auth.role] : "—"}
          </span>
        </div>

        {/* Name form */}
        <form onSubmit={saveProfile} className="space-y-4">
          <div>
            <label className="label-caps block mb-2">Nama Lengkap</label>
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full border border-ink bg-white px-4 py-3 text-[15px] focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="label-caps block mb-2">Email</label>
            <input
              disabled
              value={auth.user?.email ?? ""}
              className="w-full border border-ink/30 bg-ink/5 px-4 py-3 text-[15px] text-muted-foreground cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground mt-1">Email tidak bisa diubah.</p>
          </div>
          <button
            type="submit"
            disabled={savingProfile}
            className="bg-ink text-white px-6 py-3 text-[12px] uppercase tracking-[0.06em] font-medium hover:bg-primary disabled:opacity-50"
          >
            {savingProfile ? "Menyimpan..." : "Simpan Profil"}
          </button>
        </form>
      </section>

      {/* ── Keamanan ── */}
      <section className="bg-white border border-ink/15 p-8">
        <div className="flex items-center gap-2 mb-6">
          <Lock className="h-4 w-4" />
          <h3 className="text-base font-bold uppercase tracking-[0.06em]">Ubah Password</h3>
        </div>

        <form onSubmit={changePassword} className="space-y-4">
          <div>
            <label className="label-caps block mb-2">Password Saat Ini</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full border border-ink bg-white px-4 py-3 text-[15px] focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="label-caps block mb-2">Password Baru (min. 6 karakter)</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full border border-ink bg-white px-4 py-3 text-[15px] focus:outline-none focus:border-primary"
            />
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
          <button
            type="submit"
            disabled={savingPassword}
            className="bg-ink text-white px-6 py-3 text-[12px] uppercase tracking-[0.06em] font-medium hover:bg-primary disabled:opacity-50"
          >
            {savingPassword ? "Menyimpan..." : "Ubah Password"}
          </button>
        </form>
      </section>
    </div>
  );
}
