
-- Tighten notification insert: only the recipient themselves OR an admin can insert
DROP POLICY IF EXISTS "auth users can insert notifications" ON public.notifications;
CREATE POLICY "insert notifications self or admin" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Revoke public/anon execute on security-definer functions; keep authenticated execute
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_content_creator(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
