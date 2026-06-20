
-- Enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'creator');
CREATE TYPE public.content_status AS ENUM ('draft','submitted','revision','approved','published');

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- =========== profiles ===========
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =========== user_roles ===========
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role security definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- profiles policies
CREATE POLICY "view own profile" ON public.profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "insert own profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- user_roles policies
CREATE POLICY "view own role" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- =========== contents ===========
CREATE TABLE public.contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  caption TEXT,
  copywriting TEXT,
  hashtags TEXT[] DEFAULT '{}',
  platforms TEXT[] DEFAULT '{}',
  scheduled_date DATE NOT NULL,
  file_url TEXT,
  notes TEXT,
  status public.content_status NOT NULL DEFAULT 'draft',
  revision_comments TEXT,
  post_url TEXT,
  likes INTEGER NOT NULL DEFAULT 0,
  views INTEGER NOT NULL DEFAULT 0,
  shares INTEGER NOT NULL DEFAULT 0,
  engagement_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contents TO authenticated;
GRANT ALL ON public.contents TO service_role;
ALTER TABLE public.contents ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_contents_creator ON public.contents(creator_id);
CREATE INDEX idx_contents_status ON public.contents(status);
CREATE INDEX idx_contents_scheduled ON public.contents(scheduled_date);

CREATE TRIGGER trg_contents_updated BEFORE UPDATE ON public.contents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- helper: is current user the creator of this content?
CREATE OR REPLACE FUNCTION public.is_content_creator(_content_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.contents c JOIN public.profiles p ON p.id = c.creator_id
    WHERE c.id = _content_id AND p.user_id = _user_id
  )
$$;

-- contents policies
CREATE POLICY "creator view own contents" ON public.contents FOR SELECT TO authenticated
  USING (creator_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
         OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "creator insert own contents" ON public.contents FOR INSERT TO authenticated
  WITH CHECK (creator_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "creator update own contents" ON public.contents FOR UPDATE TO authenticated
  USING (creator_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (creator_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "admin update any content" ON public.contents FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "creator delete own contents" ON public.contents FOR DELETE TO authenticated
  USING (creator_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- =========== notifications ===========
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  content_id UUID REFERENCES public.contents(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_notifications_user ON public.notifications(user_id, is_read);

CREATE POLICY "view own notifications" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "update own notifications" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "auth users can insert notifications" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (true);

-- =========== revision_history ===========
CREATE TABLE public.revision_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES public.contents(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  comment TEXT NOT NULL,
  status_before TEXT,
  status_after TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.revision_history TO authenticated;
GRANT ALL ON public.revision_history TO service_role;
ALTER TABLE public.revision_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view revision for own or admin" ON public.revision_history FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR content_id IN (
      SELECT c.id FROM public.contents c JOIN public.profiles p ON p.id = c.creator_id
      WHERE p.user_id = auth.uid()
    )
  );
CREATE POLICY "admin insert revision" ON public.revision_history FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========== signup trigger: create profile + role from metadata ===========
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _role public.app_role;
  _full_name TEXT;
BEGIN
  _full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  BEGIN
    _role := COALESCE(NEW.raw_user_meta_data->>'role', 'creator')::public.app_role;
  EXCEPTION WHEN others THEN
    _role := 'creator';
  END;

  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, _full_name)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.contents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.contents REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
