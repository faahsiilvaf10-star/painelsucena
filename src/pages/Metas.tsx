import { useState, useEffect } from "react";
import { format, setDate, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Target, Save, Loader2, Calendar, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useIsAdmin } from "@/hooks/useUserRole";
import { useGoalByMonthYear, useSaveGoal, useDeleteGoal, getCurrentMeasurementPeriod } from "@/hooks/useGoals";
import { getBrazilNorthDate } from "@/lib/timezone";
import { JardHistoryChart } from "@/components/goals/JardHistoryChart";
import { GabiaoHistoryChart } from "@/components/goals/GabiaoHistoryChart";
import { GoalsDashboard } from "@/components/goals/GoalsDashboard";
import { DailyTrendChart } from "@/components/goals/DailyTrendChart";
import { PeriodComparison } from "@/components/goals/PeriodComparison";
import { ReadOnlyBanner } from "@/components/ReadOnlyBanner";

// Generate measurement period options (last 12 periods)
const generatePeriodOptions = () => {
  const options = [];
  const today = getBrazilNorthDate();
  
  for (let i = 0; i < 12; i++) {
    const baseDate = subMonths(today, i);
    const startDate = setDate(baseDate, 16);
    const endDate = setDate(addMonths(baseDate, 1), 16);
    const monthYear = format(startDate, "yyyy-MM");
    const label = `${format(startDate, "dd/MM/yyyy")} a ${format(endDate, "dd/MM/yyyy")}`;
    
    options.push({ value: monthYear, label });
  }
  
  return options;
};

export default function Metas() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile, isLoading: isLoadingProfile } = useProfile();
  const { isAdmin, authReady } = useIsAdmin();
  
  const periodOptions = generatePeriodOptions();
  const { monthYear: currentPeriod } = getCurrentMeasurementPeriod();
  const [selectedPeriod, setSelectedPeriod] = useState(currentPeriod);
  
  const { data: goal, isLoading: isLoadingGoal } = useGoalByMonthYear(selectedPeriod);
  const saveGoal = useSaveGoal();
  const deleteGoal = useDeleteGoal();

  // Jardinagem form state
  const [rocagem, setRocagem] = useState("");
  const [podagem, setPodagem] = useState("");
  const [coroamento, setCoroamento] = useState("");
  const [adubagem, setAdubagem] = useState("");
  const [plantio, setPlantio] = useState("");
  const [controleInvasoras, setControleInvasoras] = useState("");
  const [retiradaMudas, setRetiradaMudas] = useState("");
  const [limpezaManual, setLimpezaManual] = useState("");
  const [limpezaAssoprador, setLimpezaAssoprador] = useState("");

  // Gabião form state
  const [limpezaCanaleta, setLimpezaCanaleta] = useState("");
  const [recomposicaoGabiao, setRecomposicaoGabiao] = useState("");
  const [manutencaoDrenagem, setManutencaoDrenagem] = useState("");
  const [escavacaoManual, setEscavacaoManual] = useState("");
  const [reposicaoManta, setReposicaoManta] = useState("");
  const [reposicaoSilte, setReposicaoSilte] = useState("");
  const [limpezaBueiro, setLimpezaBueiro] = useState("");
  const [reparoCerca, setReparoCerca] = useState("");

  // Recomposição form state
  const [recomposicaoTela, setRecomposicaoTela] = useState("");
  const [recomposicaoCascalho, setRecomposicaoCascalho] = useState("");
  const [recomposicaoSilteRecomp, setRecomposicaoSilteRecomp] = useState("");

  // Check view permission - Admin, Planejador, Encarregado Geral, Encarregado I, Encarregado II
  const canView = authReady && (
    isAdmin || 
    profile?.cargo === "planejador" || 
    profile?.cargo === "encarregado_geral" || 
    profile?.cargo === "encarregado_i" || 
    profile?.cargo === "encarregado_ii"
  );
  
  // Check edit permission - only Admin, Planejador, Encarregado Geral, Encarregado I, Encarregado II
  const canEdit = authReady && (
    isAdmin || 
    profile?.cargo === "planejador" || 
    profile?.cargo === "encarregado_geral" || 
    profile?.cargo === "encarregado_i" || 
    profile?.cargo === "encarregado_ii"
  );

  // Load existing goal when period changes
  useEffect(() => {
    if (goal) {
      // Jardinagem
      setRocagem(goal.rocagem_m2?.toString() || "");
      setPodagem(goal.podagem_unidade?.toString() || "");
      setCoroamento(goal.coroamento_unidade?.toString() || "");
      setAdubagem(goal.adubagem_unidade?.toString() || "");
      setPlantio(goal.plantio_unidade?.toString() || "");
      setControleInvasoras(goal.controle_invasoras_unidade?.toString() || "");
      setRetiradaMudas(goal.retirada_mudas_unidade?.toString() || "");
      setLimpezaManual(goal.limpeza_manual_m2?.toString() || "");
      setLimpezaAssoprador(goal.limpeza_assoprador_m2?.toString() || "");
      // Gabião
      setLimpezaCanaleta(goal.limpeza_canaleta_m?.toString() || "");
      setRecomposicaoGabiao(goal.recomposicao_gabiao_m?.toString() || "");
      setManutencaoDrenagem(goal.manutencao_drenagem_m?.toString() || "");
      setEscavacaoManual(goal.escavacao_manual_unidade?.toString() || "");
      setReposicaoManta(goal.reposicao_manta_unidade?.toString() || "");
      setReposicaoSilte(goal.reposicao_silte_unidade?.toString() || "");
      setLimpezaBueiro(goal.limpeza_bueiro_unidade?.toString() || "");
      setReparoCerca(goal.reparo_cerca_m?.toString() || "");
      // Recomposição
      setRecomposicaoTela(goal.recomposicao_tela_unidade?.toString() || "");
      setRecomposicaoCascalho(goal.recomposicao_cascalho_unidade?.toString() || "");
      setRecomposicaoSilteRecomp(goal.recomposicao_silte_unidade?.toString() || "");
    } else {
      // Reset form for new period
      setRocagem("");
      setPodagem("");
      setCoroamento("");
      setAdubagem("");
      setPlantio("");
      setControleInvasoras("");
      setRetiradaMudas("");
      setLimpezaManual("");
      setLimpezaAssoprador("");
      setLimpezaCanaleta("");
      setRecomposicaoGabiao("");
      setManutencaoDrenagem("");
      setEscavacaoManual("");
      setReposicaoManta("");
      setReposicaoSilte("");
      setLimpezaBueiro("");
      setReparoCerca("");
      setRecomposicaoTela("");
      setRecomposicaoCascalho("");
      setRecomposicaoSilteRecomp("");
    }
  }, [goal, selectedPeriod]);

  // Show loading while checking permissions
  if (!authReady || isLoadingProfile) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  // Redirect if no view access
  if (!canView) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
          <Target className="h-16 w-16 text-muted-foreground" />
          <h1 className="text-2xl font-bold text-muted-foreground">Acesso Restrito</h1>
          <p className="text-muted-foreground text-center max-w-md">
            Esta página é visível apenas para Administradores, Planejadores, Encarregado Geral, Encarregado I e Encarregado II.
          </p>
          <Button onClick={() => navigate("/")}>Voltar ao Início</Button>
        </div>
      </Layout>
    );
  }

  const selectedPeriodLabel = periodOptions.find(p => p.value === selectedPeriod)?.label || "";

  const handleSave = async () => {
    if (!user) {
      toast.error("Você precisa estar logado para salvar.");
      return;
    }

    try {
      await saveGoal.mutateAsync({
        month_year: selectedPeriod,
        // Jardinagem
        rocagem_m2: rocagem ? parseFloat(rocagem) : 0,
        podagem_unidade: podagem ? parseInt(podagem) : 0,
        coroamento_unidade: coroamento ? parseInt(coroamento) : 0,
        adubagem_unidade: adubagem ? parseInt(adubagem) : 0,
        plantio_unidade: plantio ? parseInt(plantio) : 0,
        controle_invasoras_unidade: controleInvasoras ? parseInt(controleInvasoras) : 0,
        retirada_mudas_unidade: retiradaMudas ? parseInt(retiradaMudas) : 0,
        limpeza_manual_m2: limpezaManual ? parseFloat(limpezaManual) : 0,
        limpeza_assoprador_m2: limpezaAssoprador ? parseFloat(limpezaAssoprador) : 0,
        // Gabião
        limpeza_canaleta_m: limpezaCanaleta ? parseFloat(limpezaCanaleta) : 0,
        recomposicao_gabiao_m: recomposicaoGabiao ? parseFloat(recomposicaoGabiao) : 0,
        manutencao_drenagem_m: manutencaoDrenagem ? parseFloat(manutencaoDrenagem) : 0,
        escavacao_manual_unidade: escavacaoManual ? parseInt(escavacaoManual) : 0,
        reposicao_manta_unidade: reposicaoManta ? parseInt(reposicaoManta) : 0,
        reposicao_silte_unidade: reposicaoSilte ? parseInt(reposicaoSilte) : 0,
        limpeza_bueiro_unidade: limpezaBueiro ? parseInt(limpezaBueiro) : 0,
        reparo_cerca_m: reparoCerca ? parseFloat(reparoCerca) : 0,
        // Recomposição
        recomposicao_tela_unidade: recomposicaoTela ? parseInt(recomposicaoTela) : 0,
        recomposicao_cascalho_unidade: recomposicaoCascalho ? parseInt(recomposicaoCascalho) : 0,
        recomposicao_silte_unidade: recomposicaoSilteRecomp ? parseInt(recomposicaoSilteRecomp) : 0,
      });
      
      toast.success("Metas salvas com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    }
  };

  const handleDelete = async () => {
    if (!goal) return;
    
    if (!confirm("Tem certeza que deseja excluir estas metas?")) return;

    try {
      await deleteGoal.mutateAsync(goal.id);
      toast.success("Metas excluídas!");
    } catch (error: any) {
      toast.error("Erro ao excluir: " + error.message);
    }
  };

  return (
    <Layout>
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Read-only banner */}
        {!canEdit && <ReadOnlyBanner message="Você está visualizando esta página em modo somente leitura. Apenas Administradores, Planejadores e Encarregados podem editar." />}
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-amber-600/20 flex items-center justify-center shrink-0">
              <Target className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold">Metas de Medição</h1>
              <p className="text-sm text-muted-foreground">Metas por período (dia 16 a 16)</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            {/* Period Selector */}
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-full sm:w-[280px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Selecione o período" />
              </SelectTrigger>
              <SelectContent>
                {periodOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                    {option.value === currentPeriod && (
                      <Badge variant="secondary" className="ml-2">Atual</Badge>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {goal && canEdit && (
              <Button
                variant="destructive"
                size="icon"
                onClick={handleDelete}
                disabled={deleteGoal.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Consolidated Dashboard */}
        <GoalsDashboard />

        {/* Period Comparison */}
        <PeriodComparison />

        {/* Daily Trend Chart */}
        <DailyTrendChart />

        {/* Historical Charts - Separate for Jardinagem and Gabião */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <JardHistoryChart />
          <GabiaoHistoryChart />
        </div>

        {/* Form */}
        {/* Jardinagem Goals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-xl">🌿</span>
              Metas de Jardinagem
            </CardTitle>
            <CardDescription>
              Período: {selectedPeriodLabel}
              {selectedPeriod === currentPeriod && (
                <Badge variant="default" className="ml-2">Período Atual</Badge>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingGoal ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Roçagem */}
                <div className="space-y-2">
                  <Label htmlFor="rocagem" className="flex items-center gap-2">
                    <span className="text-lg">🌿</span>
                    ROÇAGEM (m²)
                  </Label>
                  <Input
                    id="rocagem"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={rocagem}
                    onChange={(e) => setRocagem(e.target.value)}
                    className="text-lg"
                  />
                </div>

                {/* Podagem */}
                <div className="space-y-2">
                  <Label htmlFor="podagem" className="flex items-center gap-2">
                    <span className="text-lg">✂️</span>
                    PODAGEM (unidade)
                  </Label>
                  <Input
                    id="podagem"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={podagem}
                    onChange={(e) => setPodagem(e.target.value)}
                    className="text-lg"
                  />
                </div>

                {/* Coroamento */}
                <div className="space-y-2">
                  <Label htmlFor="coroamento" className="flex items-center gap-2">
                    <span className="text-lg">🌱</span>
                    COROAMENTO (unidade)
                  </Label>
                  <Input
                    id="coroamento"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={coroamento}
                    onChange={(e) => setCoroamento(e.target.value)}
                    className="text-lg"
                  />
                </div>

                {/* Adubagem */}
                <div className="space-y-2">
                  <Label htmlFor="adubagem" className="flex items-center gap-2">
                    <span className="text-lg">💧</span>
                    ADUBAGEM (unidade)
                  </Label>
                  <Input
                    id="adubagem"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={adubagem}
                    onChange={(e) => setAdubagem(e.target.value)}
                    className="text-lg"
                  />
                </div>

                {/* Plantio */}
                <div className="space-y-2">
                  <Label htmlFor="plantio" className="flex items-center gap-2">
                    <span className="text-lg">🌳</span>
                    PLANTIO (unidade)
                  </Label>
                  <Input
                    id="plantio"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={plantio}
                    onChange={(e) => setPlantio(e.target.value)}
                    className="text-lg"
                  />
                </div>

                {/* Controle de Invasoras */}
                <div className="space-y-2">
                  <Label htmlFor="controleInvasoras" className="flex items-center gap-2">
                    <span className="text-lg">🚫</span>
                    CONTROLE DE INVASORAS (unidade)
                  </Label>
                  <Input
                    id="controleInvasoras"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={controleInvasoras}
                    onChange={(e) => setControleInvasoras(e.target.value)}
                    className="text-lg"
                  />
                </div>

                {/* Retirada de Mudas */}
                <div className="space-y-2">
                  <Label htmlFor="retiradaMudas" className="flex items-center gap-2">
                    <span className="text-lg">🌲</span>
                    RETIRADA DE MUDAS - ÁRVORES (unidade)
                  </Label>
                  <Input
                    id="retiradaMudas"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={retiradaMudas}
                    onChange={(e) => setRetiradaMudas(e.target.value)}
                    className="text-lg"
                  />
                </div>

                {/* Limpeza Manual */}
                <div className="space-y-2">
                  <Label htmlFor="limpezaManual" className="flex items-center gap-2">
                    <span className="text-lg">🧹</span>
                    LIMPEZA MANUAL (m²)
                  </Label>
                  <Input
                    id="limpezaManual"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={limpezaManual}
                    onChange={(e) => setLimpezaManual(e.target.value)}
                    className="text-lg"
                  />
                </div>

                {/* Limpeza Assoprador */}
                <div className="space-y-2">
                  <Label htmlFor="limpezaAssoprador" className="flex items-center gap-2">
                    <span className="text-lg">💨</span>
                    LIMPEZA ASSOPRADOR (m²)
                  </Label>
                  <Input
                    id="limpezaAssoprador"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={limpezaAssoprador}
                    onChange={(e) => setLimpezaAssoprador(e.target.value)}
                    className="text-lg"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gabião Goals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-xl">🧱</span>
              Metas de Gabião / Conservação
            </CardTitle>
            <CardDescription>
              Período: {selectedPeriodLabel}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingGoal ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Limpeza de Canaleta */}
                <div className="space-y-2">
                  <Label htmlFor="limpezaCanaleta" className="flex items-center gap-2">
                    <span className="text-lg">🚰</span>
                    LIMPEZA DE CANALETA (m)
                  </Label>
                  <Input
                    id="limpezaCanaleta"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={limpezaCanaleta}
                    onChange={(e) => setLimpezaCanaleta(e.target.value)}
                    className="text-lg"
                  />
                </div>

                {/* Recomposição de Gabião */}
                <div className="space-y-2">
                  <Label htmlFor="recomposicaoGabiao" className="flex items-center gap-2">
                    <span className="text-lg">🧱</span>
                    RECOMPOSIÇÃO DE GABIÃO (m)
                  </Label>
                  <Input
                    id="recomposicaoGabiao"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={recomposicaoGabiao}
                    onChange={(e) => setRecomposicaoGabiao(e.target.value)}
                    className="text-lg"
                  />
                </div>

                {/* Manutenção de Drenagem */}
                <div className="space-y-2">
                  <Label htmlFor="manutencaoDrenagem" className="flex items-center gap-2">
                    <span className="text-lg">🔧</span>
                    MANUTENÇÃO DE DRENAGEM (m)
                  </Label>
                  <Input
                    id="manutencaoDrenagem"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={manutencaoDrenagem}
                    onChange={(e) => setManutencaoDrenagem(e.target.value)}
                    className="text-lg"
                  />
                </div>

                {/* Escavação Manual */}
                <div className="space-y-2">
                  <Label htmlFor="escavacaoManual" className="flex items-center gap-2">
                    <span className="text-lg">⛏️</span>
                    ESCAVAÇÃO MANUAL (unidade)
                  </Label>
                  <Input
                    id="escavacaoManual"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={escavacaoManual}
                    onChange={(e) => setEscavacaoManual(e.target.value)}
                    className="text-lg"
                  />
                </div>

                {/* Reposição de Manta Asfáltica */}
                <div className="space-y-2">
                  <Label htmlFor="reposicaoManta" className="flex items-center gap-2">
                    <span className="text-lg">🛤️</span>
                    REPOSIÇÃO DE MANTA ASFÁLTICA (unidade)
                  </Label>
                  <Input
                    id="reposicaoManta"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={reposicaoManta}
                    onChange={(e) => setReposicaoManta(e.target.value)}
                    className="text-lg"
                  />
                </div>

                {/* Reposição de Silte */}
                <div className="space-y-2">
                  <Label htmlFor="reposicaoSilte" className="flex items-center gap-2">
                    <span className="text-lg">🪨</span>
                    REPOSIÇÃO DE SILTE (unidade)
                  </Label>
                  <Input
                    id="reposicaoSilte"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={reposicaoSilte}
                    onChange={(e) => setReposicaoSilte(e.target.value)}
                    className="text-lg"
                  />
                </div>

                {/* Limpeza de Bueiro */}
                <div className="space-y-2">
                  <Label htmlFor="limpezaBueiro" className="flex items-center gap-2">
                    <span className="text-lg">🕳️</span>
                    LIMPEZA DE BUEIRO (unidade)
                  </Label>
                  <Input
                    id="limpezaBueiro"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={limpezaBueiro}
                    onChange={(e) => setLimpezaBueiro(e.target.value)}
                    className="text-lg"
                  />
                </div>

                {/* Reparo de Cerca */}
                <div className="space-y-2">
                  <Label htmlFor="reparoCerca" className="flex items-center gap-2">
                    <span className="text-lg">🚧</span>
                    REPARO DE CERCA (m)
                  </Label>
                  <Input
                    id="reparoCerca"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={reparoCerca}
                    onChange={(e) => setReparoCerca(e.target.value)}
                    className="text-lg"
                  />
                </div>

                {/* Recomposição de Tela */}
                <div className="space-y-2">
                  <Label htmlFor="recomposicaoTela" className="flex items-center gap-2">
                    <span className="text-lg">🔗</span>
                    RECOMPOSIÇÃO DE TELA (unidade)
                  </Label>
                  <Input
                    id="recomposicaoTela"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={recomposicaoTela}
                    onChange={(e) => setRecomposicaoTela(e.target.value)}
                    className="text-lg"
                  />
                </div>

                {/* Recomposição de Cascalho */}
                <div className="space-y-2">
                  <Label htmlFor="recomposicaoCascalho" className="flex items-center gap-2">
                    <span className="text-lg">🪨</span>
                    RECOMPOSIÇÃO DE CASCALHO (unidade)
                  </Label>
                  <Input
                    id="recomposicaoCascalho"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={recomposicaoCascalho}
                    onChange={(e) => setRecomposicaoCascalho(e.target.value)}
                    className="text-lg"
                  />
                </div>

                {/* Recomposição de Silte */}
                <div className="space-y-2">
                  <Label htmlFor="recomposicaoSilteRecomp" className="flex items-center gap-2">
                    <span className="text-lg">🏔️</span>
                    RECOMPOSIÇÃO DE SILTE (unidade)
                  </Label>
                  <Input
                    id="recomposicaoSilteRecomp"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={recomposicaoSilteRecomp}
                    onChange={(e) => setRecomposicaoSilteRecomp(e.target.value)}
                    className="text-lg"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saveGoal.isPending || !canEdit}
            className="gap-2"
            size="lg"
          >
            {saveGoal.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar Todas as Metas
          </Button>
        </div>
      </div>
    </Layout>
  );
}
