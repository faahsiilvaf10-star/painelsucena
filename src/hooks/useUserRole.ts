import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "moderator" | "user" | "visualizador";

export const useUserRole = () => {
  // IMPORTANT:
  // Do NOT depend on useAuth() here.
  // useAuth() is currently a plain hook (not a context), so multiple instances can race.
  // That race can cause pages (like /admin) to redirect before the role query runs.
  const [userId, setUserId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let mounted = true;

    // Resolve current session once
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setUserId(session?.user?.id ?? null);
    });

    // Keep in sync across sign-in / sign-out
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const query = useQuery({
    queryKey: ["user-role", userId ?? "unknown"],
    enabled: userId !== undefined,
    queryFn: async () => {
      if (!userId) return null;

      // NOTE: PostgREST may return an array even when filtering by a single user.
      // To avoid false negatives (isAdmin=false), always take the newest role row.
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) throw error;
      return (data?.[0]?.role as AppRole | undefined) ?? null;
    },
  });

  // Expose auth readiness for guards (keeps existing destructuring intact)
  return {
    ...query,
    authReady: userId !== undefined,
  } as typeof query & { authReady: boolean };
};

export const useIsAdmin = () => {
  const { data: role, isLoading, isFetching, authReady } = useUserRole();
  return {
    isAdmin: role === "admin" || role === "moderator",
    isStrictAdmin: role === "admin",
    isModerator: role === "moderator",
    role,
    // Avoid "false negatives" while auth/role is still being resolved.
    isLoading: !authReady || isLoading || isFetching,
    authReady,
  };
};
