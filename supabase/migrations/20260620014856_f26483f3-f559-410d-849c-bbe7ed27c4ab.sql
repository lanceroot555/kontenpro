
-- 1) Storage: restrict SELECT on content-files to owner or admin
DROP POLICY IF EXISTS "authenticated read content-files" ON storage.objects;
CREATE POLICY "owner or admin read content-files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'content-files'
  AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
);

-- 2) user_roles: lock down write operations to admins only
DROP POLICY IF EXISTS "admin insert user_roles" ON public.user_roles;
CREATE POLICY "admin insert user_roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admin update user_roles" ON public.user_roles;
CREATE POLICY "admin update user_roles"
ON public.user_roles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admin delete user_roles" ON public.user_roles;
CREATE POLICY "admin delete user_roles"
ON public.user_roles FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));
