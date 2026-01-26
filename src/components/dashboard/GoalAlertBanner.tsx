import { Target, CheckCircle2, AlertTriangle, Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useGoalProgress, isNearMeasurementClose, getCurrentMeasurementPeriod, useCurrentPeriodGoal } from "@/hooks/useGoals";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface GoalStatus {
  label: string;
  emoji: string;
  unit: string;
  current: number;
  target: number;
  percentage: number;
  achieved: boolean;
}

export function GoalAlertBanner() {
  const { data: goal } = useCurrentPeriodGoal();
  const { data: progress, isLoading } = useGoalProgress();
  const { startDate, endDate, daysUntilClose } = getCurrentMeasurementPeriod();
  const isNearClose = isNearMeasurementClose();

  // Only show when near measurement close (5 days before)
  if (!isNearClose || !goal || isLoading || !progress) {
    return null;
  }

  const goals: GoalStatus[] = [
    {
      label: "Roçagem",
      emoji: "🌿",
      unit: "m²",
      current: progress.rocagem_m2.current,
      target: progress.rocagem_m2.target,
      percentage: progress.rocagem_m2.percentage,
      achieved: progress.rocagem_m2.percentage >= 100,
    },
    {
      label: "Podagem",
      emoji: "✂️",
      unit: "un",
      current: progress.podagem_unidade.current,
      target: progress.podagem_unidade.target,
      percentage: progress.podagem_unidade.percentage,
      achieved: progress.podagem_unidade.percentage >= 100,
    },
    {
      label: "Coroamento",
      emoji: "🌱",
      unit: "un",
      current: progress.coroamento_unidade.current,
      target: progress.coroamento_unidade.target,
      percentage: progress.coroamento_unidade.percentage,
      achieved: progress.coroamento_unidade.percentage >= 100,
    },
    {
      label: "Plantio",
      emoji: "🌳",
      unit: "un",
      current: progress.plantio_unidade.current,
      target: progress.plantio_unidade.target,
      percentage: progress.plantio_unidade.percentage,
      achieved: progress.plantio_unidade.percentage >= 100,
    },
    {
      label: "Controle de Invasoras",
      emoji: "🚫",
      unit: "un",
      current: progress.controle_invasoras_unidade.current,
      target: progress.controle_invasoras_unidade.target,
      percentage: progress.controle_invasoras_unidade.percentage,
      achieved: progress.controle_invasoras_unidade.percentage >= 100,
    },
    {
      label: "Retirada de Mudas",
      emoji: "🌲",
      unit: "un",
      current: progress.retirada_mudas_unidade.current,
      target: progress.retirada_mudas_unidade.target,
      percentage: progress.retirada_mudas_unidade.percentage,
      achieved: progress.retirada_mudas_unidade.percentage >= 100,
    },
  ].filter(g => g.target > 0);

  const achievedGoals = goals.filter(g => g.achieved);
  const pendingGoals = goals.filter(g => !g.achieved);
  const allAchieved = pendingGoals.length === 0 && achievedGoals.length > 0;

  const periodLabel = `${format(startDate, "dd/MM", { locale: ptBR })} a ${format(endDate, "dd/MM", { locale: ptBR })}`;

  return (
    <div className="space-y-4 mb-6 animate-fade-in">
      {/* Header Card */}
      <Card className={`border-2 ${allAchieved ? "border-green-500/50 bg-green-500/10" : "border-amber-500/50 bg-amber-500/10"}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={`h-12 w-12 rounded-full flex items-center justify-center ${allAchieved ? "bg-green-500/20" : "bg-amber-500/20"}`}>
              {allAchieved ? (
                <Trophy className="h-6 w-6 text-green-500" />
              ) : (
                <Target className="h-6 w-6 text-amber-500" />
              )}
            </div>
            <div className="flex-1">
              <h3 className={`font-bold text-lg ${allAchieved ? "text-green-500" : "text-amber-500"}`}>
                {allAchieved ? "🎉 Todas as Metas Batidas!" : "⚠️ Atenção: Fechamento de Medição"}
              </h3>
              <p className="text-sm text-muted-foreground">
                Período: {periodLabel} • Faltam {daysUntilClose} dias para o fechamento
              </p>
            </div>
            <Badge variant={allAchieved ? "default" : "secondary"} className="text-lg px-4 py-1">
              {achievedGoals.length}/{goals.length}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Achieved Goals */}
      {achievedGoals.length > 0 && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <h4 className="font-semibold text-green-500">Metas Atingidas</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {achievedGoals.map((goal) => (
                <div key={goal.label} className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{goal.emoji}</span>
                    <span className="font-medium text-green-400">{goal.label}</span>
                  </div>
                  <p className="text-sm text-green-300">
                    ✅ {goal.current.toLocaleString("pt-BR")} / {goal.target.toLocaleString("pt-BR")} {goal.unit}
                  </p>
                  <p className="text-xs text-green-400 mt-1 font-medium">
                    🏆 Parabéns, Encarregado I e sua Equipe!
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Goals */}
      {pendingGoals.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <h4 className="font-semibold text-amber-500">Metas Pendentes</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {pendingGoals.map((goal) => (
                <div key={goal.label} className="bg-amber-500/10 rounded-lg p-3 border border-amber-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{goal.emoji}</span>
                      <span className="font-medium text-amber-400">{goal.label}</span>
                    </div>
                    <Badge variant="outline" className="text-amber-500 border-amber-500/50">
                      {goal.percentage.toFixed(0)}%
                    </Badge>
                  </div>
                  <Progress value={goal.percentage} className="h-2 mb-2 [&>div]:bg-amber-500" />
                  <p className="text-sm text-amber-300">
                    {goal.current.toLocaleString("pt-BR")} / {goal.target.toLocaleString("pt-BR")} {goal.unit}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Faltam {(goal.target - goal.current).toLocaleString("pt-BR")} {goal.unit}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
