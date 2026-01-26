import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Leaf, Save, Loader2, Calendar, Trash2, History, ArrowRight } from "lucide-react";
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

const FAIXA_OPTIONS = [
  { value: "faixa_2", label: "FAIXA 2" },
  { value: "faixa_3", label: "FAIXA 3" },
  { value: "faixa_4", label: "FAIXA 4" },
];

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
  const [localFaixa, setLocalFaixa] = useState("faixa_2");
  const [rocagem, setRocagem] = useState("");
  const [podagem, setPodagem] = useState("");
  const [coroamento, setCoroamento] = useState("");
  const [plantio, setPlantio] = useState("");
  const [limpezaManual, setLimpezaManual] = useState("");
  const [limpezaAssoprador, setLimpezaAssoprador] = useState("");
  const [manutencaoCanteiro, setManutencaoCanteiro] = useState("");
  const [controleInvasorasUnidade, setControleInvasorasUnidade] = useState("");
  const [controleInvasorasNome, setControleInvasorasNome] = useState("");
  const [retiradaMudasUnidade, setRetiradaMudasUnidade] = useState("");

  // Check access permission
  const hasAccess = authReady && (isAdmin || profile?.cargo === "encarregado_i");

  // Load existing report when date changes
  useEffect(() => {
    if (existingReport) {
      setLocalFaixa(existingReport.local_faixa || "faixa_2");
      setRocagem(existingReport.rocagem_m2?.toString() || "");
      setPodagem(existingReport.podagem_unidade?.toString() || "");
      setCoroamento(existingReport.coroamento_unidade?.toString() || "");
      setPlantio(existingReport.plantio_unidade?.toString() || "");
      setLimpezaManual(existingReport.limpeza_manual_m2?.toString() || "");
      setLimpezaAssoprador(existingReport.limpeza_assoprador_m2?.toString() || "");
      setManutencaoCanteiro(existingReport.manutencao_canteiro || "");
      setControleInvasorasUnidade(existingReport.controle_invasoras_unidade?.toString() || "");
      setControleInvasorasNome(existingReport.controle_invasoras_nome || "");
      setRetiradaMudasUnidade(existingReport.retirada_mudas_unidade?.toString() || "");
    } else {
      // Reset form for new date
      setLocalFaixa("faixa_2");
      setRocagem("");
      setPodagem("");
      setCoroamento("");
      setPlantio("");
      setLimpezaManual("");
      setLimpezaAssoprador("");
      setManutencaoCanteiro("");
      setControleInvasorasUnidade("");
      setControleInvasorasNome("");
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

  const handleSave = async () => {
    if (!user) {
      toast.error("Você precisa estar logado para salvar.");
      return;
    }

    if (!localFaixa) {
      toast.error("Selecione a Faixa.");
      return;
    }

    try {
      await saveReport.mutateAsync({
        report_date: selectedDateStr,
        local_faixa: localFaixa,
        rocagem_m2: rocagem ? parseFloat(rocagem) : undefined,
        podagem_unidade: podagem ? parseInt(podagem) : undefined,
        coroamento_unidade: coroamento ? parseInt(coroamento) : undefined,
        plantio_unidade: plantio ? parseInt(plantio) : undefined,
        limpeza_manual_m2: limpezaManual ? parseFloat(limpezaManual) : undefined,
        limpeza_assoprador_m2: limpezaAssoprador ? parseFloat(limpezaAssoprador) : undefined,
        manutencao_canteiro: manutencaoCanteiro || undefined,
        controle_invasoras_unidade: controleInvasorasUnidade ? parseInt(controleInvasorasUnidade) : undefined,
        controle_invasoras_nome: controleInvasorasNome || undefined,
        retirada_mudas_unidade: retiradaMudasUnidade ? parseInt(retiradaMudasUnidade) : undefined,
      });
      toast.success("Atividades salvas com sucesso!");
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

            {existingReport && (
              <Button variant="destructive" size="icon" onClick={handleDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}

            <Button onClick={handleSave} disabled={saveReport.isPending}>
              {saveReport.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar
            </Button>

            <Button variant="outline" onClick={() => navigate("/rdo")} className="gap-2">
              <ArrowRight className="h-4 w-4" />
              Ir para RDO
            </Button>
          </div>
        </div>

        {isLoadingReport && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>

              {/* New Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CONTROLE DE INVASORAS (Unidade)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={controleInvasorasUnidade}
                    onChange={(e) => setControleInvasorasUnidade(e.target.value)}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label>NOME DA INVASORA</Label>
                  <Input
                    type="text"
                    value={controleInvasorasNome}
                    onChange={(e) => setControleInvasorasNome(e.target.value)}
                    placeholder="Ex: Capim-colonião, Braquiária..."
                  />
                </div>
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
                    <p>* Roçagem - {rocagem} m²</p>
                  )}
                  {podagem && parseInt(podagem) > 0 && (
                    <p>* Podagem - {podagem} unidade(s)</p>
                  )}
                  {coroamento && parseInt(coroamento) > 0 && (
                    <p>* Coroamento - {coroamento} unidade(s)</p>
                  )}
                  {plantio && parseInt(plantio) > 0 && (
                    <p>* Plantio - {plantio} unidade(s)</p>
                  )}
                  {limpezaManual && parseFloat(limpezaManual) > 0 && (
                    <p>* Limpeza Manual - {limpezaManual} m²</p>
                  )}
                  {limpezaAssoprador && parseFloat(limpezaAssoprador) > 0 && (
                    <p>* Limpeza com Assoprador - {limpezaAssoprador} m²</p>
                  )}
                  {controleInvasorasUnidade && parseInt(controleInvasorasUnidade) > 0 && (
                    <p>* Controle de Invasoras{controleInvasorasNome ? ` (${controleInvasorasNome})` : ""} - {controleInvasorasUnidade} unidade(s)</p>
                  )}
                  {retiradaMudasUnidade && parseInt(retiradaMudasUnidade) > 0 && (
                    <p>* Retirada de Mudas (Árvores) - {retiradaMudasUnidade} unidade(s)</p>
                  )}
                  {manutencaoCanteiro && (
                    <p>* Manutenção de Canteiro: {manutencaoCanteiro}</p>
                  )}
                  {!rocagem && !podagem && !coroamento && !plantio && !limpezaManual && !limpezaAssoprador && !controleInvasorasUnidade && !retiradaMudasUnidade && !manutencaoCanteiro && (
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
