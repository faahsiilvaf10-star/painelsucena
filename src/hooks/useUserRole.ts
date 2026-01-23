import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type AppRole = "admin" | "user";

export const useUserRole = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      // NOTE: PostgREST may return an array even when filtering by a single user.
      // To avoid false negatives (isAdmin=false), always take the newest role row.
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);
      
      if (error) throw error;
      return (data?.[0]?.role as AppRole | undefined) ?? null;
    },
    enabled: !!user?.id,
  });
};

export const useIsAdmin = () => {
  const { data: role, isLoading } = useUserRole();
  return {
    isAdmin: role === "admin",
    isLoading,
  };
};
