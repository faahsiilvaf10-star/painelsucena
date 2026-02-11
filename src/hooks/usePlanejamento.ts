import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { setDate, addMonths, format } from "date-fns";
import { getBrazilNorthDate } from "@/lib/timezone";

export interface GoalRecord {
  id: string;
  month_year: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Atividades I (Jardinagem)
  rocagem_m2: number;
  podagem_unidade: number;
  coroamento_unidade: number;
  plantio_unidade: number;
  controle_invasoras_unidade: number;
  retirada_mudas_unidade: number;
  adubagem_unidade: number;
  limpeza_manual_m2: number;
  limpeza_assoprador_m2: number;
  // Atividades II (Gabião)
  limpeza_canaleta_m: number;
  limpeza_bueiro_unidade: number;
  recomposicao_gabiao_m: number;
  manutencao_drenagem_m: number;
  reparo_cerca_m: number;
  escavacao_manual_unidade: number;
  reposicao_manta_unidade: number;
  reposicao_silte_unidade: number;
  recomposicao_tela_unidade: number;
  recomposicao_cascalho_unidade: number;
  recomposicao_silte_unidade: number;
}

// Services definitions
export const JARDINAGEM_SERVICES = [
  { key: "rocagem_m2", label: "Roçagem", unit: "m²" },
  { key: "podagem_unidade", label: "Podagem", unit: "un" },
  { key: "coroamento_unidade", label: "Coroamento", unit: "un" },
  { key: "plantio_unidade", label: "Plantio", unit: "un" },
  { key: "controle_invasoras_unidade", label: "Controle Invasoras", unit: "un" },
  { key: "retirada_mudas_unidade", label: "Retirada de Mudas", unit: "un" },
  { key: "adubagem_unidade", label: "Adubagem", unit: "un" },
  { key: "limpeza_manual_m2", label: "Limpeza Manual", unit: "m²" },
  { key: "limpeza_assoprador_m2", label: "Limpeza Assoprador", unit: "m²" },
] as const;

export const GABIAO_SERVICES = [
  { key: "limpeza_canaleta_m", label: "Limpeza Canaleta", unit: "m" },
  { key: "limpeza_bueiro_unidade", label: "Limpeza Bueiro", unit: "un" },
  { key: "recomposicao_gabiao_m", label: "Recomposição Gabião", unit: "m" },
  { key: "manutencao_drenagem_m", label: "Manutenção Drenagem", unit: "m" },
  { key: "reparo_cerca_m", label: "Reparo de Cerca", unit: "m" },
  { key: "escavacao_manual_unidade", label: "Escavação Manual", unit: "un" },
  { key: "reposicao_manta_unidade", label: "Reposição Manta", unit: "un" },
  { key: "reposicao_silte_unidade", label: "Reposição Silte", unit: "un" },
  { key: "recomposicao_tela_unidade", label: "Recomposição Tela", unit: "un" },
  { key: "recomposicao_cascalho_unidade", label: "Recomposição Cascalho", unit: "un" },
  { key: "recomposicao_silte_unidade", label: "Recomposição Silte", unit: "un" },
] as const;

export function getCurrentMeasurementPeriod() {
  const today = getBrazilNorthDate();
  const day = today.getDate();
  const month = today.getMonth();
  const year = today.getFullYear();

  let startDate: Date;
  let endDate: Date;

  if (day >= 16) {
    startDate = new Date(year, month, 16);
    endDate = setDate(addMonths(startDate, 1), 15);
  } else {
    startDate = new Date(year, month - 1, 16);
    endDate = new Date(year, month, 15);
  }

  const monthYear = format(startDate, "yyyy-MM");
  return { startDate, endDate, monthYear, label: `${format(startDate, "dd/MM")} a ${format(endDate, "dd/MM/yyyy")}` };
}

export function useGoals(monthYear?: string) {
  const period = getCurrentMeasurementPeriod();
  const effectiveMonthYear = monthYear || period.monthYear;

  return useQuery({
    queryKey: ["goals", effectiveMonthYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .eq("month_year", effectiveMonthYear)
        .maybeSingle();
      if (error) throw error;
      return data as GoalRecord | null;
    },
  });
}

export function useGoalsHistory() {
  return useQuery({
    queryKey: ["goals-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .order("month_year", { ascending: false })
        .limit(12);
      if (error) throw error;
      return (data || []) as GoalRecord[];
    },
  });
}

export function useSaveGoals() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: { monthYear: string; goals: Partial<GoalRecord>; existingId?: string }) => {
      if (!user) throw new Error("Não autenticado");

      if (params.existingId) {
        const { error } = await supabase
          .from("goals")
          .update(params.goals)
          .eq("id", params.existingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("goals")
          .insert({
            ...params.goals,
            month_year: params.monthYear,
            created_by: user.id,
          } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["goals-history"] });
      toast.success("Metas salvas com sucesso!");
    },
    onError: (err: any) => {
      toast.error("Erro ao salvar metas: " + err.message);
    },
  });
}
