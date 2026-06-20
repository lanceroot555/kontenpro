import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type AppRole = "superadmin" | "admin" | "creator";

export type AppProfile = {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  account_status: "pending" | "approved" | "rejected";
};

export type AuthState = {
  user: User | null;
  profile: AppProfile | null;
  role: AppRole | null;
  loading: boolean;
};

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ user: null, profile: null, role: null, loading: true });

  useEffect(() => {
    let mounted = true;
    async function load(user: User | null) {
      if (!user) {
        if (mounted) setState({ user: null, profile: null, role: null, loading: false });
        return;
      }
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id,user_id,full_name,avatar_url,account_status").eq("user_id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);
      const role = (roles?.[0]?.role as AppRole | undefined) ?? null;
      if (mounted) setState({ user, profile: (profile as AppProfile) ?? null, role, loading: false });
    }

    supabase.auth.getUser().then(({ data }) => load(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      load(session?.user ?? null);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  return state;
}
