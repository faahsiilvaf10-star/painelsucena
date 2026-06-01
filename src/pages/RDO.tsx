// @ts-nocheck
import { useState, useMemo, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import * as E from "@/lib/whatsappEmojis";
import { copyAndShareWhatsApp, copyToClipboard } from "@/lib/copyAndShare";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Copy, FileText, Sun, Cloud, CloudRain, CloudSun, Save, History, Image, X, Loader2, Calendar, Trash2, Clock, Lock, Unlock, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import Layout from "@/components/layout/Layout";
import { EditablePageTitle } from "@/components/cms/EditablePageTitle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useAttendanceRecords } from "@/hooks/useAttendance";
import { useEquipment } from "@/hooks/useEquipment";
import { useEquipmentOutByDate } from "@/hooks/useEquipmentMovements";
import { useDailyShiftRecords } from "@/hooks/useDailyShiftRecords";
import { useDDSByDate } from "@/hooks/useDDSSchedule";
import { useRDOReports, useRDOReport, useSaveRDOReport, useUploadRDOPhotos, useDeleteRDOReport } from "@/hooks/useRDOReports";
import { useJardinagemReportByDate, formatJardinagemForRDO } from "@/hooks/useJardinagemReports";
import { useGabiaoReportByDate, formatGabiaoForRDO } from "@/hooks/useGabiaoReports";
import { useMudasPlantioByDate, formatMudasPlantadasForRDO } from "@/hooks/useMudasPlantio";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useRDOLock } from "@/hooks/useRDOLock";
import { useIsAdmin } from "@/hooks/useUserRole";
import { useJardinagemEquipment } from "@/hooks/useJardinagemEquipment";
import { useRHEfetivo } from "@/hooks/useRHEfetivo";
import { useAttendanceAreaAssignments } from "@/hooks/useAttendanceAreaAssignments";
import { useAttendanceDailyMarks } from "@/hooks/useAttendanceDailyMarks";
import { useCurrentTemperature } from "@/hooks/useCurrentTemperature";
import { buildAreaPresenceText } from "@/lib/attendanceReport";
import { getBrazilNorthDate, getBrazilNorthTodayString } from "@/lib/timezone";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ReadOnlyBanner } from "@/components/ReadOnlyBanner";
import { PlannedActivitiesTab } from "@/components/rdo/PlannedActivitiesTab";

// Role mappings for areas
const roleToArea: Record<string, "gabiao" | "jardinagem"> = {
  polivalente: "gabiao",
  meia_oficial: "gabiao",
  ajudante_gabiao: "gabiao",
  aux_eletrica: "gabiao",
  mecanico: "gabiao",
  jardineiro: "jardinagem",
  ajudante_jardinagem: "jardinagem",
  motorista_pipa: "jardinagem",
  motorista_munk: "jardinagem",
  motorista_onibus: "jardinagem",
  motorista_veiculo_leve: "jardinagem",
};

const roleLabels: Record<string, string> = {
  polivalente: "Polivalente",
  meia_oficial: "Meia Oficial",
  ajudante_gabiao: "Ajudante",
  aux_eletrica: "Aux. Elétrica",
  mecanico: "Mecânico",
  jardineiro: "Jardineiro",
  ajudante_jardinagem: "Ajudante",
  motorista_pipa: "Motorista Pipa",
  motorista_munk: "Motorista Munck",
  motorista_onibus: "Motorista Ônibus",
  motorista_veiculo_leve: "Motorista Veículo Leve",
};

const equipmentTypeLabels: Record<string, string> = {
  pipa: "Caminhão Pipa",
  munk: "Munck",
  camionete: "Veiculo Leve",
  onibus: "Ônibus",
};

const weatherOptions = [
  { value: "sol", label: "Sol", icon: Sun },
  { value: "nublado", label: "Nublado", icon: Cloud },
  { value: "parcialmente_nublado", label: "Parcialmente Nublado", icon: CloudSun },
  { value: "chuva", label: "Chuva", icon: CloudRain },
];

const weatherLabels: Record<string, string> = {
  sol: "Sol",
  nublado: "Nublado",
  parcialmente_nublado: "Parcialmente Nublado",
  chuva: "Chuva",
};

export default function RDO() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { isAdmin } = useIsAdmin();
  const todayStr = getBrazilNorthTodayString();
  const today = getBrazilNorthDate();
  
  // Check edit permission - only admin and encarregado_geral can edit RDO
  const canEdit = isAdmin || profile?.cargo === "encarregado_geral";
  
  // Date selection state
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [activeTab, setActiveTab] = useState("report");
  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  
  const { data: attendanceRecords } = useAttendanceRecords(selectedDateStr);
  const { data: equipment } = useEquipment();
  const { data: equipmentOut = [] } = useEquipmentOutByDate(selectedDateStr);
  const { data: shiftRecords = [] } = useDailyShiftRecords(selectedDateStr);
  const { data: dateDDS } = useDDSByDate(selectedDateStr);
  const { data: existingReport, isLoading: isLoadingReport } = useRDOReport(selectedDateStr);
  const { data: allReports } = useRDOReports();
  const { data: jardinagemReport } = useJardinagemReportByDate(selectedDateStr);
  const { data: gabiaoReport } = useGabiaoReportByDate(selectedDateStr);
  const { data: mudasPlantadas } = useMudasPlantioByDate(selectedDateStr);
  const { data: jardinagemEquipmentList = [] } = useJardinagemEquipment();
  const { data: rhEfetivo } = useRHEfetivo();
  const { data: areaAssignments } = useAttendanceAreaAssignments();
  const { getAbsentIds: getDailyAbsentIds } = useAttendanceDailyMarks(selectedDateStr);
  const saveReport = useSaveRDOReport();
  const deleteReport = useDeleteRDOReport();
  const uploadPhotos = useUploadRDOPhotos();

  // Photo state
  const [photos, setPhotos] = useState<string[]>([]);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  // Check if selected date is Friday (5 = Friday in getDay())
  const isFriday = selectedDate.getDay() === 5;
  const defaultHorario = isFriday ? "07:00 as 16:00" : "07:00 as 17:00";

  const [headerInfo, setHeaderInfo] = useState({
    empresa: "Sucena Empreendimentos",
    contrato: "460001269",
    gerencia: "Hydro",
    lideranca: "Eng. Luís Araújo",
    tst: "Itamar Junior e Alexssandro Chaves",
    local: "Alunorte Barcarena",
    horario: defaultHorario,
  });

  const [weatherMorning, setWeatherMorning] = useState("sol");
  const [weatherAfternoon, setWeatherAfternoon] = useState("sol");
  const [difficulties, setDifficulties] = useState("Não Houve.");

  // Temperatura: capturada em tempo real até as 16h e congelada após esse horário.
  // Persiste no banco (temperature/apparent_temp/humidity) para reaparecer no relatório do dia seguinte.
  const isToday = selectedDateStr === todayStr;
  const [isBeforeCutoff, setIsBeforeCutoff] = useState(() => new Date().getHours() < 16);
  useEffect(() => {
    if (!isBeforeCutoff) return;
    const interval = setInterval(() => {
      if (new Date().getHours() >= 16) setIsBeforeCutoff(false);
    }, 30 * 1000);
    return () => clearInterval(interval);
  }, [isBeforeCutoff]);

  // Mostra a temperatura ATUAL sempre na prévia, independente do dia selecionado.
  const [frozenTemp, setFrozenTemp] = useState<{ temperature: number; apparentTemp: number; humidity: number; fetchedAt: string } | null>(null);
  // Sempre busca a temperatura atual (em tempo real) para exibir na prévia, mesmo ao editar RDO de dias anteriores.
  const { data: currentTemp } = useCurrentTemperature(true);
  useEffect(() => {
    if (currentTemp) setFrozenTemp(currentTemp);
  }, [currentTemp]);

  // Para dias anteriores: usa o valor salvo no banco (existingReport.temperature)
  const savedTemp = existingReport && existingReport.temperature != null
    ? {
        temperature: Number(existingReport.temperature),
        apparentTemp: Number(existingReport.apparent_temp ?? existingReport.temperature),
        humidity: Number(existingReport.humidity ?? 0),
        fetchedAt: existingReport.temperature_captured_at ?? existingReport.updated_at,
      }
    : null;

  // Busca a temperatura do dia anterior para exibir no relatório
  const prevDayTemp = useMemo(() => {
    const prevDate = new Date(selectedDate);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevDateStr = format(prevDate, "yyyy-MM-dd");
    
    const prevReport = allReports?.find(r => r.report_date === prevDateStr);
    if (prevReport && prevReport.temperature != null) {
      return {
        temperature: Number(prevReport.temperature),
        apparentTemp: Number(prevReport.apparent_temp ?? prevReport.temperature),
        humidity: Number(prevReport.humidity ?? 0),
        fetchedAt: prevReport.temperature_captured_at ?? prevReport.updated_at,
      };
    }
    return null;
  }, [allReports, selectedDate]);

  // Para HOJE: mostra a temperatura ATUAL em tempo real (atualiza durante o dia).
  // Para dias anteriores: mostra a ÚLTIMA temperatura salva daquele dia.
  const displayTemp = isToday
    ? (currentTemp ?? frozenTemp ?? savedTemp)
    : (savedTemp ?? prevDayTemp);
  const showTemperature = !!displayTemp;
  const isLiveTemp = isToday && !!(currentTemp ?? frozenTemp);

  // Auto-persiste a temperatura no banco quando estamos no dia atual e temos um valor capturado.
  // Garante que o RDO do "dia anterior" sempre tenha a última temperatura registrada (ex: 16h).
  const lastPersistedTempRef = useRef<number | null>(null);
  useEffect(() => {
    if (!isToday || !user?.id) return;
    const tempToPersist = frozenTemp ?? currentTemp;
    if (!tempToPersist) return;
    if (lastPersistedTempRef.current === tempToPersist.temperature) return;
    if (!existingReport) return; // só atualiza se já houver relatório criado para hoje
    lastPersistedTempRef.current = tempToPersist.temperature;
    (async () => {
      try {
        await supabase
          .from("rdo_reports")
          .update({
            temperature: tempToPersist.temperature,
            apparent_temp: tempToPersist.apparentTemp,
            humidity: tempToPersist.humidity,
            temperature_captured_at: tempToPersist.fetchedAt,
          })
          .eq("id", existingReport.id);
      } catch (err) {
        console.warn("auto-persist temperature falhou:", err);
      }
    })();
  }, [isToday, user?.id, frozenTemp, currentTemp, existingReport, isBeforeCutoff]);

  // Update horario when date changes (Friday = 16:00, other days = 17:00)
  useEffect(() => {
    const newHorario = selectedDate.getDay() === 5 ? "07:00 as 16:00" : "07:00 as 17:00";
    setHeaderInfo(prev => ({ ...prev, horario: newHorario }));
  }, [selectedDate]);

  // Load existing report when date changes
  useEffect(() => {
    if (existingReport) {
      setWeatherMorning(existingReport.weather_morning || "sol");
      setWeatherAfternoon(existingReport.weather_afternoon || "sol");
      setDifficulties(existingReport.difficulties || "Não Houve.");
      setPhotos(existingReport.photo_urls || []);
    } else {
      // Reset form for new date
      setWeatherMorning("sol");
      setWeatherAfternoon("sol");
      setDifficulties("Não Houve.");
      setPhotos([]);
    }
  }, [existingReport, selectedDateStr]);

  // Extract base activities for planned tab
  const baseGabiaoActivities = useMemo(() => [
    "Escavação manual",
    "Reposição de manta asfáltica",
    "Reposição de silte",
    "Limpeza e organização",
    "Retirada de tela",
    "Retirada de cascalho",
    "Lavagem de vertedouro",
    "Lavagem de bacias do vertedouro",
    "Reposição de Geotêxtil",
    "Retirada de Geotêxtil",
    "Retirada de Geomembrana",
    "Reposição de Geomembrana",
    "Recomposição de tela",
    "Recomposição de cascalho",
    "Recomposição de silte",
    "Transporte de Materiais",
    "Limpeza de Canaleta",
    "Recomposição de Gabião",
    "Manutenção de Drenagem",
    "Limpeza de Bueiro",
    "Reparo de Cerca",
  ], []);

  const baseJardinagemActivities = useMemo(() => [
    "Roçagem",
    "Podagem",
    "Cova",
    "Coroamento",
    "Adubagem",
    "Plantio",
    "Limpeza Manual",
    "Limpeza com Soprador",
    "Controle de Invasoras",
    "Retirada de Mudas (Árvores)",
    "Plantio de Grama",
    "Manutenção de Canteiro",
    "Irrigação com Pipas",
    "Irrigação com Carretel",
  ], []);

  const handleSavePlanned = async (planned: { gabiao: string[]; jardinagem: string[] }) => {
    if (!user) return;
    try {
      await saveReport.mutateAsync({
        report_date: selectedDateStr,
        weather_morning: weatherMorning,
        weather_afternoon: weatherAfternoon,
        report_text: existingReport?.report_text || "",
        planned_activities: planned,
      });
      toast.success("Atividades previstas salvas!");
    } catch (err: any) {
      toast.error("Erro ao salvar atividades previstas: " + err.message);
    }
  };

  // Calculate workforce by role and area
  const workforceByArea = useMemo(() => {
    const presentRecords = attendanceRecords?.filter(
      (r) => r.status === "present" || r.status === "late"
    ) || [];

    const gabiao: Record<string, number> = {};
    const jardinagem: Record<string, number> = {};

    presentRecords.forEach((record) => {
      const role = record.employees?.role || "";
      const area = roleToArea[role];
      
      if (area === "gabiao") {
        gabiao[role] = (gabiao[role] || 0) + 1;
      } else if (area === "jardinagem") {
        jardinagem[role] = (jardinagem[role] || 0) + 1;
      }
    });

    return { gabiao, jardinagem };
  }, [attendanceRecords]);

  // Calculate equipment summary (excluding maintenance)
  const equipmentSummary = useMemo(() => {
    if (!equipment) return { items: [], total: 0, equipmentNoCanteiro: [] };
    
    // Create a map of shift records by plate for quick lookup
    const shiftRecordsByPlate = new Map(
      shiftRecords.map(sr => [sr.plate, sr])
    );
    
    // Regra de horário da saída para o RDO:
    // - Saída antes das 10:00h: equipamento NÃO entra no RDO (fica fora)
    // - Saída a partir das 12:00h: equipamento ENTRA no RDO (trabalhou o dia)
    // - Entre 10:00h e 12:00h: mantém a lógica anterior por motivo
    const parseHour = (t?: string | null) => {
      if (!t) return null;
      const [h, m] = t.split(":").map(Number);
      if (Number.isNaN(h)) return null;
      return h + (Number.isNaN(m) ? 0 : m / 60);
    };
    const reallyOut = equipmentOut.filter(m => {
      if (!m.exit_reason) return false;
      const hour = parseHour(m.movement_time);
      if (hour !== null) {
        if (hour >= 12) return false; // saída tarde → conta como presente no RDO
        if (hour < 10) return true;   // saída cedo → fica fora do RDO
      }
      return (
        m.exit_reason !== "fim_turno" &&
        m.exit_reason !== "operando" &&
        m.exit_reason !== "aguardando_frente_servico"
      );
    });
    
    // Get plates of equipment actually out (maintenance, vistoria)
    const platesOut = new Set(reallyOut.map(m => m.plate));
    
    // Equipment in the yard = all equipment minus those with active exit
    // Enrich with driver/helper from shift records
    const equipmentNoCanteiro = equipment
      .filter(eq => !platesOut.has(eq.plate))
      .map(eq => {
        const shiftRecord = shiftRecordsByPlate.get(eq.plate);
        return {
          ...eq,
          // Use shift record driver/helper if available, fallback to equipment table
          driver: shiftRecord?.driver_name || eq.driver || "",
          helper: shiftRecord?.helper_name || eq.helper || "",
        };
      });
    
    const typeCount: Record<string, { count: number; plates: string[] }> = {};
    
    equipmentNoCanteiro.forEach((eq) => {
      const type = eq.equipment_type || "pipa";
      if (!typeCount[type]) {
        typeCount[type] = { count: 0, plates: [] };
      }
      typeCount[type].count++;
      typeCount[type].plates.push(eq.plate);
    });

    const items = Object.entries(typeCount).map(([type, data]) => ({
      type,
      label: equipmentTypeLabels[type] || type,
      count: data.count,
      plates: data.plates,
    }));

    return { items, total: equipmentNoCanteiro.length, equipmentNoCanteiro };
  }, [equipment, equipmentOut, shiftRecords]);

  // Calculate jardinagem equipment summary (only those with status "entrou")
  const jardinagemEquipmentSummary = useMemo(() => {
    const equipmentInObra = jardinagemEquipmentList.filter(eq => eq.status === "entrou");
    
    // Group by equipment type (extract base name without number)
    const typeCount: Record<string, number> = {};
    
    equipmentInObra.forEach((eq) => {
      // Extract base name (e.g., "Roçadeira" from "Roçadeira 70")
      const baseName = eq.name.replace(/\s*\d+$/, "").trim();
      // Pluralize common names
      let pluralName = baseName;
      if (baseName === "Roçadeira") pluralName = "Roçadeiras";
      else if (baseName === "Motopoda") pluralName = "Motopodas";
      else if (baseName === "Soprador") pluralName = "Sopradores";
      else if (baseName === "Perfurador") pluralName = "Perfuradores";
      
      if (!typeCount[pluralName]) {
        typeCount[pluralName] = 0;
      }
      typeCount[pluralName]++;
    });
    
    const items = Object.entries(typeCount).map(([name, count]) => ({
      name,
      count,
    }));
    
    return { items, total: equipmentInObra.length };
  }, [jardinagemEquipmentList]);

  // Format date for report
  const formattedDate = format(selectedDate, "dd/MM/yy (EEEE)", { locale: ptBR });
  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  // Generate the formatted report
  const generateReport = () => {
    // Constrói o efetivo (apenas presentes) a partir da Lista de Presença
    const allColaboradores = (rhEfetivo?.colaboradores ?? [])
      .slice()
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    const employeeAreaMap = new Map<number, "gabiao" | "jardinagem" | "adm">();
    (areaAssignments ?? []).forEach((a) =>
      employeeAreaMap.set(a.employee_id, a.area as "gabiao" | "jardinagem" | "adm")
    );

    const buildArea = (area: "gabiao" | "jardinagem") => {
      const empsInArea = allColaboradores.filter(
        (c) => employeeAreaMap.get(c.id) === area
      );
      if (empsInArea.length === 0) return "";
      const absent = getDailyAbsentIds(area);
      return buildAreaPresenceText(area, empsInArea, absent, {
        includeHeader: false,
        onlyPresent: true,
        includeSupport: false,
      });
    };

    const gabiaoWorkforce = buildArea("gabiao");
    const jardinagemWorkforce = buildArea("jardinagem");

    // Build equipment text
    const equipmentText = equipmentSummary.items
      .map((item) => {
        const platesStr = item.plates.length > 0 ? ` * - ${item.plates.join("- ")}*` : "";
        return `•       ${String(item.count).padStart(2, "0")} ${item.label}${platesStr}`;
      })
      .join("\n");

    // Fixed equipment that always appears in all RDOs
    const fixedEquipmentText = `   • Veículo Leve - SNJ9G70
   • Ônibus - SMY7A93`;

    // Fixed equipment plates to exclude from dynamic list
    const fixedPlates = ["SNJ9G70", "SMY7A93"];

    // Build equipment text with driver, helper/sinaleiro and plate
    // Use equipment in the yard (no canteiro) from the same logic as Entrada/Saída page
    const dynamicEquipment = equipmentSummary.equipmentNoCanteiro.filter(
      eq => !fixedPlates.includes(eq.plate)
    );
    
    const dynamicEquipmentText = dynamicEquipment.length > 0
      ? dynamicEquipment
          .map((eq) => {
            const typeLabel = equipmentTypeLabels[eq.equipment_type] || eq.equipment_type;
            // Use "Sinaleiro" for munk type, "Ajudante" for others
            const helperLabel = eq.equipment_type === "munk" ? "Sinaleiro" : "Ajudante";
            const helperText = eq.helper && eq.helper.trim() !== "" ? ` | ${helperLabel}: ${eq.helper}` : "";
            const driverText = eq.driver && eq.driver.trim() !== "" ? `\n      Motorista: ${eq.driver}` : "";
            return `   • ${typeLabel} (${eq.plate})${driverText}${helperText}`;
          })
          .join("\n")
      : "";

    // Combine fixed + dynamic equipment
    const operatingEquipmentText = dynamicEquipmentText 
      ? `${fixedEquipmentText}\n${dynamicEquipmentText}`
      : fixedEquipmentText;

    // Build jardinagem equipment text
    const jardinagemEquipmentText = jardinagemEquipmentSummary.items.length > 0
      ? jardinagemEquipmentSummary.items
          .map((item) => `   • ${item.count} ${item.name}`)
          .join("\n")
      : "   Nenhum equipamento no canteiro";

    // DDS info - use saved dds_text if available, otherwise generate from schedule
    let ddsText = "A definir";
    if (existingReport?.dds_text) {
      ddsText = existingReport.dds_text;
    } else if (dateDDS) {
      const presenterName = dateDDS.presenter?.full_name || dateDDS.external_presenter_name || "A definir";
      ddsText = `${presenterName} - ${dateDDS.theme || "Tema a definir"}`;
    }

    // Get jardinagem activities from daily report if available
    const jardinagemFromReport = formatJardinagemForRDO(jardinagemReport);
    
    // Get mudas plantadas for the date
    const mudasPlantadasFromReport = formatMudasPlantadasForRDO(mudasPlantadas);
    
    // Combine jardinagem + mudas plantadas
    const jardinagemSection = [jardinagemFromReport, mudasPlantadasFromReport].filter(Boolean).join("\n");
    
    // Get gabião activities from daily report if available
    const gabiaoFromReport = formatGabiaoForRDO(gabiaoReport);

    // Using Unicode escape sequences for WhatsApp compatibility
    const report = `${E.EMOJI_CONSTRUCTION} EMPRESA: ${headerInfo.empresa}

${E.EMOJI_DOCUMENT} CONTRATO - ${headerInfo.contrato}

${E.EMOJI_ARROW_RIGHT} GERÊNCIA: ${headerInfo.gerencia}

${E.EMOJI_ARROW_RIGHT} LIDERANÇA: ${headerInfo.lideranca}

${E.EMOJI_ARROW_RIGHT} TST: ${headerInfo.tst}

${E.EMOJI_ARROW_RIGHT} LOCAL: ${headerInfo.local}

${E.EMOJI_ARROW_RIGHT} DATA: ${capitalizedDate}

${E.EMOJI_ARROW_RIGHT} HORÁRIO: ${headerInfo.horario}

${E.EMOJI_ARROW_RIGHT} DDS: ${ddsText}

${E.EMOJI_TOOLS} ATIVIDADES:

🌿 Jardinagem 🌿

${jardinagemSection}

${E.EMOJI_WORKER} Efetivo ${E.EMOJI_WORKER}
${jardinagemWorkforce}

✳️ ÁREA GABIÃO ✳️

${gabiaoFromReport}

${E.EMOJI_WORKER} Efetivo ${E.EMOJI_WORKER}
${gabiaoWorkforce}

${E.EMOJI_CHECK} EQUIPAMENTOS EM OPERAÇÃO (${dynamicEquipment.length + 2})
${operatingEquipmentText}

${E.EMOJI_CHECK} Equipamentos Jardinagem na Obra (${jardinagemEquipmentSummary.total})
${jardinagemEquipmentText}

    Condições climáticas:
• MANHÃ = ${weatherLabels[weatherMorning]}
• TARDE = ${weatherLabels[weatherAfternoon]}${showTemperature && displayTemp ? `
• 🌡️ TEMPERATURA${isLiveTemp ? " ATUAL" : ""} = ${displayTemp.temperature}°C (sensação ${displayTemp.apparentTemp}°C)` : ""}

${E.EMOJI_WARNING} DIFICULDADES/DESVIOS
${difficulties}`;

    return report;
  };

  const handleWhatsApp = async () => {
    const report = generateReport();
    const ok = await copyAndShareWhatsApp(report);
    if (ok) toast.success("Enviado para WhatsApp!");
    else toast.error("Erro ao compartilhar");
  };

  const handleCopyOnly = async () => {
    const report = generateReport();
    const ok = await copyToClipboard(report);
    if (ok) toast.success("Relatório copiado!");
    else toast.error("Erro ao copiar relatório");
  };



  // RDO Lock hook
  const { isLocked, lockData, lockRDO, unlockRDO, canUnlock } = useRDOLock(selectedDateStr);

  const handleSave = async () => {
    if (!user) {
      toast.error("Você precisa estar logado para salvar o relatório.");
      return;
    }

    if (isLocked) {
      toast.error("Este relatório está bloqueado. Desbloqueie para editar.");
      return;
    }

    try {
      // Generate DDS text to save
      let ddsTextToSave = "A definir";
      if (dateDDS) {
        const presenterName = dateDDS.presenter?.full_name || dateDDS.external_presenter_name || "A definir";
        ddsTextToSave = `${presenterName} - ${dateDDS.theme || "Tema a definir"}`;
      }

      // Persiste a temperatura capturada (preferindo o valor atual/congelado de hoje, com fallback ao já salvo)
      const tempToSave = isToday ? (frozenTemp ?? currentTemp ?? savedTemp) : savedTemp;

      await saveReport.mutateAsync({
        report_date: selectedDateStr,
        weather_morning: weatherMorning,
        weather_afternoon: weatherAfternoon,
        difficulties,
        photo_urls: photos,
        report_text: generateReport(),
        dds_text: ddsTextToSave,
        temperature: tempToSave?.temperature ?? null,
        apparent_temp: tempToSave?.apparentTemp ?? null,
        humidity: tempToSave?.humidity ?? null,
        temperature_captured_at: tempToSave?.fetchedAt ?? null,
      });
      
      // Lock the report after saving
      await lockRDO.mutateAsync();
      
      toast.success("Relatório salvo e bloqueado!");
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    }
  };

  const handleUnlock = async () => {
    try {
      await unlockRDO.mutateAsync();
      toast.success("Relatório desbloqueado!");
    } catch (error: any) {
      toast.error("Erro ao desbloquear: " + error.message);
    }
  };

  const handleDelete = async () => {
    if (!existingReport) return;
    
    if (isLocked && !canUnlock && !isAdmin) {
      toast.error("Este relatório está bloqueado. Desbloqueie para excluir.");
      return;
    }

    if (!confirm("Tem certeza que deseja excluir este relatório?")) return;

    try {
      // Unlock first if locked
      if (isLocked) {
        await unlockRDO.mutateAsync();
      }
      await deleteReport.mutateAsync(existingReport.id);
      toast.success("Relatório excluído!");
    } catch (error: any) {
      toast.error("Erro ao excluir: " + error.message);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate files
    const validFiles = files.filter((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} não é uma imagem válida.`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} excede 5MB.`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setIsUploadingPhotos(true);
    try {
      const urls = await uploadPhotos(validFiles);
      setPhotos((prev) => [...prev, ...urls]);
      toast.success(`${urls.length} foto(s) adicionada(s)!`);
    } catch (error: any) {
      toast.error("Erro ao fazer upload: " + error.message);
    } finally {
      setIsUploadingPhotos(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // Get dates with reports for calendar highlighting
  const datesWithReports = useMemo(() => {
    return allReports?.map((r) => r.report_date) || [];
  }, [allReports]);

  return (
    <Layout>
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Read-only banner */}
        {!canEdit && <ReadOnlyBanner message="Você está visualizando esta página em modo somente leitura. Apenas Administradores e Encarregado Geral podem editar." />}
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />
            <div className="min-w-0">
              <EditablePageTitle pageKey="rdo" defaultValue="RDO - Relatório Diário de Obra" className="text-lg sm:text-2xl font-bold" />
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm text-muted-foreground">{capitalizedDate}</p>
                {isFriday && (
                  <Badge variant="secondary" className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1 text-xs">
                    <Clock className="h-3 w-3" />
                    Horário Reduzido
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          {(showTemperature && displayTemp) && (
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/20 gap-1.5 py-1">
                <Sun className="h-3 w-3" />
                {isLiveTemp ? "Temperatura Atual" : "Temperatura"}: {displayTemp.temperature}°C (sensação {displayTemp.apparentTemp}°C)
              </Badge>
              {prevDayTemp && displayTemp !== prevDayTemp && (
                <Badge variant="outline" className="text-xs bg-indigo-500/10 text-indigo-600 border-indigo-500/20 gap-1.5 py-1">
                  <Sun className="h-3 w-3" />
                  Ontem: {prevDayTemp.temperature}°C (sensação {prevDayTemp.apparentTemp}°C)
                </Badge>
              )}
            </div>
          )}

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
                  <DialogTitle>Histórico de RDOs</DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-[400px] pr-4">
                  {allReports?.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum relatório salvo ainda.
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
                                {weatherLabels[report.weather_morning]} / {weatherLabels[report.weather_afternoon]}
                              </p>
                            </div>
                            {report.photo_urls?.length > 0 && (
                              <Badge variant="secondary" className="gap-1">
                                <Image className="h-3 w-3" />
                                {report.photo_urls.length}
                              </Badge>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </DialogContent>
            </Dialog>

            {/* Lock Status Badge */}
            {isLocked && (
              <Badge variant="destructive" className="gap-1">
                <Lock className="h-3 w-3" />
                Bloqueado
              </Badge>
            )}

            {/* Unlock Button - only show if locked and user can unlock */}
            {isLocked && (canUnlock || isAdmin) && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="gap-2 border-amber-500 text-amber-600 hover:bg-amber-500/10">
                    <Unlock className="h-4 w-4" />
                    Desbloquear
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Desbloquear Relatório?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Ao desbloquear, o relatório poderá ser editado novamente. Deseja continuar?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleUnlock}>
                      Desbloquear
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {existingReport && !isLocked && canEdit && (
              <Button variant="destructive" size="icon" onClick={handleDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}

            <Button variant="outline" onClick={handleWhatsApp}>
              <MessageCircle className="h-4 w-4 mr-2 text-[#25D366]" />
              WhatsApp
            </Button>
            <Button variant="outline" onClick={handleCopyOnly}>
              <Copy className="h-4 w-4 mr-2" />
              Copiar
            </Button>


            <Button 
              onClick={handleSave} 
              disabled={saveReport.isPending || lockRDO.isPending || isLocked || !canEdit}
              className={isLocked || !canEdit ? "opacity-50" : ""}
            >
              {saveReport.isPending || lockRDO.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : isLocked ? (
                <Lock className="h-4 w-4 mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {isLocked ? "Bloqueado" : !canEdit ? "Somente Leitura" : "Salvar"}
            </Button>
          </div>
        </div>

        {isLoadingReport && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-6">
            <TabsTrigger value="report" className="gap-2">
              <FileText className="h-4 w-4" />
              Relatório Diário
            </TabsTrigger>
            <TabsTrigger value="planned" className="gap-2">
              <Clock className="h-4 w-4" />
              Atividade Prevista
            </TabsTrigger>
          </TabsList>

          <TabsContent value="report">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Form */}
              <div className="space-y-4">
                {/* Header Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Informações Gerais</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Empresa</Label>
                        <Input
                          value={headerInfo.empresa}
                          onChange={(e) => setHeaderInfo({ ...headerInfo, empresa: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Contrato</Label>
                        <Input
                          value={headerInfo.contrato}
                          onChange={(e) => setHeaderInfo({ ...headerInfo, contrato: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Gerência</Label>
                        <Input
                          value={headerInfo.gerencia}
                          onChange={(e) => setHeaderInfo({ ...headerInfo, gerencia: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Liderança</Label>
                        <Input
                          value={headerInfo.lideranca}
                          onChange={(e) => setHeaderInfo({ ...headerInfo, lideranca: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>TST</Label>
                        <Input
                          value={headerInfo.tst}
                          onChange={(e) => setHeaderInfo({ ...headerInfo, tst: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Local</Label>
                        <Input
                          value={headerInfo.local}
                          onChange={(e) => setHeaderInfo({ ...headerInfo, local: e.target.value })}
                        />
                      </div>
                      <div className="col-span-2 space-y-2">
                        <Label>Horário</Label>
                        <Input
                          value={headerInfo.horario}
                          onChange={(e) => setHeaderInfo({ ...headerInfo, horario: e.target.value })}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>


                {/* Weather & Difficulties */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Condições e Observações</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>☀️ Manhã</Label>
                        <Select value={weatherMorning} onValueChange={setWeatherMorning}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {weatherOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                <div className="flex items-center gap-2">
                                  <opt.icon className="h-4 w-4" />
                                  {opt.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>🌙 Tarde</Label>
                        <Select value={weatherAfternoon} onValueChange={setWeatherAfternoon}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {weatherOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                <div className="flex items-center gap-2">
                                  <opt.icon className="h-4 w-4" />
                                  {opt.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>⚠ Dificuldades/Desvios</Label>
                      <Textarea
                        value={difficulties}
                        onChange={(e) => setDifficulties(e.target.value)}
                        placeholder="Não Houve."
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Photos */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Image className="h-5 w-5" />
                      Fotos do Relatório
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      multiple
                      onChange={handleFileSelect}
                    />
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingPhotos}
                    >
                      {isUploadingPhotos ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Image className="h-4 w-4 mr-2" />
                          Adicionar Fotos (máx. 5MB cada)
                        </>
                      )}
                    </Button>

                    {photos.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {photos.map((url, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={url}
                              alt={`Foto ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg"
                            />
                            <button
                              onClick={() => removePhoto(index)}
                              className="absolute top-1 right-1 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {photos.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {photos.length} foto(s) adicionada(s)
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Preview */}
              <Card className="h-fit lg:sticky lg:top-4">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    📋 Prévia do Relatório
                    {existingReport && (
                      <Badge variant="secondary">Salvo</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px]">
                    <pre className="whitespace-pre-wrap text-sm font-mono bg-muted p-4 rounded-lg">
                      {generateReport()}
                    </pre>
                    
                    {photos.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-sm font-medium">📷 Fotos anexadas:</p>
                        <div className="grid grid-cols-2 gap-2">
                          {photos.map((url, index) => (
                            <img
                              key={index}
                              src={url}
                              alt={`Foto ${index + 1}`}
                              className="w-full h-32 object-cover rounded-lg"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="planned">
            <PlannedActivitiesTab
              selectedDate={selectedDate}
              gabiaoActivities={baseGabiaoActivities}
              jardinagemActivities={baseJardinagemActivities}
              initialPlanned={existingReport?.planned_activities}
              onSave={handleSavePlanned}
              isSaving={saveReport.isPending}
              canEdit={canEdit && !isLocked}
            />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
