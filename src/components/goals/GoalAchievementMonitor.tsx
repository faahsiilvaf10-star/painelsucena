import { useEffect, useRef } from "react";
import { useGoalProgress, useCurrentPeriodGoal, getCurrentMeasurementPeriod } from "@/hooks/useGoals";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Keep track of which goals have been notified (per session) to avoid duplicates
const notifiedGoals = new Set<string>();

interface GoalInfo {
  key: string;
  name: string;
  type: "jardinagem" | "gabiao";
  current: number;
  target: number;
  percentage: number;
}

export function GoalAchievementMonitor() {
  const { data: goal } = useCurrentPeriodGoal();
  const { data: progress } = useGoalProgress();
  const { startDate, endDate, monthYear } = getCurrentMeasurementPeriod();
  const periodLabel = `${format(startDate, "dd/MM/yyyy", { locale: ptBR })} a ${format(endDate, "dd/MM/yyyy", { locale: ptBR })}`;
  const prevProgressRef = useRef<typeof progress>(null);

  useEffect(() => {
    if (!progress || !goal) return;

    // Map all goals with their info
    const goalInfoList: GoalInfo[] = [
      // Jardinagem
      { key: "rocagem_m2", name: "Roçagem", type: "jardinagem", ...progress.rocagem_m2 },
      { key: "podagem_unidade", name: "Podagem", type: "jardinagem", ...progress.podagem_unidade },
      { key: "coroamento_unidade", name: "Coroamento", type: "jardinagem", ...progress.coroamento_unidade },
      { key: "plantio_unidade", name: "Plantio", type: "jardinagem", ...progress.plantio_unidade },
      { key: "controle_invasoras_unidade", name: "Controle de Invasoras", type: "jardinagem", ...progress.controle_invasoras_unidade },
      { key: "retirada_mudas_unidade", name: "Retirada de Mudas", type: "jardinagem", ...progress.retirada_mudas_unidade },
      { key: "limpeza_manual_m2", name: "Limpeza Manual", type: "jardinagem", ...progress.limpeza_manual_m2 },
      { key: "limpeza_assoprador_m2", name: "Limpeza Soprador", type: "jardinagem", ...progress.limpeza_assoprador_m2 },
      // Gabião
      { key: "limpeza_canaleta_m", name: "Limpeza de Canaleta", type: "gabiao", ...progress.limpeza_canaleta_m },
      { key: "recomposicao_gabiao_m", name: "Recomposição de Gabião", type: "gabiao", ...progress.recomposicao_gabiao_m },
      { key: "manutencao_drenagem_m", name: "Manutenção de Drenagem", type: "gabiao", ...progress.manutencao_drenagem_m },
      { key: "escavacao_manual_unidade", name: "Escavação Manual", type: "gabiao", ...progress.escavacao_manual_unidade },
      { key: "reposicao_manta_unidade", name: "Reposição de Manta Asfáltica", type: "gabiao", ...progress.reposicao_manta_unidade },
      { key: "reposicao_silte_unidade", name: "Reposição de Silte", type: "gabiao", ...progress.reposicao_silte_unidade },
      { key: "limpeza_bueiro_unidade", name: "Limpeza de Bueiro", type: "gabiao", ...progress.limpeza_bueiro_unidade },
      { key: "reparo_cerca_m", name: "Reparo de Cerca", type: "gabiao", ...progress.reparo_cerca_m },
    ];

    // Check which goals just reached 100%
    for (const goalInfo of goalInfoList) {
      // Skip goals with no target set
      if (goalInfo.target <= 0) continue;

      const notificationKey = `${monthYear}-${goalInfo.key}`;
      
      // Skip if already notified
      if (notifiedGoals.has(notificationKey)) continue;

      // Check if goal just reached 100%
      if (goalInfo.percentage >= 100) {
        // Check previous progress to see if this is a new achievement
        const prevGoalProgress = prevProgressRef.current?.[goalInfo.key as keyof typeof progress];
        const wasAlreadyComplete = prevGoalProgress && prevGoalProgress.percentage >= 100;

        // Only notify if this is a new achievement (wasn't complete before)
        // Or if this is the first time we're checking (no previous data)
        if (!wasAlreadyComplete) {
          notifiedGoals.add(notificationKey);
          
          // Send notification (fire and forget)
          sendGoalNotification({
            goalType: goalInfo.type,
            goalName: goalInfo.name,
            currentValue: goalInfo.current,
            targetValue: goalInfo.target,
            periodLabel,
          });
        }
      }
    }

    // Store current progress for next comparison
    prevProgressRef.current = progress;
  }, [progress, goal, monthYear, periodLabel]);

  // This component doesn't render anything
  return null;
}

async function sendGoalNotification(params: {
  goalType: "jardinagem" | "gabiao";
  goalName: string;
  currentValue: number;
  targetValue: number;
  periodLabel: string;
}) {
  try {
    console.log(`🎯 Sending goal achievement notification for: ${params.goalName}`);
    
    const { data, error } = await supabase.functions.invoke("notify-goal-achieved", {
      body: params,
    });

    if (error) {
      console.error("Error sending goal notification:", error);
      return;
    }

    console.log("✅ Goal achievement notification sent:", data);
  } catch (error) {
    console.error("Failed to send goal notification:", error);
  }
}
