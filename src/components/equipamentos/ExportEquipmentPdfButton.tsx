import { useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getLogoBase64 } from "@/lib/pdfLogo";
import type { Equipment, EquipmentStopHistory } from "@/hooks/useEquipment";
import type { EquipmentMovement } from "@/hooks/useEquipmentMovements";
import { supabase } from "@/integrations/supabase/client";
import {
  buildFuelGaugeSvg,
  fuelLevelToLabel,
  fuelLevelToPercentage,
} from "@/lib/pdf/fuelGauge";

interface ExportEquipmentPdfButtonProps {
  equipment: Equipment;
  movements: EquipmentMovement[];
  stopHistory: EquipmentStopHistory[];
}

export function ExportEquipmentPdfButton({
  equipment,
  movements,
  stopHistory,
}: ExportEquipmentPdfButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const buildParteDiariaFormHtml = (params: {
    logoBase64: string;
    dateLabel: string;
    equipmentName: string;
    plate: string;
    driverName: string;
    helperName: string;
    activities: Array<{ start: string; end: string; description: string }>;
    initialFuelLevel?: string | null;
    finalFuelLevel?: string | null;
  }) => {
    const maxRows = 12;
    const rows = [...params.activities]
      .slice(0, maxRows)
      .concat(
        Array.from({ length: Math.max(0, maxRows - params.activities.length) }).map(() => ({
          start: "",
          end: "",
          description: "",
        }))
      );

    const activityRowsHtml = rows
      .map(
        (r) => `
          <tr>
            <td class="cell horario">${r.start}</td>
            <td class="cell as">ÀS</td>
            <td class="cell horario">${r.end}</td>
            <td class="cell desc">${r.description}</td>
          </tr>
        `
      )
      .join("");

    const instructionText =
      "01 - PREENCHER O CABEÇALHO COM NOME, DATA, TIPO DE EQUIPAMENTO E PLACA/TAG - " +
      "02 - COLOCAR KM OU HORÍMETRO INICIAL E FINAL " +
      "03 - COLOCAR O HORÁRIO QUE INICIA CADA ATIVIDADE. " +
      "04 - COLOCAR HORÁRIO DE INICIO E FINAL QUANDO HOUVER DEFEITO MECÂNICO E DESCREVER O DEFEITO " +
      "05 - AO FINAL DA JORNADA DE TRABALHO ASSINAR E ENTREGAR PARA APONTADOR OU ENCARREGADO RESPONSÁVEL. " +
      "06 - A PARTE DIÁRIA DEVERÁ SER PREENCHIDA TODOS OS DIAS INCLUSIVE DOMINGOS E FÉRIADOS. " +
      "07 - O MOTORISTA/OPERADOR TEM ATÉ O DIA 02 DE CADA MÊS PARA ENTREGAR TODAS AS PARTES DIÁRIAS, E O APONTADOR TEM ATÉ O DIA 04 PARA ENVIAR PARA O SETOR DE CONFERÊNCIA, O DESCUMPRIMENTO DESSE ITEM IRÁ GERAR ADVERTÊNCIA POR ESCRITO.";

    const initialFuelPct = fuelLevelToPercentage(params.initialFuelLevel);
    const finalFuelPct = fuelLevelToPercentage(
      params.finalFuelLevel ?? params.initialFuelLevel
    );

    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Parte Diária de Equipamento - ${params.equipmentName}</title>
        <style>
          @page { 
            size: A4 portrait; 
            margin: 12mm 10mm; 
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          html, body {
            width: 100%;
            height: 100%;
          }
          body {
            font-family: Arial, Helvetica, sans-serif;
            color: #000;
            font-size: 11px;
            line-height: 1.3;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
            padding: 0;
          }
          .sheet {
            border: 2px solid #000;
            width: 100%;
            max-width: 190mm;
            margin: 0 auto;
          }
          .logo-row {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 8px;
            border-bottom: 1px solid #000;
          }
          .logo-row img { height: 40px; }

          .top {
            display: flex;
            border-bottom: 1px solid #000;
          }
          .top-title {
            flex: 1;
            background: #e6e6e6;
            font-weight: 700;
            text-align: center;
            padding: 8px 10px;
            border-right: 1px solid #000;
            font-size: 14px;
            letter-spacing: .5px;
          }
          .obra {
            width: 180px;
            display: flex;
          }
          .obra .label {
            background: #e6e6e6;
            font-weight: 700;
            padding: 8px 10px;
            border-right: 1px solid #000;
            font-size: 11px;
          }
          .obra .value { 
            flex: 1;
            padding: 8px 10px; 
            font-size: 11px;
          }

          .info-row {
            display: flex;
            border-bottom: 1px solid #000;
          }
          .cell-label {
            background: #f0f0f0;
            font-weight: 700;
            padding: 6px 10px;
            border-right: 1px solid #000;
            font-size: 10px;
            text-transform: uppercase;
            white-space: nowrap;
          }
          .cell-value {
            flex: 1;
            padding: 6px 10px;
            border-right: 1px solid #000;
            font-size: 11px;
          }
          .info-row .cell-value:last-child { border-right: none; }
          .info-row .cell-label:first-child { width: 150px; }

          .main {
            display: flex;
          }
          .left { 
            width: 180px;
            border-right: 1px solid #000; 
            flex-shrink: 0;
          }
          .right {
            flex: 1;
          }

          .block-title {
            background: #f0f0f0;
            font-weight: 700;
            text-align: center;
            padding: 6px 10px;
            border-bottom: 1px solid #000;
            font-size: 10px;
            text-transform: uppercase;
          }

          .pair {
            display: flex;
            border-bottom: 1px solid #000;
          }
          .pair .box {
            flex: 1;
            padding: 8px 6px;
            text-align: center;
            border-right: 1px solid #000;
          }
          .pair .box:last-child { border-right: none; }
          .mini {
            font-size: 9px;
            color: #555;
            margin-bottom: 3px;
          }
          .val {
            font-family: monospace;
            font-weight: 700;
            font-size: 12px;
            min-height: 16px;
          }

          .fuel {
            border-bottom: 1px solid #000;
            padding: 8px;
          }
          .fuel-grid {
            display: flex;
            justify-content: space-around;
          }
          .fuel-item { text-align: center; }
          .fuel-item .mini { margin-bottom: 5px; }
          .fuel-svg { display: block; margin: 0 auto; }

          .desc-title {
            background: #f0f0f0;
            font-weight: 700;
            text-align: center;
            padding: 6px 10px;
            border-bottom: 1px solid #000;
            font-size: 10px;
            text-transform: uppercase;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          .cell {
            border: 1px solid #000;
            padding: 5px 6px;
            height: 26px;
            font-size: 11px;
          }
          .horario { width: 60px; text-align: center; font-family: monospace; }
          .as { width: 35px; text-align: center; font-size: 10px; }
          .desc { width: auto; }

          .signatures {
            display: flex;
            justify-content: space-between;
            padding: 20px 20px 15px;
            border-top: 1px solid #000;
          }
          .sig {
            text-align: center;
            width: 30%;
          }
          .sig-name {
            font-weight: bold;
            font-size: 10px;
            margin: 0;
            padding: 0;
            line-height: 1;
            min-height: 12px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .sig .line {
            border-top: 1px solid #000;
            margin-top: 2px;
            margin-bottom: 5px;
          }
          .sig .lbl { font-size: 9px; }

          .instructions {
            border-top: 1px solid #000;
            padding: 8px 10px;
            font-size: 8px;
            line-height: 1.4;
          }
          .instructions strong { font-weight: 700; }

          @media print {
            html, body { 
              width: 210mm; 
              height: 297mm; 
            }
            .sheet {
              page-break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="sheet">
          ${params.logoBase64 ? `<div class="logo-row"><img src="${params.logoBase64}" alt="Sucena" /></div>` : ""}

          <div class="top">
            <div class="top-title">PARTE DIÁRIA DE EQUIPAMENTO</div>
            <div class="obra">
              <div class="label">OBRA:</div>
              <div class="value">460001269</div>
            </div>
          </div>

          <div class="info-row">
            <div class="cell-label">MOTORISTA/OPERADOR</div>
            <div class="cell-value">${params.driverName || ""}</div>
            <div class="cell-label">DATA</div>
            <div class="cell-value">${params.dateLabel}</div>
          </div>
          <div class="info-row">
            <div class="cell-label">EQUIPAMENTO</div>
            <div class="cell-value">${params.equipmentName}</div>
            <div class="cell-label">PLACA</div>
            <div class="cell-value" style="font-family: monospace;">${params.plate}</div>
          </div>
          <div class="info-row">
            <div class="cell-label">AJUDANTE</div>
            <div class="cell-value">${params.helperName || "-"}</div>
          </div>

          <div class="main">
            <div class="left">
              <div class="block-title">KM</div>
              <div class="pair">
                <div class="box"><div class="mini">INICIAL</div><div class="val"></div></div>
                <div class="box"><div class="mini">FINAL</div><div class="val"></div></div>
              </div>

              <div class="block-title">HORÍMETRO</div>
              <div class="pair">
                <div class="box"><div class="mini">INICIAL</div><div class="val"></div></div>
                <div class="box"><div class="mini">FINAL</div><div class="val"></div></div>
              </div>

              <div class="fuel">
                <div class="block-title" style="border: 1px solid #000; border-left: none; border-right: none; margin: -6px -6px 6px;">ABASTECIMENTO</div>
                <div class="fuel-grid">
                  <div class="fuel-item">
                    <div class="mini">INICIAL</div>
                    <div class="fuel-svg">${buildFuelGaugeSvg({ level: params.initialFuelLevel, width: 80, height: 48 })}</div>
                    <div class="mini" style="margin-top: 3px; font-weight: 700; color: #111;">${fuelLevelToLabel(params.initialFuelLevel)}</div>
                  </div>
                  <div class="fuel-item">
                    <div class="mini">FINAL</div>
                    <div class="fuel-svg">${buildFuelGaugeSvg({ level: params.finalFuelLevel ?? params.initialFuelLevel, width: 80, height: 48 })}</div>
                    <div class="mini" style="margin-top: 3px; font-weight: 700; color: #111;">${fuelLevelToLabel(params.finalFuelLevel ?? params.initialFuelLevel)}</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="right">
              <div class="desc-title">DESCRIMINAÇÃO: SERVIÇOS, PARADAS E OBS.</div>
              <table>
                <thead>
                  <tr>
                    <th class="cell horario" style="background:#f0f0f0;">HORÁRIO</th>
                    <th class="cell as" style="background:#f0f0f0;"></th>
                    <th class="cell horario" style="background:#f0f0f0;">FINAL</th>
                    <th class="cell desc" style="background:#f0f0f0;"></th>
                  </tr>
                </thead>
                <tbody>
                  ${activityRowsHtml}
                </tbody>
              </table>
            </div>
          </div>

          <div class="signatures">
            <div class="sig"><div class="sig-name">${params.driverName || ""}</div><div class="line"></div><div class="lbl">Ass. Motorista/Op</div></div>
            <div class="sig"><div class="sig-name">Creriane Navegantes</div><div class="line"></div><div class="lbl">Ass. Encarreg./Apontador</div></div>
            <div class="sig"><div class="sig-name">Luís Carlos</div><div class="line"></div><div class="lbl">Ass. Gerência</div></div>
          </div>

          <div class="instructions"><strong>INSTRUÇÃO:</strong> ${instructionText}</div>
        </div>
      </body>
      </html>
    `;
  };

  const getStatusLabel = (stopReason: string | null) => {
    if (!stopReason || stopReason === "none" || stopReason === "operando") {
      return "Operando";
    }
    switch (stopReason) {
      case "maintenance":
        return "Manutenção";
      case "waiting":
      case "waiting_front":
        return "Aguardando Frente";
      case "end_of_shift":
        return "Fim de Turno";
      case "end_of_day":
        return "Combustível";
      case "rain":
        return "Chuva";
      case "abastecimento":
        return "Abastecimento";
      default:
        return stopReason;
    }
  };

  const getExitReasonLabel = (reason: string | null) => {
    if (!reason) return "-";
    switch (reason) {
      case "manutencao_corretiva":
        return "Manutenção Corretiva";
      case "manutencao_preventiva":
        return "Manutenção Preventiva";
      case "vistoria":
        return "Vistoria";
      case "operando":
        return "Operando";
      case "aguardando_frente_servico":
        return "Aguardando Frente";
      case "fim_turno":
        return "Fim de Turno";
      default:
        return reason;
    }
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return "-";
    if (minutes >= 60) {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return `${h}h${m > 0 ? ` ${m}min` : ""}`;
    }
    return `${minutes}min`;
  };

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const logoBase64 = await getLogoBase64();
      const today = format(new Date(), "yyyy-MM-dd");
      const dateLabel = format(new Date(), "dd/MM/yyyy", { locale: ptBR });

      // Try to load fuel levels from today's shift record (when available)
      const { data: fuelRecord } = await supabase
        .from("daily_shift_records")
        .select("initial_fuel_level, final_fuel_level")
        .eq("equipment_id", equipment.id)
        .eq("shift_date", today)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Filter today's data
      const todayMovements = movements.filter((m) => m.movement_date === today);
      const todayStops = stopHistory.filter((h) => {
        const stopDate = format(new Date(h.started_at), "yyyy-MM-dd");
        return stopDate === today;
      });

      // Calculate total stop time
      const totalStopMinutes = todayStops.reduce(
        (acc, stop) => acc + (stop.duration_minutes || 0),
        0
      );

      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("Permita pop-ups para exportar PDF");
        setIsExporting(false);
        return;
      }

      const activities = todayStops
        .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime())
        .map((stop) => ({
          start: format(new Date(stop.started_at), "HH:mm", { locale: ptBR }),
          end: stop.ended_at ? format(new Date(stop.ended_at), "HH:mm", { locale: ptBR }) : "",
          description: `${getStatusLabel(stop.stop_reason)}${stop.defect_description ? ` - ${stop.defect_description}` : ""}`,
        }));

      const htmlContent = buildParteDiariaFormHtml({
        logoBase64,
        dateLabel,
        equipmentName: equipment.name,
        plate: equipment.plate,
        driverName: equipment.driver || "",
        helperName: equipment.helper || "",
        activities,
        initialFuelLevel: fuelRecord?.initial_fuel_level ?? null,
        finalFuelLevel: fuelRecord?.final_fuel_level ?? null,
      });

      printWindow.document.write(htmlContent);
      printWindow.document.close();

      printWindow.onload = () => {
        const images = Array.from(printWindow.document.images || []);

        const waitForImages = Promise.all(
          images.map((img) =>
            img.complete
              ? Promise.resolve()
              : new Promise<void>((resolve) => {
                  img.onload = () => resolve();
                  img.onerror = () => resolve();
                })
          )
        );

        waitForImages.finally(() => {
          setTimeout(() => {
            printWindow.print();
            printWindow.onafterprint = () => printWindow.close();
          }, 150);
        });
      };

      toast.success("PDF gerado com sucesso!");
    } catch (error) {
      console.error("Error exporting to PDF:", error);
      toast.error("Erro ao exportar para PDF");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={exportToPDF}
      disabled={isExporting}
      className="h-8 w-8 text-primary hover:bg-primary/10"
      title="Exportar PDF"
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileText className="h-4 w-4" />
      )}
    </Button>
  );
}
