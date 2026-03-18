// @ts-nocheck
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, addMonths, subMonths, setDate } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart3, Save, Loader2, ChevronLeft, ChevronRight, Leaf, Hammer, TrendingUp, Target } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useIsAdmin } from "@/hooks/useUserRole";
import {
  useGoals,
  useGoalsHistory,
  useSaveGoals,
  getCurrentMeasurementPeriod,
  JARDINAGEM_SERVICES,
  GABIAO_SERVICES,
  type GoalRecord,
} from "@/hooks/usePlanejamento";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const CHART_COLORS = [
  "hsl(142, 76%, 36%)", // green
  "hsl(217, 91%, 60%)", // blue
  "hsl(45, 93%, 47%)",  // amber
  "hsl(262, 83%, 58%)", // violet
  "hsl(346, 77%, 50%)", // rose
  "hsl(173, 80%, 40%)", // teal
  "hsl(25, 95%, 53%)",  // orange
  "hsl(198, 93%, 60%)", // sky
  "hsl(330, 81%, 60%)", // pink
  "hsl(80, 60%, 45%)",  // lime
  "hsl(291, 47%, 51%)", // purple
];

export default function Planejamento() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { isAdmin } = useIsAdmin();

  const period = getCurrentMeasurementPeriod();
  const [selectedMonthYear, setSelectedMonthYear] = useState(period.monthYear);

  // Navigation between periods
  const navigatePeriod = (direction: "prev" | "next") => {
    const [year, month] = selectedMonthYear.split("-").map(Number);
    const base = new Date(year, month - 1, 16);
    const newDate = direction === "next" ? addMonths(base, 1) : subMonths(base, 1);
    setSelectedMonthYear(format(newDate, "yyyy-MM"));
  };

  const { data: currentGoals, isLoading } = useGoals(selectedMonthYear);
  const { data: history } = useGoalsHistory();
  const saveGoals = useSaveGoals();

  // Determine if user can edit
  const canEdit = useMemo(() => {
    if (isAdmin) return true;
    if (!profile?.cargo) return false;
    return ["planejador", "engenheiro_planejamento"].includes(profile.cargo);
  }, [isAdmin, profile?.cargo]);

  // Form state
  const [formValues, setFormValues] = useState<Record<string, number>>({});
  const [isEditing, setIsEditing] = useState(false);

  const startEditing = () => {
    const values: Record<string, number> = {};
    [...JARDINAGEM_SERVICES, ...GABIAO_SERVICES].forEach((s) => {
      values[s.key] = (currentGoals as any)?.[s.key] ?? 0;
    });
    setFormValues(values);
    setIsEditing(true);
  };

  const handleSave = () => {
    saveGoals.mutate(
      { monthYear: selectedMonthYear, goals: formValues, existingId: currentGoals?.id },
      { onSuccess: () => setIsEditing(false) }
    );
  };

  // Period label
  const [pYear, pMonth] = selectedMonthYear.split("-").map(Number);
  const pStart = new Date(pYear, pMonth - 1, 16);
  const pEnd = setDate(addMonths(pStart, 1), 15);
  const periodLabel = `${format(pStart, "dd/MM/yyyy")} a ${format(pEnd, "dd/MM/yyyy")}`;
  const periodMonthName = format(pStart, "MMMM yyyy", { locale: ptBR });

  // Chart data
  const jardinagemChartData = JARDINAGEM_SERVICES.map((s, i) => ({
    name: s.label,
    meta: (currentGoals as any)?.[s.key] ?? 0,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  })).filter((d) => d.meta > 0);

  const gabiaoChartData = GABIAO_SERVICES.map((s, i) => ({
    name: s.label,
    meta: (currentGoals as any)?.[s.key] ?? 0,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  })).filter((d) => d.meta > 0);

  // History chart data (last 6 periods)
  const historyChartData = useMemo(() => {
    if (!history || history.length === 0) return [];
    return history.slice(0, 6).reverse().map((g) => {
      const [y, m] = g.month_year.split("-").map(Number);
      const d = new Date(y, m - 1, 16);
      return {
        period: format(d, "MMM/yy", { locale: ptBR }),
        jardinagem: JARDINAGEM_SERVICES.reduce((sum, s) => sum + ((g as any)[s.key] || 0), 0),
        gabiao: GABIAO_SERVICES.reduce((sum, s) => sum + ((g as any)[s.key] || 0), 0),
      };
    });
  }, [history]);

  // Total metas
  const totalJardinagem = JARDINAGEM_SERVICES.reduce((sum, s) => sum + ((currentGoals as any)?.[s.key] || 0), 0);
  const totalGabiao = GABIAO_SERVICES.reduce((sum, s) => sum + ((currentGoals as any)?.[s.key] || 0), 0);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100 } },
  };

  return (
    <Layout>
      <div className="space-y-6 p-2 md:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
                <Target className="h-7 w-7 text-primary" />
              </div>
              Planejamento
            </h1>
            <p className="text-muted-foreground mt-1">Metas de produção por período de medição</p>
          </div>

          {/* Period navigator */}
          <div className="flex items-center gap-2 bg-card border rounded-xl px-3 py-2 shadow-sm">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigatePeriod("prev")}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center min-w-[180px]">
              <p className="text-sm font-semibold capitalize">{periodMonthName}</p>
              <p className="text-xs text-muted-foreground">{periodLabel}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigatePeriod("next")}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>

        {/* Summary cards */}
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div variants={itemVariants}>
            <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/20"><Leaf className="h-5 w-5 text-emerald-500" /></div>
                  <div>
                    <p className="text-xs text-muted-foreground">Atividades I</p>
                    <p className="text-2xl font-bold">{totalJardinagem.toLocaleString("pt-BR")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/20"><Hammer className="h-5 w-5 text-amber-500" /></div>
                  <div>
                    <p className="text-xs text-muted-foreground">Atividades II</p>
                    <p className="text-2xl font-bold">{totalGabiao.toLocaleString("pt-BR")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/20"><BarChart3 className="h-5 w-5 text-blue-500" /></div>
                  <div>
                    <p className="text-xs text-muted-foreground">Serviços Ativos</p>
                    <p className="text-2xl font-bold">{jardinagemChartData.length + gabiaoChartData.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Card className="bg-gradient-to-br from-violet-500/10 to-violet-500/5 border-violet-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-violet-500/20"><TrendingUp className="h-5 w-5 text-violet-500" /></div>
                  <div>
                    <p className="text-xs text-muted-foreground">Histórico</p>
                    <p className="text-2xl font-bold">{history?.length || 0} <span className="text-sm font-normal text-muted-foreground">períodos</span></p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Main content */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 md:w-auto md:inline-grid">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="edit">Definir Metas</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <AnimatePresence mode="wait">
              <motion.div key="overview" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Jardinagem chart */}
                <Card className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Leaf className="h-5 w-5 text-emerald-500" />
                      Atividades I — Jardinagem
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {jardinagemChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={jardinagemChartData} layout="vertical" margin={{ left: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                          <XAxis type="number" tick={{ fontSize: 11 }} />
                          <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                          <Tooltip
                            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                            formatter={(value: number) => [value.toLocaleString("pt-BR"), "Meta"]}
                          />
                          <Bar dataKey="meta" radius={[0, 6, 6, 0]} animationDuration={1200} animationEasing="ease-out">
                            {jardinagemChartData.map((entry, i) => (
                              <Cell key={i} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-muted-foreground">Nenhuma meta definida para este período</div>
                    )}
                  </CardContent>
                </Card>

                {/* Gabião chart */}
                <Card className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Hammer className="h-5 w-5 text-amber-500" />
                      Atividades II — Gabião
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {gabiaoChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={gabiaoChartData} layout="vertical" margin={{ left: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                          <XAxis type="number" tick={{ fontSize: 11 }} />
                          <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 11 }} />
                          <Tooltip
                            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                            formatter={(value: number) => [value.toLocaleString("pt-BR"), "Meta"]}
                          />
                          <Bar dataKey="meta" radius={[0, 6, 6, 0]} animationDuration={1200} animationEasing="ease-out">
                            {gabiaoChartData.map((entry, i) => (
                              <Cell key={i} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-muted-foreground">Nenhuma meta definida para este período</div>
                    )}
                  </CardContent>
                </Card>

                {/* Distribution Pie charts */}
                {(jardinagemChartData.length > 0 || gabiaoChartData.length > 0) && (
                  <Card className="lg:col-span-2 overflow-hidden">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Distribuição de Metas</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {jardinagemChartData.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-center mb-2 text-emerald-600">Jardinagem</p>
                            <ResponsiveContainer width="100%" height={250}>
                              <PieChart>
                                <Pie
                                  data={jardinagemChartData}
                                  dataKey="meta"
                                  nameKey="name"
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={90}
                                  innerRadius={40}
                                  paddingAngle={3}
                                  animationDuration={1000}
                                  animationEasing="ease-out"
                                >
                                  {jardinagemChartData.map((entry, i) => (
                                    <Cell key={i} fill={entry.fill} stroke="transparent" />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => value.toLocaleString("pt-BR")} />
                                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                        {gabiaoChartData.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-center mb-2 text-amber-600">Gabião</p>
                            <ResponsiveContainer width="100%" height={250}>
                              <PieChart>
                                <Pie
                                  data={gabiaoChartData}
                                  dataKey="meta"
                                  nameKey="name"
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={90}
                                  innerRadius={40}
                                  paddingAngle={3}
                                  animationDuration={1000}
                                  animationEasing="ease-out"
                                >
                                  {gabiaoChartData.map((entry, i) => (
                                    <Cell key={i} fill={entry.fill} stroke="transparent" />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => value.toLocaleString("pt-BR")} />
                                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            </AnimatePresence>
          </TabsContent>

          {/* Edit Tab */}
          <TabsContent value="edit">
            <AnimatePresence mode="wait">
              <motion.div key="edit" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
                {!canEdit ? (
                  <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                      <Target className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="font-medium">Acesso restrito</p>
                      <p className="text-sm">Somente Planejador, Engenheiro de Planejamento ou Admin podem definir metas.</p>
                    </CardContent>
                  </Card>
                ) : isLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-sm">{periodLabel}</Badge>
                      {!isEditing ? (
                        <Button onClick={startEditing}>{currentGoals ? "Editar Metas" : "Definir Metas"}</Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={() => setIsEditing(false)}>Cancelar</Button>
                          <Button onClick={handleSave} disabled={saveGoals.isPending}>
                            {saveGoals.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                            Salvar
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Jardinagem */}
                      <motion.div variants={containerVariants} initial="hidden" animate="visible">
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-lg">
                              <Leaf className="h-5 w-5 text-emerald-500" />
                              Atividades I — Jardinagem
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {JARDINAGEM_SERVICES.map((service) => (
                              <motion.div key={service.key} variants={itemVariants} className="flex items-center gap-3">
                                <Label className="min-w-[140px] text-sm">{service.label}</Label>
                                <Input
                                  type="number"
                                  min={0}
                                  className="w-28"
                                  disabled={!isEditing}
                                  value={isEditing ? formValues[service.key] ?? 0 : (currentGoals as any)?.[service.key] ?? 0}
                                  onChange={(e) => setFormValues((prev) => ({ ...prev, [service.key]: Number(e.target.value) }))}
                                />
                                <span className="text-xs text-muted-foreground">{service.unit}</span>
                              </motion.div>
                            ))}
                          </CardContent>
                        </Card>
                      </motion.div>

                      {/* Gabião */}
                      <motion.div variants={containerVariants} initial="hidden" animate="visible">
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-lg">
                              <Hammer className="h-5 w-5 text-amber-500" />
                              Atividades II — Gabião
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {GABIAO_SERVICES.map((service) => (
                              <motion.div key={service.key} variants={itemVariants} className="flex items-center gap-3">
                                <Label className="min-w-[140px] text-sm">{service.label}</Label>
                                <Input
                                  type="number"
                                  min={0}
                                  className="w-28"
                                  disabled={!isEditing}
                                  value={isEditing ? formValues[service.key] ?? 0 : (currentGoals as any)?.[service.key] ?? 0}
                                  onChange={(e) => setFormValues((prev) => ({ ...prev, [service.key]: Number(e.target.value) }))}
                                />
                                <span className="text-xs text-muted-foreground">{service.unit}</span>
                              </motion.div>
                            ))}
                          </CardContent>
                        </Card>
                      </motion.div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <AnimatePresence mode="wait">
              <motion.div key="history" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }} className="space-y-6">
                {historyChartData.length > 0 ? (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        Evolução Total de Metas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={historyChartData}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                          <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip
                            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                            formatter={(value: number) => value.toLocaleString("pt-BR")}
                          />
                          <Legend />
                          <Bar
                            dataKey="jardinagem"
                            name="Jardinagem"
                            fill="hsl(142, 76%, 36%)"
                            radius={[4, 4, 0, 0]}
                            animationDuration={1200}
                          />
                          <Bar
                            dataKey="gabiao"
                            name="Gabião"
                            fill="hsl(45, 93%, 47%)"
                            radius={[4, 4, 0, 0]}
                            animationDuration={1200}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                      <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>Nenhum histórico de metas disponível</p>
                    </CardContent>
                  </Card>
                )}

                {/* Historical details */}
                {history && history.length > 0 && (
                  <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {history.map((goal) => {
                      const [gy, gm] = goal.month_year.split("-").map(Number);
                      const gStart = new Date(gy, gm - 1, 16);
                      const gEnd = setDate(addMonths(gStart, 1), 15);
                      const total = [...JARDINAGEM_SERVICES, ...GABIAO_SERVICES].reduce(
                        (s, sv) => s + ((goal as any)[sv.key] || 0), 0
                      );
                      return (
                        <motion.div key={goal.id} variants={itemVariants}>
                          <Card
                            className={`cursor-pointer transition-all hover:shadow-md ${
                              goal.month_year === selectedMonthYear ? "ring-2 ring-primary" : ""
                            }`}
                            onClick={() => setSelectedMonthYear(goal.month_year)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-2">
                                <p className="font-semibold capitalize">{format(gStart, "MMMM yyyy", { locale: ptBR })}</p>
                                <Badge variant="secondary">{total.toLocaleString("pt-BR")}</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {format(gStart, "dd/MM")} a {format(gEnd, "dd/MM/yyyy")}
                              </p>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
