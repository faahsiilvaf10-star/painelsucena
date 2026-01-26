import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useAdminUsers = () => {
  return useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (error) throw error;
      
      return new Set(data?.map((row) => row.user_id) ?? []);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
