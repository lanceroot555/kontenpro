-- 1. Add superadmin role
-- In Postgres 12+ we can add enum values if it's the only statement or outside a transaction block. 
-- Supabase handles this safely in migrations usually.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'superadmin';
COMMIT;

-- 2. Add account_status column to profiles
ALTER TABLE public.profiles ADD COLUMN account_status TEXT NOT NULL DEFAULT 'pending' CHECK (account_status IN ('pending', 'approved', 'rejected'));

-- 3. Automatically approve all existing users
UPDATE public.profiles SET account_status = 'approved';

-- 4. Set all current admins to superadmin
UPDATE public.user_roles SET role = 'superadmin' WHERE role = 'admin';

-- 5. Update private.has_role so superadmin inherits all roles
CREATE OR REPLACE FUNCTION private.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND (role = _role OR role = 'superadmin'::public.app_role)
  )
$$;

-- 6. Add RLS policies for Super Admin to access profiles and user_roles
CREATE POLICY "superadmin can view all profiles" ON public.profiles FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'superadmin'::public.app_role));

CREATE POLICY "superadmin can update any profile" ON public.profiles FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'superadmin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'superadmin'::public.app_role));

CREATE POLICY "superadmin can view all user_roles" ON public.user_roles FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'superadmin'::public.app_role));

CREATE POLICY "superadmin can update any user_role" ON public.user_roles FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'superadmin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'superadmin'::public.app_role));

-- 7. Ensure brand_members also accessible by superadmin
CREATE POLICY "superadmin can view brand_members" ON public.brand_members FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'superadmin'::public.app_role));
CREATE POLICY "superadmin can modify brand_members" ON public.brand_members FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'superadmin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'superadmin'::public.app_role));
