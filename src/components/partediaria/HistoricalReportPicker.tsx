import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarDays, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getLogoBase64 } from "@/lib/pdfLogo";
import { buildFuelGaugeSvg, fuelLevelToLabel } from "@/lib/pdf/fuelGauge";
import type { StatusHistoryEntry } from "@/hooks/useDailyShiftRecords";

interface HistoricalReportPickerProps {
  equipmentId: string;
  equipmentName: string;
  plate: string;
}

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    none: "Operando",
    operando: "Operando",
    waiting: "Aguardando Frente",
    waiting_front: "Aguardando Frente",
    aguardando_frente_servico: "Aguardando Frente",
    rain: "Parado (Chuva)",
    end_of_day: "Abastecendo",
    abastecimento: "Abastecendo",
    maintenance: "Manutenção",
    manutencao_corretiva: "Manutenção Corretiva",
    manutencao_preventiva: "Manutenção Preventiva",
    vistoria: "Vistoria",
    end_of_shift: "Fim de Turno",
    fim_turno: "Fim de Turno",
  };
  return labels[status] || status;
};

const getExitReasonLabel = (reason: string | null): string => {
  if (!reason) return "-";
  const labels: Record<string, string> = {
    manutencao_corretiva: "Manutenção Corretiva",
    manutencao_preventiva: "Manutenção Preventiva",
    vistoria: "Vistoria",
    operando: "Operando",
    aguardando_frente_servico: "Aguardando Frente",
    fim_turno: "Fim de Turno",
  };
  return labels[reason] || reason;
};

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const isReturnAfterRefuelingEntry = (entry: StatusHistoryEntry) => {
  const desc = entry.description ?? "";
  const status = entry.status ?? "";
  const nDesc = normalizeText(desc);
  const nStatus = normalizeText(status);
  return (
    nDesc.includes("retorno apos abastecimento") ||
    nStatus.includes("retorno_abastecimento") ||
    nStatus.includes("retorno abastecimento")
  );
};

export function HistoricalReportPicker({ equipmentId, equipmentName, plate }: HistoricalReportPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isExporting, setIsExporting] = useState(false);

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setIsOpen(false);
  };

  const handleExportPdf = async () => {
    if (!selectedDate) {
      toast.error("Selecione uma data primeiro");
      return;
    }

    setIsExporting(true);

    try {
      const formattedDateForQuery = format(selectedDate, "yyyy-MM-dd");
      
      const { data: records, error } = await supabase
        .from("daily_shift_records")
        .select("*")
        .eq("equipment_id", equipmentId)
        .eq("shift_date", formattedDateForQuery)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!records) {
        toast.error(`Nenhum registro encontrado para ${format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}`);
        setIsExporting(false);
        return;
      }

      await generatePDF(records, selectedDate);
      
    } catch (error) {
      console.error("Error fetching record:", error);
      toast.error("Erro ao buscar relatório");
    } finally {
      setIsExporting(false);
    }
  };

  const generatePDF = async (record: any, date: Date) => {
    try {
      const logoBase64 = await getLogoBase64();
      const formattedDate = format(date, "dd/MM/yyyy", { locale: ptBR });
      
      const { data: exitMovements } = await supabase
        .from("equipment_movements")
        .select("movement_time, exit_reason, problem_description, observation")
        .eq("plate", plate)
        .eq("movement_date", record.shift_date)
        .eq("movement_type", "saida")
        .order("movement_time", { ascending: false })
        .limit(1);
      
      const exitMovement = exitMovements?.[0] || null;
      
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("Pop-up bloqueado. Permita pop-ups para exportar.");
        return;
      }

      const statusHistory = Array.isArray(record.status_history) ? record.status_history : [];
      
      const sortedHistory = [...statusHistory].sort(
        (a: StatusHistoryEntry, b: StatusHistoryEntry) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      const filteredHistory = sortedHistory.filter(
        (entry: StatusHistoryEntry, index: number, arr: StatusHistoryEntry[]) => {
          if (index === 0) return true;
          const prevEntry = arr[index - 1];
          return entry.status !== prevEntry.status || entry.description !== prevEntry.description;
        }
      );

      const activityRows: string[] = [];
      for (let i = 0; i < filteredHistory.length; i++) {
        const entry = filteredHistory[i];
        if (isReturnAfterRefuelingEntry(entry)) continue;

        const nextEntry = filteredHistory[i + 1];
        const startTime = format(new Date(entry.timestamp), "HH:mm", { locale: ptBR });

        const isLastEntry = i === filteredHistory.length - 1;
        const isEndOfShift = entry.status === "end_of_shift" || entry.status === "fim_turno";

        let endTime = "";
        if (nextEntry) {
          endTime = format(new Date(nextEntry.timestamp), "HH:mm", { locale: ptBR });
          if (isReturnAfterRefuelingEntry(nextEntry)) i++;
        } else if (isLastEntry && isEndOfShift) {
          endTime = startTime;
        }

        let description = getStatusLabel(entry.status);
        if (entry.description) description = entry.description;

        activityRows.push(`
          <tr>
            <td class="cell horario-cell">${startTime}</td>
            <td class="cell as-cell">ÀS</td>
            <td class="cell horario-cell">${endTime}</td>
            <td class="cell desc-cell">${description}</td>
          </tr>
        `);
      }

      const totalRows = 12;
      const emptyRowsCount = Math.max(0, totalRows - activityRows.length);
      for (let i = 0; i < emptyRowsCount; i++) {
        activityRows.push(`
          <tr>
            <td class="cell horario-cell"></td>
            <td class="cell as-cell">ÀS</td>
            <td class="cell horario-cell"></td>
            <td class="cell desc-cell"></td>
          </tr>
        `);
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <title>Parte Diária - ${equipmentName} - ${formattedDate}</title>
          <style>
            @page { size: A4; margin: 10mm; }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: Arial, sans-serif;
              font-size: 11px;
              color: #000;
              background: #fff;
              padding: 5mm;
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
            .form-container { border: 2px solid #000; width: 100%; }
            .row { display: flex; border-bottom: 1px solid #000; }
            .row:last-child { border-bottom: none; }
            .cell-label { background: #e8e8e8; font-weight: bold; padding: 5px 8px; border-right: 1px solid #000; font-size: 10px; }
            .cell-value { padding: 5px 8px; border-right: 1px solid #000; flex: 1; }
            .cell-value:last-child { border-right: none; }
            .header-row { background: #d0d0d0; font-weight: bold; font-size: 12px; text-align: center; }
            .header-title { flex: 1; padding: 8px; border-right: 1px solid #000; }
            .header-obra { width: 180px; display: flex; }
            .header-obra .cell-label { background: #d0d0d0; }
            .main-section { display: flex; }
            .left-col { width: 160px; border-right: 1px solid #000; }
            .right-col { flex: 1; }
            .section-title { background: #e8e8e8; font-weight: bold; padding: 4px 8px; border-bottom: 1px solid #000; font-size: 10px; text-align: center; }
            .km-row { display: flex; border-bottom: 1px solid #000; }
            .km-cell { flex: 1; text-align: center; padding: 4px; border-right: 1px solid #000; }
            .km-cell:last-child { border-right: none; }
            .km-label { font-size: 8px; color: #666; }
            .km-value { font-weight: bold; font-size: 12px; }
            .fuel-section { padding: 8px; border-bottom: 1px solid #000; }
            .fuel-row { display: flex; justify-content: space-around; }
            .fuel-item { text-align: center; }
            .fuel-label { font-size: 8px; color: #666; margin-bottom: 3px; }
            .fuel-text { font-weight: bold; font-size: 9px; }
            .activities-header { background: #e8e8e8; font-weight: bold; padding: 4px 8px; border-bottom: 1px solid #000; font-size: 9px; text-align: center; }
            .activities-table { width: 100%; border-collapse: collapse; }
            .activities-table .cell { border: 1px solid #000; padding: 3px 5px; height: 20px; font-size: 10px; }
            .horario-cell { width: 45px; text-align: center; }
            .as-cell { width: 25px; text-align: center; font-size: 9px; }
            .desc-cell { }
            .signatures { display: flex; justify-content: space-between; padding: 25px 15px 10px; border-top: 1px solid #000; }
            .sig-box { text-align: center; width: 30%; }
            .sig-name { font-weight: bold; font-size: 10px; margin: 0; padding: 0; line-height: 1; min-height: 12px; }
            .sig-line { border-top: 1px solid #000; margin-top: 2px; }
            .sig-label { font-size: 8px; margin-top: 2px; }
            .instructions { background: #f5f5f5; padding: 6px 8px; font-size: 7px; line-height: 1.4; border-top: 1px solid #000; }
            .logo-row { text-align: center; padding: 5px; border-bottom: 1px solid #000; }
            .logo { height: 35px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="form-container">
            ${logoBase64 ? `<div class="logo-row"><img src="${logoBase64}" class="logo" alt="Logo" /></div>` : ""}
            
            <div class="row header-row">
              <div class="header-title">PARTE DIÁRIA DE EQUIPAMENTO</div>
              <div class="header-obra">
                <div class="cell-label" style="background:#d0d0d0;">OBRA:</div>
                <div class="cell-value">460001269</div>
              </div>
            </div>

            <div class="row">
              <div class="cell-label" style="width:140px;">MOTORISTA/OPERADOR</div>
              <div class="cell-value" style="flex:2;">${record.driver_name}</div>
              <div class="cell-label">DATA</div>
              <div class="cell-value" style="width:100px;">${formattedDate}</div>
            </div>

            <div class="row">
              <div class="cell-label" style="width:140px;">EQUIPAMENTO</div>
              <div class="cell-value" style="flex:2;">${record.equipment_name}</div>
              <div class="cell-label">PLACA</div>
              <div class="cell-value" style="width:100px;font-family:monospace;">${record.plate}</div>
            </div>

            <div class="row">
              <div class="cell-label" style="width:140px;">AJUDANTE</div>
              <div class="cell-value">${record.helper_name || "-"}</div>
            </div>

            ${exitMovement ? `
            <div class="row" style="background:#fff3cd;">
              <div class="cell-label" style="width:140px;">SAÍDA</div>
              <div class="cell-value" style="width:80px;">${exitMovement.movement_time?.substring(0, 5) || "-"}</div>
              <div class="cell-label">MOTIVO</div>
              <div class="cell-value" style="flex:2;">${getExitReasonLabel(exitMovement.exit_reason)}${exitMovement.problem_description ? ` - ${exitMovement.problem_description}` : ""}${exitMovement.observation ? ` (${exitMovement.observation})` : ""}</div>
            </div>
            ` : ""}

            <div class="main-section">
              <div class="left-col">
                <div class="section-title">KM</div>
                <div class="km-row">
                  <div class="km-cell">
                    <div class="km-label">INICIAL</div>
                    <div class="km-value">${record.initial_km ?? "-"}</div>
                  </div>
                  <div class="km-cell" style="border-right:none;">
                    <div class="km-label">FINAL</div>
                    <div class="km-value">${record.final_km ?? "-"}</div>
                  </div>
                </div>

                <div class="section-title">HORÍMETRO</div>
                <div class="km-row">
                  <div class="km-cell">
                    <div class="km-label">INICIAL</div>
                    <div class="km-value">${record.initial_horimeter ?? "-"}</div>
                  </div>
                  <div class="km-cell" style="border-right:none;">
                    <div class="km-label">FINAL</div>
                    <div class="km-value">${record.final_horimeter ?? "-"}</div>
                  </div>
                </div>

                <div class="section-title">ABASTECIMENTO</div>
                <div class="fuel-section">
                  <div class="fuel-row">
                    <div class="fuel-item">
                      <div class="fuel-label">INICIAL</div>
                      ${buildFuelGaugeSvg({ level: record.initial_fuel_level, width: 80, height: 48 })}
                      <div class="fuel-text">${fuelLevelToLabel(record.initial_fuel_level)}</div>
                    </div>
                    <div class="fuel-item">
                      <div class="fuel-label">FINAL</div>
                      ${buildFuelGaugeSvg({ level: record.final_fuel_level || record.initial_fuel_level, width: 80, height: 48 })}
                      <div class="fuel-text">${fuelLevelToLabel(record.final_fuel_level || record.initial_fuel_level)}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="right-col">
                <div class="activities-header">DESCRIMINAÇÃO: SERVIÇOS, PARADAS E OBS.</div>
                <table class="activities-table">
                  <thead>
                    <tr>
                      <th class="cell horario-cell" style="background:#e8e8e8;">HORÁRIO</th>
                      <th class="cell as-cell" style="background:#e8e8e8;"></th>
                      <th class="cell horario-cell" style="background:#e8e8e8;">FINAL</th>
                      <th class="cell desc-cell" style="background:#e8e8e8;"></th>
                    </tr>
                  </thead>
                  <tbody>
                    ${activityRows.join("")}
                  </tbody>
                </table>
              </div>
            </div>

            <div class="signatures">
              <div class="sig-box">
                <div class="sig-name">${record.driver_name}</div>
                <div class="sig-line"></div>
                <div class="sig-label">Ass. Motorista/Op</div>
              </div>
              <div class="sig-box">
                <div class="sig-name">Creriane Navegantes</div>
                <div class="sig-line"></div>
                <div class="sig-label">Encarregada</div>
              </div>
              <div class="sig-box">
                <div class="sig-name">Luís Carlos</div>
                <div class="sig-line"></div>
                <div class="sig-label">Gerência</div>
              </div>
            </div>

            <div class="instructions">
              <strong>INSTRUÇÕES:</strong> Preencher diariamente. Especificar paradas, abastecimentos e ocorrências.
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
      toast.success(`Relatório de ${formattedDate} gerado!`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Erro ao gerar PDF");
    }
  };

  return (
    <div className="flex items-center gap-0.5">
      {/* Date Picker */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8",
              selectedDate && "text-primary"
            )}
            title={selectedDate 
              ? `Data selecionada: ${format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}` 
              : "Selecionar data"
            }
          >
            <CalendarDays className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <div className="p-3 border-b">
            <p className="text-sm font-medium">Selecione uma data</p>
            <p className="text-xs text-muted-foreground">
              Para gerar PDF do relatório histórico
            </p>
          </div>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            disabled={(date) => date > new Date()}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
            locale={ptBR}
          />
        </PopoverContent>
      </Popover>

      {/* PDF Export Button */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-8 w-8",
          selectedDate ? "text-amber-600 hover:text-amber-700" : "text-muted-foreground"
        )}
        disabled={!selectedDate || isExporting}
        onClick={handleExportPdf}
        title={selectedDate 
          ? `Gerar PDF de ${format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}` 
          : "Selecione uma data primeiro"
        }
      >
        {isExporting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileText className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
