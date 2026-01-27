import { useState, useEffect, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Hammer, Save, Loader2, Calendar, Trash2, History, Send } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useIsAdmin } from "@/hooks/useUserRole";
import { 
  useGabiaoReports, 
  useGabiaoReportByDate, 
  useSaveGabiaoReport, 
  useDeleteGabiaoReport 
} from "@/hooks/useGabiaoReports";
import { getBrazilNorthDate } from "@/lib/timezone";
import { cn } from "@/lib/utils";
import MonthlyReportDialog from "@/components/atividades/MonthlyReportDialog";
import { GoalProgressCard } from "@/components/goals/GoalProgressCard";

const FAIXA_OPTIONS = [
  { value: "FAIXA 2", label: "FAIXA 2" },
  { value: "FAIXA 3", label: "FAIXA 3" },
  { value: "FAIXA 4", label: "FAIXA 4" },
];

// Generate fase options from 1 to 5
const FASE_OPTIONS = Array.from({ length: 5 }, (_, i) => ({
  value: (1 + i).toString(),
  label: `Fase ${1 + i}`,
}));

// Generate elevado options from 28 to 56
const ELEVADO_OPTIONS = Array.from({ length: 29 }, (_, i) => ({
  value: (28 + i).toString(),
  label: `${28 + i}`,
}));

export default function AtividadesII() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile, isLoading: isLoadingProfile } = useProfile();
  const { isAdmin, authReady } = useIsAdmin();
  
  const today = getBrazilNorthDate();
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");

  const { data: existingReport, isLoading: isLoadingReport } = useGabiaoReportByDate(selectedDateStr);
  const { data: allReports } = useGabiaoReports();
  const saveReport = useSaveGabiaoReport();
  const deleteReport = useDeleteGabiaoReport();

  // Measurement period calculation (day 16 to day 15 of next month)
  const getMeasurementPeriod = () => {
    const currentDay = selectedDate.getDate();
    const currentMonth = selectedDate.getMonth();
    const currentYear = selectedDate.getFullYear();
    
    let startDate: Date;
    let endDate: Date;
    
    if (currentDay >= 16) {
      // From day 16 of current month to day 15 of next month
      startDate = new Date(currentYear, currentMonth, 16);
      endDate = new Date(currentYear, currentMonth + 1, 15);
    } else {
      // From day 16 of previous month to day 15 of current month
      startDate = new Date(currentYear, currentMonth - 1, 16);
      endDate = new Date(currentYear, currentMonth, 15);
    }
    
    return { startDate, endDate };
  };

  // Calculate totals for the measurement period by parsing observacoes
  const measurementPeriodTotals = useMemo(() => {
    if (!allReports) return { escavacaoManual: 0, reposicaoManta: 0, reposicaoSilte: 0 };
    
    const { startDate, endDate } = getMeasurementPeriod();
    const startStr = format(startDate, "yyyy-MM-dd");
    const endStr = format(endDate, "yyyy-MM-dd");
    
    const periodReports = allReports.filter(report => {
      return report.report_date >= startStr && report.report_date <= endStr;
    });
    
    const totals = periodReports.reduce((acc, report) => {
      const obs = report.observacoes || "";
      // Count occurrences of each activity type
      const hasEscavacao = obs.includes("Escavação manual") ? 1 : 0;
      const hasManta = obs.includes("Reposição de manta") ? 1 : 0;
      const hasSilte = obs.includes("Reposição de silte") ? 1 : 0;
      
      return {
        escavacaoManual: acc.escavacaoManual + hasEscavacao,
        reposicaoManta: acc.reposicaoManta + hasManta,
        reposicaoSilte: acc.reposicaoSilte + hasSilte,
      };
    }, { escavacaoManual: 0, reposicaoManta: 0, reposicaoSilte: 0 });
    
    return totals;
  }, [allReports, selectedDate]);

  // Form state
  const [localServico, setLocalServico] = useState("FAIXA 2");
  const [fase, setFase] = useState("");
  const [elevado, setElevado] = useState("");
  
  // Activity checkboxes
  const [escavacaoManual, setEscavacaoManual] = useState(false);
  const [reposicaoManta, setReposicaoManta] = useState(false);
  const [mantaDimensao, setMantaDimensao] = useState("");
  const [reposicaoSilte, setReposicaoSilte] = useState(false);
  const [silteQuantidade, setSilteQuantidade] = useState("");
  const [limpezaOrganizacao, setLimpezaOrganizacao] = useState(false);
  
  // New activities
  const [retiradaTela, setRetiradaTela] = useState(false);
  const [retiradaTelaDimensao, setRetiradaTelaDimensao] = useState("");
  const [retiradaCascalho, setRetiradaCascalho] = useState(false);
  const [retiradaCascalhoQuantidade, setRetiradaCascalhoQuantidade] = useState("");
  const [lavagemVertedouro, setLavagemVertedouro] = useState(false);
  const [lavagemBaciasVertedouro, setLavagemBaciasVertedouro] = useState(false);
  const [reposicaoGeotextil, setReposicaoGeotextil] = useState(false);
  const [reposicaoGeotextilDimensao, setReposicaoGeotextilDimensao] = useState("");
  
  // Manual activities text
  const [atividadesManuais, setAtividadesManuais] = useState("");
  const [observacoes, setObservacoes] = useState("");

  // Load existing data when report changes
  useEffect(() => {
    if (existingReport) {
      setLocalServico(existingReport.local_servico || "FAIXA 2");
      // Parse fase from local_servico if it contains "Fase"
      const faseMatch = existingReport.local_servico?.match(/Fase (\d+)/);
      if (faseMatch) {
        setFase(faseMatch[1]);
      } else {
        setFase("");
      }
      // Parse elevado from local_servico if it contains "Elevado"
      const elevadoMatch = existingReport.local_servico?.match(/Elevado (\d+)/);
      if (elevadoMatch) {
        setElevado(elevadoMatch[1]);
      } else {
        setElevado("");
      }
      setObservacoes(existingReport.observacoes || "");
      
      // Parse saved activities from observacoes field (we'll store structured data there)
      // For now, we'll just load the text
      // The structured activities will be parsed from a JSON-like format or markers
    } else {
      // Reset form for new date
      setLocalServico("FAIXA 2");
      setFase("");
      setElevado("");
      setEscavacaoManual(false);
      setReposicaoManta(false);
      setMantaDimensao("");
      setReposicaoSilte(false);
      setSilteQuantidade("");
      setLimpezaOrganizacao(false);
      setRetiradaTela(false);
      setRetiradaTelaDimensao("");
      setRetiradaCascalho(false);
      setRetiradaCascalhoQuantidade("");
      setLavagemVertedouro(false);
      setLavagemBaciasVertedouro(false);
      setReposicaoGeotextil(false);
      setReposicaoGeotextilDimensao("");
      setAtividadesManuais("");
      setObservacoes("");
    }
  }, [existingReport, selectedDateStr]);

  // Check access permissions
  const hasAccess = authReady && (isAdmin || profile?.cargo === "encarregado_ii");

  if (!authReady || isLoadingProfile) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!hasAccess) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <Hammer className="h-16 w-16 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Acesso Restrito</h1>
          <p className="text-muted-foreground mb-4">
            Apenas Administradores e Encarregados II podem acessar esta página.
          </p>
          <Button onClick={() => navigate("/")}>Voltar ao Início</Button>
        </div>
      </Layout>
    );
  }

  const formattedDate = format(selectedDate, "dd/MM/yy (EEEE)", { locale: ptBR });
  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  // Build the combined observacoes to save
  const buildObservacoes = () => {
    const lines: string[] = [];
    
    if (escavacaoManual) {
      lines.push("* Escavação manual");
    }
    if (reposicaoManta) {
      lines.push(`* Reposição de manta asfáltica${mantaDimensao ? ` - ${mantaDimensao}` : ""}`);
    }
    if (reposicaoSilte) {
      lines.push(`* Reposição de silte${silteQuantidade ? ` - ${silteQuantidade} m²` : ""}`);
    }
    if (limpezaOrganizacao) {
      lines.push("* Limpeza e organização");
    }
    if (retiradaTela) {
      lines.push(`* Retirada de tela${retiradaTelaDimensao ? ` - ${retiradaTelaDimensao}` : ""}`);
    }
    if (retiradaCascalho) {
      lines.push(`* Retirada de cascalho${retiradaCascalhoQuantidade ? ` - ${retiradaCascalhoQuantidade} m²` : ""}`);
    }
    if (lavagemVertedouro) {
      lines.push("* Lavagem de vertedouro");
    }
    if (lavagemBaciasVertedouro) {
      lines.push("* Lavagem de bacias do vertedouro");
    }
    if (reposicaoGeotextil) {
      lines.push(`* Reposição de Geotêxtil${reposicaoGeotextilDimensao ? ` - ${reposicaoGeotextilDimensao}` : ""}`);
    }
    
    if (atividadesManuais.trim()) {
      lines.push("");
      lines.push(atividadesManuais.trim());
    }
    
    if (observacoes.trim()) {
      lines.push("");
      lines.push(`Obs: ${observacoes.trim()}`);
    }
    
    return lines.join("\n");
  };

  const handleSave = async (redirectToRdo: boolean = false) => {
    if (!user) {
      toast.error("Você precisa estar logado para salvar.");
      return;
    }

    if (!localServico) {
      toast.error("Selecione o Local do Serviço.");
      return;
    }

    const combinedObservacoes = buildObservacoes();
    
    // Build local servico with fase and elevado if selected
    let fullLocalServico = localServico;
    if (fase) {
      fullLocalServico += ` - Fase ${fase}`;
    }
    if (elevado) {
      fullLocalServico += ` - Elevado ${elevado}`;
    }

    try {
      await saveReport.mutateAsync({
        report_date: selectedDateStr,
        local_servico: fullLocalServico,
        observacoes: combinedObservacoes || undefined,
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

  // Generate preview
  const getPreviewText = () => {
    const lines: string[] = [];
    
    if (escavacaoManual) {
      lines.push("* Escavação manual");
    }
    if (reposicaoManta) {
      lines.push(`* Reposição de manta asfáltica${mantaDimensao ? ` - ${mantaDimensao}` : ""}`);
    }
    if (reposicaoSilte) {
      lines.push(`* Reposição de silte${silteQuantidade ? ` - ${silteQuantidade} m²` : ""}`);
    }
    if (limpezaOrganizacao) {
      lines.push("* Limpeza e organização");
    }
    if (retiradaTela) {
      lines.push(`* Retirada de tela${retiradaTelaDimensao ? ` - ${retiradaTelaDimensao}` : ""}`);
    }
    if (retiradaCascalho) {
      lines.push(`* Retirada de cascalho${retiradaCascalhoQuantidade ? ` - ${retiradaCascalhoQuantidade} m²` : ""}`);
    }
    if (lavagemVertedouro) {
      lines.push("* Lavagem de vertedouro");
    }
    if (lavagemBaciasVertedouro) {
      lines.push("* Lavagem de bacias do vertedouro");
    }
    if (reposicaoGeotextil) {
      lines.push(`* Reposição de Geotêxtil${reposicaoGeotextilDimensao ? ` - ${reposicaoGeotextilDimensao}` : ""}`);
    }
    
    if (atividadesManuais.trim()) {
      atividadesManuais.trim().split("\n").forEach(line => {
        if (line.trim()) {
          lines.push(`* ${line.trim()}`);
        }
      });
    }
    
    return lines;
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-orange-600/20 flex items-center justify-center">
              <Hammer className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Atividades II - Gabião</h1>
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
                  <DialogTitle>Histórico de Atividades - Gabião</DialogTitle>
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
                                {report.local_servico}
                              </p>
                            </div>
                            <Badge variant="secondary">
                              {report.local_servico}
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
              type="gabiao"
              getLocationLabel={(report) => report.local_servico || "Sem local"}
              formatReportPreview={(report) => {
                return report.observacoes || "Nenhuma atividade registrada";
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
              className="gap-2 bg-orange-600 hover:bg-orange-700"
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

        {/* Measurement Period Summary */}
        {(() => {
          const { startDate, endDate } = getMeasurementPeriod();
          const measurementPeriodLabel = `${format(startDate, "dd/MM/yyyy")} a ${format(endDate, "dd/MM/yyyy")}`;
          return (
            <Card className="border-orange-500/30 bg-orange-500/5">
              <CardContent className="py-3 px-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-medium">Período de Medição Atual:</span>
                    <Badge variant="outline" className="border-orange-500/50 text-orange-500 font-semibold">
                      {measurementPeriodLabel}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>⛏️ Escavação: <strong className="text-foreground">{measurementPeriodTotals.escavacaoManual}</strong></span>
                    <span>🧱 Manta: <strong className="text-foreground">{measurementPeriodTotals.reposicaoManta}</strong></span>
                    <span>🏗️ Silte: <strong className="text-foreground">{measurementPeriodTotals.reposicaoSilte}</strong></span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Goal Progress Card - Only Gabião */}
        <GoalProgressCard type="gabiao" />

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hammer className="h-5 w-5 text-orange-500" />
                Registro de Atividades - Gabião
              </CardTitle>
              <CardDescription>
                Selecione as atividades realizadas e/ou escreva manualmente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Local Selection */}
              <div className="space-y-4">
                <Label>📍 LOCAL DO SERVIÇO</Label>
                <div className="flex flex-wrap gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Faixa</Label>
                    <Select value={localServico} onValueChange={setLocalServico}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Selecione" />
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
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Fase</Label>
                    <Select value={fase || "none"} onValueChange={(val) => setFase(val === "none" ? "" : val)}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma</SelectItem>
                        {FASE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Elevado</Label>
                    <Select value={elevado || "none"} onValueChange={(val) => setElevado(val === "none" ? "" : val)}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {ELEVADO_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            Elevado {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Activity Checkboxes */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">📋 ATIVIDADES</Label>
                
                {/* Escavação manual */}
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/30">
                  <Checkbox 
                    id="escavacao" 
                    checked={escavacaoManual}
                    onCheckedChange={(checked) => setEscavacaoManual(checked === true)}
                  />
                  <Label htmlFor="escavacao" className="cursor-pointer font-medium">
                    Escavação manual
                  </Label>
                </div>

                {/* Reposição de manta asfáltica */}
                <div className="p-3 rounded-lg bg-muted/30 space-y-3">
                  <div className="flex items-center space-x-3">
                    <Checkbox 
                      id="manta" 
                      checked={reposicaoManta}
                      onCheckedChange={(checked) => setReposicaoManta(checked === true)}
                    />
                    <Label htmlFor="manta" className="cursor-pointer font-medium">
                      Reposição de manta asfáltica
                    </Label>
                  </div>
                  {reposicaoManta && (
                    <div className="flex items-center gap-2 ml-7">
                      <Button
                        type="button"
                        variant={mantaDimensao === "10 x 3" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setMantaDimensao(mantaDimensao === "10 x 3" ? "" : "10 x 3")}
                      >
                        10 x 3
                      </Button>
                      <span className="text-sm text-muted-foreground">ou</span>
                      <Input
                        type="text"
                        placeholder="Dimensão personalizada"
                        value={mantaDimensao !== "10 x 3" ? mantaDimensao : ""}
                        onChange={(e) => setMantaDimensao(e.target.value)}
                        className="w-[180px]"
                      />
                    </div>
                  )}
                </div>

                {/* Reposição de silte */}
                <div className="p-3 rounded-lg bg-muted/30 space-y-3">
                  <div className="flex items-center space-x-3">
                    <Checkbox 
                      id="silte" 
                      checked={reposicaoSilte}
                      onCheckedChange={(checked) => setReposicaoSilte(checked === true)}
                    />
                    <Label htmlFor="silte" className="cursor-pointer font-medium">
                      Reposição de silte
                    </Label>
                  </div>
                  {reposicaoSilte && (
                    <div className="flex items-center gap-2 ml-7">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Quantidade"
                        value={silteQuantidade}
                        onChange={(e) => setSilteQuantidade(e.target.value)}
                        className="w-[120px]"
                      />
                      <span className="text-sm font-medium">m²</span>
                    </div>
                  )}
                </div>

                {/* Limpeza e organização */}
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/30">
                  <Checkbox 
                    id="limpeza" 
                    checked={limpezaOrganizacao}
                    onCheckedChange={(checked) => setLimpezaOrganizacao(checked === true)}
                  />
                  <Label htmlFor="limpeza" className="cursor-pointer font-medium">
                    Limpeza e organização
                  </Label>
                </div>

                {/* Retirada de tela */}
                <div className="p-3 rounded-lg bg-muted/30 space-y-3">
                  <div className="flex items-center space-x-3">
                    <Checkbox 
                      id="retiradaTela" 
                      checked={retiradaTela}
                      onCheckedChange={(checked) => setRetiradaTela(checked === true)}
                    />
                    <Label htmlFor="retiradaTela" className="cursor-pointer font-medium">
                      Retirada de tela
                    </Label>
                  </div>
                  {retiradaTela && (
                    <div className="flex items-center gap-2 ml-7">
                      <Input
                        type="text"
                        placeholder="Ex: 8 x 8"
                        value={retiradaTelaDimensao}
                        onChange={(e) => setRetiradaTelaDimensao(e.target.value)}
                        className="w-[150px]"
                      />
                    </div>
                  )}
                </div>

                {/* Retirada de cascalho */}
                <div className="p-3 rounded-lg bg-muted/30 space-y-3">
                  <div className="flex items-center space-x-3">
                    <Checkbox 
                      id="retiradaCascalho" 
                      checked={retiradaCascalho}
                      onCheckedChange={(checked) => setRetiradaCascalho(checked === true)}
                    />
                    <Label htmlFor="retiradaCascalho" className="cursor-pointer font-medium">
                      Retirada de cascalho
                    </Label>
                  </div>
                  {retiradaCascalho && (
                    <div className="flex items-center gap-2 ml-7">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Quantidade"
                        value={retiradaCascalhoQuantidade}
                        onChange={(e) => setRetiradaCascalhoQuantidade(e.target.value)}
                        className="w-[120px]"
                      />
                      <span className="text-sm font-medium">m²</span>
                    </div>
                  )}
                </div>

                {/* Lavagem de vertedouro */}
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/30">
                  <Checkbox 
                    id="lavagemVertedouro" 
                    checked={lavagemVertedouro}
                    onCheckedChange={(checked) => setLavagemVertedouro(checked === true)}
                  />
                  <Label htmlFor="lavagemVertedouro" className="cursor-pointer font-medium">
                    Lavagem de vertedouro
                  </Label>
                </div>

                {/* Lavagem de bacias do vertedouro */}
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/30">
                  <Checkbox 
                    id="lavagemBacias" 
                    checked={lavagemBaciasVertedouro}
                    onCheckedChange={(checked) => setLavagemBaciasVertedouro(checked === true)}
                  />
                  <Label htmlFor="lavagemBacias" className="cursor-pointer font-medium">
                    Lavagem de bacias do vertedouro
                  </Label>
                </div>

                {/* Reposição de Geotêxtil */}
                <div className="p-3 rounded-lg bg-muted/30 space-y-3">
                  <div className="flex items-center space-x-3">
                    <Checkbox 
                      id="reposicaoGeotextil" 
                      checked={reposicaoGeotextil}
                      onCheckedChange={(checked) => setReposicaoGeotextil(checked === true)}
                    />
                    <Label htmlFor="reposicaoGeotextil" className="cursor-pointer font-medium">
                      Reposição de Geotêxtil
                    </Label>
                  </div>
                  {reposicaoGeotextil && (
                    <div className="flex items-center gap-2 ml-7">
                      <Input
                        type="text"
                        placeholder="Ex: 8 x 8"
                        value={reposicaoGeotextilDimensao}
                        onChange={(e) => setReposicaoGeotextilDimensao(e.target.value)}
                        className="w-[150px]"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Manual Activities Text */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">✏️ ATIVIDADES MANUAIS</Label>
                <Textarea
                  value={atividadesManuais}
                  onChange={(e) => setAtividadesManuais(e.target.value)}
                  placeholder="Escreva outras atividades realizadas (uma por linha)..."
                  rows={5}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Cada linha será formatada como um item de atividade no relatório.
                </p>
              </div>

              {/* Observações */}
              <div className="space-y-2">
                <Label>📝 OBSERVAÇÕES</Label>
                <Textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Observações adicionais sobre as atividades..."
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
                <p className="font-bold">📍 Local: {getFaixaLabel(localServico)}{elevado ? ` - Elevado ${elevado}` : ""}</p>
                <div className="border-t pt-2 mt-2 space-y-1">
                  {getPreviewText().length > 0 ? (
                    getPreviewText().map((line, idx) => (
                      <p key={idx}>{line}</p>
                    ))
                  ) : (
                    <p className="text-muted-foreground italic">Nenhuma atividade selecionada</p>
                  )}
                  {observacoes && (
                    <p className="mt-2">Obs: {observacoes}</p>
                  )}
                </div>
              </div>

              <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <p className="text-sm text-orange-600 dark:text-orange-400">
                  💡 Os dados preenchidos aqui serão automaticamente incluídos na seção "Gabião" do RDO.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
