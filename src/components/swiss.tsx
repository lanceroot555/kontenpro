import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Status = "draft" | "submitted" | "revision" | "approved" | "published";

const map: Record<Status, { label: string; bg: string; border: string; text: string }> = {
  draft:     { label: "Draft",     bg: "rgba(107,107,107,0.15)", border: "#6B6B6B", text: "#3a3a3a" },
  submitted: { label: "Submitted", bg: "rgba(245,166,35,0.15)",  border: "#F5A623", text: "#7a4d00" },
  revision:  { label: "Revision",  bg: "rgba(232,116,29,0.15)",  border: "#E8741D", text: "#7a3d00" },
  approved:  { label: "Approved",  bg: "rgba(0,166,81,0.15)",    border: "#00A651", text: "#005c2d" },
  published: { label: "Published", bg: "rgba(0,87,184,0.15)",    border: "#0057B8", text: "#003a7a" },
};

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const s = map[status];
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-[3px] text-[11px] font-medium uppercase tracking-[0.08em] border-2 rounded-[4px]",
        className,
      )}
      style={{ backgroundColor: s.bg, borderColor: s.border, color: s.text }}
    >
      {s.label}
    </span>
  );
}

export function PlatformBadge({ platform }: { platform: string }) {
  const colors: Record<string, string> = {
    instagram: "#E1306C",
    tiktok: "#0A0A0A",
    twitter: "#1DA1F2",
    youtube: "#FF0000",
    linkedin: "#0A66C2",
  };
  const c = colors[platform.toLowerCase()] || "#6B6B6B";
  return (
    <span
      className="inline-flex items-center px-2 py-[3px] text-[11px] font-medium uppercase tracking-[0.08em] border-2 rounded-[4px]"
      style={{ backgroundColor: `${c}22`, borderColor: c, color: c }}
    >
      {platform}
    </span>
  );
}

export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground", className)}>
      {children}
    </span>
  );
}
