import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PlanejamentoMeta {
  id: string;
  linha: number | null;
  categoria: string | null;
  atividade: string;
  meta: number;
  realizado: number;
  unidade: string | null;
  display_order: number;
  is_section_header: boolean;
  updated_at: string;
}

export function usePlanejamentoMetas() {
  return useQuery({
    queryKey: ["planejamento-metas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planejamento_metas")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PlanejamentoMeta[];
    },
  });
}

export function useUpdatePlanejamentoMeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, meta, realizado }: { id: string; meta?: number; realizado?: number }) => {
      const patch: Record<string, number> = {};
      if (meta !== undefined) patch.meta = meta;
      if (realizado !== undefined) patch.realizado = realizado;
      const { error } = await supabase.from("planejamento_metas").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planejamento-metas"] });
      toast.success("Meta atualizada");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
