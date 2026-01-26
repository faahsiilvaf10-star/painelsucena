import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Leaf, Save, Loader2, Calendar, Trash2, History, ArrowRight, Plus, X, Send } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useIsAdmin } from "@/hooks/useUserRole";
import { 
  useJardinagemReports, 
  useJardinagemReportByDate, 
  useSaveJardinagemReport, 
  useDeleteJardinagemReport 
} from "@/hooks/useJardinagemReports";
import { getBrazilNorthDate, getBrazilNorthTodayString } from "@/lib/timezone";
import { cn } from "@/lib/utils";
import MonthlyReportDialog from "@/components/atividades/MonthlyReportDialog";
import { GoalProgressCard } from "@/components/goals/GoalProgressCard";

interface InvasoraEntry {
  nome: string;
  unidade: string;
}

const FAIXA_OPTIONS = [
  { value: "FAIXA 2", label: "FAIXA 2" },
  { value: "FAIXA 3", label: "FAIXA 3" },
  { value: "FAIXA 4", label: "FAIXA 4" },
];

// Generate berma options from 28 to 56
const BERMA_OPTIONS = Array.from({ length: 29 }, (_, i) => ({
  value: (28 + i).toString(),
  label: `Berma ${28 + i}`,
}));

export default function Atividades() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile, isLoading: isLoadingProfile } = useProfile();
  const { isAdmin, authReady } = useIsAdmin();
  
  const today = getBrazilNorthDate();
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");

  const { data: existingReport, isLoading: isLoadingReport } = useJardinagemReportByDate(selectedDateStr);
  const { data: allReports } = useJardinagemReports();
  const saveReport = useSaveJardinagemReport();
  const deleteReport = useDeleteJardinagemReport();

  // Form state
  const [localFaixa, setLocalFaixa] = useState("FAIXA 2");
  const [rocagem, setRocagem] = useState("");
  const [rocagemBerma, setRocagemBerma] = useState("");
  const [podagem, setPodagem] = useState("");
  const [podagemBerma, setPodagemBerma] = useState("");
  const [coroamento, setCoroamento] = useState("");
  const [coroamentoBerma, setCoroamentoBerma] = useState("");
  const [plantio, setPlantio] = useState("");
  const [plantioBerma, setPlantioBerma] = useState("");
  const [limpezaManual, setLimpezaManual] = useState("");
  const [limpezaManualBerma, setLimpezaManualBerma] = useState("");
  const [limpezaAssoprador, setLimpezaAssoprador] = useState("");
  const [limpezaAssopradorBerma, setLimpezaAssopradorBerma] = useState("");
  const [manutencaoCanteiro, setManutencaoCanteiro] = useState("");
  const [invasoras, setInvasoras] = useState<InvasoraEntry[]>([{ nome: "", unidade: "" }]);
  const [invasorasBerma, setInvasorasBerma] = useState("");
  const [retiradaMudasUnidade, setRetiradaMudasUnidade] = useState("");

  // Helper functions for invasoras
  const addInvasora = () => {
    setInvasoras([...invasoras, { nome: "", unidade: "" }]);
  };

  const removeInvasora = (index: number) => {
    if (invasoras.length > 1) {
      setInvasoras(invasoras.filter((_, i) => i !== index));
    }
  };

  const updateInvasora = (index: number, field: keyof InvasoraEntry, value: string) => {
    const updated = [...invasoras];
    updated[index][field] = value;
    setInvasoras(updated);
  };

  // Parse invasoras from stored data
  const parseInvasorasFromStorage = (nome: string | null, unidade: number | null): InvasoraEntry[] => {
    if (!nome && !unidade) return [{ nome: "", unidade: "" }];
    
    // Check if it's a JSON array
    if (nome && nome.startsWith("[")) {
      try {
        return JSON.parse(nome);
      } catch {
        return [{ nome: nome || "", unidade: unidade?.toString() || "" }];
      }
    }
    
    return [{ nome: nome || "", unidade: unidade?.toString() || "" }];
  };

  // Format invasoras for storage
  const formatInvasorasForStorage = (): { nome: string | undefined; unidade: number | undefined } => {
    const filtered = invasoras.filter(i => i.nome || i.unidade);
    if (filtered.length === 0) return { nome: undefined, unidade: undefined };
    
    if (filtered.length === 1) {
      return {
        nome: filtered[0].nome || undefined,
        unidade: filtered[0].unidade ? parseInt(filtered[0].unidade) : undefined
      };
    }
    
    // Multiple entries: store as JSON and sum units
    const totalUnidade = filtered.reduce((sum, i) => sum + (parseInt(i.unidade) || 0), 0);
    return {
      nome: JSON.stringify(filtered),
      unidade: totalUnidade > 0 ? totalUnidade : undefined
    };
  };

  // Check access permission
  const hasAccess = authReady && (isAdmin || profile?.cargo === "encarregado_i");

  // Load existing report when date changes
  useEffect(() => {
    if (existingReport) {
      setLocalFaixa(existingReport.local_faixa || "FAIXA 2");
      setRocagem(existingReport.rocagem_m2?.toString() || "");
      setRocagemBerma(existingReport.rocagem_berma?.toString() || "");
      setPodagem(existingReport.podagem_unidade?.toString() || "");
      setPodagemBerma(existingReport.podagem_berma?.toString() || "");
      setCoroamento(existingReport.coroamento_unidade?.toString() || "");
      setCoroamentoBerma(existingReport.coroamento_berma?.toString() || "");
      setPlantio(existingReport.plantio_unidade?.toString() || "");
      setPlantioBerma(existingReport.plantio_berma?.toString() || "");
      setLimpezaManual(existingReport.limpeza_manual_m2?.toString() || "");
      setLimpezaManualBerma(existingReport.limpeza_manual_berma?.toString() || "");
      setLimpezaAssoprador(existingReport.limpeza_assoprador_m2?.toString() || "");
      setLimpezaAssopradorBerma(existingReport.limpeza_assoprador_berma?.toString() || "");
      setManutencaoCanteiro(existingReport.manutencao_canteiro || "");
      setInvasoras(parseInvasorasFromStorage(existingReport.controle_invasoras_nome, existingReport.controle_invasoras_unidade));
      setInvasorasBerma(existingReport.controle_invasoras_berma?.toString() || "");
      setRetiradaMudasUnidade(existingReport.retirada_mudas_unidade?.toString() || "");
    } else {
      // Reset form for new date
      setLocalFaixa("FAIXA 2");
      setRocagem("");
      setRocagemBerma("");
      setPodagem("");
      setPodagemBerma("");
      setCoroamento("");
      setCoroamentoBerma("");
      setPlantio("");
      setPlantioBerma("");
      setLimpezaManual("");
      setLimpezaManualBerma("");
      setLimpezaAssoprador("");
      setLimpezaAssopradorBerma("");
      setManutencaoCanteiro("");
      setInvasoras([{ nome: "", unidade: "" }]);
      setInvasorasBerma("");
      setRetiradaMudasUnidade("");
    }
  }, [existingReport, selectedDateStr]);

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
          <Leaf className="h-16 w-16 text-muted-foreground" />
          <h1 className="text-2xl font-bold text-muted-foreground">Acesso Restrito</h1>
          <p className="text-muted-foreground">
            Esta página é visível apenas para Administradores e Encarregado I.
          </p>
          <Button onClick={() => navigate("/")}>Voltar ao Início</Button>
        </div>
      </Layout>
    );
  }

  const formattedDate = format(selectedDate, "dd/MM/yy (EEEE)", { locale: ptBR });
  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  const handleSave = async (redirectToRdo: boolean = false) => {
    if (!user) {
      toast.error("Você precisa estar logado para salvar.");
      return;
    }

    if (!localFaixa) {
      toast.error("Selecione a Faixa.");
      return;
    }

    try {
      const invasorasData = formatInvasorasForStorage();
      await saveReport.mutateAsync({
        report_date: selectedDateStr,
        local_faixa: localFaixa,
        rocagem_m2: rocagem ? parseFloat(rocagem) : undefined,
        rocagem_berma: rocagemBerma ? parseInt(rocagemBerma) : undefined,
        podagem_unidade: podagem ? parseInt(podagem) : undefined,
        podagem_berma: podagemBerma ? parseInt(podagemBerma) : undefined,
        coroamento_unidade: coroamento ? parseInt(coroamento) : undefined,
        coroamento_berma: coroamentoBerma ? parseInt(coroamentoBerma) : undefined,
        plantio_unidade: plantio ? parseInt(plantio) : undefined,
        plantio_berma: plantioBerma ? parseInt(plantioBerma) : undefined,
        limpeza_manual_m2: limpezaManual ? parseFloat(limpezaManual) : undefined,
        limpeza_manual_berma: limpezaManualBerma ? parseInt(limpezaManualBerma) : undefined,
        limpeza_assoprador_m2: limpezaAssoprador ? parseFloat(limpezaAssoprador) : undefined,
        limpeza_assoprador_berma: limpezaAssopradorBerma ? parseInt(limpezaAssopradorBerma) : undefined,
        manutencao_canteiro: manutencaoCanteiro || undefined,
        controle_invasoras_unidade: invasorasData.unidade,
        controle_invasoras_nome: invasorasData.nome,
        controle_invasoras_berma: invasorasBerma ? parseInt(invasorasBerma) : undefined,
        retirada_mudas_unidade: retiradaMudasUnidade ? parseInt(retiradaMudasUnidade) : undefined,
      });
      
      if (redirectToRdo) {
        toast.success("Atividades salvas! Redirecionando para RDO...");
        navigate("/rdo");
      } else {
        toast.success("Atividades salvas com sucesso!");
      }
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    }
  };

  const handleDelete = async () => {
    if (!existingReport) return;
    
    if (!confirm("Tem certeza que deseja excluir este registro?")) return;

    try {
      await deleteReport.mutateAsync(existingReport.id);
      toast.success("Registro excluído!");
    } catch (error: any) {
      toast.error("Erro ao excluir: " + error.message);
    }
  };

  // Get dates with reports for calendar highlighting
  const datesWithReports = allReports?.map((r) => r.report_date) || [];

  const getFaixaLabel = (value: string) => {
    return FAIXA_OPTIONS.find((f) => f.value === value)?.label || value;
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-green-600/20 flex items-center justify-center">
              <Leaf className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Atividades - Jardinagem</h1>
              <p className="text-muted-foreground">{capitalizedDate}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Date Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Calendar className="h-4 w-4" />
                  {format(selectedDate, "dd/MM/yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  locale={ptBR}
                  modifiers={{
                    hasReport: datesWithReports.map((d) => parseISO(d)),
                  }}
                  modifiersStyles={{
                    hasReport: {
                      backgroundColor: "hsl(var(--primary) / 0.2)",
                      fontWeight: "bold",
                    },
                  }}
                />
              </PopoverContent>
            </Popover>

            {/* History Dialog */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <History className="h-4 w-4" />
                  Histórico
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Histórico de Atividades</DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-[400px] pr-4">
                  {allReports?.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum registro salvo ainda.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {allReports?.map((report) => (
                        <button
                          key={report.id}
                          onClick={() => {
                            setSelectedDate(parseISO(report.report_date));
                          }}
                          className={cn(
                            "w-full text-left p-3 rounded-lg border transition-colors",
                            report.report_date === selectedDateStr
                              ? "bg-primary/10 border-primary"
                              : "hover:bg-secondary"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">
                                {format(parseISO(report.report_date), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {getFaixaLabel(report.local_faixa)}
                              </p>
                            </div>
                            <Badge variant="secondary">
                              {getFaixaLabel(report.local_faixa)}
                            </Badge>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </DialogContent>
            </Dialog>

            {/* Monthly Report Dialog */}
            <MonthlyReportDialog
              reports={allReports || []}
              type="jardinagem"
              getLocationLabel={(report) => report.local_faixa || "Sem local"}
              formatReportPreview={(report) => {
                const lines = [];
                if (report.rocagem_m2 && parseFloat(report.rocagem_m2) > 0) {
                  lines.push(`* Roçagem - ${report.rocagem_m2} m²${report.rocagem_berma ? ` (Berma ${report.rocagem_berma})` : ""}`);
                }
                if (report.podagem_unidade && parseInt(report.podagem_unidade) > 0) {
                  lines.push(`* Podagem - ${report.podagem_unidade} unidade(s)${report.podagem_berma ? ` (Berma ${report.podagem_berma})` : ""}`);
                }
                if (report.coroamento_unidade && parseInt(report.coroamento_unidade) > 0) {
                  lines.push(`* Coroamento - ${report.coroamento_unidade} unidade(s)${report.coroamento_berma ? ` (Berma ${report.coroamento_berma})` : ""}`);
                }
                if (report.plantio_unidade && parseInt(report.plantio_unidade) > 0) {
                  lines.push(`* Plantio - ${report.plantio_unidade} unidade(s)${report.plantio_berma ? ` (Berma ${report.plantio_berma})` : ""}`);
                }
                if (report.limpeza_manual_m2 && parseFloat(report.limpeza_manual_m2) > 0) {
                  lines.push(`* Limpeza Manual - ${report.limpeza_manual_m2} m²${report.limpeza_manual_berma ? ` (Berma ${report.limpeza_manual_berma})` : ""}`);
                }
                if (report.limpeza_assoprador_m2 && parseFloat(report.limpeza_assoprador_m2) > 0) {
                  lines.push(`* Limpeza com Assoprador - ${report.limpeza_assoprador_m2} m²${report.limpeza_assoprador_berma ? ` (Berma ${report.limpeza_assoprador_berma})` : ""}`);
                }
                if (report.controle_invasoras_unidade && parseInt(report.controle_invasoras_unidade) > 0) {
                  lines.push(`* Controle de Invasoras${report.controle_invasoras_nome ? ` (${report.controle_invasoras_nome})` : ""} - ${report.controle_invasoras_unidade} unidade(s)`);
                }
                if (report.retirada_mudas_unidade && parseInt(report.retirada_mudas_unidade) > 0) {
                  lines.push(`* Retirada de Mudas - ${report.retirada_mudas_unidade} unidade(s)`);
                }
                if (report.manutencao_canteiro) {
                  lines.push(`* Manutenção de Canteiro: ${report.manutencao_canteiro}`);
                }
                return lines.length > 0 ? lines.join("\n") : "Nenhuma atividade registrada";
              }}
            />

            {existingReport && (
              <Button variant="destructive" size="icon" onClick={handleDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}

            <Button onClick={() => handleSave(false)} disabled={saveReport.isPending} variant="outline">
              {saveReport.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar
            </Button>

            <Button 
              onClick={() => handleSave(true)} 
              disabled={saveReport.isPending}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              {saveReport.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Enviar WhatsApp
            </Button>
          </div>
        </div>

        {isLoadingReport && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Goal Progress Card - Only Jardinagem */}
        <GoalProgressCard type="jardinagem" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Leaf className="h-5 w-5 text-green-500" />
                Relatório de Atividades
              </CardTitle>
              <CardDescription>
                Preencha os dados das atividades de jardinagem do dia. 
                Estes dados serão enviados automaticamente para o RDO.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Local/Faixa */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">📍 Local - FAIXA</Label>
                <Select value={localFaixa} onValueChange={setLocalFaixa}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a faixa" />
                  </SelectTrigger>
                  <SelectContent>
                    {FAIXA_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Activity Fields */}
              <div className="space-y-4">
                {/* Roçagem */}
                <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="space-y-2">
                    <Label>ROÇAGEM (m²)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={rocagem}
                      onChange={(e) => setRocagem(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Berma</Label>
                    <Select value={rocagemBerma} onValueChange={setRocagemBerma}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {BERMA_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Podagem */}
                <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="space-y-2">
                    <Label>PODAGEM (Unidade)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={podagem}
                      onChange={(e) => setPodagem(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Berma</Label>
                    <Select value={podagemBerma} onValueChange={setPodagemBerma}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {BERMA_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Coroamento */}
                <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="space-y-2">
                    <Label>COROAMENTO (Unidade)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={coroamento}
                      onChange={(e) => setCoroamento(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Berma</Label>
                    <Select value={coroamentoBerma} onValueChange={setCoroamentoBerma}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {BERMA_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Plantio */}
                <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="space-y-2">
                    <Label>PLANTIO (Unidade)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={plantio}
                      onChange={(e) => setPlantio(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Berma</Label>
                    <Select value={plantioBerma} onValueChange={setPlantioBerma}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {BERMA_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Limpeza Manual */}
                <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="space-y-2">
                    <Label>LIMPEZA MANUAL (m²)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={limpezaManual}
                      onChange={(e) => setLimpezaManual(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Berma</Label>
                    <Select value={limpezaManualBerma} onValueChange={setLimpezaManualBerma}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {BERMA_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Limpeza com Assoprador */}
                <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="space-y-2">
                    <Label>LIMPEZA COM ASSOPRADOR (m²)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={limpezaAssoprador}
                      onChange={(e) => setLimpezaAssoprador(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Berma</Label>
                    <Select value={limpezaAssopradorBerma} onValueChange={setLimpezaAssopradorBerma}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {BERMA_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Invasoras Fields */}
              <div className="space-y-3 p-3 rounded-lg bg-muted/30">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <Label className="text-base font-semibold">🌿 CONTROLE DE INVASORAS</Label>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-muted-foreground">Berma:</Label>
                      <Select value={invasorasBerma} onValueChange={setInvasorasBerma}>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {BERMA_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addInvasora}
                      className="gap-1"
                    >
                      <Plus className="h-4 w-4" />
                      Adicionar mais
                    </Button>
                  </div>
                </div>
                
                {invasoras.map((invasora, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_120px_auto] gap-2 items-end p-3 rounded-lg bg-background/50">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Nome da Invasora</Label>
                      <Input
                        type="text"
                        value={invasora.nome}
                        onChange={(e) => updateInvasora(index, "nome", e.target.value)}
                        placeholder="Ex: Capim-colonião, Braquiária..."
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Unidade</Label>
                      <Input
                        type="number"
                        min="0"
                        value={invasora.unidade}
                        onChange={(e) => updateInvasora(index, "unidade", e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    {invasoras.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeInvasora(index)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    {invasoras.length === 1 && (
                      <div className="w-10" /> 
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label>RETIRADA DE MUDAS - ÁRVORES (Unidade)</Label>
                <Input
                  type="number"
                  min="0"
                  value={retiradaMudasUnidade}
                  onChange={(e) => setRetiradaMudasUnidade(e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label>MANUTENÇÃO DE CANTEIRO</Label>
                <Textarea
                  value={manutencaoCanteiro}
                  onChange={(e) => setManutencaoCanteiro(e.target.value)}
                  placeholder="Descreva as atividades de manutenção de canteiro..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Summary Preview */}
          <Card className="h-fit lg:sticky lg:top-4">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                📋 Resumo para RDO
                {existingReport && (
                  <Badge variant="secondary">Salvo</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Esta prévia mostra como os dados aparecerão no RDO
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-lg space-y-2 font-mono text-sm">
                <p className="font-bold">📍 Local: {getFaixaLabel(localFaixa)}</p>
                <div className="border-t pt-2 mt-2 space-y-1">
                  {rocagem && parseFloat(rocagem) > 0 && (
                    <p>* Roçagem - {rocagem} m²{rocagemBerma && ` (Berma ${rocagemBerma})`}</p>
                  )}
                  {podagem && parseInt(podagem) > 0 && (
                    <p>* Podagem - {podagem} unidade(s){podagemBerma && ` (Berma ${podagemBerma})`}</p>
                  )}
                  {coroamento && parseInt(coroamento) > 0 && (
                    <p>* Coroamento - {coroamento} unidade(s){coroamentoBerma && ` (Berma ${coroamentoBerma})`}</p>
                  )}
                  {plantio && parseInt(plantio) > 0 && (
                    <p>* Plantio - {plantio} unidade(s){plantioBerma && ` (Berma ${plantioBerma})`}</p>
                  )}
                  {limpezaManual && parseFloat(limpezaManual) > 0 && (
                    <p>* Limpeza Manual - {limpezaManual} m²{limpezaManualBerma && ` (Berma ${limpezaManualBerma})`}</p>
                  )}
                  {limpezaAssoprador && parseFloat(limpezaAssoprador) > 0 && (
                    <p>* Limpeza com Assoprador - {limpezaAssoprador} m²{limpezaAssopradorBerma && ` (Berma ${limpezaAssopradorBerma})`}</p>
                  )}
                  {invasoras.some(i => i.unidade && parseInt(i.unidade) > 0) && (
                    invasoras.filter(i => i.unidade && parseInt(i.unidade) > 0).map((inv, idx) => (
                      <p key={idx}>* Controle de Invasoras{inv.nome ? ` (${inv.nome})` : ""} - {inv.unidade} unidade(s){invasorasBerma && ` (Berma ${invasorasBerma})`}</p>
                    ))
                  )}
                  {retiradaMudasUnidade && parseInt(retiradaMudasUnidade) > 0 && (
                    <p>* Retirada de Mudas (Árvores) - {retiradaMudasUnidade} unidade(s)</p>
                  )}
                  {manutencaoCanteiro && (
                    <p>* Manutenção de Canteiro: {manutencaoCanteiro}</p>
                  )}
                  {!rocagem && !podagem && !coroamento && !plantio && !limpezaManual && !limpezaAssoprador && !invasoras.some(i => i.unidade && parseInt(i.unidade) > 0) && !retiradaMudasUnidade && !manutencaoCanteiro && (
                    <p className="text-muted-foreground italic">Nenhuma atividade preenchida</p>
                  )}
                </div>
              </div>

              <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-sm text-green-600 dark:text-green-400">
                  💡 Os dados preenchidos aqui serão automaticamente incluídos na seção "Jardinagem" do RDO.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
