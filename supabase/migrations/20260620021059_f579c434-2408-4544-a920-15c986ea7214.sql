CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION private.is_content_creator(_content_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.contents c
    JOIN public.profiles p ON p.id = c.creator_id
    WHERE c.id = _content_id AND p.user_id = _user_id
  )
$$;

REVOKE ALL ON FUNCTION private.has_role(UUID, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_content_creator(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(UUID, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_content_creator(UUID, UUID) TO authenticated, service_role;

DROP POLICY IF EXISTS "view own profile" ON public.profiles;
CREATE POLICY "view own profile" ON public.profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "view own role" ON public.user_roles;
CREATE POLICY "view own role" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "creator view own contents" ON public.contents;
CREATE POLICY "creator view own contents" ON public.contents FOR SELECT TO authenticated
  USING (creator_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
         OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admin update any content" ON public.contents;
CREATE POLICY "admin update any content" ON public.contents FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "view revision for own or admin" ON public.revision_history;
CREATE POLICY "view revision for own or admin" ON public.revision_history FOR SELECT TO authenticated
  USING (
    private.has_role(auth.uid(), 'admin'::public.app_role)
    OR content_id IN (
      SELECT c.id FROM public.contents c JOIN public.profiles p ON p.id = c.creator_id
      WHERE p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "admin insert revision" ON public.revision_history;
CREATE POLICY "admin insert revision" ON public.revision_history FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "owner or admin read content-files" ON storage.objects;
CREATE POLICY "owner or admin read content-files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'content-files'
  AND (owner = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role))
);

DROP POLICY IF EXISTS "admin insert user_roles" ON public.user_roles;
CREATE POLICY "admin insert user_roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admin update user_roles" ON public.user_roles;
CREATE POLICY "admin update user_roles"
ON public.user_roles FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admin delete user_roles" ON public.user_roles;
CREATE POLICY "admin delete user_roles"
ON public.user_roles FOR DELETE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_content_creator(UUID, UUID) FROM PUBLIC, anon, authenticated;