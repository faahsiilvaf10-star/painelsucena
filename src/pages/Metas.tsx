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

  // Form state
  const [rocagem, setRocagem] = useState("");
  const [podagem, setPodagem] = useState("");
  const [coroamento, setCoroamento] = useState("");
  const [plantio, setPlantio] = useState("");
  const [controleInvasoras, setControleInvasoras] = useState("");
  const [retiradaMudas, setRetiradaMudas] = useState("");

  // Check access permission - Admin or Planejador
  const hasAccess = authReady && (isAdmin || profile?.cargo === "planejador");

  // Load existing goal when period changes
  useEffect(() => {
    if (goal) {
      setRocagem(goal.rocagem_m2?.toString() || "");
      setPodagem(goal.podagem_unidade?.toString() || "");
      setCoroamento(goal.coroamento_unidade?.toString() || "");
      setPlantio(goal.plantio_unidade?.toString() || "");
      setControleInvasoras(goal.controle_invasoras_unidade?.toString() || "");
      setRetiradaMudas(goal.retirada_mudas_unidade?.toString() || "");
    } else {
      // Reset form for new period
      setRocagem("");
      setPodagem("");
      setCoroamento("");
      setPlantio("");
      setControleInvasoras("");
      setRetiradaMudas("");
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

  // Redirect if no access
  if (!hasAccess) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
          <Target className="h-16 w-16 text-muted-foreground" />
          <h1 className="text-2xl font-bold text-muted-foreground">Acesso Restrito</h1>
          <p className="text-muted-foreground">
            Esta página é visível apenas para Administradores e Planejadores.
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
        rocagem_m2: rocagem ? parseFloat(rocagem) : 0,
        podagem_unidade: podagem ? parseInt(podagem) : 0,
        coroamento_unidade: coroamento ? parseInt(coroamento) : 0,
        plantio_unidade: plantio ? parseInt(plantio) : 0,
        controle_invasoras_unidade: controleInvasoras ? parseInt(controleInvasoras) : 0,
        retirada_mudas_unidade: retiradaMudas ? parseInt(retiradaMudas) : 0,
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
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-amber-600/20 flex items-center justify-center">
              <Target className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Metas de Medição</h1>
              <p className="text-muted-foreground">Defina as metas para cada período (dia 16 a 16)</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Period Selector */}
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[280px]">
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

            {goal && (
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

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-amber-500" />
              Metas do Período
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
              </div>
            )}

            {/* Save Button */}
            <div className="flex justify-end mt-6">
              <Button
                onClick={handleSave}
                disabled={saveGoal.isPending}
                className="gap-2"
                size="lg"
              >
                {saveGoal.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Salvar Metas
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
