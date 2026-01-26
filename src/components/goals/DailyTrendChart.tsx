import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCurrentMeasurementPeriod, useGoalByMonthYear } from "@/hooks/useGoals";
import { format, eachDayOfInterval, isBefore, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getBrazilNorthDate } from "@/lib/timezone";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { TrendingUp, Leaf, Mountain } from "lucide-react";

interface DailyData {
  date: string;
  displayDate: string;
  // Jardinagem cumulative
  rocagem_m2: number;
  podagem_unidade: number;
  coroamento_unidade: number;
  plantio_unidade: number;
  controle_invasoras_unidade: number;
  retirada_mudas_unidade: number;
  // Gabião cumulative
  limpeza_canaleta_m: number;
  recomposicao_gabiao_m: number;
  manutencao_drenagem_m: number;
  // Percentages
  jardinagem_percentage: number;
  gabiao_percentage: number;
}

export const DailyTrendChart = () => {
  const { startDate, endDate, monthYear } = getCurrentMeasurementPeriod();
  const { data: goal } = useGoalByMonthYear(monthYear);
  const today = getBrazilNorthDate();

  const { data: trendData, isLoading } = useQuery({
    queryKey: ["daily-trend", monthYear],
    queryFn: async (): Promise<DailyData[]> => {
      if (!goal) return [];

      const startStr = format(startDate, "yyyy-MM-dd");
      const endStr = format(endDate, "yyyy-MM-dd");

      // Fetch all reports in the period
      const [jardResponse, gabiaoResponse] = await Promise.all([
        supabase
          .from("daily_jardinagem_reports")
          .select("*")
          .gte("report_date", startStr)
          .lte("report_date", endStr)
          .order("report_date", { ascending: true }),
        supabase
          .from("daily_gabiao_reports")
          .select("*")
          .gte("report_date", startStr)
          .lte("report_date", endStr)
          .order("report_date", { ascending: true }),
      ]);

      if (jardResponse.error) throw jardResponse.error;
      if (gabiaoResponse.error) throw gabiaoResponse.error;

      // Group reports by date
      const jardByDate: Record<string, typeof jardResponse.data> = {};
      jardResponse.data?.forEach((report) => {
        if (!jardByDate[report.report_date]) {
          jardByDate[report.report_date] = [];
        }
        jardByDate[report.report_date].push(report);
      });

      const gabiaoByDate: Record<string, typeof gabiaoResponse.data> = {};
      gabiaoResponse.data?.forEach((report) => {
        if (!gabiaoByDate[report.report_date]) {
          gabiaoByDate[report.report_date] = [];
        }
        gabiaoByDate[report.report_date].push(report);
      });

      // Generate all days in the period up to today
      const effectiveEndDate = isBefore(today, endDate) ? today : endDate;
      const allDays = eachDayOfInterval({ start: startDate, end: effectiveEndDate });

      // Calculate cumulative values for each day
      const cumulative = {
        rocagem_m2: 0,
        podagem_unidade: 0,
        coroamento_unidade: 0,
        plantio_unidade: 0,
        controle_invasoras_unidade: 0,
        retirada_mudas_unidade: 0,
        limpeza_canaleta_m: 0,
        recomposicao_gabiao_m: 0,
        manutencao_drenagem_m: 0,
      };

      const result: DailyData[] = [];

      for (const day of allDays) {
        const dateStr = format(day, "yyyy-MM-dd");
        
        // Add jardinagem reports for this day
        const jardReports = jardByDate[dateStr] || [];
        jardReports.forEach((report) => {
          cumulative.rocagem_m2 += Number(report.rocagem_m2) || 0;
          cumulative.podagem_unidade += Number(report.podagem_unidade) || 0;
          cumulative.coroamento_unidade += Number(report.coroamento_unidade) || 0;
          cumulative.plantio_unidade += Number(report.plantio_unidade) || 0;
          cumulative.controle_invasoras_unidade += Number(report.controle_invasoras_unidade) || 0;
          cumulative.retirada_mudas_unidade += Number(report.retirada_mudas_unidade) || 0;
        });

        // Add gabião reports for this day
        const gabiaoReports = gabiaoByDate[dateStr] || [];
        gabiaoReports.forEach((report) => {
          cumulative.limpeza_canaleta_m += Number(report.limpeza_canaleta_m) || 0;
          cumulative.recomposicao_gabiao_m += Number(report.recomposicao_gabiao_m) || 0;
          cumulative.manutencao_drenagem_m += Number(report.manutencao_drenagem_m) || 0;
        });

        // Calculate percentages
        const jardGoals = [
          { current: cumulative.rocagem_m2, target: goal.rocagem_m2 },
          { current: cumulative.podagem_unidade, target: goal.podagem_unidade },
          { current: cumulative.coroamento_unidade, target: goal.coroamento_unidade },
          { current: cumulative.plantio_unidade, target: goal.plantio_unidade },
          { current: cumulative.controle_invasoras_unidade, target: goal.controle_invasoras_unidade },
          { current: cumulative.retirada_mudas_unidade, target: goal.retirada_mudas_unidade },
        ].filter(g => g.target > 0);

        const gabiaoGoals = [
          { current: cumulative.limpeza_canaleta_m, target: goal.limpeza_canaleta_m },
          { current: cumulative.recomposicao_gabiao_m, target: goal.recomposicao_gabiao_m },
          { current: cumulative.manutencao_drenagem_m, target: goal.manutencao_drenagem_m },
        ].filter(g => g.target > 0);

        const jardPercentage = jardGoals.length > 0
          ? jardGoals.reduce((sum, g) => sum + Math.min((g.current / g.target) * 100, 100), 0) / jardGoals.length
          : 0;

        const gabiaoPercentage = gabiaoGoals.length > 0
          ? gabiaoGoals.reduce((sum, g) => sum + Math.min((g.current / g.target) * 100, 100), 0) / gabiaoGoals.length
          : 0;

        result.push({
          date: dateStr,
          displayDate: format(day, "dd/MM", { locale: ptBR }),
          ...cumulative,
          jardinagem_percentage: Math.round(jardPercentage * 10) / 10,
          gabiao_percentage: Math.round(gabiaoPercentage * 10) / 10,
        });
      }

      return result;
    },
    enabled: !!goal,
  });

  if (!goal) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-primary" />
            Tendência Diária
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Nenhuma meta definida para o período atual
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-primary" />
            Tendência Diária
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const periodLabel = `${format(startDate, "dd/MM", { locale: ptBR })} - ${format(endDate, "dd/MM", { locale: ptBR })}`;

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-primary" />
            Tendência Diária do Período
          </div>
          <span className="text-sm font-normal text-muted-foreground">
            {periodLabel}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="combined" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="combined">Visão Geral</TabsTrigger>
            <TabsTrigger value="jardinagem" className="flex items-center gap-1">
              <Leaf className="h-3 w-3" />
              Jardinagem
            </TabsTrigger>
            <TabsTrigger value="gabiao" className="flex items-center gap-1">
              <Mountain className="h-3 w-3" />
              Gabião
            </TabsTrigger>
          </TabsList>

          <TabsContent value="combined">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorJard" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorGabiao" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="displayDate" 
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxis 
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                    formatter={(value: number) => [`${value.toFixed(1)}%`, ""]}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="jardinagem_percentage"
                    name="Jardinagem"
                    stroke="hsl(var(--chart-1))"
                    fill="url(#colorJard)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="gabiao_percentage"
                    name="Gabião"
                    stroke="hsl(var(--chart-2))"
                    fill="url(#colorGabiao)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="jardinagem">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="displayDate" 
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="rocagem_m2"
                    name="Roçagem (m²)"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="podagem_unidade"
                    name="Podagem"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="coroamento_unidade"
                    name="Coroamento"
                    stroke="hsl(var(--chart-3))"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="plantio_unidade"
                    name="Plantio"
                    stroke="hsl(var(--chart-4))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="gabiao">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="displayDate" 
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="limpeza_canaleta_m"
                    name="Limpeza Canaleta (m)"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="recomposicao_gabiao_m"
                    name="Recomposição Gabião (m)"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="manutencao_drenagem_m"
                    name="Manutenção Drenagem (m)"
                    stroke="hsl(var(--chart-3))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
