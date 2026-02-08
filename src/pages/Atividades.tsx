import { useState, useEffect, useMemo } from "react";
import * as E from "@/lib/whatsappEmojis";
import { copyAndShareWhatsApp, copyToClipboard } from "@/lib/copyAndShare";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Leaf, Save, Loader2, Calendar, Trash2, History, ArrowRight, Plus, X, Copy, Droplets, MessageCircle } from "lucide-react";
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
  useJardinagemReports, 
  useJardinagemReportByDate, 
  useSaveJardinagemReport, 
  useDeleteJardinagemReport 
} from "@/hooks/useJardinagemReports";
import { getBrazilNorthDate, getBrazilNorthTodayString } from "@/lib/timezone";
import { cn } from "@/lib/utils";
import MonthlyReportDialog from "@/components/atividades/MonthlyReportDialog";
import { PhotoUploader } from "@/components/atividades/PhotoUploader";
import { ReadOnlyBanner } from "@/components/ReadOnlyBanner";
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

// Invasoras options
const INVASORAS_OPTIONS = [
  { value: "Acácia", label: "Acácia" },
  { value: "Erva-de-passarinho", label: "Erva-de-passarinho" },
  { value: "Juqueri", label: "Juqueri" },
  { value: "Leucena", label: "Leucena" },
];

// Generate berma options from 28 to 56 + Mirante
const BERMA_OPTIONS = [
  ...Array.from({ length: 29 }, (_, i) => ({
    value: (28 + i).toString(),
    label: `Berma ${28 + i}`,
  })),
  { value: "mirante", label: "Mirante" },
];

// Generate even berma options from 28 to 56 (only even numbers)
const BERMA_OPTIONS_EVEN = Array.from({ length: 15 }, (_, i) => ({
  value: (28 + i * 2).toString(),
  label: `Berma ${28 + i * 2}`,
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

  // Calculate measurement period (day 16 to day 16)
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

  // Calculate totals for the measurement period
  const measurementPeriodTotals = useMemo(() => {
    if (!allReports) return { coroamento: 0, adubagem: 0, rocagem: 0, podagem: 0, plantio: 0, retiradaMudas: 0 };
    
    const { startDate, endDate } = getMeasurementPeriod();
    const startStr = format(startDate, "yyyy-MM-dd");
    const endStr = format(endDate, "yyyy-MM-dd");
    
    const periodReports = allReports.filter(report => {
      return report.report_date >= startStr && report.report_date <= endStr;
    });
    
    const totals = periodReports.reduce((acc, report) => {
      return {
        coroamento: acc.coroamento + (report.coroamento_unidade || 0),
        adubagem: acc.adubagem + (report.adubagem_unidade || 0),
        rocagem: acc.rocagem + (parseFloat(report.rocagem_m2?.toString() || "0") || 0),
        podagem: acc.podagem + (report.podagem_unidade || 0),
        plantio: acc.plantio + (report.plantio_unidade || 0),
        retiradaMudas: acc.retiradaMudas + (report.retirada_mudas_unidade || 0),
      };
    }, { coroamento: 0, adubagem: 0, rocagem: 0, podagem: 0, plantio: 0, retiradaMudas: 0 });
    
    return totals;
  }, [allReports, selectedDate]);

  // Form state
  const [localFaixa, setLocalFaixa] = useState("FAIXA 2");
  const [rocagem, setRocagem] = useState("");
  const [rocagemBerma, setRocagemBerma] = useState("");
  const [rocagemFaixa, setRocagemFaixa] = useState("");
  const [podagem, setPodagem] = useState("");
  const [podagemBerma, setPodagemBerma] = useState("");
  const [podagemFaixa, setPodagemFaixa] = useState("");
  const [coroamento, setCoroamento] = useState("");
  const [coroamentoBerma, setCoroamentoBerma] = useState("");
  const [coroamentoFaixa, setCoroamentoFaixa] = useState("");
  const [adubagem, setAdubagem] = useState("");
  const [adubagemBerma, setAdubagemBerma] = useState("");
  const [adubagemFaixa, setAdubagemFaixa] = useState("");
  const [plantio, setPlantio] = useState("");
  const [plantioBerma, setPlantioBerma] = useState("");
  const [plantioFaixa, setPlantioFaixa] = useState("");
  const [limpezaManual, setLimpezaManual] = useState("");
  const [limpezaManualBerma, setLimpezaManualBerma] = useState("");
  const [limpezaManualFaixa, setLimpezaManualFaixa] = useState("");
  const [limpezaAssoprador, setLimpezaAssoprador] = useState("");
  const [limpezaAssopradorBerma, setLimpezaAssopradorBerma] = useState("");
  const [limpezaAssopradorFaixa, setLimpezaAssopradorFaixa] = useState("");
  const [manutencaoCanteiro, setManutencaoCanteiro] = useState("");
  const [invasoras, setInvasoras] = useState<InvasoraEntry[]>([{ nome: "", unidade: "" }]);
  const [invasorasBerma, setInvasorasBerma] = useState("");
  const [retiradaMudasUnidade, setRetiradaMudasUnidade] = useState("");
  
  // Plantio de Grama state
  const [plantioGrama, setPlantioGrama] = useState("");
  const [plantioGramaFaixa, setPlantioGramaFaixa] = useState("");
  const [plantioGramaBerma, setPlantioGramaBerma] = useState("");
  
  // Atividades manuais state
  const [atividadesManuais, setAtividadesManuais] = useState("");
  
  // Irrigation state
  const [irrigacaoPipas, setIrrigacaoPipas] = useState(false);
  const [irrigacaoCarretel, setIrrigacaoCarretel] = useState(false);
  const [irrigacaoCarretelBermas, setIrrigacaoCarretelBermas] = useState<number[]>([]);
  
  // Photo state
  const [photos, setPhotos] = useState<string[]>([]);

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

  // Check access permission - can view if encarregado_geral, encarregado_i, or admin
  const canView = authReady && (
    isAdmin || 
    profile?.cargo === "encarregado_geral" || 
    profile?.cargo === "encarregado_i"
  );
  
  // Check edit permission - only encarregado_geral, encarregado_i, or admin can edit
  const canEdit = authReady && (
    isAdmin || 
    profile?.cargo === "encarregado_geral" || 
    profile?.cargo === "encarregado_i"
  );

  // Load existing report when date changes
  useEffect(() => {
    if (existingReport) {
      setLocalFaixa(existingReport.local_faixa || "FAIXA 2");
      setRocagem(existingReport.rocagem_m2?.toString() || "");
      setRocagemBerma(existingReport.rocagem_berma?.toString() || "");
      setRocagemFaixa(existingReport.rocagem_faixa?.toString() || "");
      setPodagem(existingReport.podagem_unidade?.toString() || "");
      setPodagemBerma(existingReport.podagem_berma?.toString() || "");
      setPodagemFaixa(existingReport.podagem_faixa || "");
      setCoroamento(existingReport.coroamento_unidade?.toString() || "");
      setCoroamentoBerma(existingReport.coroamento_berma?.toString() || "");
      setCoroamentoFaixa(existingReport.coroamento_faixa || "");
      setAdubagem(existingReport.adubagem_unidade?.toString() || "");
      setAdubagemBerma(existingReport.adubagem_berma?.toString() || "");
      setAdubagemFaixa(existingReport.adubagem_faixa || "");
      setPlantio(existingReport.plantio_unidade?.toString() || "");
      setPlantioBerma(existingReport.plantio_berma?.toString() || "");
      setPlantioFaixa(existingReport.plantio_faixa || "");
      setLimpezaManual(existingReport.limpeza_manual_m2?.toString() || "");
      setLimpezaManualBerma(existingReport.limpeza_manual_berma?.toString() || "");
      setLimpezaManualFaixa(existingReport.limpeza_manual_faixa || "");
      setLimpezaAssoprador(existingReport.limpeza_assoprador_m2?.toString() || "");
      setLimpezaAssopradorBerma(existingReport.limpeza_assoprador_berma?.toString() || "");
      setLimpezaAssopradorFaixa(existingReport.limpeza_assoprador_faixa || "");
      setManutencaoCanteiro(existingReport.manutencao_canteiro || "");
      setInvasoras(parseInvasorasFromStorage(existingReport.controle_invasoras_nome, existingReport.controle_invasoras_unidade));
      setInvasorasBerma(existingReport.controle_invasoras_berma?.toString() || "");
      setRetiradaMudasUnidade(existingReport.retirada_mudas_unidade?.toString() || "");
      // Irrigation fields
      setIrrigacaoPipas(existingReport.irrigacao_pipas || false);
      setIrrigacaoCarretel(existingReport.irrigacao_carretel || false);
      setIrrigacaoCarretelBermas(existingReport.irrigacao_carretel_bermas || []);
      // New fields
      setPlantioGrama(existingReport.plantio_grama_m2?.toString() || "");
      setPlantioGramaFaixa(existingReport.plantio_grama_faixa || "");
      setPlantioGramaBerma(existingReport.plantio_grama_berma?.toString() || "");
      setAtividadesManuais(existingReport.atividades_manuais || "");
      setPhotos(existingReport.photo_urls || []);
    } else {
      // Reset form for new date
      setLocalFaixa("FAIXA 2");
      setRocagem("");
      setRocagemBerma("");
      setRocagemFaixa("");
      setPodagem("");
      setPodagemBerma("");
      setPodagemFaixa("");
      setCoroamento("");
      setCoroamentoBerma("");
      setCoroamentoFaixa("");
      setAdubagem("");
      setAdubagemBerma("");
      setAdubagemFaixa("");
      setPlantio("");
      setPlantioBerma("");
      setPlantioFaixa("");
      setLimpezaManual("");
      setLimpezaManualBerma("");
      setLimpezaManualFaixa("");
      setLimpezaAssoprador("");
      setLimpezaAssopradorBerma("");
      setLimpezaAssopradorFaixa("");
      setManutencaoCanteiro("");
      setInvasoras([{ nome: "", unidade: "" }]);
      setInvasorasBerma("");
      setRetiradaMudasUnidade("");
      // Reset irrigation fields
      setIrrigacaoPipas(false);
      setIrrigacaoCarretel(false);
      setIrrigacaoCarretelBermas([]);
      // Reset new fields
      setPlantioGrama("");
      setPlantioGramaFaixa("");
      setPlantioGramaBerma("");
      setAtividadesManuais("");
      setPhotos([]);
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

  // Redirect if no view access
  if (!canView) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
          <Leaf className="h-16 w-16 text-muted-foreground" />
          <h1 className="text-2xl font-bold text-muted-foreground">Acesso Restrito</h1>
          <p className="text-muted-foreground">
            Esta página é visível apenas para Administradores, Encarregado Geral e Encarregado I.
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
      const invasorasData = formatInvasorasForStorage();
      await saveReport.mutateAsync({
        report_date: selectedDateStr,
        local_faixa: localFaixa,
        rocagem_m2: rocagem ? parseFloat(rocagem) : undefined,
        rocagem_berma: rocagemBerma ? parseInt(rocagemBerma) : undefined,
        rocagem_faixa: rocagemFaixa || undefined,
        podagem_unidade: podagem ? parseInt(podagem) : undefined,
        podagem_berma: podagemBerma ? parseInt(podagemBerma) : undefined,
        podagem_faixa: podagemFaixa || undefined,
        coroamento_unidade: coroamento ? parseInt(coroamento) : undefined,
        coroamento_berma: coroamentoBerma ? parseInt(coroamentoBerma) : undefined,
        coroamento_faixa: coroamentoFaixa || undefined,
        adubagem_unidade: adubagem ? parseInt(adubagem) : undefined,
        adubagem_berma: adubagemBerma ? parseInt(adubagemBerma) : undefined,
        adubagem_faixa: adubagemFaixa || undefined,
        plantio_unidade: plantio ? parseInt(plantio) : undefined,
        plantio_berma: plantioBerma ? parseInt(plantioBerma) : undefined,
        plantio_faixa: plantioFaixa || undefined,
        limpeza_manual_m2: limpezaManual ? parseFloat(limpezaManual) : undefined,
        limpeza_manual_berma: limpezaManualBerma ? parseInt(limpezaManualBerma) : undefined,
        limpeza_manual_faixa: limpezaManualFaixa || undefined,
        limpeza_assoprador_m2: limpezaAssoprador ? parseFloat(limpezaAssoprador) : undefined,
        limpeza_assoprador_berma: limpezaAssopradorBerma ? parseInt(limpezaAssopradorBerma) : undefined,
        limpeza_assoprador_faixa: limpezaAssopradorFaixa || undefined,
        manutencao_canteiro: manutencaoCanteiro || undefined,
        controle_invasoras_unidade: invasorasData.unidade,
        controle_invasoras_nome: invasorasData.nome,
        controle_invasoras_berma: invasorasBerma ? parseInt(invasorasBerma) : undefined,
        retirada_mudas_unidade: retiradaMudasUnidade ? parseInt(retiradaMudasUnidade) : undefined,
        irrigacao_pipas: irrigacaoPipas,
        irrigacao_carretel: irrigacaoCarretel,
        irrigacao_carretel_bermas: irrigacaoCarretel && irrigacaoCarretelBermas.length > 0 ? irrigacaoCarretelBermas : undefined,
        plantio_grama_m2: plantioGrama ? parseFloat(plantioGrama) : undefined,
        plantio_grama_faixa: plantioGramaFaixa || undefined,
        plantio_grama_berma: plantioGramaBerma ? parseInt(plantioGramaBerma) : undefined,
        atividades_manuais: atividadesManuais || undefined,
        photo_urls: photos.length > 0 ? photos : undefined,
      });
      
      toast.success("Atividades salvas com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    }
  };

  // Generate RDO summary for WhatsApp
  const generateRDOSummary = () => {
    const formattedDateStr = format(selectedDate, "dd/MM/yyyy");
    
    let summary = `${E.EMOJI_CALENDAR} *RDO JARDINAGEM - ${formattedDateStr}*\n\n`;
    summary += `${E.EMOJI_PIN} *Local:* ${localFaixa}\n\n`;
    summary += `${E.EMOJI_SEEDLING} *Atividades Realizadas:*\n`;
    
    const lines: string[] = [];
    const formatBerma = (berma: string): string => berma ? ` (Berma ${berma})` : "";
    const formatFaixa = (faixa: string): string => faixa ? ` - ${faixa}` : "";
    
    // Only include activities with values > 0
    if (rocagem && parseFloat(rocagem) > 0) {
      lines.push(`* Roçagem - ${rocagem} m²${formatBerma(rocagemBerma)}${formatFaixa(rocagemFaixa)}`);
    }
    if (podagem && parseInt(podagem) > 0) {
      lines.push(`* Podagem - ${podagem} unidade(s)${formatBerma(podagemBerma)}${formatFaixa(podagemFaixa)}`);
    }
    if (coroamento && parseInt(coroamento) > 0) {
      lines.push(`* Coroamento - ${coroamento} unidade(s)${formatBerma(coroamentoBerma)}${formatFaixa(coroamentoFaixa)}`);
    }
    if (adubagem && parseInt(adubagem) > 0) {
      lines.push(`* Adubagem - ${adubagem} unidade(s)${formatBerma(adubagemBerma)}${formatFaixa(adubagemFaixa)}`);
    }
    if (plantio && parseInt(plantio) > 0) {
      lines.push(`* Plantio - ${plantio} unidade(s)${formatBerma(plantioBerma)}${formatFaixa(plantioFaixa)}`);
    }
    if (limpezaManual && parseFloat(limpezaManual) > 0) {
      lines.push(`* Limpeza Manual - ${limpezaManual} m²${formatBerma(limpezaManualBerma)}${formatFaixa(limpezaManualFaixa)}`);
    }
    if (limpezaAssoprador && parseFloat(limpezaAssoprador) > 0) {
      lines.push(`* Limpeza com Soprador - ${limpezaAssoprador} m²${formatBerma(limpezaAssopradorBerma)}${formatFaixa(limpezaAssopradorFaixa)}`);
    }
    // Only include invasoras with unidade > 0
    const filteredInvasoras = invasoras.filter(i => i.unidade && parseInt(i.unidade) > 0);
    filteredInvasoras.forEach(inv => {
      const nomeText = inv.nome ? ` (${inv.nome})` : "";
      lines.push(`* Controle de Invasoras${nomeText} - ${inv.unidade} unidade(s)${formatBerma(invasorasBerma)}`);
    });
    
    if (retiradaMudasUnidade && parseInt(retiradaMudasUnidade) > 0) lines.push(`* Retirada de Mudas (Árvores) - ${retiradaMudasUnidade} unidade(s)`);
    if (manutencaoCanteiro && manutencaoCanteiro.trim()) lines.push(`* Manutenção de Canteiro: ${manutencaoCanteiro}`);
    // Plantio de Grama
    if (plantioGrama && parseFloat(plantioGrama) > 0) {
      const faixaText = plantioGramaFaixa ? ` - ${plantioGramaFaixa}` : "";
      const bermaText = plantioGramaBerma ? ` (Berma ${plantioGramaBerma})` : "";
      lines.push(`* Plantio de Grama - ${plantioGrama} m²${bermaText}${faixaText}`);
    }
    // Atividades Manuais
    if (atividadesManuais && atividadesManuais.trim()) lines.push(`* ${atividadesManuais}`);
    if (irrigacaoPipas) lines.push(`* Irrigação com Pipas nas Faixas 3 e 4 e Mirante`);
    if (irrigacaoCarretel && irrigacaoCarretelBermas.length > 0) {
      const bermasText = irrigacaoCarretelBermas.sort((a, b) => a - b).join(", ");
      lines.push(`* Irrigação com Carretel (Bermas: ${bermasText})`);
    } else if (irrigacaoCarretel) {
      lines.push(`* Irrigação com Carretel`);
    }
    
    if (lines.length > 0) {
      lines.forEach(line => {
        summary += `${line}\n`;
      });
    } else {
      summary += "Nenhuma atividade registrada\n";
    }
    
    return summary;
  };

  const handleWhatsAppReport = async () => {
    const summary = generateRDOSummary();
    const ok = await copyAndShareWhatsApp(summary);
    if (ok) toast.success("Enviado para WhatsApp!");
    else toast.error("Erro ao compartilhar");
  };

  const handleCopyReport = async () => {
    const summary = generateRDOSummary();
    const ok = await copyToClipboard(summary);
    if (ok) toast.success("Relatório copiado!");
    else toast.error("Erro ao copiar relatório");
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

  const { startDate, endDate } = getMeasurementPeriod();
  const measurementPeriodLabel = `${format(startDate, "dd/MM/yyyy")} a ${format(endDate, "dd/MM/yyyy")}`;

  return (
    <Layout>
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Read-only banner */}
        {!canEdit && <ReadOnlyBanner message="Você está visualizando esta página em modo somente leitura. Apenas Administradores, Encarregado Geral e Encarregado I podem editar." />}
        {/* Measurement Period Summary */}
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="py-2 sm:py-3 px-3 sm:px-4">
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Calendar className="h-4 w-4 text-green-500 shrink-0" />
                <span className="text-xs sm:text-sm font-medium">Período de Medição:</span>
                <Badge variant="outline" className="border-green-500/50 text-green-500 font-semibold text-xs">
                  {measurementPeriodLabel}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>🌿 Roçagem: <strong className="text-foreground">{measurementPeriodTotals.rocagem.toLocaleString('pt-BR')} m²</strong></span>
                <span>✂️ Podagem: <strong className="text-foreground">{measurementPeriodTotals.podagem}</strong></span>
                <span>🌱 Coroamento: <strong className="text-foreground">{measurementPeriodTotals.coroamento}</strong></span>
                <span>💧 Adubagem: <strong className="text-foreground">{measurementPeriodTotals.adubagem}</strong></span>
                <span>🌳 Plantio: <strong className="text-foreground">{measurementPeriodTotals.plantio}</strong></span>
                <span>🌲 Retirada: <strong className="text-foreground">{measurementPeriodTotals.retiradaMudas}</strong></span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-green-600/20 flex items-center justify-center shrink-0">
              <Leaf className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold">Atividades - Jardinagem</h1>
              <p className="text-sm text-muted-foreground truncate">{capitalizedDate}</p>
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
                const formatBerma = (berma: any) => berma ? ` (Berma ${berma})` : "";
                const formatFaixa = (faixa: any) => faixa ? ` - ${faixa}` : "";
                
                if (report.rocagem_m2 && parseFloat(report.rocagem_m2) > 0) {
                  lines.push(`* Roçagem - ${report.rocagem_m2} m²${formatBerma(report.rocagem_berma)}${formatFaixa(report.rocagem_faixa)}`);
                }
                if (report.podagem_unidade && parseInt(report.podagem_unidade) > 0) {
                  lines.push(`* Podagem - ${report.podagem_unidade} unidade(s)${formatBerma(report.podagem_berma)}${formatFaixa(report.podagem_faixa)}`);
                }
                if (report.coroamento_unidade && parseInt(report.coroamento_unidade) > 0) {
                  lines.push(`* Coroamento - ${report.coroamento_unidade} unidade(s)${formatBerma(report.coroamento_berma)}${formatFaixa(report.coroamento_faixa)}`);
                }
                if (report.adubagem_unidade && parseInt(report.adubagem_unidade) > 0) {
                  lines.push(`* Adubagem - ${report.adubagem_unidade} unidade(s)${formatBerma(report.adubagem_berma)}${formatFaixa(report.adubagem_faixa)}`);
                }
                if (report.plantio_unidade && parseInt(report.plantio_unidade) > 0) {
                  lines.push(`* Plantio - ${report.plantio_unidade} unidade(s)${formatBerma(report.plantio_berma)}${formatFaixa(report.plantio_faixa)}`);
                }
                if (report.limpeza_manual_m2 && parseFloat(report.limpeza_manual_m2) > 0) {
                  lines.push(`* Limpeza Manual - ${report.limpeza_manual_m2} m²${formatBerma(report.limpeza_manual_berma)}${formatFaixa(report.limpeza_manual_faixa)}`);
                }
                if (report.limpeza_assoprador_m2 && parseFloat(report.limpeza_assoprador_m2) > 0) {
                  lines.push(`* Limpeza com Soprador - ${report.limpeza_assoprador_m2} m²${formatBerma(report.limpeza_assoprador_berma)}${formatFaixa(report.limpeza_assoprador_faixa)}`);
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

            {existingReport && canEdit && (
              <Button variant="destructive" size="icon" onClick={handleDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}

            <Button onClick={() => handleSave()} disabled={saveReport.isPending || !canEdit} variant="outline">
              {saveReport.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar
            </Button>

            <Button 
              onClick={handleWhatsAppReport} 
              variant="outline"
              className="gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </Button>
            <Button 
              onClick={handleCopyReport} 
              variant="outline"
              className="gap-2"
            >
              <Copy className="h-4 w-4" />
              Copiar
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
                <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_140px] gap-3 p-3 rounded-lg bg-muted/30">
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
                    <Label>Faixa</Label>
                    <Select value={rocagemFaixa} onValueChange={setRocagemFaixa}>
                      <SelectTrigger>
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
                <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_140px] gap-3 p-3 rounded-lg bg-muted/30">
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
                    <Label>Faixa</Label>
                    <Select value={podagemFaixa} onValueChange={setPodagemFaixa}>
                      <SelectTrigger>
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
                <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_140px] gap-3 p-3 rounded-lg bg-muted/30">
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
                    <Label>Faixa</Label>
                    <Select value={coroamentoFaixa} onValueChange={setCoroamentoFaixa}>
                      <SelectTrigger>
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

                {/* Adubagem */}
                <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_140px] gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="space-y-2">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <Label>ADUBAGEM (Unidade)</Label>
                      </div>
                      {measurementPeriodTotals.coroamento > 0 && (
                        <Badge 
                          variant={measurementPeriodTotals.adubagem >= measurementPeriodTotals.coroamento ? "default" : "secondary"}
                          className="text-xs w-fit"
                        >
                          Coroamento (Medição): {measurementPeriodTotals.coroamento} | Adubagem: {measurementPeriodTotals.adubagem} | Faltam: {Math.max(0, measurementPeriodTotals.coroamento - measurementPeriodTotals.adubagem)}
                        </Badge>
                      )}
                    </div>
                    <Input
                      type="number"
                      min="0"
                      value={adubagem}
                      onChange={(e) => setAdubagem(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Faixa</Label>
                    <Select value={adubagemFaixa} onValueChange={setAdubagemFaixa}>
                      <SelectTrigger>
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
                  <div className="space-y-2">
                    <Label>Berma</Label>
                    <Select value={adubagemBerma} onValueChange={setAdubagemBerma}>
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
                <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_140px] gap-3 p-3 rounded-lg bg-muted/30">
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
                    <Label>Faixa</Label>
                    <Select value={plantioFaixa} onValueChange={setPlantioFaixa}>
                      <SelectTrigger>
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
                <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_140px] gap-3 p-3 rounded-lg bg-muted/30">
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
                    <Label>Faixa</Label>
                    <Select value={limpezaManualFaixa} onValueChange={setLimpezaManualFaixa}>
                      <SelectTrigger>
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

                {/* Limpeza com Soprador */}
                <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_140px] gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="space-y-2">
                    <Label>LIMPEZA COM SOPRADOR (m²)</Label>
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
                    <Label>Faixa</Label>
                    <Select value={limpezaAssopradorFaixa} onValueChange={setLimpezaAssopradorFaixa}>
                      <SelectTrigger>
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
                      <Select 
                        value={invasora.nome} 
                        onValueChange={(value) => updateInvasora(index, "nome", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a invasora" />
                        </SelectTrigger>
                        <SelectContent>
                          {INVASORAS_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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

              {/* Plantio de Grama */}
              <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_140px] gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="space-y-2">
                  <Label className="text-green-600 dark:text-green-400">🌿 PLANTIO DE GRAMA (m²)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={plantioGrama}
                    onChange={(e) => setPlantioGrama(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Faixa</Label>
                  <Select value={plantioGramaFaixa} onValueChange={setPlantioGramaFaixa}>
                    <SelectTrigger>
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
                <div className="space-y-2">
                  <Label>Berma</Label>
                  <Select value={plantioGramaBerma} onValueChange={setPlantioGramaBerma}>
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

              {/* Atividades Manuais */}
              <div className="space-y-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <Label className="text-amber-600 dark:text-amber-400">✏️ OUTRAS ATIVIDADES (Preenchimento Manual)</Label>
                <Textarea
                  value={atividadesManuais}
                  onChange={(e) => setAtividadesManuais(e.target.value)}
                  placeholder="Descreva outras atividades realizadas que não estão listadas acima..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Este campo será incluído no resumo do RDO exatamente como preenchido.
                </p>
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

              {/* Irrigation Section */}
              <div className="space-y-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-center gap-2">
                  <Droplets className="h-5 w-5 text-blue-500" />
                  <Label className="text-base font-semibold text-blue-500">IRRIGAÇÃO</Label>
                </div>
                
                {/* Irrigação com Pipas */}
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-background/50">
                  <Checkbox
                    id="irrigacao-pipas"
                    checked={irrigacaoPipas}
                    onCheckedChange={(checked) => setIrrigacaoPipas(checked === true)}
                  />
                  <Label htmlFor="irrigacao-pipas" className="cursor-pointer">
                    Irrigação com Pipas nas Faixas 3 e 4 e Mirante
                  </Label>
                </div>

                {/* Irrigação com Carretel */}
                <div className="space-y-3 p-3 rounded-lg bg-background/50">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="irrigacao-carretel"
                      checked={irrigacaoCarretel}
                      onCheckedChange={(checked) => {
                        setIrrigacaoCarretel(checked === true);
                        if (!checked) {
                          setIrrigacaoCarretelBermas([]);
                        }
                      }}
                    />
                    <Label htmlFor="irrigacao-carretel" className="cursor-pointer">
                      Irrigação com Carretel
                    </Label>
                  </div>

                  {irrigacaoCarretel && (
                    <div className="ml-7 space-y-2">
                      <Label className="text-sm text-muted-foreground">Selecione as Bermas (somente pares):</Label>
                      <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
                        {BERMA_OPTIONS_EVEN.map((opt) => {
                          const bermaNum = parseInt(opt.value);
                          const isSelected = irrigacaoCarretelBermas.includes(bermaNum);
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setIrrigacaoCarretelBermas(irrigacaoCarretelBermas.filter(b => b !== bermaNum));
                                } else {
                                  setIrrigacaoCarretelBermas([...irrigacaoCarretelBermas, bermaNum].sort((a, b) => a - b));
                                }
                              }}
                              className={cn(
                                "px-3 py-2 text-sm rounded-md border transition-colors",
                                isSelected
                                  ? "bg-blue-500 text-white border-blue-500"
                                  : "bg-background border-input hover:bg-muted"
                              )}
                            >
                              {bermaNum}
                            </button>
                          );
                        })}
                      </div>
                      {irrigacaoCarretelBermas.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Selecionadas: {irrigacaoCarretelBermas.join(", ")}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Photo Upload Section */}
              <div className="pt-4 border-t">
                <PhotoUploader
                  photos={photos}
                  onPhotosChange={setPhotos}
                  disabled={!canEdit}
                  folder="jardinagem"
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
                  {adubagem && parseInt(adubagem) > 0 && (
                    <p>* Adubagem - {adubagem} unidade(s){adubagemBerma && ` (Berma ${adubagemBerma})`}</p>
                  )}
                  {plantio && parseInt(plantio) > 0 && (
                    <p>* Plantio - {plantio} unidade(s){plantioBerma && ` (Berma ${plantioBerma})`}</p>
                  )}
                  {limpezaManual && parseFloat(limpezaManual) > 0 && (
                    <p>* Limpeza Manual - {limpezaManual} m²{limpezaManualBerma && ` (Berma ${limpezaManualBerma})`}</p>
                  )}
                  {limpezaAssoprador && parseFloat(limpezaAssoprador) > 0 && (
                    <p>* Limpeza com Soprador - {limpezaAssoprador} m²{limpezaAssopradorBerma && ` (Berma ${limpezaAssopradorBerma})`}</p>
                  )}
                  {invasoras.some(i => i.unidade && parseInt(i.unidade) > 0) && (
                    invasoras.filter(i => i.unidade && parseInt(i.unidade) > 0).map((inv, idx) => (
                      <p key={idx}>* Controle de Invasoras{inv.nome ? ` (${inv.nome})` : ""} - {inv.unidade} unidade(s){invasorasBerma && ` (Berma ${invasorasBerma})`}</p>
                    ))
                  )}
                  {retiradaMudasUnidade && parseInt(retiradaMudasUnidade) > 0 && (
                    <p>* Retirada de Mudas (Árvores) - {retiradaMudasUnidade} unidade(s)</p>
                  )}
                  {plantioGrama && parseFloat(plantioGrama) > 0 && (
                    <p>* Plantio de Grama - {plantioGrama} m²{plantioGramaBerma && ` (Berma ${plantioGramaBerma})`}{plantioGramaFaixa && ` - ${plantioGramaFaixa}`}</p>
                  )}
                  {atividadesManuais && (
                    <p>* {atividadesManuais}</p>
                  )}
                  {manutencaoCanteiro && (
                    <p>* Manutenção de Canteiro: {manutencaoCanteiro}</p>
                  )}
                  {irrigacaoPipas && (
                    <p>* Irrigação com Pipas nas Faixas 3 e 4 e Mirante</p>
                  )}
                  {irrigacaoCarretel && (
                    <p>* Irrigação com Carretel{irrigacaoCarretelBermas.length > 0 && ` (Bermas: ${irrigacaoCarretelBermas.join(", ")})`}</p>
                  )}
                  {!rocagem && !podagem && !coroamento && !adubagem && !plantio && !limpezaManual && !limpezaAssoprador && !invasoras.some(i => i.unidade && parseInt(i.unidade) > 0) && !retiradaMudasUnidade && !manutencaoCanteiro && !irrigacaoPipas && !irrigacaoCarretel && !plantioGrama && !atividadesManuais && (
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
