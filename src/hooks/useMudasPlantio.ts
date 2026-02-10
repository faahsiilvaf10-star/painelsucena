import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface MudaPlantio {
  id: string;
  especie: string;
  quantidade: number;
  faixa: string | null;
  berma: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const useMudasPlantio = () => {
  return useQuery({
    queryKey: ["mudas-plantio"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mudas_plantio")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as MudaPlantio[];
    },
  });
};

export const useAddMudaPlantio = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (muda: { especie: string; quantidade: number; faixa?: string; berma?: number }) => {
      const { data, error } = await supabase
        .from("mudas_plantio")
        .insert({
          especie: muda.especie,
          quantidade: muda.quantidade,
          faixa: muda.faixa || null,
          berma: muda.berma || null,
          created_by: user?.id || "",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mudas-plantio"] });
    },
  });
};

export const useDeleteMudaPlantio = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mudas_plantio").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mudas-plantio"] });
    },
  });
};
