import { useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getLogoBase64 } from "@/lib/pdfLogo";
import type { Equipment, EquipmentStopHistory } from "@/hooks/useEquipment";
import type { EquipmentMovement } from "@/hooks/useEquipmentMovements";

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

    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Parte Diária de Equipamento - ${params.equipmentName}</title>
        <style>
          @page { size: A4; margin: 8mm; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 0;
            font-family: Arial, Helvetica, sans-serif;
            color: #000;
            font-size: 10px;
            line-height: 1.2;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .sheet {
            border: 2px solid #000;
          }
          .logo-row {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 6px 8px;
            border-bottom: 1px solid #000;
          }
          .logo-row img { height: 30px; }

          .top {
            display: grid;
            grid-template-columns: 1fr 210px;
            border-bottom: 1px solid #000;
          }
          .top-title {
            background: #e6e6e6;
            font-weight: 700;
            text-align: center;
            padding: 6px 8px;
            border-right: 1px solid #000;
            font-size: 12px;
            letter-spacing: .3px;
          }
          .obra {
            display: grid;
            grid-template-columns: 60px 1fr;
          }
          .obra .label {
            background: #e6e6e6;
            font-weight: 700;
            padding: 6px 8px;
            border-right: 1px solid #000;
          }
          .obra .value { padding: 6px 8px; }

          .info-row {
            display: grid;
            grid-template-columns: 170px 1fr 70px 120px;
            border-bottom: 1px solid #000;
          }
          .cell-label {
            background: #f0f0f0;
            font-weight: 700;
            padding: 5px 8px;
            border-right: 1px solid #000;
            font-size: 9px;
            text-transform: uppercase;
          }
          .cell-value {
            padding: 5px 8px;
            border-right: 1px solid #000;
          }
          .info-row > div:nth-child(4) { border-right: none; }

          .main {
            display: grid;
            grid-template-columns: 190px 1fr;
            min-height: 420px;
          }
          .left { border-right: 1px solid #000; }

          .block-title {
            background: #f0f0f0;
            font-weight: 700;
            text-align: center;
            padding: 4px 8px;
            border-bottom: 1px solid #000;
            font-size: 9px;
            text-transform: uppercase;
          }

          .pair {
            display: grid;
            grid-template-columns: 1fr 1fr;
            border-bottom: 1px solid #000;
          }
          .pair .box {
            padding: 6px 6px;
            text-align: center;
            border-right: 1px solid #000;
          }
          .pair .box:last-child { border-right: none; }
          .mini {
            font-size: 8px;
            color: #555;
            margin-bottom: 2px;
          }
          .val {
            font-family: monospace;
            font-weight: 700;
            font-size: 11px;
            min-height: 14px;
          }

          .fuel {
            border-bottom: 1px solid #000;
            padding: 6px;
          }
          .fuel-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }
          .fuel-item { text-align: center; }
          .fuel-item .mini { margin-bottom: 4px; }
          .fuel-line {
            height: 18px;
            border: 1px solid #000;
            margin: 0 auto;
            width: 120px;
            background: #fff;
          }

          .desc-title {
            background: #f0f0f0;
            font-weight: 700;
            text-align: center;
            padding: 4px 8px;
            border-bottom: 1px solid #000;
            font-size: 9px;
            text-transform: uppercase;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          .cell {
            border: 1px solid #000;
            padding: 3px 5px;
            height: 22px;
            font-size: 10px;
          }
          .horario { width: 55px; text-align: center; font-family: monospace; }
          .as { width: 30px; text-align: center; font-size: 9px; }
          .desc { width: auto; }

          .signatures {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 10px;
            padding: 18px 10px 8px;
            border-top: 1px solid #000;
          }
          .sig {
            text-align: center;
          }
          .sig .line {
            border-top: 1px solid #000;
            margin-top: 28px;
            margin-bottom: 4px;
          }
          .sig .lbl { font-size: 8px; }

          .instructions {
            border-top: 1px solid #000;
            padding: 6px 8px;
            font-size: 7px;
            line-height: 1.35;
          }
          .instructions strong { font-weight: 700; }

          @media print {
            body { margin: 0; }
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
              <div class="value"></div>
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
          <div class="info-row" style="grid-template-columns: 170px 1fr 70px 120px;">
            <div class="cell-label">ABASTECIMENTO</div>
            <div class="cell-value"></div>
            <div class="cell-label">TAG</div>
            <div class="cell-value"></div>
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
                    <div class="fuel-line"></div>
                  </div>
                  <div class="fuel-item">
                    <div class="mini">FINAL</div>
                    <div class="fuel-line"></div>
                  </div>
                </div>
              </div>
            </div>

            <div>
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
            <div class="sig"><div class="line"></div><div class="lbl">Ass. Motorista/Op</div></div>
            <div class="sig"><div class="line"></div><div class="lbl">Ass. Encarreg./Apontador</div></div>
            <div class="sig"><div class="line"></div><div class="lbl">Ass. Gerência</div></div>
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
