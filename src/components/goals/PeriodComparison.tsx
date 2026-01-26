import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCurrentMeasurementPeriod, useGoalByMonthYear } from "@/hooks/useGoals";
import { format, setDate, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getBrazilNorthDate } from "@/lib/timezone";
import { ArrowUp, ArrowDown, Minus, TrendingUp, Leaf, Mountain } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricComparison {
  name: string;
  icon: string;
  currentValue: number;
  previousValue: number;
  currentTarget: number;
  previousTarget: number;
  unit: string;
}

interface PeriodData {
  jardinagem: MetricComparison[];
  gabiao: MetricComparison[];
  currentPeriodLabel: string;
  previousPeriodLabel: string;
}

// Get previous measurement period
const getPreviousMeasurementPeriod = () => {
  const { startDate } = getCurrentMeasurementPeriod();
  const prevStartDate = subMonths(startDate, 1);
  const prevEndDate = setDate(subMonths(startDate, 0), 16);
  
  return {
    startDate: prevStartDate,
    endDate: prevEndDate,
    monthYear: format(prevStartDate, "yyyy-MM"),
  };
};

export const PeriodComparison = () => {
  const { startDate: currentStart, endDate: currentEnd, monthYear: currentMonthYear } = getCurrentMeasurementPeriod();
  const { startDate: prevStart, endDate: prevEnd, monthYear: prevMonthYear } = getPreviousMeasurementPeriod();
  
  const { data: currentGoal } = useGoalByMonthYear(currentMonthYear);
  const { data: previousGoal } = useGoalByMonthYear(prevMonthYear);

  const { data: comparisonData, isLoading } = useQuery({
    queryKey: ["period-comparison", currentMonthYear, prevMonthYear],
    queryFn: async (): Promise<PeriodData | null> => {
      const currentStartStr = format(currentStart, "yyyy-MM-dd");
      const currentEndStr = format(currentEnd, "yyyy-MM-dd");
      const prevStartStr = format(prevStart, "yyyy-MM-dd");
      const prevEndStr = format(prevEnd, "yyyy-MM-dd");

      // Fetch reports for both periods in parallel
      const [currentJard, currentGabiao, prevJard, prevGabiao] = await Promise.all([
        supabase
          .from("daily_jardinagem_reports")
          .select("*")
          .gte("report_date", currentStartStr)
          .lte("report_date", currentEndStr),
        supabase
          .from("daily_gabiao_reports")
          .select("*")
          .gte("report_date", currentStartStr)
          .lte("report_date", currentEndStr),
        supabase
          .from("daily_jardinagem_reports")
          .select("*")
          .gte("report_date", prevStartStr)
          .lte("report_date", prevEndStr),
        supabase
          .from("daily_gabiao_reports")
          .select("*")
          .gte("report_date", prevStartStr)
          .lte("report_date", prevEndStr),
      ]);

      // Calculate current period jardinagem totals
      const currentJardTotals = {
        rocagem_m2: 0,
        podagem_unidade: 0,
        coroamento_unidade: 0,
        plantio_unidade: 0,
        controle_invasoras_unidade: 0,
        retirada_mudas_unidade: 0,
      };

      currentJard.data?.forEach((report) => {
        currentJardTotals.rocagem_m2 += Number(report.rocagem_m2) || 0;
        currentJardTotals.podagem_unidade += Number(report.podagem_unidade) || 0;
        currentJardTotals.coroamento_unidade += Number(report.coroamento_unidade) || 0;
        currentJardTotals.plantio_unidade += Number(report.plantio_unidade) || 0;
        currentJardTotals.controle_invasoras_unidade += Number(report.controle_invasoras_unidade) || 0;
        currentJardTotals.retirada_mudas_unidade += Number(report.retirada_mudas_unidade) || 0;
      });

      // Calculate previous period jardinagem totals
      const prevJardTotals = {
        rocagem_m2: 0,
        podagem_unidade: 0,
        coroamento_unidade: 0,
        plantio_unidade: 0,
        controle_invasoras_unidade: 0,
        retirada_mudas_unidade: 0,
      };

      prevJard.data?.forEach((report) => {
        prevJardTotals.rocagem_m2 += Number(report.rocagem_m2) || 0;
        prevJardTotals.podagem_unidade += Number(report.podagem_unidade) || 0;
        prevJardTotals.coroamento_unidade += Number(report.coroamento_unidade) || 0;
        prevJardTotals.plantio_unidade += Number(report.plantio_unidade) || 0;
        prevJardTotals.controle_invasoras_unidade += Number(report.controle_invasoras_unidade) || 0;
        prevJardTotals.retirada_mudas_unidade += Number(report.retirada_mudas_unidade) || 0;
      });

      // Calculate current period gabião totals
      const currentGabiaoTotals = {
        limpeza_canaleta_m: 0,
        recomposicao_gabiao_m: 0,
        manutencao_drenagem_m: 0,
      };

      currentGabiao.data?.forEach((report) => {
        currentGabiaoTotals.limpeza_canaleta_m += Number(report.limpeza_canaleta_m) || 0;
        currentGabiaoTotals.recomposicao_gabiao_m += Number(report.recomposicao_gabiao_m) || 0;
        currentGabiaoTotals.manutencao_drenagem_m += Number(report.manutencao_drenagem_m) || 0;
      });

      // Calculate previous period gabião totals
      const prevGabiaoTotals = {
        limpeza_canaleta_m: 0,
        recomposicao_gabiao_m: 0,
        manutencao_drenagem_m: 0,
      };

      prevGabiao.data?.forEach((report) => {
        prevGabiaoTotals.limpeza_canaleta_m += Number(report.limpeza_canaleta_m) || 0;
        prevGabiaoTotals.recomposicao_gabiao_m += Number(report.recomposicao_gabiao_m) || 0;
        prevGabiaoTotals.manutencao_drenagem_m += Number(report.manutencao_drenagem_m) || 0;
      });

      return {
        jardinagem: [
          {
            name: "Roçagem",
            icon: "🌿",
            currentValue: currentJardTotals.rocagem_m2,
            previousValue: prevJardTotals.rocagem_m2,
            currentTarget: currentGoal?.rocagem_m2 || 0,
            previousTarget: previousGoal?.rocagem_m2 || 0,
            unit: "m²",
          },
          {
            name: "Podagem",
            icon: "✂️",
            currentValue: currentJardTotals.podagem_unidade,
            previousValue: prevJardTotals.podagem_unidade,
            currentTarget: currentGoal?.podagem_unidade || 0,
            previousTarget: previousGoal?.podagem_unidade || 0,
            unit: "un",
          },
          {
            name: "Coroamento",
            icon: "🌱",
            currentValue: currentJardTotals.coroamento_unidade,
            previousValue: prevJardTotals.coroamento_unidade,
            currentTarget: currentGoal?.coroamento_unidade || 0,
            previousTarget: previousGoal?.coroamento_unidade || 0,
            unit: "un",
          },
          {
            name: "Plantio",
            icon: "🌳",
            currentValue: currentJardTotals.plantio_unidade,
            previousValue: prevJardTotals.plantio_unidade,
            currentTarget: currentGoal?.plantio_unidade || 0,
            previousTarget: previousGoal?.plantio_unidade || 0,
            unit: "un",
          },
        ],
        gabiao: [
          {
            name: "Limpeza Canaleta",
            icon: "🚰",
            currentValue: currentGabiaoTotals.limpeza_canaleta_m,
            previousValue: prevGabiaoTotals.limpeza_canaleta_m,
            currentTarget: currentGoal?.limpeza_canaleta_m || 0,
            previousTarget: previousGoal?.limpeza_canaleta_m || 0,
            unit: "m",
          },
          {
            name: "Recomp. Gabião",
            icon: "🧱",
            currentValue: currentGabiaoTotals.recomposicao_gabiao_m,
            previousValue: prevGabiaoTotals.recomposicao_gabiao_m,
            currentTarget: currentGoal?.recomposicao_gabiao_m || 0,
            previousTarget: previousGoal?.recomposicao_gabiao_m || 0,
            unit: "m",
          },
          {
            name: "Manut. Drenagem",
            icon: "🔧",
            currentValue: currentGabiaoTotals.manutencao_drenagem_m,
            previousValue: prevGabiaoTotals.manutencao_drenagem_m,
            currentTarget: currentGoal?.manutencao_drenagem_m || 0,
            previousTarget: previousGoal?.manutencao_drenagem_m || 0,
            unit: "m",
          },
        ],
        currentPeriodLabel: `${format(currentStart, "dd/MM", { locale: ptBR })} - ${format(currentEnd, "dd/MM", { locale: ptBR })}`,
        previousPeriodLabel: `${format(prevStart, "dd/MM", { locale: ptBR })} - ${format(prevEnd, "dd/MM", { locale: ptBR })}`,
      };
    },
    enabled: true,
  });

  const renderDiff = (current: number, previous: number) => {
    const diff = current - previous;
    const percentChange = previous > 0 ? ((diff / previous) * 100).toFixed(0) : current > 0 ? "+100" : "0";
    
    if (diff > 0) {
      return (
        <div className="flex items-center gap-1 text-emerald-500">
          <ArrowUp className="h-3 w-3" />
          <span className="text-xs font-medium">+{percentChange}%</span>
        </div>
      );
    } else if (diff < 0) {
      return (
        <div className="flex items-center gap-1 text-red-500">
          <ArrowDown className="h-3 w-3" />
          <span className="text-xs font-medium">{percentChange}%</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 text-muted-foreground">
        <Minus className="h-3 w-3" />
        <span className="text-xs font-medium">0%</span>
      </div>
    );
  };

  const renderMetricCard = (metric: MetricComparison) => {
    const currentPercent = metric.currentTarget > 0 
      ? Math.min((metric.currentValue / metric.currentTarget) * 100, 100) 
      : 0;
    const previousPercent = metric.previousTarget > 0 
      ? Math.min((metric.previousValue / metric.previousTarget) * 100, 100) 
      : 0;

    return (
      <div
        key={metric.name}
        className="p-3 rounded-lg bg-muted/30 border border-border/30 space-y-2"
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium flex items-center gap-1.5">
            <span>{metric.icon}</span>
            {metric.name}
          </span>
          {renderDiff(metric.currentValue, metric.previousValue)}
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="space-y-1">
            <div className="text-muted-foreground">Atual</div>
            <div className="font-semibold text-foreground">
              {metric.currentValue.toLocaleString()} {metric.unit}
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  currentPercent >= 100 ? "bg-emerald-500" : currentPercent >= 70 ? "bg-amber-500" : "bg-red-500"
                )}
                style={{ width: `${currentPercent}%` }}
              />
            </div>
            <div className="text-muted-foreground">{currentPercent.toFixed(0)}% da meta</div>
          </div>
          
          <div className="space-y-1">
            <div className="text-muted-foreground">Anterior</div>
            <div className="font-semibold text-foreground">
              {metric.previousValue.toLocaleString()} {metric.unit}
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  previousPercent >= 100 ? "bg-emerald-500" : previousPercent >= 70 ? "bg-amber-500" : "bg-red-500"
                )}
                style={{ width: `${previousPercent}%` }}
              />
            </div>
            <div className="text-muted-foreground">{previousPercent.toFixed(0)}% da meta</div>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-primary" />
            Comparativo de Períodos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!comparisonData) {
    return null;
  }

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-primary" />
            Comparativo de Períodos
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-xs">
              Atual: {comparisonData.currentPeriodLabel}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Anterior: {comparisonData.previousPeriodLabel}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Jardinagem Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-emerald-600">
            <Leaf className="h-4 w-4" />
            Jardinagem
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {comparisonData.jardinagem.map(renderMetricCard)}
          </div>
        </div>

        {/* Gabião Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-amber-600">
            <Mountain className="h-4 w-4" />
            Gabião / Conservação
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {comparisonData.gabiao.map(renderMetricCard)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
