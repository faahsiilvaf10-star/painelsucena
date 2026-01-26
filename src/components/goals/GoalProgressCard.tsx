import { Target, TrendingUp, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useGoalProgress, getCurrentMeasurementPeriod, useCurrentPeriodGoal } from "@/hooks/useGoals";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface GoalItemProps {
  label: string;
  emoji: string;
  unit: string;
  current: number;
  target: number;
  percentage: number;
}

function GoalItem({ label, emoji, unit, current, target, percentage }: GoalItemProps) {
  const isComplete = percentage >= 100;
  const isClose = percentage >= 80 && percentage < 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{emoji}</span>
          <span className="text-sm font-medium">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          {isComplete ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : isClose ? (
            <TrendingUp className="h-4 w-4 text-amber-500" />
          ) : null}
          <Badge variant={isComplete ? "default" : isClose ? "secondary" : "outline"}>
            {current.toLocaleString("pt-BR")} / {target.toLocaleString("pt-BR")} {unit}
          </Badge>
        </div>
      </div>
      <Progress
        value={percentage}
        className={`h-2 ${isComplete ? "[&>div]:bg-green-500" : isClose ? "[&>div]:bg-amber-500" : ""}`}
      />
      <p className="text-xs text-muted-foreground text-right">
        {percentage.toFixed(1)}%
      </p>
    </div>
  );
}

export function GoalProgressCard() {
  const { data: goal } = useCurrentPeriodGoal();
  const { data: progress, isLoading } = useGoalProgress();
  const { startDate, endDate, daysUntilClose } = getCurrentMeasurementPeriod();

  // Don't show if no goal is set
  if (!goal || isLoading) {
    return null;
  }

  // If no progress data yet
  if (!progress) {
    return null;
  }

  const periodLabel = `${format(startDate, "dd/MM", { locale: ptBR })} a ${format(endDate, "dd/MM", { locale: ptBR })}`;

  // Calculate overall progress
  const goals = [
    progress.rocagem_m2,
    progress.podagem_unidade,
    progress.coroamento_unidade,
    progress.plantio_unidade,
    progress.controle_invasoras_unidade,
    progress.retirada_mudas_unidade,
  ].filter(g => g.target > 0);

  const completedGoals = goals.filter(g => g.percentage >= 100).length;
  const totalGoals = goals.length;

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-600/20 flex items-center justify-center">
              <Target className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Progresso das Metas</CardTitle>
              <CardDescription>
                Período: {periodLabel} • {daysUntilClose} dias restantes
              </CardDescription>
            </div>
          </div>
          <Badge variant={completedGoals === totalGoals ? "default" : "secondary"}>
            {completedGoals}/{totalGoals} metas atingidas
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {progress.rocagem_m2.target > 0 && (
          <GoalItem
            label="Roçagem"
            emoji="🌿"
            unit="m²"
            current={progress.rocagem_m2.current}
            target={progress.rocagem_m2.target}
            percentage={progress.rocagem_m2.percentage}
          />
        )}
        {progress.podagem_unidade.target > 0 && (
          <GoalItem
            label="Podagem"
            emoji="✂️"
            unit="un"
            current={progress.podagem_unidade.current}
            target={progress.podagem_unidade.target}
            percentage={progress.podagem_unidade.percentage}
          />
        )}
        {progress.coroamento_unidade.target > 0 && (
          <GoalItem
            label="Coroamento"
            emoji="🌱"
            unit="un"
            current={progress.coroamento_unidade.current}
            target={progress.coroamento_unidade.target}
            percentage={progress.coroamento_unidade.percentage}
          />
        )}
        {progress.plantio_unidade.target > 0 && (
          <GoalItem
            label="Plantio"
            emoji="🌳"
            unit="un"
            current={progress.plantio_unidade.current}
            target={progress.plantio_unidade.target}
            percentage={progress.plantio_unidade.percentage}
          />
        )}
        {progress.controle_invasoras_unidade.target > 0 && (
          <GoalItem
            label="Controle de Invasoras"
            emoji="🚫"
            unit="un"
            current={progress.controle_invasoras_unidade.current}
            target={progress.controle_invasoras_unidade.target}
            percentage={progress.controle_invasoras_unidade.percentage}
          />
        )}
        {progress.retirada_mudas_unidade.target > 0 && (
          <GoalItem
            label="Retirada de Mudas"
            emoji="🌲"
            unit="un"
            current={progress.retirada_mudas_unidade.current}
            target={progress.retirada_mudas_unidade.target}
            percentage={progress.retirada_mudas_unidade.percentage}
          />
        )}
      </CardContent>
    </Card>
  );
}
