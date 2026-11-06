import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);
  return { user, loading };
}

export function useMe() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["me", user?.id],
    enabled: !!user,
    queryFn: async () => {
      await supabase.rpc("release_my_pending");
      const [p, r, w] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user!.id).single(),
        supabase.from("user_roles").select("role").eq("user_id", user!.id),
        supabase.from("wallets").select("*").eq("user_id", user!.id).maybeSingle(),
      ]);
      const roles = (r.data ?? []).map((x) => x.role);
      return { user: user!, profile: p.data, wallet: w.data, roles };
    },
  });
}
