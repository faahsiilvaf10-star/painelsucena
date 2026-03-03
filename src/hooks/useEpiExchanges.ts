import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface EpiExchange {
  id: string;
  data: string;
  autorizado_por: string;
  matricula_autorizador: string | null;
  motivo_troca: string;
  funcionario_nome: string;
  funcionario_funcao: string | null;
  funcionario_matricula: string | null;
  epis: string[];
  uniforme_blusa_tamanho: string | null;
  uniforme_blusa_quantidade: number;
  uniforme_calca_tamanho: string | null;
  uniforme_calca_quantidade: number;
  assinatura_funcionario: string | null;
  assinatura_autorizador: string | null;
  created_by: string;
  created_at: string;
}

export function useEpiExchanges() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: exchanges = [], isLoading } = useQuery({
    queryKey: ["epi-exchanges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("epi_exchanges" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as EpiExchange[];
    },
    enabled: !!user,
  });

  const createExchange = useMutation({
    mutationFn: async (values: Omit<EpiExchange, "id" | "created_at" | "created_by">) => {
      const { error } = await supabase
        .from("epi_exchanges" as any)
        .insert({ ...values, created_by: user!.id } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["epi-exchanges"] });
      toast.success("Troca de EPI registrada com sucesso!");
    },
    onError: () => toast.error("Erro ao registrar troca de EPI"),
  });

  const deleteExchange = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("epi_exchanges" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["epi-exchanges"] });
      toast.success("Registro excluído!");
    },
    onError: () => toast.error("Erro ao excluir registro"),
  });

  return { exchanges, isLoading, createExchange, deleteExchange };
}
