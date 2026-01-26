import { Target, CheckCircle2, AlertTriangle, Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  team: string;
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

  // Jardinagem goals
  const jardGoals: GoalStatus[] = [
    {
      label: "Roçagem",
      emoji: "🌿",
      unit: "m²",
      current: progress.rocagem_m2.current,
      target: progress.rocagem_m2.target,
      percentage: progress.rocagem_m2.percentage,
      achieved: progress.rocagem_m2.percentage >= 100,
      team: "Encarregado I e sua Equipe",
    },
    {
      label: "Podagem",
      emoji: "✂️",
      unit: "un",
      current: progress.podagem_unidade.current,
      target: progress.podagem_unidade.target,
      percentage: progress.podagem_unidade.percentage,
      achieved: progress.podagem_unidade.percentage >= 100,
      team: "Encarregado I e sua Equipe",
    },
    {
      label: "Coroamento",
      emoji: "🌱",
      unit: "un",
      current: progress.coroamento_unidade.current,
      target: progress.coroamento_unidade.target,
      percentage: progress.coroamento_unidade.percentage,
      achieved: progress.coroamento_unidade.percentage >= 100,
      team: "Encarregado I e sua Equipe",
    },
    {
      label: "Plantio",
      emoji: "🌳",
      unit: "un",
      current: progress.plantio_unidade.current,
      target: progress.plantio_unidade.target,
      percentage: progress.plantio_unidade.percentage,
      achieved: progress.plantio_unidade.percentage >= 100,
      team: "Encarregado I e sua Equipe",
    },
    {
      label: "Controle de Invasoras",
      emoji: "🚫",
      unit: "un",
      current: progress.controle_invasoras_unidade.current,
      target: progress.controle_invasoras_unidade.target,
      percentage: progress.controle_invasoras_unidade.percentage,
      achieved: progress.controle_invasoras_unidade.percentage >= 100,
      team: "Encarregado I e sua Equipe",
    },
    {
      label: "Retirada de Mudas",
      emoji: "🌲",
      unit: "un",
      current: progress.retirada_mudas_unidade.current,
      target: progress.retirada_mudas_unidade.target,
      percentage: progress.retirada_mudas_unidade.percentage,
      achieved: progress.retirada_mudas_unidade.percentage >= 100,
      team: "Encarregado I e sua Equipe",
    },
  ].filter(g => g.target > 0);

  // Gabião goals
  const gabiaoGoals: GoalStatus[] = [
    {
      label: "Limpeza de Canaleta",
      emoji: "🚰",
      unit: "m",
      current: progress.limpeza_canaleta_m.current,
      target: progress.limpeza_canaleta_m.target,
      percentage: progress.limpeza_canaleta_m.percentage,
      achieved: progress.limpeza_canaleta_m.percentage >= 100,
      team: "Encarregado II e sua Equipe",
    },
    {
      label: "Recomposição de Gabião",
      emoji: "🧱",
      unit: "m",
      current: progress.recomposicao_gabiao_m.current,
      target: progress.recomposicao_gabiao_m.target,
      percentage: progress.recomposicao_gabiao_m.percentage,
      achieved: progress.recomposicao_gabiao_m.percentage >= 100,
      team: "Encarregado II e sua Equipe",
    },
    {
      label: "Manutenção de Drenagem",
      emoji: "🔧",
      unit: "m",
      current: progress.manutencao_drenagem_m.current,
      target: progress.manutencao_drenagem_m.target,
      percentage: progress.manutencao_drenagem_m.percentage,
      achieved: progress.manutencao_drenagem_m.percentage >= 100,
      team: "Encarregado II e sua Equipe",
    },
    {
      label: "Limpeza de Bueiro",
      emoji: "🕳️",
      unit: "un",
      current: progress.limpeza_bueiro_unidade.current,
      target: progress.limpeza_bueiro_unidade.target,
      percentage: progress.limpeza_bueiro_unidade.percentage,
      achieved: progress.limpeza_bueiro_unidade.percentage >= 100,
      team: "Encarregado II e sua Equipe",
    },
    {
      label: "Reparo de Cerca",
      emoji: "🪵",
      unit: "m",
      current: progress.reparo_cerca_m.current,
      target: progress.reparo_cerca_m.target,
      percentage: progress.reparo_cerca_m.percentage,
      achieved: progress.reparo_cerca_m.percentage >= 100,
      team: "Encarregado II e sua Equipe",
    },
  ].filter(g => g.target > 0);

  const allGoals = [...jardGoals, ...gabiaoGoals];
  const achievedGoals = allGoals.filter(g => g.achieved);
  const pendingGoals = allGoals.filter(g => !g.achieved);
  const allAchieved = pendingGoals.length === 0 && achievedGoals.length > 0;

  const periodLabel = `${format(startDate, "dd/MM", { locale: ptBR })} a ${format(endDate, "dd/MM", { locale: ptBR })}`;

  const renderGoalCards = (goals: GoalStatus[], achieved: boolean) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {goals.map((goal) => (
        <div 
          key={goal.label} 
          className={`rounded-lg p-3 border ${
            achieved 
              ? "bg-green-500/10 border-green-500/20" 
              : "bg-amber-500/10 border-amber-500/20"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">{goal.emoji}</span>
              <span className={`font-medium ${achieved ? "text-green-400" : "text-amber-400"}`}>
                {goal.label}
              </span>
            </div>
            {!achieved && (
              <Badge variant="outline" className="text-amber-500 border-amber-500/50">
                {goal.percentage.toFixed(0)}%
              </Badge>
            )}
          </div>
          {!achieved && (
            <Progress value={goal.percentage} className="h-2 mb-2 [&>div]:bg-amber-500" />
          )}
          <p className={`text-sm ${achieved ? "text-green-300" : "text-amber-300"}`}>
            {achieved ? "✅" : ""} {goal.current.toLocaleString("pt-BR")} / {goal.target.toLocaleString("pt-BR")} {goal.unit}
          </p>
          {achieved ? (
            <p className="text-xs text-green-400 mt-1 font-medium">
              🏆 Parabéns, {goal.team}!
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">
              Faltam {(goal.target - goal.current).toLocaleString("pt-BR")} {goal.unit}
            </p>
          )}
        </div>
      ))}
    </div>
  );

  const jardAchieved = jardGoals.filter(g => g.achieved);
  const jardPending = jardGoals.filter(g => !g.achieved);
  const gabiaoAchieved = gabiaoGoals.filter(g => g.achieved);
  const gabiaoPending = gabiaoGoals.filter(g => !g.achieved);

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
              {achievedGoals.length}/{allGoals.length}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Jardinagem and Gabião */}
      <Card>
        <CardContent className="p-4">
          <Tabs defaultValue="jardinagem" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="jardinagem" className="gap-2">
                <span>🌿</span> Jardinagem ({jardAchieved.length}/{jardGoals.length})
              </TabsTrigger>
              <TabsTrigger value="gabiao" className="gap-2">
                <span>🧱</span> Gabião ({gabiaoAchieved.length}/{gabiaoGoals.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="jardinagem" className="space-y-4">
              {jardAchieved.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <h4 className="font-semibold text-green-500">Metas Atingidas</h4>
                  </div>
                  {renderGoalCards(jardAchieved, true)}
                </div>
              )}
              {jardPending.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    <h4 className="font-semibold text-amber-500">Metas Pendentes</h4>
                  </div>
                  {renderGoalCards(jardPending, false)}
                </div>
              )}
              {jardGoals.length === 0 && (
                <p className="text-muted-foreground text-center py-4">Nenhuma meta de jardinagem definida</p>
              )}
            </TabsContent>

            <TabsContent value="gabiao" className="space-y-4">
              {gabiaoAchieved.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <h4 className="font-semibold text-green-500">Metas Atingidas</h4>
                  </div>
                  {renderGoalCards(gabiaoAchieved, true)}
                </div>
              )}
              {gabiaoPending.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    <h4 className="font-semibold text-amber-500">Metas Pendentes</h4>
                  </div>
                  {renderGoalCards(gabiaoPending, false)}
                </div>
              )}
              {gabiaoGoals.length === 0 && (
                <p className="text-muted-foreground text-center py-4">Nenhuma meta de gabião definida</p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
