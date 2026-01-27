import { Target, TrendingUp, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface GoalProgressCardProps {
  type?: "jardinagem" | "gabiao" | "all";
}

export function GoalProgressCard({ type = "all" }: GoalProgressCardProps) {
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

  // Filter goals based on type
  const jardGoals = [
    progress.rocagem_m2,
    progress.podagem_unidade,
    progress.coroamento_unidade,
    progress.adubagem_unidade,
    progress.plantio_unidade,
    progress.controle_invasoras_unidade,
    progress.retirada_mudas_unidade,
  ].filter(g => g.target > 0);

  const gabiaoGoals = [
    progress.limpeza_canaleta_m,
    progress.recomposicao_gabiao_m,
    progress.manutencao_drenagem_m,
    progress.escavacao_manual_unidade,
    progress.reposicao_manta_unidade,
    progress.reposicao_silte_unidade,
  ].filter(g => g.target > 0);

  const allGoals = [...jardGoals, ...gabiaoGoals];
  const completedGoals = allGoals.filter(g => g.percentage >= 100).length;
  const totalGoals = allGoals.length;

  // If showing specific type and there are no goals for it, don't render
  if (type === "jardinagem" && jardGoals.length === 0) return null;
  if (type === "gabiao" && gabiaoGoals.length === 0) return null;
  if (type === "all" && totalGoals === 0) return null;

  const renderJardGoals = () => (
    <div className="space-y-4">
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
      {progress.adubagem_unidade.target > 0 && (
        <GoalItem
          label="Adubagem"
          emoji="💧"
          unit="un"
          current={progress.adubagem_unidade.current}
          target={progress.adubagem_unidade.target}
          percentage={progress.adubagem_unidade.percentage}
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
    </div>
  );

  const renderGabiaoGoals = () => (
    <div className="space-y-4">
      {progress.limpeza_canaleta_m.target > 0 && (
        <GoalItem
          label="Limpeza de Canaleta"
          emoji="🚰"
          unit="m"
          current={progress.limpeza_canaleta_m.current}
          target={progress.limpeza_canaleta_m.target}
          percentage={progress.limpeza_canaleta_m.percentage}
        />
      )}
      {progress.recomposicao_gabiao_m.target > 0 && (
        <GoalItem
          label="Recomposição de Gabião"
          emoji="🧱"
          unit="m"
          current={progress.recomposicao_gabiao_m.current}
          target={progress.recomposicao_gabiao_m.target}
          percentage={progress.recomposicao_gabiao_m.percentage}
        />
      )}
      {progress.manutencao_drenagem_m.target > 0 && (
        <GoalItem
          label="Manutenção de Drenagem"
          emoji="🔧"
          unit="m"
          current={progress.manutencao_drenagem_m.current}
          target={progress.manutencao_drenagem_m.target}
          percentage={progress.manutencao_drenagem_m.percentage}
        />
      )}
      {progress.escavacao_manual_unidade.target > 0 && (
        <GoalItem
          label="Escavação Manual"
          emoji="⛏️"
          unit="un"
          current={progress.escavacao_manual_unidade.current}
          target={progress.escavacao_manual_unidade.target}
          percentage={progress.escavacao_manual_unidade.percentage}
        />
      )}
      {progress.reposicao_manta_unidade.target > 0 && (
        <GoalItem
          label="Reposição de Manta Asfáltica"
          emoji="🛤️"
          unit="un"
          current={progress.reposicao_manta_unidade.current}
          target={progress.reposicao_manta_unidade.target}
          percentage={progress.reposicao_manta_unidade.percentage}
        />
      )}
      {progress.reposicao_silte_unidade.target > 0 && (
        <GoalItem
          label="Reposição de Silte"
          emoji="🪨"
          unit="un"
          current={progress.reposicao_silte_unidade.current}
          target={progress.reposicao_silte_unidade.target}
          percentage={progress.reposicao_silte_unidade.percentage}
        />
      )}
    </div>
  );

  // Specific type rendering
  if (type === "jardinagem") {
    const jardCompleted = jardGoals.filter(g => g.percentage >= 100).length;
    return (
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-600/20 flex items-center justify-center">
                <span className="text-xl">🌿</span>
              </div>
              <div>
                <CardTitle className="text-lg">Metas de Jardinagem</CardTitle>
                <CardDescription>
                  Período: {periodLabel} • {daysUntilClose} dias restantes
                </CardDescription>
              </div>
            </div>
            <Badge variant={jardCompleted === jardGoals.length ? "default" : "secondary"}>
              {jardCompleted}/{jardGoals.length} metas
            </Badge>
          </div>
        </CardHeader>
        <CardContent>{renderJardGoals()}</CardContent>
      </Card>
    );
  }

  if (type === "gabiao") {
    const gabiaoCompleted = gabiaoGoals.filter(g => g.percentage >= 100).length;
    return (
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-orange-600/20 flex items-center justify-center">
                <span className="text-xl">🧱</span>
              </div>
              <div>
                <CardTitle className="text-lg">Metas de Gabião</CardTitle>
                <CardDescription>
                  Período: {periodLabel} • {daysUntilClose} dias restantes
                </CardDescription>
              </div>
            </div>
            <Badge variant={gabiaoCompleted === gabiaoGoals.length ? "default" : "secondary"}>
              {gabiaoCompleted}/{gabiaoGoals.length} metas
            </Badge>
          </div>
        </CardHeader>
        <CardContent>{renderGabiaoGoals()}</CardContent>
      </Card>
    );
  }

  // Full view with tabs
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
      <CardContent>
        <Tabs defaultValue="jardinagem" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="jardinagem" className="gap-2">
              <span>🌿</span> Jardinagem
            </TabsTrigger>
            <TabsTrigger value="gabiao" className="gap-2">
              <span>🧱</span> Gabião
            </TabsTrigger>
          </TabsList>
          <TabsContent value="jardinagem">
            {jardGoals.length > 0 ? renderJardGoals() : (
              <p className="text-muted-foreground text-center py-4">Nenhuma meta de jardinagem definida</p>
            )}
          </TabsContent>
          <TabsContent value="gabiao">
            {gabiaoGoals.length > 0 ? renderGabiaoGoals() : (
              <p className="text-muted-foreground text-center py-4">Nenhuma meta de gabião definida</p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
