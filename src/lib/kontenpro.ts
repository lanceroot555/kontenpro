import { supabase } from "@/integrations/supabase/client";

export type PlatformKey = "instagram" | "tiktok" | "twitter" | "youtube" | "linkedin";

export const PLATFORMS: { key: PlatformKey; label: string }[] = [
  { key: "instagram", label: "Instagram" },
  { key: "tiktok", label: "TikTok" },
  { key: "twitter", label: "Twitter (X)" },
  { key: "youtube", label: "YouTube" },
  { key: "linkedin", label: "LinkedIn" },
];

export async function notify(userId: string, type: string, message: string, contentId?: string) {
  await supabase.from("notifications").insert({ user_id: userId, type, message, content_id: contentId ?? null });
}

// Notify all admins by inserting one notification per admin
export async function notifyAdmins(type: string, message: string, contentId?: string) {
  const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
  if (!admins?.length) return;
  await supabase.from("notifications").insert(
    admins.map((a) => ({ user_id: a.user_id, type, message, content_id: contentId ?? null }))
  );
}

export function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}j`;
  return `${Math.floor(diff / 86400)}h`;
}
