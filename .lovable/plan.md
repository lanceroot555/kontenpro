# KontenPro — Build Plan

A web app to replace spreadsheets for social media teams: Creators submit content, Admins approve/request revisions, then update post stats. Includes calendar, analytics, and realtime notifications.

## Stack adaptation

The PRD specifies React Router v6 + Zustand + React Query. The Lovable template uses **TanStack Start + TanStack Router + TanStack Query + Supabase (Lovable Cloud)**. I will build on the native stack — same features, same routes, same behavior. (If you'd rather I shoehorn React Router v6 in, say so; it's not recommended.)

- **Backend:** Lovable Cloud (Supabase) — Auth, Postgres, Storage, Realtime, RLS
- **UI:** shadcn/ui restyled to Swiss Style via tokens in `src/styles.css`
- **Calendar:** custom month grid (no heavy lib), or `react-day-picker` already in template
- **State:** TanStack Query for server state + realtime; small Zustand store only if needed

## Design system (Swiss Style)

Implemented as CSS tokens in `src/styles.css` + Tailwind v4 `@theme`:
- Colors: black `#0A0A0A`, off-white `#F5F5F0`, white, red `#E8001D`, grays, status green/yellow/blue
- Inter font loaded via `<link>` in `__root.tsx`
- Border radius 0 (4px exception for badges), 1px borders instead of shadows
- Button/Card/Input/Table/Badge variants restyled to spec

## Database (migration)

Four tables per PRD §4: `profiles`, `contents`, `notifications`, `revision_history`. Plus:
- `app_role` enum (`admin`,`creator`) + dedicated `user_roles` table (security best practice — role NOT stored on profiles to prevent privilege escalation). PRD's `profiles.role` will be replaced by `user_roles` + `has_role()` security-definer function.
- RLS on every table; GRANTs to `authenticated` and `service_role`
- Trigger: on `auth.users` insert → create `profiles` row + insert into `user_roles` from signup metadata
- Realtime enabled on `contents` and `notifications`
- Storage bucket `content-files` (public read)

## Routes

```
src/routes/
  index.tsx                              Landing (Swiss style, 7 sections)
  auth.tsx                               Login + Signup tabs (with role select)
  forgot-password.tsx
  reset-password.tsx
  verify-email.tsx
  _authenticated/route.tsx               (managed by Cloud integration)
  _authenticated/dashboard.tsx           Role-router: redirects to admin or creator home
  _authenticated/admin/route.tsx         Admin layout (sidebar + topbar) + role gate
  _authenticated/admin/dashboard.tsx     Overview analytics
  _authenticated/admin/approval.tsx      Approval Queue
  _authenticated/admin/contents.tsx      Konten Tim
  _authenticated/admin/update-stats.tsx  Update Statistik
  _authenticated/admin/notifications.tsx
  _authenticated/creator/route.tsx       Creator layout + role gate
  _authenticated/creator/new.tsx         Buat Konten
  _authenticated/creator/calendar.tsx    Kalender
  _authenticated/creator/status.tsx      Status Kontenku
  _authenticated/creator/metrics.tsx     Metrik Personal
  _authenticated/creator/notifications.tsx
```

## Feature breakdown

1. **Landing** — Hero, Problem, Features (6 cards), How It Works (3 steps), Testimonial, Final CTA, Footer. Subtle CSS animations only.
2. **Auth** — Email/password signup with role radio (Admin/Creator). Writes profile + role on signup. Login redirects by role. Password reset flow.
3. **Admin Overview** — 4 metric cards, bar chart (per platform), line chart (per week), top 5 table. Uses Recharts (already in shadcn ecosystem).
4. **Approval Queue** — Filters, content cards with Approve / Request Revision (modal with comment). Writes to `revision_history`, fires notification, realtime list refresh.
5. **Konten Tim** — Full table with filters + detail drawer.
6. **Update Statistik** — Inline modal to set post_url + likes/views/shares; auto-compute engagement_rate; status → `published`; notify Creator.
7. **Creator Buat Konten** — Full form per PRD with Zod validation, file upload to Storage with progress + thumbnail, Save Draft / Submit actions.
8. **Kalender** — Month grid, prev/next + year picker, status-colored dots per day, day popover, content detail modal.
9. **Status Kontenku** — Cards with status badge; revision-comment expansion; Edit / Resubmit.
10. **Metrik Personal** — Aggregates for the creator's published content + table.
11. **Notifications** — Bell with unread badge in topbar, dropdown panel, mark-all-read, realtime subscription. Dedicated page lists all.
12. **Realtime** — `useRealtimeNotifications` and `useRealtimeContents` hooks invalidate Query caches.
13. **Responsive** — Sidebar collapses to bottom tab bar < 768px.
14. **Empty states & error toasts** per PRD §14–§15.

## Build order

1. Enable Lovable Cloud + run schema migration (tables, RLS, trigger, storage bucket, realtime).
2. Swiss Style tokens + Inter font + restyle base shadcn components (Button, Card, Input, Badge, Table).
3. Landing page.
4. Auth pages + role-aware redirect + protected layouts with role gates.
5. Shared shell: sidebar, topbar, notification bell, mobile tab bar.
6. Creator flow (Buat Konten → Status → Kalender → Metrik).
7. Admin flow (Approval → Konten Tim → Update Statistik → Overview analytics).
8. Notifications + realtime wiring across both roles.
9. Empty states, validation, error handling polish.

## Technical notes

- All mutations via `createServerFn` with `requireSupabaseAuth`; admin-only fns additionally check `has_role(uid,'admin')`.
- Server functions live in `src/lib/*.functions.ts` (never `src/server/`).
- File upload goes through the browser Supabase client directly to Storage (no need to round-trip server).
- Engagement rate = `((likes + shares) / views) * 100` when views > 0 (PRD mentions comments but schema has no comments column — I'll use likes+shares; tell me if you want a `comments` column added).
- Charts via `recharts`.

## Open questions (I'll proceed with defaults unless you say otherwise)

1. **Role storage:** I'll use a separate `user_roles` table (security best practice) instead of `profiles.role` as written in the PRD. OK?
2. **Engagement formula:** `(likes + shares) / views * 100` (no comments column in schema). OK, or add a `comments` column?
3. **Email confirmation:** Lovable Cloud has email confirmation **on** by default. For smoother testing I can disable it so signup → immediate login. Keep on or turn off?
