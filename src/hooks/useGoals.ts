import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { format, setDate, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
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
  escavacao_manual_unidade: number;
  reposicao_manta_unidade: number;
  reposicao_silte_unidade: number;
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
  escavacao_manual_unidade?: number;
  reposicao_manta_unidade?: number;
  reposicao_silte_unidade?: number;
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
            escavacao_manual_unidade: input.escavacao_manual_unidade ?? 0,
            reposicao_manta_unidade: input.reposicao_manta_unidade ?? 0,
            reposicao_silte_unidade: input.reposicao_silte_unidade ?? 0,
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
            escavacao_manual_unidade: input.escavacao_manual_unidade ?? 0,
            reposicao_manta_unidade: input.reposicao_manta_unidade ?? 0,
            reposicao_silte_unidade: input.reposicao_silte_unidade ?? 0,
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
  escavacao_manual_unidade: { current: number; target: number; percentage: number };
  reposicao_manta_unidade: { current: number; target: number; percentage: number };
  reposicao_silte_unidade: { current: number; target: number; percentage: number };
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

      // Sum up gabião values - parse from observacoes field for checkbox activities
      const gabiaoTotals = {
        limpeza_canaleta_m: 0,
        recomposicao_gabiao_m: 0,
        manutencao_drenagem_m: 0,
        escavacao_manual_unidade: 0,
        reposicao_manta_unidade: 0,
        reposicao_silte_unidade: 0,
      };

      gabiaoResponse.data?.forEach((report) => {
        gabiaoTotals.limpeza_canaleta_m += Number(report.limpeza_canaleta_m) || 0;
        gabiaoTotals.recomposicao_gabiao_m += Number(report.recomposicao_gabiao_m) || 0;
        gabiaoTotals.manutencao_drenagem_m += Number(report.manutencao_drenagem_m) || 0;
        
        // Parse checkbox activities from observacoes field
        const obs = report.observacoes || "";
        if (obs.includes("Escavação manual")) {
          gabiaoTotals.escavacao_manual_unidade += 1;
        }
        if (obs.includes("Reposição de manta asfáltica")) {
          gabiaoTotals.reposicao_manta_unidade += 1;
        }
        if (obs.includes("Reposição de silte")) {
          gabiaoTotals.reposicao_silte_unidade += 1;
        }
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
        escavacao_manual_unidade: calcProgress(gabiaoTotals.escavacao_manual_unidade, goal.escavacao_manual_unidade),
        reposicao_manta_unidade: calcProgress(gabiaoTotals.reposicao_manta_unidade, goal.reposicao_manta_unidade),
        reposicao_silte_unidade: calcProgress(gabiaoTotals.reposicao_silte_unidade, goal.reposicao_silte_unidade),
      };
    },
    enabled: !!goal,
  });
};

// Historical progress for charts (last 6 periods)
export interface HistoricalGoalData {
  monthYear: string;
  periodLabel: string;
  jardinagem: {
    achieved: number;
    total: number;
    percentage: number;
  };
  gabiao: {
    achieved: number;
    total: number;
    percentage: number;
  };
}

export const useHistoricalGoals = () => {
  return useQuery({
    queryKey: ["historical-goals"],
    queryFn: async (): Promise<HistoricalGoalData[]> => {
      const today = getBrazilNorthDate();
      const periods: HistoricalGoalData[] = [];

      // Get all goals
      const { data: allGoals, error: goalsError } = await supabase
        .from("goals")
        .select("*")
        .order("month_year", { ascending: false })
        .limit(6);

      if (goalsError) throw goalsError;
      if (!allGoals || allGoals.length === 0) return [];

      for (const goal of allGoals) {
        // Parse month_year to get the period dates
        const [year, month] = goal.month_year.split("-").map(Number);
        const startDate = new Date(year, month - 1, 16);
        const endDate = new Date(year, month, 16);

        const startStr = format(startDate, "yyyy-MM-dd");
        const endStr = format(endDate, "yyyy-MM-dd");
        const periodLabel = format(startDate, "MMM/yy", { locale: ptBR });

        // Fetch reports for this period
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

        // Calculate jardinagem totals
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

        // Calculate gabião totals
        const gabiaoTotals = {
          limpeza_canaleta_m: 0,
          recomposicao_gabiao_m: 0,
          manutencao_drenagem_m: 0,
          escavacao_manual_unidade: 0,
          reposicao_manta_unidade: 0,
          reposicao_silte_unidade: 0,
        };

        gabiaoResponse.data?.forEach((report) => {
          gabiaoTotals.limpeza_canaleta_m += Number(report.limpeza_canaleta_m) || 0;
          gabiaoTotals.recomposicao_gabiao_m += Number(report.recomposicao_gabiao_m) || 0;
          gabiaoTotals.manutencao_drenagem_m += Number(report.manutencao_drenagem_m) || 0;
          
          const obs = report.observacoes || "";
          if (obs.includes("Escavação manual")) gabiaoTotals.escavacao_manual_unidade += 1;
          if (obs.includes("Reposição de manta asfáltica")) gabiaoTotals.reposicao_manta_unidade += 1;
          if (obs.includes("Reposição de silte")) gabiaoTotals.reposicao_silte_unidade += 1;
        });

        // Count achieved goals
        const jardGoals = [
          { current: jardTotals.rocagem_m2, target: goal.rocagem_m2 },
          { current: jardTotals.podagem_unidade, target: goal.podagem_unidade },
          { current: jardTotals.coroamento_unidade, target: goal.coroamento_unidade },
          { current: jardTotals.plantio_unidade, target: goal.plantio_unidade },
          { current: jardTotals.controle_invasoras_unidade, target: goal.controle_invasoras_unidade },
          { current: jardTotals.retirada_mudas_unidade, target: goal.retirada_mudas_unidade },
        ].filter(g => g.target > 0);

        const gabiaoGoals = [
          { current: gabiaoTotals.limpeza_canaleta_m, target: goal.limpeza_canaleta_m },
          { current: gabiaoTotals.recomposicao_gabiao_m, target: goal.recomposicao_gabiao_m },
          { current: gabiaoTotals.manutencao_drenagem_m, target: goal.manutencao_drenagem_m },
          { current: gabiaoTotals.escavacao_manual_unidade, target: goal.escavacao_manual_unidade },
          { current: gabiaoTotals.reposicao_manta_unidade, target: goal.reposicao_manta_unidade },
          { current: gabiaoTotals.reposicao_silte_unidade, target: goal.reposicao_silte_unidade },
        ].filter(g => g.target > 0);

        const jardAchieved = jardGoals.filter(g => g.current >= g.target).length;
        const gabiaoAchieved = gabiaoGoals.filter(g => g.current >= g.target).length;

        periods.push({
          monthYear: goal.month_year,
          periodLabel,
          jardinagem: {
            achieved: jardAchieved,
            total: jardGoals.length,
            percentage: jardGoals.length > 0 ? (jardAchieved / jardGoals.length) * 100 : 0,
          },
          gabiao: {
            achieved: gabiaoAchieved,
            total: gabiaoGoals.length,
            percentage: gabiaoGoals.length > 0 ? (gabiaoAchieved / gabiaoGoals.length) * 100 : 0,
          },
        });
      }

      return periods.reverse(); // Oldest first for chart display
    },
  });
};
