import { useMemo } from "react";
import { format, setDate, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Target, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Leaf,
  Wrench,
  Calendar,
  Trophy
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useGoalProgress, useCurrentPeriodGoal, getCurrentMeasurementPeriod, isNearMeasurementClose } from "@/hooks/useGoals";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  RadialBarChart,
  RadialBar,
} from "recharts";

interface MetricCardProps {
  label: string;
  current: number;
  target: number;
  percentage: number;
  unit: string;
  icon: string;
}

const MetricCard = ({ label, current, target, percentage, unit, icon }: MetricCardProps) => {
  const isComplete = percentage >= 100;
  const isWarning = percentage >= 70 && percentage < 100;
  const isDanger = percentage < 50;

  return (
    <div className={`p-4 rounded-lg border transition-all ${
      isComplete 
        ? "bg-green-500/10 border-green-500/30" 
        : isWarning 
        ? "bg-amber-500/10 border-amber-500/30"
        : isDanger
        ? "bg-red-500/10 border-red-500/30"
        : "bg-secondary/50 border-border"
    }`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-lg">{icon}</span>
        {isComplete && <CheckCircle2 className="h-4 w-4 text-green-500" />}
        {!isComplete && isNearMeasurementClose() && isDanger && (
          <AlertTriangle className="h-4 w-4 text-amber-500" />
        )}
      </div>
      <p className="text-sm font-medium text-muted-foreground mb-1 truncate">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-bold">{current.toLocaleString("pt-BR")}</span>
        <span className="text-sm text-muted-foreground">/ {target.toLocaleString("pt-BR")} {unit}</span>
      </div>
      <Progress 
        value={percentage} 
        className={`h-2 mt-2 ${
          isComplete 
            ? "[&>div]:bg-green-500" 
            : isWarning 
            ? "[&>div]:bg-amber-500"
            : isDanger
            ? "[&>div]:bg-red-500"
            : ""
        }`}
      />
      <p className="text-xs text-muted-foreground mt-1 text-right">
        {percentage.toFixed(1)}%
      </p>
    </div>
  );
};

export function GoalsDashboard() {
  const { data: goal, isLoading: isLoadingGoal } = useCurrentPeriodGoal();
  const { data: progress, isLoading: isLoadingProgress } = useGoalProgress();
  const { startDate, endDate, daysUntilClose } = getCurrentMeasurementPeriod();
  const isNearClose = isNearMeasurementClose();

  const periodLabel = useMemo(() => {
    return `${format(startDate, "dd/MM", { locale: ptBR })} a ${format(endDate, "dd/MM/yyyy", { locale: ptBR })}`;
  }, [startDate, endDate]);

  // Calculate summary statistics
  const summary = useMemo(() => {
    if (!progress) return null;

    const jardMetrics = [
      progress.rocagem_m2,
      progress.podagem_unidade,
      progress.coroamento_unidade,
      progress.adubagem_unidade,
      progress.plantio_unidade,
      progress.controle_invasoras_unidade,
      progress.retirada_mudas_unidade,
    ].filter(m => m.target > 0);

    const gabiaoMetrics = [
      progress.limpeza_canaleta_m,
      progress.recomposicao_gabiao_m,
      progress.manutencao_drenagem_m,
      progress.escavacao_manual_unidade,
      progress.reposicao_manta_unidade,
      progress.reposicao_silte_unidade,
    ].filter(m => m.target > 0);

    const jardCompleted = jardMetrics.filter(m => m.percentage >= 100).length;
    const gabiaoCompleted = gabiaoMetrics.filter(m => m.percentage >= 100).length;

    const jardAvgProgress = jardMetrics.length > 0 
      ? jardMetrics.reduce((sum, m) => sum + m.percentage, 0) / jardMetrics.length 
      : 0;
    const gabiaoAvgProgress = gabiaoMetrics.length > 0 
      ? gabiaoMetrics.reduce((sum, m) => sum + m.percentage, 0) / gabiaoMetrics.length 
      : 0;

    const totalMetrics = jardMetrics.length + gabiaoMetrics.length;
    const totalCompleted = jardCompleted + gabiaoCompleted;
    const overallProgress = totalMetrics > 0 
      ? ((jardAvgProgress * jardMetrics.length) + (gabiaoAvgProgress * gabiaoMetrics.length)) / totalMetrics 
      : 0;

    return {
      jardMetrics,
      gabiaoMetrics,
      jardCompleted,
      gabiaoCompleted,
      jardAvgProgress,
      gabiaoAvgProgress,
      totalMetrics,
      totalCompleted,
      overallProgress,
    };
  }, [progress]);

  // Pie chart data for team comparison
  const teamComparisonData = useMemo(() => {
    if (!summary) return [];
    return [
      { name: "Jardinagem", value: summary.jardAvgProgress, fill: "hsl(142 76% 36%)" },
      { name: "Gabião", value: summary.gabiaoAvgProgress, fill: "hsl(45 93% 47%)" },
    ];
  }, [summary]);

  // Radial bar data for overall progress
  const radialData = useMemo(() => {
    if (!summary) return [];
    return [
      { 
        name: "Progresso Geral", 
        value: summary.overallProgress, 
        fill: summary.overallProgress >= 80 
          ? "hsl(142 76% 36%)" 
          : summary.overallProgress >= 50 
          ? "hsl(45 93% 47%)" 
          : "hsl(0 84% 60%)" 
      },
    ];
  }, [summary]);

  const isLoading = isLoadingGoal || isLoadingProgress;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!goal || !progress) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Target className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Nenhuma meta definida</h3>
          <p className="text-muted-foreground text-sm mt-1">
            Defina as metas para o período atual abaixo.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Summary Card */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-full bg-primary/20 flex items-center justify-center">
                <Trophy className="h-7 w-7 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Dashboard de Metas</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Período: {periodLabel}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isNearClose && (
                <Badge variant="destructive" className="animate-pulse gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {daysUntilClose} dias para o fechamento
                </Badge>
              )}
              <Badge 
                variant={summary?.overallProgress && summary.overallProgress >= 80 ? "default" : "secondary"}
                className="text-lg px-4 py-1"
              >
                {summary?.overallProgress.toFixed(0)}% Concluído
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Metas Atingidas */}
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium text-muted-foreground">Metas Atingidas</span>
              </div>
              <p className="text-3xl font-bold text-green-600">
                {summary?.totalCompleted} / {summary?.totalMetrics}
              </p>
            </div>

            {/* Progresso Jardinagem */}
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <div className="flex items-center gap-2 mb-2">
                <Leaf className="h-5 w-5 text-emerald-500" />
                <span className="text-sm font-medium text-muted-foreground">Jardinagem</span>
              </div>
              <p className="text-3xl font-bold text-emerald-600">
                {summary?.jardAvgProgress.toFixed(0)}%
              </p>
              <p className="text-xs text-muted-foreground">
                {summary?.jardCompleted}/{summary?.jardMetrics.length} metas
              </p>
            </div>

            {/* Progresso Gabião */}
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-center gap-2 mb-2">
                <Wrench className="h-5 w-5 text-amber-500" />
                <span className="text-sm font-medium text-muted-foreground">Gabião</span>
              </div>
              <p className="text-3xl font-bold text-amber-600">
                {summary?.gabiaoAvgProgress.toFixed(0)}%
              </p>
              <p className="text-xs text-muted-foreground">
                {summary?.gabiaoCompleted}/{summary?.gabiaoMetrics.length} metas
              </p>
            </div>

            {/* Dias Restantes */}
            <div className={`p-4 rounded-lg ${
              daysUntilClose <= 5 
                ? "bg-red-500/10 border border-red-500/30" 
                : "bg-blue-500/10 border border-blue-500/30"
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <Calendar className={`h-5 w-5 ${daysUntilClose <= 5 ? "text-red-500" : "text-blue-500"}`} />
                <span className="text-sm font-medium text-muted-foreground">Dias Restantes</span>
              </div>
              <p className={`text-3xl font-bold ${daysUntilClose <= 5 ? "text-red-600" : "text-blue-600"}`}>
                {daysUntilClose}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radial Progress Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Progresso Geral do Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart 
                  cx="50%" 
                  cy="50%" 
                  innerRadius="60%" 
                  outerRadius="90%" 
                  data={radialData}
                  startAngle={180}
                  endAngle={0}
                >
                  <RadialBar
                    background={{ fill: "hsl(var(--muted))" }}
                    dataKey="value"
                    cornerRadius={10}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`${value.toFixed(1)}%`, "Progresso"]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <div className="text-center mt-[-100px]">
              <p className="text-4xl font-bold">{summary?.overallProgress.toFixed(0)}%</p>
              <p className="text-sm text-muted-foreground">Progresso Total</p>
            </div>
          </CardContent>
        </Card>

        {/* Team Comparison Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Comparativo por Equipe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={teamComparisonData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value.toFixed(0)}%`}
                    labelLine={false}
                  >
                    {teamComparisonData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`${value.toFixed(1)}%`, "Progresso"]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Jardinagem Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Leaf className="h-5 w-5 text-emerald-500" />
              Métricas de Jardinagem
            </CardTitle>
            <CardDescription>
              {summary?.jardCompleted} de {summary?.jardMetrics.length} metas atingidas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {progress.rocagem_m2.target > 0 && (
                <MetricCard
                  label="Roçagem"
                  current={progress.rocagem_m2.current}
                  target={progress.rocagem_m2.target}
                  percentage={progress.rocagem_m2.percentage}
                  unit="m²"
                  icon="🌿"
                />
              )}
              {progress.podagem_unidade.target > 0 && (
                <MetricCard
                  label="Podagem"
                  current={progress.podagem_unidade.current}
                  target={progress.podagem_unidade.target}
                  percentage={progress.podagem_unidade.percentage}
                  unit="un"
                  icon="✂️"
                />
              )}
              {progress.coroamento_unidade.target > 0 && (
                <MetricCard
                  label="Coroamento"
                  current={progress.coroamento_unidade.current}
                  target={progress.coroamento_unidade.target}
                  percentage={progress.coroamento_unidade.percentage}
                  unit="un"
                  icon="🌱"
                />
              )}
              {progress.adubagem_unidade.target > 0 && (
                <MetricCard
                  label="Adubagem"
                  current={progress.adubagem_unidade.current}
                  target={progress.adubagem_unidade.target}
                  percentage={progress.adubagem_unidade.percentage}
                  unit="un"
                  icon="💧"
                />
              )}
              {progress.plantio_unidade.target > 0 && (
                <MetricCard
                  label="Plantio"
                  current={progress.plantio_unidade.current}
                  target={progress.plantio_unidade.target}
                  percentage={progress.plantio_unidade.percentage}
                  unit="un"
                  icon="🌳"
                />
              )}
              {progress.controle_invasoras_unidade.target > 0 && (
                <MetricCard
                  label="Controle Invasoras"
                  current={progress.controle_invasoras_unidade.current}
                  target={progress.controle_invasoras_unidade.target}
                  percentage={progress.controle_invasoras_unidade.percentage}
                  unit="un"
                  icon="🚫"
                />
              )}
              {progress.retirada_mudas_unidade.target > 0 && (
                <MetricCard
                  label="Retirada de Mudas"
                  current={progress.retirada_mudas_unidade.current}
                  target={progress.retirada_mudas_unidade.target}
                  percentage={progress.retirada_mudas_unidade.percentage}
                  unit="un"
                  icon="🌲"
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Gabião Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-amber-500" />
              Métricas de Gabião / Conservação
            </CardTitle>
            <CardDescription>
              {summary?.gabiaoCompleted} de {summary?.gabiaoMetrics.length} metas atingidas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {progress.limpeza_canaleta_m.target > 0 && (
                <MetricCard
                  label="Limpeza Canaleta"
                  current={progress.limpeza_canaleta_m.current}
                  target={progress.limpeza_canaleta_m.target}
                  percentage={progress.limpeza_canaleta_m.percentage}
                  unit="m"
                  icon="🚰"
                />
              )}
              {progress.recomposicao_gabiao_m.target > 0 && (
                <MetricCard
                  label="Recomposição Gabião"
                  current={progress.recomposicao_gabiao_m.current}
                  target={progress.recomposicao_gabiao_m.target}
                  percentage={progress.recomposicao_gabiao_m.percentage}
                  unit="m"
                  icon="🧱"
                />
              )}
              {progress.manutencao_drenagem_m.target > 0 && (
                <MetricCard
                  label="Manutenção Drenagem"
                  current={progress.manutencao_drenagem_m.current}
                  target={progress.manutencao_drenagem_m.target}
                  percentage={progress.manutencao_drenagem_m.percentage}
                  unit="m"
                  icon="🔧"
                />
              )}
              {progress.escavacao_manual_unidade.target > 0 && (
                <MetricCard
                  label="Escavação Manual"
                  current={progress.escavacao_manual_unidade.current}
                  target={progress.escavacao_manual_unidade.target}
                  percentage={progress.escavacao_manual_unidade.percentage}
                  unit="un"
                  icon="⛏️"
                />
              )}
              {progress.reposicao_manta_unidade.target > 0 && (
                <MetricCard
                  label="Reposição Manta"
                  current={progress.reposicao_manta_unidade.current}
                  target={progress.reposicao_manta_unidade.target}
                  percentage={progress.reposicao_manta_unidade.percentage}
                  unit="un"
                  icon="🛡️"
                />
              )}
              {progress.reposicao_silte_unidade.target > 0 && (
                <MetricCard
                  label="Reposição Silte"
                  current={progress.reposicao_silte_unidade.current}
                  target={progress.reposicao_silte_unidade.target}
                  percentage={progress.reposicao_silte_unidade.percentage}
                  unit="un"
                  icon="🏔️"
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
