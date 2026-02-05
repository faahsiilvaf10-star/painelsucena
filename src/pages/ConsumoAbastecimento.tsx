import { useState } from "react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Droplets, TrendingUp, Truck, Calendar, Loader2 } from "lucide-react";
import { useRefuelingData } from "@/hooks/useRefuelingData";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const POINT_COLORS: Record<string, string> = {
  "Ponto 46": "#06b6d4",
  "Ponto 3C": "#3b82f6",
  "Ponto 3D": "#8b5cf6",
};

const VEHICLE_COLORS = ["#06b6d4", "#3b82f6", "#8b5cf6", "#10b981", "#f59e0b"];

function formatLiters(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}k`;
  }
  return value.toLocaleString("pt-BR");
}

export default function ConsumoAbastecimento() {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());

  const { data, isLoading } = useRefuelingData(selectedYear, selectedMonth);

  const years = Array.from(
    { length: 5 },
    (_, i) => currentDate.getFullYear() - i
  );

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Droplets className="h-6 w-6 text-cyan-500" />
              Consumo de Abastecimento
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Relatório de consumo de água dos caminhões pipa
            </p>
          </div>

          <div className="flex gap-2">
            <Select
              value={selectedMonth.toString()}
              onValueChange={(v) => setSelectedMonth(parseInt(v))}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTH_NAMES.map((name, index) => (
                  <SelectItem key={index} value={index.toString()}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedYear.toString()}
              onValueChange={(v) => setSelectedYear(parseInt(v))}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400">
                <Droplets className="h-4 w-4" />
                <span className="text-xs font-medium">Este Mês</span>
              </div>
              <p className="text-2xl font-bold mt-2">
                {data?.currentMonthRefuelings || 0}
              </p>
              <p className="text-xs text-muted-foreground">
                abastecimentos
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs font-medium">Litros/Mês</span>
              </div>
              <p className="text-2xl font-bold mt-2">
                {formatLiters(data?.currentMonthLiters || 0)}
              </p>
              <p className="text-xs text-muted-foreground">litros</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                <Calendar className="h-4 w-4" />
                <span className="text-xs font-medium">Total Geral</span>
              </div>
              <p className="text-2xl font-bold mt-2">
                {data?.totalRefuelings || 0}
              </p>
              <p className="text-xs text-muted-foreground">
                abastecimentos
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <Truck className="h-4 w-4" />
                <span className="text-xs font-medium">Total Litros</span>
              </div>
              <p className="text-2xl font-bold mt-2">
                {formatLiters(data?.totalLiters || 0)}
              </p>
              <p className="text-xs text-muted-foreground">litros</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quantity by Point */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">
                Quantidade de Abastecimentos por Ponto
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data?.refuelingByPoint && data.refuelingByPoint.some(p => p.count > 0) ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={data.refuelingByPoint}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis 
                      dataKey="point" 
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      formatter={(value: number) => [`${value} abastecimentos`, "Quantidade"]}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {data.refuelingByPoint.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={POINT_COLORS[entry.point] || "#06b6d4"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  <p className="text-sm">Nenhum dado disponível</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Consumption by Vehicle */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">
                Consumo por Veículo (Litros)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data?.refuelingByVehicle && data.refuelingByVehicle.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={data.refuelingByVehicle}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis 
                      dataKey="vehicleName" 
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      tickFormatter={formatLiters}
                    />
                    <Tooltip
                      formatter={(value: number) => [`${value.toLocaleString("pt-BR")} L`, "Consumo"]}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="liters" radius={[4, 4, 0, 0]}>
                      {data.refuelingByVehicle.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={VEHICLE_COLORS[index % VEHICLE_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  <p className="text-sm">Nenhum dado disponível</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Monthly Consumption Chart - Full Width */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">
                Consumo Mensal de Água - Caminhão Pipa ({selectedYear})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data?.monthlyRefueling && data.monthlyRefueling.some(m => m.count > 0) ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.monthlyRefueling}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis 
                      dataKey="monthName" 
                      tick={{ fontSize: 10 }}
                      axisLine={false}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      tickFormatter={formatLiters}
                      label={{ 
                        value: 'Litros', 
                        angle: -90, 
                        position: 'insideLeft',
                        style: { fontSize: 12 }
                      }}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        if (name === "liters") {
                          return [`${value.toLocaleString("pt-BR")} L`, "Consumo"];
                        }
                        return [value, name];
                      }}
                      labelFormatter={(label) => `Mês: ${label}`}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar 
                      dataKey="liters" 
                      fill="#06b6d4" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  <p className="text-sm">Nenhum dado disponível para {selectedYear}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Daily Details Table */}
        {data?.dailyByVehicle && data.dailyByVehicle.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">
                Detalhamento Diário - {MONTH_NAMES[selectedMonth]} {selectedYear}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 font-medium">Data</th>
                      <th className="text-left py-2 px-3 font-medium">Veículo</th>
                      <th className="text-left py-2 px-3 font-medium">Placa</th>
                      <th className="text-center py-2 px-3 font-medium">Qtd.</th>
                      <th className="text-right py-2 px-3 font-medium">Litros</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.dailyByVehicle
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .map((item, index) => (
                        <tr key={index} className="border-b last:border-b-0 hover:bg-muted/50">
                          <td className="py-2 px-3">
                            {format(new Date(item.date + "T12:00:00"), "dd/MM", { locale: ptBR })}
                          </td>
                          <td className="py-2 px-3 font-medium">{item.vehicleName}</td>
                          <td className="py-2 px-3 text-muted-foreground font-mono text-xs">
                            {item.plate}
                          </td>
                          <td className="py-2 px-3 text-center">{item.count}</td>
                          <td className="py-2 px-3 text-right font-medium text-cyan-600 dark:text-cyan-400">
                            {item.liters.toLocaleString("pt-BR")} L
                          </td>
                        </tr>
                      ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/30 font-medium">
                      <td colSpan={3} className="py-2 px-3">Total do Mês</td>
                      <td className="py-2 px-3 text-center">
                        {data.dailyByVehicle.reduce((sum, item) => sum + item.count, 0)}
                      </td>
                      <td className="py-2 px-3 text-right text-cyan-600 dark:text-cyan-400">
                        {data.dailyByVehicle
                          .reduce((sum, item) => sum + item.liters, 0)
                          .toLocaleString("pt-BR")} L
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info */}
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground text-center">
              📊 Cada abastecimento considera <strong>{(data?.litersPerRefuel || 20000).toLocaleString("pt-BR")} litros</strong> de água.
              Os dados são calculados automaticamente com base nos registros do Painel do Motorista.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
