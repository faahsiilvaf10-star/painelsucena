import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useHistoricalGoals } from "@/hooks/useGoals";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, Area, AreaChart } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const COLORS = {
  achieved: "hsl(142, 76%, 36%)",
  pending: "hsl(45, 93%, 47%)",
  primary: "hsl(24, 95%, 53%)",
};

export function GabiaoHistoryChart() {
  const { data: historicalData, isLoading } = useHistoricalGoals();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!historicalData || historicalData.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-64 text-center">
          <span className="text-4xl mb-4">🧱</span>
          <p className="text-muted-foreground">Nenhum dado histórico disponível</p>
          <p className="text-sm text-muted-foreground">Os gráficos aparecerão quando houver metas definidas</p>
        </CardContent>
      </Card>
    );
  }

  // Prepare data for charts
  const barData = historicalData.map((period) => ({
    name: period.periodLabel,
    percentage: period.gabiao.percentage,
    achieved: period.gabiao.achieved,
    total: period.gabiao.total,
  }));

  // Calculate overall statistics for pie chart
  const totalAchieved = historicalData.reduce((acc, p) => acc + p.gabiao.achieved, 0);
  const totalGoals = historicalData.reduce((acc, p) => acc + p.gabiao.total, 0);

  const pieData = [
    { name: "Atingidas", value: totalAchieved, color: COLORS.achieved },
    { name: "Não atingidas", value: Math.max(0, totalGoals - totalAchieved), color: COLORS.pending },
  ].filter((d) => d.value > 0);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover/95 backdrop-blur border rounded-lg shadow-lg p-3">
          <p className="font-medium mb-1">{label}</p>
          <p className="text-sm" style={{ color: COLORS.primary }}>
            🧱 Gabião: {payload[0]?.value?.toFixed(0)}%
          </p>
          {payload[0]?.payload && (
            <p className="text-xs text-muted-foreground mt-1">
              {payload[0].payload.achieved} de {payload[0].payload.total} metas
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border-orange-600/20">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-orange-600/20 flex items-center justify-center">
            <span className="text-xl">🧱</span>
          </div>
          <div>
            <CardTitle className="text-lg">Evolução - Gabião</CardTitle>
            <CardDescription>
              Últimos {historicalData.length} períodos de medição
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="bar" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="bar" className="gap-2">
              📊 Barras
            </TabsTrigger>
            <TabsTrigger value="area" className="gap-2">
              📈 Área
            </TabsTrigger>
            <TabsTrigger value="pie" className="gap-2">
              🥧 Pizza
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bar">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `${value}%`}
                    className="text-muted-foreground"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="percentage" 
                    fill={COLORS.primary} 
                    radius={[4, 4, 0, 0]}
                    name="Gabião"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="area">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `${value}%`}
                    className="text-muted-foreground"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone"
                    dataKey="percentage" 
                    fill={COLORS.primary} 
                    fillOpacity={0.3}
                    stroke={COLORS.primary}
                    strokeWidth={2}
                    name="Gabião"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="pie">
            <div className="flex flex-col items-center">
              {pieData.length > 0 ? (
                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-gab-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} metas`, ""]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-muted-foreground">Sem dados</p>
              )}
              <p className="text-sm text-muted-foreground mt-2">
                {totalAchieved} de {totalGoals} metas atingidas no total
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
