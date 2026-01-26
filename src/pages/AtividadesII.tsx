import { useState, useEffect } from "react";
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

  // Form state
  const [localServico, setLocalServico] = useState("FAIXA 2");
  const [limpezaCanaleta, setLimpezaCanaleta] = useState("");
  const [limpezaCaneletaBerma, setLimpezaCaneletaBerma] = useState("");
  const [recomposicaoGabiao, setRecomposicaoGabiao] = useState("");
  const [recomposicaoGabiaoBerma, setRecomposicaoGabiaoBerma] = useState("");
  const [manutencaoDrenagem, setManutencaoDrenagem] = useState("");
  const [manutencaoDrenagemBerma, setManutencaoDrenagemBerma] = useState("");
  const [limpezaBueiro, setLimpezaBueiro] = useState("");
  const [limpezaBueiroBerma, setLimpezaBueiroBerma] = useState("");
  const [reparoCerca, setReparoCerca] = useState("");
  const [reparoCercaBerma, setReparoCercaBerma] = useState("");
  const [observacoes, setObservacoes] = useState("");

  // Load existing data when report changes
  useEffect(() => {
    if (existingReport) {
      setLocalServico(existingReport.local_servico || "FAIXA 2");
      setLimpezaCanaleta(existingReport.limpeza_canaleta_m?.toString() || "");
      setLimpezaCaneletaBerma(existingReport.limpeza_canaleta_berma?.toString() || "");
      setRecomposicaoGabiao(existingReport.recomposicao_gabiao_m?.toString() || "");
      setRecomposicaoGabiaoBerma(existingReport.recomposicao_gabiao_berma?.toString() || "");
      setManutencaoDrenagem(existingReport.manutencao_drenagem_m?.toString() || "");
      setManutencaoDrenagemBerma(existingReport.manutencao_drenagem_berma?.toString() || "");
      setLimpezaBueiro(existingReport.limpeza_bueiro_unidade?.toString() || "");
      setLimpezaBueiroBerma(existingReport.limpeza_bueiro_berma?.toString() || "");
      setReparoCerca(existingReport.reparo_cerca_m?.toString() || "");
      setReparoCercaBerma(existingReport.reparo_cerca_berma?.toString() || "");
      setObservacoes(existingReport.observacoes || "");
    } else {
      // Reset form for new date
      setLocalServico("FAIXA 2");
      setLimpezaCanaleta("");
      setLimpezaCaneletaBerma("");
      setRecomposicaoGabiao("");
      setRecomposicaoGabiaoBerma("");
      setManutencaoDrenagem("");
      setManutencaoDrenagemBerma("");
      setLimpezaBueiro("");
      setLimpezaBueiroBerma("");
      setReparoCerca("");
      setReparoCercaBerma("");
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

  const handleSave = async (redirectToRdo: boolean = false) => {
    if (!user) {
      toast.error("Você precisa estar logado para salvar.");
      return;
    }

    if (!localServico) {
      toast.error("Selecione o Local do Serviço.");
      return;
    }

    try {
      await saveReport.mutateAsync({
        report_date: selectedDateStr,
        local_servico: localServico,
        limpeza_canaleta_m: limpezaCanaleta ? parseFloat(limpezaCanaleta) : undefined,
        limpeza_canaleta_berma: limpezaCaneletaBerma ? parseInt(limpezaCaneletaBerma) : undefined,
        recomposicao_gabiao_m: recomposicaoGabiao ? parseFloat(recomposicaoGabiao) : undefined,
        recomposicao_gabiao_berma: recomposicaoGabiaoBerma ? parseInt(recomposicaoGabiaoBerma) : undefined,
        manutencao_drenagem_m: manutencaoDrenagem ? parseFloat(manutencaoDrenagem) : undefined,
        manutencao_drenagem_berma: manutencaoDrenagemBerma ? parseInt(manutencaoDrenagemBerma) : undefined,
        limpeza_bueiro_unidade: limpezaBueiro ? parseInt(limpezaBueiro) : undefined,
        limpeza_bueiro_berma: limpezaBueiroBerma ? parseInt(limpezaBueiroBerma) : undefined,
        reparo_cerca_m: reparoCerca ? parseFloat(reparoCerca) : undefined,
        reparo_cerca_berma: reparoCercaBerma ? parseInt(reparoCercaBerma) : undefined,
        observacoes: observacoes || undefined,
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
                Preencha as atividades de manutenção de gabião realizadas no dia
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Local Selection */}
              <div className="space-y-2">
                <Label>📍 LOCAL DO SERVIÇO</Label>
                <Select value={localServico} onValueChange={setLocalServico}>
                  <SelectTrigger className="w-full md:w-[300px]">
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
                {/* Limpeza de Canaleta */}
                <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="space-y-2">
                    <Label>LIMPEZA DE CANALETA (m)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={limpezaCanaleta}
                      onChange={(e) => setLimpezaCanaleta(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Berma</Label>
                    <Select value={limpezaCaneletaBerma} onValueChange={setLimpezaCaneletaBerma}>
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

                {/* Recomposição de Gabião */}
                <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="space-y-2">
                    <Label>RECOMPOSIÇÃO DE GABIÃO (m)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={recomposicaoGabiao}
                      onChange={(e) => setRecomposicaoGabiao(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Berma</Label>
                    <Select value={recomposicaoGabiaoBerma} onValueChange={setRecomposicaoGabiaoBerma}>
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

                {/* Manutenção de Drenagem */}
                <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="space-y-2">
                    <Label>MANUTENÇÃO DE DRENAGEM (m)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={manutencaoDrenagem}
                      onChange={(e) => setManutencaoDrenagem(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Berma</Label>
                    <Select value={manutencaoDrenagemBerma} onValueChange={setManutencaoDrenagemBerma}>
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

                {/* Limpeza de Bueiro */}
                <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="space-y-2">
                    <Label>LIMPEZA DE BUEIRO (Unidade)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={limpezaBueiro}
                      onChange={(e) => setLimpezaBueiro(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Berma</Label>
                    <Select value={limpezaBueiroBerma} onValueChange={setLimpezaBueiroBerma}>
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

                {/* Reparo de Cerca */}
                <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="space-y-2">
                    <Label>REPARO DE CERCA (m)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={reparoCerca}
                      onChange={(e) => setReparoCerca(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Berma</Label>
                    <Select value={reparoCercaBerma} onValueChange={setReparoCercaBerma}>
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

              <div className="space-y-2">
                <Label>OBSERVAÇÕES</Label>
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
                <p className="font-bold">📍 Local: {getFaixaLabel(localServico)}</p>
                <div className="border-t pt-2 mt-2 space-y-1">
                  {limpezaCanaleta && parseFloat(limpezaCanaleta) > 0 && (
                    <p>* Limpeza de Canaleta - {limpezaCanaleta} m{limpezaCaneletaBerma && ` (Berma ${limpezaCaneletaBerma})`}</p>
                  )}
                  {recomposicaoGabiao && parseFloat(recomposicaoGabiao) > 0 && (
                    <p>* Recomposição de Gabião - {recomposicaoGabiao} m{recomposicaoGabiaoBerma && ` (Berma ${recomposicaoGabiaoBerma})`}</p>
                  )}
                  {manutencaoDrenagem && parseFloat(manutencaoDrenagem) > 0 && (
                    <p>* Manutenção de Drenagem - {manutencaoDrenagem} m{manutencaoDrenagemBerma && ` (Berma ${manutencaoDrenagemBerma})`}</p>
                  )}
                  {limpezaBueiro && parseInt(limpezaBueiro) > 0 && (
                    <p>* Limpeza de Bueiro - {limpezaBueiro} unidade(s){limpezaBueiroBerma && ` (Berma ${limpezaBueiroBerma})`}</p>
                  )}
                  {reparoCerca && parseFloat(reparoCerca) > 0 && (
                    <p>* Reparo de Cerca - {reparoCerca} m{reparoCercaBerma && ` (Berma ${reparoCercaBerma})`}</p>
                  )}
                  {observacoes && (
                    <p>* Observações: {observacoes}</p>
                  )}
                  {!limpezaCanaleta && !recomposicaoGabiao && !manutencaoDrenagem && !limpezaBueiro && !reparoCerca && !observacoes && (
                    <p className="text-muted-foreground italic">Nenhuma atividade preenchida</p>
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
