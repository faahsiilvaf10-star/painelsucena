import { BarChart3, TrendingUp, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHistoricalGoals } from "@/hooks/useGoals";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = {
  achieved: "hsl(142, 76%, 36%)",
  pending: "hsl(45, 93%, 47%)",
  jardinagem: "hsl(142, 70%, 45%)",
  gabiao: "hsl(24, 95%, 53%)",
};

export function GoalHistoryChart() {
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
          <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nenhum dado histórico disponível</p>
          <p className="text-sm text-muted-foreground">Os gráficos aparecerão quando houver metas definidas</p>
        </CardContent>
      </Card>
    );
  }

  // Prepare data for bar chart
  const barData = historicalData.map((period) => ({
    name: period.periodLabel,
    jardinagem: period.jardinagem.percentage,
    gabiao: period.gabiao.percentage,
  }));

  // Calculate overall statistics for pie chart
  const totalJardAchieved = historicalData.reduce((acc, p) => acc + p.jardinagem.achieved, 0);
  const totalJardTotal = historicalData.reduce((acc, p) => acc + p.jardinagem.total, 0);
  const totalGabiaoAchieved = historicalData.reduce((acc, p) => acc + p.gabiao.achieved, 0);
  const totalGabiaoTotal = historicalData.reduce((acc, p) => acc + p.gabiao.total, 0);

  const pieDataJard = [
    { name: "Atingidas", value: totalJardAchieved, color: COLORS.achieved },
    { name: "Não atingidas", value: Math.max(0, totalJardTotal - totalJardAchieved), color: COLORS.pending },
  ].filter((d) => d.value > 0);

  const pieDataGabiao = [
    { name: "Atingidas", value: totalGabiaoAchieved, color: COLORS.achieved },
    { name: "Não atingidas", value: Math.max(0, totalGabiaoTotal - totalGabiaoAchieved), color: COLORS.pending },
  ].filter((d) => d.value > 0);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover/95 backdrop-blur border rounded-lg shadow-lg p-3">
          <p className="font-medium mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name === "jardinagem" ? "🌿 Jardinagem" : "🧱 Gabião"}: {entry.value.toFixed(0)}%
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Evolução Histórica das Metas</CardTitle>
            <CardDescription>
              Últimos {historicalData.length} períodos de medição
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="bar" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="bar" className="gap-2">
              📊 Barras
            </TabsTrigger>
            <TabsTrigger value="pie" className="gap-2">
              🥧 Pizza
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bar">
            <div className="h-80">
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
                  <Legend 
                    formatter={(value) => value === "jardinagem" ? "🌿 Jardinagem" : "🧱 Gabião"}
                  />
                  <Bar 
                    dataKey="jardinagem" 
                    fill={COLORS.jardinagem} 
                    radius={[4, 4, 0, 0]}
                    name="jardinagem"
                  />
                  <Bar 
                    dataKey="gabiao" 
                    fill={COLORS.gabiao} 
                    radius={[4, 4, 0, 0]}
                    name="gabiao"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="pie">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Jardinagem Pie */}
              <div className="text-center">
                <h4 className="font-semibold mb-4 flex items-center justify-center gap-2">
                  <span>🌿</span> Jardinagem
                </h4>
                {pieDataJard.length > 0 ? (
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieDataJard}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {pieDataJard.map((entry, index) => (
                            <Cell key={`cell-jard-${index}`} fill={entry.color} />
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
                  {totalJardAchieved} de {totalJardTotal} metas atingidas
                </p>
              </div>

              {/* Gabião Pie */}
              <div className="text-center">
                <h4 className="font-semibold mb-4 flex items-center justify-center gap-2">
                  <span>🧱</span> Gabião
                </h4>
                {pieDataGabiao.length > 0 ? (
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieDataGabiao}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {pieDataGabiao.map((entry, index) => (
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
                  {totalGabiaoAchieved} de {totalGabiaoTotal} metas atingidas
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
