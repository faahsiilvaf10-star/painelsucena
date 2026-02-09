import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Json } from "@/integrations/supabase/types";

const DEFAULT_NAV_ORDER = [
  "destaques", "instacena", "atividades", "atividades-ii", "arquivos-seguranca", "consumo-abastecimento",
  "campanhas", "dds", "documentos", "entrada-saida", "estoque", "homologados", "hora-extra",
  "lembretes", "relatorio", "matriz", "metas", "pedidos", "rdo", "presenca", "rh",
  "parte-diaria", "plano-manutencao", "vistoria-cintas", "vistorias", "slides", "emergencia"
];

export function useUserNavOrder() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch global nav order from site_settings
  const { data: globalNavOrder } = useQuery({
    queryKey: ["global-nav-order"],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("nav_order")
        .limit(1)
        .single();

      if (error) {
        console.error("Error fetching global nav order:", error);
        return DEFAULT_NAV_ORDER;
      }

      if (data?.nav_order && Array.isArray(data.nav_order)) {
        return data.nav_order as string[];
      }

      return DEFAULT_NAV_ORDER;
    },
    staleTime: 1000 * 60 * 5,
  });

  const effectiveDefaultOrder = globalNavOrder ?? DEFAULT_NAV_ORDER;

  const { data: navOrder, isLoading } = useQuery({
    queryKey: ["user-nav-order", user?.id],
    queryFn: async (): Promise<string[]> => {
      if (!user?.id) return effectiveDefaultOrder;

      const { data, error } = await supabase
        .from("user_preferences")
        .select("nav_order")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching user nav order:", error);
        return effectiveDefaultOrder;
      }

      if (data?.nav_order && Array.isArray(data.nav_order)) {
        return data.nav_order as string[];
      }

      return effectiveDefaultOrder;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  const updateNavOrder = useMutation({
    mutationFn: async (newOrder: string[]) => {
      if (!user?.id) throw new Error("User not authenticated");

      // Check if user preferences exist
      const { data: existing } = await supabase
        .from("user_preferences")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from("user_preferences")
          .update({ 
            nav_order: newOrder as unknown as Json,
            updated_at: new Date().toISOString() 
          })
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from("user_preferences")
          .insert({ 
            user_id: user.id, 
            nav_order: newOrder as unknown as Json 
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-nav-order", user?.id] });
    },
  });

  const resetNavOrder = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data: existing } = await supabase
        .from("user_preferences")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("user_preferences")
          .update({ 
            nav_order: null,
            updated_at: new Date().toISOString() 
          })
          .eq("user_id", user.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-nav-order", user?.id] });
    },
  });

  return {
    navOrder: navOrder ?? effectiveDefaultOrder,
    isLoading,
    updateNavOrder,
    resetNavOrder,
  };
}
