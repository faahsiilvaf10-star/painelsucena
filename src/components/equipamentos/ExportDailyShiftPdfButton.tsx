import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { getLogoBase64 } from "@/lib/pdfLogo";
import type { DailyShiftRecord, StatusHistoryEntry } from "@/hooks/useDailyShiftRecords";

interface ExportDailyShiftPdfButtonProps {
  record: DailyShiftRecord;
  isLoading?: boolean;
}

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    none: "Operando",
    operando: "Operando",
    waiting: "Aguardando Frente",
    rain: "Parado (Chuva)",
    end_of_day: "Abastecendo",
    abastecimento: "Abastecendo",
    maintenance: "Manutenção",
    end_of_shift: "Fim de Turno",
  };
  return labels[status] || status;
};

const getFuelLevelLabel = (level: string | null): string => {
  if (!level) return "";
  const labels: Record<string, string> = {
    empty: "VAZIO",
    quarter: "1/4",
    half: "1/2",
    three_quarters: "3/4",
    full: "CHEIO",
  };
  return labels[level] || level;
};

export function ExportDailyShiftPdfButton({ record, isLoading }: ExportDailyShiftPdfButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const logoBase64 = await getLogoBase64();
      const formattedDate = format(new Date(record.shift_date), "dd/MM/yyyy", { locale: ptBR });
      
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("Pop-up bloqueado. Permita pop-ups para exportar.");
        setIsExporting(false);
        return;
      }

      // Generate activity rows from status history
      const activityRows = record.status_history.length > 0
        ? record.status_history.map((entry: StatusHistoryEntry, index: number) => {
            const nextEntry = record.status_history[index + 1];
            const startTime = format(new Date(entry.timestamp), "HH:mm", { locale: ptBR });
            const endTime = nextEntry 
              ? format(new Date(nextEntry.timestamp), "HH:mm", { locale: ptBR })
              : "";
            const description = getStatusLabel(entry.status);
            
            return `
              <tr>
                <td class="cell time-cell">${startTime}</td>
                <td class="cell time-cell">ÀS</td>
                <td class="cell time-cell">${endTime}</td>
                <td class="cell description-cell">${description}</td>
              </tr>
            `;
          }).join("")
        : "";

      // Add empty rows to complete 12 rows total
      const emptyRowsCount = Math.max(0, 12 - record.status_history.length);
      const emptyRows = Array(emptyRowsCount).fill(`
        <tr>
          <td class="cell time-cell"></td>
          <td class="cell time-cell">ÀS</td>
          <td class="cell time-cell"></td>
          <td class="cell description-cell"></td>
        </tr>
      `).join("");

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Parte Diária - ${record.equipment_name} - ${formattedDate}</title>
          <style>
            @page {
              size: A4;
              margin: 8mm;
            }
            * {
              box-sizing: border-box;
            }
            body {
              font-family: Arial, Helvetica, sans-serif;
              margin: 0;
              padding: 8px;
              background: white;
              color: #000;
              font-size: 10px;
              line-height: 1.2;
            }
            .container {
              border: 2px solid #000;
              padding: 0;
            }
            .header-row {
              display: flex;
              border-bottom: 1px solid #000;
            }
            .header-title {
              flex: 1;
              background: #f0f0f0;
              font-weight: bold;
              font-size: 12px;
              padding: 6px 10px;
              text-align: center;
              border-right: 1px solid #000;
            }
            .header-obra {
              width: 200px;
              display: flex;
            }
            .header-obra-label {
              background: #f0f0f0;
              font-weight: bold;
              padding: 6px 8px;
              border-right: 1px solid #000;
            }
            .header-obra-value {
              flex: 1;
              padding: 6px 8px;
            }
            .info-row {
              display: flex;
              border-bottom: 1px solid #000;
            }
            .info-cell {
              display: flex;
              border-right: 1px solid #000;
            }
            .info-cell:last-child {
              border-right: none;
            }
            .info-label {
              background: #f0f0f0;
              font-weight: bold;
              padding: 4px 6px;
              font-size: 9px;
              white-space: nowrap;
            }
            .info-value {
              padding: 4px 8px;
              min-width: 80px;
              font-weight: 500;
            }
            .main-content {
              display: flex;
            }
            .left-section {
              width: 200px;
              border-right: 1px solid #000;
            }
            .right-section {
              flex: 1;
            }
            .km-section, .horimeter-section {
              border-bottom: 1px solid #000;
            }
            .section-header {
              background: #f0f0f0;
              font-weight: bold;
              padding: 4px 6px;
              font-size: 9px;
              border-bottom: 1px solid #000;
            }
            .km-values {
              display: flex;
            }
            .km-box {
              flex: 1;
              text-align: center;
              padding: 6px 4px;
              border-right: 1px solid #000;
            }
            .km-box:last-child {
              border-right: none;
            }
            .km-label {
              font-size: 8px;
              color: #666;
              margin-bottom: 2px;
            }
            .km-value {
              font-weight: bold;
              font-size: 11px;
              font-family: monospace;
            }
            .fuel-section {
              border-bottom: 1px solid #000;
              padding: 6px;
            }
            .fuel-row {
              display: flex;
              justify-content: space-around;
              margin-top: 4px;
            }
            .fuel-item {
              text-align: center;
            }
            .fuel-label {
              font-size: 8px;
              color: #666;
              margin-bottom: 2px;
            }
            .fuel-gauge {
              width: 50px;
              height: 30px;
              border: 2px solid #333;
              border-radius: 3px;
              position: relative;
              background: linear-gradient(to top, #f59e0b var(--fill), #f5f5f5 var(--fill));
              margin: 0 auto 2px;
            }
            .fuel-text {
              font-weight: bold;
              font-size: 9px;
            }
            .description-header {
              background: #f0f0f0;
              font-weight: bold;
              padding: 4px 8px;
              font-size: 9px;
              border-bottom: 1px solid #000;
              text-align: center;
            }
            .activities-table {
              width: 100%;
              border-collapse: collapse;
            }
            .activities-table .cell {
              border: 1px solid #000;
              padding: 4px 6px;
              height: 22px;
            }
            .time-cell {
              width: 50px;
              text-align: center;
              font-family: monospace;
              font-size: 10px;
            }
            .description-cell {
              font-size: 10px;
            }
            .signatures-section {
              border-top: 1px solid #000;
              padding: 15px 10px 10px;
              display: flex;
              justify-content: space-between;
            }
            .signature-box {
              text-align: center;
              width: 30%;
            }
            .signature-line {
              border-top: 1px solid #000;
              margin-bottom: 4px;
              margin-top: 30px;
            }
            .signature-label {
              font-size: 8px;
              color: #333;
            }
            .instructions {
              background: #f9f9f9;
              border-top: 1px solid #000;
              padding: 6px 8px;
              font-size: 7px;
              line-height: 1.4;
              color: #333;
            }
            .instructions strong {
              display: block;
              margin-bottom: 2px;
            }
            .logo-container {
              text-align: center;
              padding: 4px;
              border-bottom: 1px solid #000;
            }
            .logo {
              height: 30px;
            }
            @media print {
              body { padding: 0; margin: 0; }
              .container { border-width: 1px; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <!-- Logo -->
            ${logoBase64 ? `
              <div class="logo-container">
                <img src="${logoBase64}" alt="Sucena" class="logo" />
              </div>
            ` : ""}
            
            <!-- Header -->
            <div class="header-row">
              <div class="header-title">PARTE DIÁRIA DE EQUIPAMENTO</div>
              <div class="header-obra">
                <div class="header-obra-label">OBRA:</div>
                <div class="header-obra-value">SUCENA</div>
              </div>
            </div>

            <!-- Info Row 1 -->
            <div class="info-row">
              <div class="info-cell" style="flex: 2;">
                <div class="info-label">MOTORISTA/OPERADOR</div>
                <div class="info-value">${record.driver_name}</div>
              </div>
              <div class="info-cell" style="flex: 1;">
                <div class="info-label">DATA</div>
                <div class="info-value">${formattedDate}</div>
              </div>
            </div>

            <!-- Info Row 2 -->
            <div class="info-row">
              <div class="info-cell" style="flex: 2;">
                <div class="info-label">EQUIPAMENTO</div>
                <div class="info-value">${record.equipment_name}</div>
              </div>
              <div class="info-cell" style="flex: 1;">
                <div class="info-label">PLACA</div>
                <div class="info-value" style="font-family: monospace;">${record.plate}</div>
              </div>
            </div>

            <!-- Info Row 3 -->
            <div class="info-row">
              <div class="info-cell" style="flex: 2;">
                <div class="info-label">AJUDANTE</div>
                <div class="info-value">${record.helper_name || "-"}</div>
              </div>
              <div class="info-cell" style="flex: 1;">
                <div class="info-label">TAG</div>
                <div class="info-value">-</div>
              </div>
            </div>

            <!-- Main Content -->
            <div class="main-content">
              <!-- Left Section: KM, Horimeter, Fuel -->
              <div class="left-section">
                <!-- KM Section -->
                <div class="km-section">
                  <div class="section-header">KM</div>
                  <div class="km-values">
                    <div class="km-box">
                      <div class="km-label">INICIAL</div>
                      <div class="km-value">${record.initial_km ?? "-"}</div>
                    </div>
                    <div class="km-box">
                      <div class="km-label">FINAL</div>
                      <div class="km-value">${record.final_km ?? "-"}</div>
                    </div>
                  </div>
                </div>

                <!-- Horimeter Section -->
                <div class="horimeter-section">
                  <div class="section-header">HORÍMETRO</div>
                  <div class="km-values">
                    <div class="km-box">
                      <div class="km-label">INICIAL</div>
                      <div class="km-value">${record.initial_horimeter ?? "-"}</div>
                    </div>
                    <div class="km-box">
                      <div class="km-label">FINAL</div>
                      <div class="km-value">${record.final_horimeter ?? "-"}</div>
                    </div>
                  </div>
                </div>

                <!-- Fuel Section -->
                <div class="fuel-section">
                  <div class="section-header" style="margin: -6px -6px 6px; padding: 4px 6px; border-bottom: 1px solid #000;">ABASTECIMENTO</div>
                  <div class="fuel-row">
                    <div class="fuel-item">
                      <div class="fuel-label">INICIAL</div>
                      <div class="fuel-gauge" style="--fill: ${record.initial_fuel_level === 'full' ? '100%' : record.initial_fuel_level === 'three_quarters' ? '75%' : record.initial_fuel_level === 'half' ? '50%' : record.initial_fuel_level === 'quarter' ? '25%' : '0%'};"></div>
                      <div class="fuel-text">${getFuelLevelLabel(record.initial_fuel_level)}</div>
                    </div>
                    <div class="fuel-item">
                      <div class="fuel-label">FINAL</div>
                      <div class="fuel-gauge" style="--fill: ${(record.final_fuel_level || record.initial_fuel_level) === 'full' ? '100%' : (record.final_fuel_level || record.initial_fuel_level) === 'three_quarters' ? '75%' : (record.final_fuel_level || record.initial_fuel_level) === 'half' ? '50%' : (record.final_fuel_level || record.initial_fuel_level) === 'quarter' ? '25%' : '0%'};"></div>
                      <div class="fuel-text">${getFuelLevelLabel(record.final_fuel_level || record.initial_fuel_level)}</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Right Section: Activities -->
              <div class="right-section">
                <div class="description-header">DESCRIMINAÇÃO: SERVIÇOS, PARADAS E OBS.</div>
                <table class="activities-table">
                  <thead>
                    <tr>
                      <th class="cell time-cell" style="background: #f0f0f0;">HORÁRIO</th>
                      <th class="cell time-cell" style="background: #f0f0f0;"></th>
                      <th class="cell time-cell" style="background: #f0f0f0;">FINAL</th>
                      <th class="cell description-cell" style="background: #f0f0f0;">ATIVIDADE</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${activityRows}
                    ${emptyRows}
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Signatures -->
            <div class="signatures-section">
              <div class="signature-box">
                <div class="signature-line"></div>
                <div class="signature-label">Ass. Motorista/Op</div>
              </div>
              <div class="signature-box">
                <div class="signature-line"></div>
                <div class="signature-label">Ass. Encarreg./Apontador</div>
              </div>
              <div class="signature-box">
                <div class="signature-line"></div>
                <div class="signature-label">Ass. Gerência</div>
              </div>
            </div>

            <!-- Instructions -->
            <div class="instructions">
              <strong>INSTRUÇÃO:</strong>
              01 - PREENCHER O CABEÇALHO COM NOME, DATA, TIPO DE EQUIPAMENTO E PLACA/TAG.
              02 - COLOCAR KM OU HORÍMETRO INICIAL E FINAL.
              03 - COLOCAR O HORÁRIO QUE INICIA CADA ATIVIDADE.
              04 - COLOCAR HORÁRIO DE INICIO E FINAL QUANDO HOUVER DEFEITO MECÂNICO E DESCREVER O DEFEITO.
              05 - AO FINAL DA JORNADA DE TRABALHO ASSINAR E ENTREGAR PARA APONTADOR OU ENCARREGADO RESPONSÁVEL.
              06 - A PARTE DIÁRIA DEVERÁ SER PREENCHIDA TODOS OS DIAS INCLUSIVE DOMINGOS E FERIADOS.
              07 - O MOTORISTA/OPERADOR TEM ATÉ O DIA 02 DE CADA MÊS PARA ENTREGAR TODAS AS PARTES DIÁRIAS, E O APONTADOR TEM ATÉ O DIA 04 PARA ENVIAR PARA O SETOR DE CONFERÊNCIA, O DESCUMPRIMENTO DESSE ITEM IRÁ GERAR ADVERTÊNCIA POR ESCRITO.
            </div>
          </div>
        </body>
        </html>
      `;

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
          }, 150);
        });
      };

      toast.success("Relatório gerado com sucesso!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Erro ao gerar relatório");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={isLoading || isExporting}
      className="gap-2"
    >
      {isLoading || isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileText className="h-4 w-4" />
      )}
      Imprimir Relatório
    </Button>
  );
}
