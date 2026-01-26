import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { format, setDate, addMonths, subMonths, isAfter, isBefore, parseISO } from "date-fns";
import { getBrazilNorthDate } from "@/lib/timezone";

export interface Goal {
  id: string;
  month_year: string;
  // Jardinagem goals
  rocagem_m2: number;
  podagem_unidade: number;
  coroamento_unidade: number;
  plantio_unidade: number;
  controle_invasoras_unidade: number;
  retirada_mudas_unidade: number;
  // Gabião goals
  limpeza_canaleta_m: number;
  recomposicao_gabiao_m: number;
  manutencao_drenagem_m: number;
  limpeza_bueiro_unidade: number;
  reparo_cerca_m: number;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface GoalInput {
  month_year: string;
  // Jardinagem
  rocagem_m2?: number;
  podagem_unidade?: number;
  coroamento_unidade?: number;
  plantio_unidade?: number;
  controle_invasoras_unidade?: number;
  retirada_mudas_unidade?: number;
  // Gabião
  limpeza_canaleta_m?: number;
  recomposicao_gabiao_m?: number;
  manutencao_drenagem_m?: number;
  limpeza_bueiro_unidade?: number;
  reparo_cerca_m?: number;
}

// Get the current measurement period (16th to 16th)
export const getCurrentMeasurementPeriod = () => {
  const today = getBrazilNorthDate();
  const currentDay = today.getDate();
  
  let startDate: Date;
  let endDate: Date;
  
  if (currentDay >= 16) {
    // Period: 16th of current month to 16th of next month
    startDate = setDate(today, 16);
    endDate = setDate(addMonths(today, 1), 16);
  } else {
    // Period: 16th of previous month to 16th of current month
    startDate = setDate(subMonths(today, 1), 16);
    endDate = setDate(today, 16);
  }
  
  return {
    startDate,
    endDate,
    monthYear: format(startDate, "yyyy-MM"),
    daysUntilClose: Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
  };
};

// Check if we're within 5 days of closing
export const isNearMeasurementClose = () => {
  const { daysUntilClose } = getCurrentMeasurementPeriod();
  return daysUntilClose <= 5 && daysUntilClose > 0;
};

export const useGoals = () => {
  return useQuery({
    queryKey: ["goals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .order("month_year", { ascending: false });

      if (error) throw error;
      return data as Goal[];
    },
  });
};

export const useGoalByMonthYear = (monthYear: string) => {
  return useQuery({
    queryKey: ["goals", monthYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .eq("month_year", monthYear)
        .maybeSingle();

      if (error) throw error;
      return data as Goal | null;
    },
    enabled: !!monthYear,
  });
};

export const useCurrentPeriodGoal = () => {
  const { monthYear } = getCurrentMeasurementPeriod();
  return useGoalByMonthYear(monthYear);
};

export const useSaveGoal = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: GoalInput) => {
      if (!user) throw new Error("Usuário não autenticado");

      // Check if goal exists
      const { data: existing } = await supabase
        .from("goals")
        .select("id")
        .eq("month_year", input.month_year)
        .maybeSingle();

      if (existing) {
        // Update
        const { data, error } = await supabase
          .from("goals")
          .update({
            rocagem_m2: input.rocagem_m2 ?? 0,
            podagem_unidade: input.podagem_unidade ?? 0,
            coroamento_unidade: input.coroamento_unidade ?? 0,
            plantio_unidade: input.plantio_unidade ?? 0,
            controle_invasoras_unidade: input.controle_invasoras_unidade ?? 0,
            retirada_mudas_unidade: input.retirada_mudas_unidade ?? 0,
            limpeza_canaleta_m: input.limpeza_canaleta_m ?? 0,
            recomposicao_gabiao_m: input.recomposicao_gabiao_m ?? 0,
            manutencao_drenagem_m: input.manutencao_drenagem_m ?? 0,
            limpeza_bueiro_unidade: input.limpeza_bueiro_unidade ?? 0,
            reparo_cerca_m: input.reparo_cerca_m ?? 0,
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert
        const { data, error } = await supabase
          .from("goals")
          .insert({
            month_year: input.month_year,
            rocagem_m2: input.rocagem_m2 ?? 0,
            podagem_unidade: input.podagem_unidade ?? 0,
            coroamento_unidade: input.coroamento_unidade ?? 0,
            plantio_unidade: input.plantio_unidade ?? 0,
            controle_invasoras_unidade: input.controle_invasoras_unidade ?? 0,
            retirada_mudas_unidade: input.retirada_mudas_unidade ?? 0,
            limpeza_canaleta_m: input.limpeza_canaleta_m ?? 0,
            recomposicao_gabiao_m: input.recomposicao_gabiao_m ?? 0,
            manutencao_drenagem_m: input.manutencao_drenagem_m ?? 0,
            limpeza_bueiro_unidade: input.limpeza_bueiro_unidade ?? 0,
            reparo_cerca_m: input.reparo_cerca_m ?? 0,
            created_by: user.id,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
  });
};

export const useDeleteGoal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("goals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
  });
};

// Calculate progress for current measurement period
export interface GoalProgress {
  // Jardinagem
  rocagem_m2: { current: number; target: number; percentage: number };
  podagem_unidade: { current: number; target: number; percentage: number };
  coroamento_unidade: { current: number; target: number; percentage: number };
  plantio_unidade: { current: number; target: number; percentage: number };
  controle_invasoras_unidade: { current: number; target: number; percentage: number };
  retirada_mudas_unidade: { current: number; target: number; percentage: number };
  // Gabião
  limpeza_canaleta_m: { current: number; target: number; percentage: number };
  recomposicao_gabiao_m: { current: number; target: number; percentage: number };
  manutencao_drenagem_m: { current: number; target: number; percentage: number };
  limpeza_bueiro_unidade: { current: number; target: number; percentage: number };
  reparo_cerca_m: { current: number; target: number; percentage: number };
}

export const useGoalProgress = () => {
  const { startDate, endDate, monthYear } = getCurrentMeasurementPeriod();
  const { data: goal } = useGoalByMonthYear(monthYear);

  return useQuery({
    queryKey: ["goal-progress", monthYear],
    queryFn: async (): Promise<GoalProgress | null> => {
      if (!goal) return null;

      // Get date range for reports
      const startStr = format(startDate, "yyyy-MM-dd");
      const endStr = format(endDate, "yyyy-MM-dd");

      // Fetch jardinagem and gabião reports in parallel
      const [jardResponse, gabiaoResponse] = await Promise.all([
        supabase
          .from("daily_jardinagem_reports")
          .select("*")
          .gte("report_date", startStr)
          .lte("report_date", endStr),
        supabase
          .from("daily_gabiao_reports")
          .select("*")
          .gte("report_date", startStr)
          .lte("report_date", endStr),
      ]);

      if (jardResponse.error) throw jardResponse.error;
      if (gabiaoResponse.error) throw gabiaoResponse.error;

      // Sum up jardinagem values
      const jardTotals = {
        rocagem_m2: 0,
        podagem_unidade: 0,
        coroamento_unidade: 0,
        plantio_unidade: 0,
        controle_invasoras_unidade: 0,
        retirada_mudas_unidade: 0,
      };

      jardResponse.data?.forEach((report) => {
        jardTotals.rocagem_m2 += Number(report.rocagem_m2) || 0;
        jardTotals.podagem_unidade += Number(report.podagem_unidade) || 0;
        jardTotals.coroamento_unidade += Number(report.coroamento_unidade) || 0;
        jardTotals.plantio_unidade += Number(report.plantio_unidade) || 0;
        jardTotals.controle_invasoras_unidade += Number(report.controle_invasoras_unidade) || 0;
        jardTotals.retirada_mudas_unidade += Number(report.retirada_mudas_unidade) || 0;
      });

      // Sum up gabião values
      const gabiaoTotals = {
        limpeza_canaleta_m: 0,
        recomposicao_gabiao_m: 0,
        manutencao_drenagem_m: 0,
        limpeza_bueiro_unidade: 0,
        reparo_cerca_m: 0,
      };

      gabiaoResponse.data?.forEach((report) => {
        gabiaoTotals.limpeza_canaleta_m += Number(report.limpeza_canaleta_m) || 0;
        gabiaoTotals.recomposicao_gabiao_m += Number(report.recomposicao_gabiao_m) || 0;
        gabiaoTotals.manutencao_drenagem_m += Number(report.manutencao_drenagem_m) || 0;
        gabiaoTotals.limpeza_bueiro_unidade += Number(report.limpeza_bueiro_unidade) || 0;
        gabiaoTotals.reparo_cerca_m += Number(report.reparo_cerca_m) || 0;
      });

      const calcProgress = (current: number, target: number) => ({
        current,
        target,
        percentage: target > 0 ? Math.min((current / target) * 100, 100) : 0,
      });

      return {
        // Jardinagem
        rocagem_m2: calcProgress(jardTotals.rocagem_m2, goal.rocagem_m2),
        podagem_unidade: calcProgress(jardTotals.podagem_unidade, goal.podagem_unidade),
        coroamento_unidade: calcProgress(jardTotals.coroamento_unidade, goal.coroamento_unidade),
        plantio_unidade: calcProgress(jardTotals.plantio_unidade, goal.plantio_unidade),
        controle_invasoras_unidade: calcProgress(jardTotals.controle_invasoras_unidade, goal.controle_invasoras_unidade),
        retirada_mudas_unidade: calcProgress(jardTotals.retirada_mudas_unidade, goal.retirada_mudas_unidade),
        // Gabião
        limpeza_canaleta_m: calcProgress(gabiaoTotals.limpeza_canaleta_m, goal.limpeza_canaleta_m),
        recomposicao_gabiao_m: calcProgress(gabiaoTotals.recomposicao_gabiao_m, goal.recomposicao_gabiao_m),
        manutencao_drenagem_m: calcProgress(gabiaoTotals.manutencao_drenagem_m, goal.manutencao_drenagem_m),
        limpeza_bueiro_unidade: calcProgress(gabiaoTotals.limpeza_bueiro_unidade, goal.limpeza_bueiro_unidade),
        reparo_cerca_m: calcProgress(gabiaoTotals.reparo_cerca_m, goal.reparo_cerca_m),
      };
    },
    enabled: !!goal,
  });
};
