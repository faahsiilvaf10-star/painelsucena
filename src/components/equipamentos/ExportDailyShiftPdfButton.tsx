import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { getLogoBase64 } from "@/lib/pdfLogo";
import type { DailyShiftRecord, StatusHistoryEntry, RefuelingPoint } from "@/hooks/useDailyShiftRecords";

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
  if (!level) return "Não informado";
  const labels: Record<string, string> = {
    empty: "Vazio",
    quarter: "1/4",
    half: "1/2",
    three_quarters: "3/4",
    full: "Cheio",
  };
  return labels[level] || level;
};

const getFuelGaugeDataUrl = (level: string | null): string => {
  const levelPercentages: Record<string, number> = {
    empty: 0,
    quarter: 25,
    half: 50,
    three_quarters: 75,
    full: 100,
  };
  
  const percentage = levelPercentages[level || "half"] || 50;
  const fillHeight = Math.round((percentage / 100) * 40);
  const yPosition = 50 - fillHeight;
  const levelLabel = getFuelLevelLabel(level);
  
  const svg = `<svg width="80" height="100" viewBox="0 0 80 100" xmlns="http://www.w3.org/2000/svg">
    <rect x="15" y="10" width="50" height="65" rx="5" fill="#f9fafb" stroke="#374151" stroke-width="2"/>
    <rect x="18" y="${73 - fillHeight}" width="44" height="${fillHeight}" rx="3" fill="#f59e0b"/>
    <line x1="8" y1="15" x2="15" y2="15" stroke="#666" stroke-width="1.5"/>
    <text x="6" y="18" font-size="10" fill="#374151" text-anchor="end" font-family="Arial, sans-serif">F</text>
    <line x1="8" y1="42" x2="15" y2="42" stroke="#666" stroke-width="1.5"/>
    <text x="6" y="45" font-size="10" fill="#374151" text-anchor="end" font-family="Arial, sans-serif">½</text>
    <line x1="8" y1="70" x2="15" y2="70" stroke="#666" stroke-width="1.5"/>
    <text x="6" y="73" font-size="10" fill="#374151" text-anchor="end" font-family="Arial, sans-serif">E</text>
    <rect x="30" y="5" width="20" height="8" rx="2" fill="#4b5563"/>
    <text x="40" y="92" font-size="12" fill="#1f2937" text-anchor="middle" font-weight="bold" font-family="Arial, sans-serif">${levelLabel}</text>
  </svg>`;
  
  const base64 = btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${base64}`;
};

export function ExportDailyShiftPdfButton({ record, isLoading }: ExportDailyShiftPdfButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const logoBase64 = await getLogoBase64();
      const formattedDate = format(new Date(record.shift_date), "dd/MM/yyyy", { locale: ptBR });
      const formattedDateFull = format(new Date(record.shift_date), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
      
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("Pop-up bloqueado. Permita pop-ups para exportar.");
        setIsExporting(false);
        return;
      }

      const statusHistoryHtml = record.status_history.length > 0
        ? record.status_history.map((entry: StatusHistoryEntry) => `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">
                ${format(new Date(entry.timestamp), "HH:mm", { locale: ptBR })}
              </td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">
                <span style="background: #f3f4f6; padding: 2px 8px; border-radius: 4px; font-weight: 500;">
                  ${getStatusLabel(entry.status)}
                </span>
              </td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">
                ${entry.changed_by || "Sistema"}
              </td>
            </tr>
          `).join("")
        : '<tr><td colspan="3" style="padding: 16px; text-align: center; color: #6b7280;">Nenhuma alteração de status registrada</td></tr>';

      const refuelingPointsHtml = record.refueling_points.length > 0
        ? record.refueling_points.map((point: RefuelingPoint) => `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 500;">
                ${point.point}
              </td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">
                ${format(new Date(point.started_at), "HH:mm", { locale: ptBR })}
              </td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">
                ${point.ended_at ? format(new Date(point.ended_at), "HH:mm", { locale: ptBR }) : "Em andamento"}
              </td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">
                ${point.duration_minutes ? `${point.duration_minutes} min` : "-"}
              </td>
            </tr>
          `).join("")
        : '<tr><td colspan="4" style="padding: 16px; text-align: center; color: #6b7280;">Nenhum abastecimento registrado</td></tr>';

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Relatório Diário - ${record.equipment_name} - ${formattedDate}</title>
          <style>
            @page {
              size: A4;
              margin: 10mm;
            }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              margin: 0;
              padding: 10px;
              background: white;
              color: #1f2937;
              font-size: 9px;
              line-height: 1.3;
            }
            .header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 2px solid #f59e0b;
              padding-bottom: 8px;
              margin-bottom: 10px;
            }
            .header-left {
              display: flex;
              align-items: center;
              gap: 10px;
            }
            .logo {
              height: 35px;
            }
            .header-title h1 {
              margin: 0;
              font-size: 14px;
              color: #1f2937;
            }
            .header-title p {
              margin: 2px 0 0 0;
              color: #6b7280;
              font-size: 9px;
            }
            .vehicle-badge {
              background: linear-gradient(135deg, #f59e0b, #d97706);
              color: white;
              padding: 6px 12px;
              border-radius: 6px;
              text-align: center;
            }
            .vehicle-badge h2 {
              margin: 0;
              font-size: 11px;
            }
            .vehicle-badge p {
              margin: 2px 0 0 0;
              font-size: 10px;
              font-family: monospace;
            }
            .section {
              margin-bottom: 8px;
              break-inside: avoid;
            }
            .section-title {
              font-size: 10px;
              font-weight: 600;
              color: #374151;
              margin-bottom: 4px;
              padding-bottom: 2px;
              border-bottom: 1px solid #e5e7eb;
            }
            .info-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 8px;
            }
            .info-box {
              background: #f9fafb;
              border: 1px solid #e5e7eb;
              border-radius: 4px;
              padding: 6px;
            }
            .info-box label {
              display: block;
              font-size: 7px;
              color: #6b7280;
              text-transform: uppercase;
              margin-bottom: 2px;
            }
            .info-box .value {
              font-size: 10px;
              font-weight: 600;
              color: #1f2937;
            }
            .info-box .value.mono {
              font-family: monospace;
            }
            .telemetry-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 8px;
              align-items: start;
            }
            .gauge-container {
              display: flex;
              flex-direction: column;
              align-items: center;
              padding: 6px;
              background: #f9fafb;
              border-radius: 4px;
              border: 1px solid #e5e7eb;
            }
            .gauge-label {
              font-size: 7px;
              color: #6b7280;
              text-transform: uppercase;
              margin-bottom: 4px;
            }
            .telemetry-table {
              background: #f9fafb;
              border-radius: 4px;
              border: 1px solid #e5e7eb;
              padding: 6px;
            }
            .telemetry-table h4 {
              margin: 0 0 4px 0;
              font-size: 8px;
              color: #6b7280;
              text-transform: uppercase;
            }
            .telemetry-row {
              display: flex;
              justify-content: space-between;
              padding: 3px 0;
              border-bottom: 1px solid #e5e7eb;
            }
            .telemetry-row:last-child {
              border-bottom: none;
            }
            .telemetry-row .label {
              color: #6b7280;
              font-size: 8px;
            }
            .telemetry-row .value {
              font-weight: 600;
              font-family: monospace;
              font-size: 8px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 8px;
            }
            th {
              background: #f3f4f6;
              padding: 4px 6px;
              text-align: left;
              font-weight: 600;
              color: #374151;
              border-bottom: 1px solid #e5e7eb;
              font-size: 8px;
            }
            td {
              padding: 3px 6px;
            }
            .footer {
              margin-top: 10px;
              padding-top: 6px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              color: #9ca3af;
              font-size: 7px;
            }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-left">
              <img src="${logoBase64}" alt="Sucena" class="logo" />
              <div class="header-title">
                <h1>Relatório Diário de Operação</h1>
                <p>${formattedDateFull}</p>
              </div>
            </div>
            <div class="vehicle-badge">
              <h2>${record.equipment_name}</h2>
              <p>${record.plate}</p>
            </div>
          </div>

          <div class="section">
            <div class="section-title">👤 Equipe</div>
            <div class="info-grid">
              <div class="info-box">
                <label>Motorista</label>
                <div class="value">${record.driver_name}</div>
              </div>
              <div class="info-box">
                <label>Ajudante</label>
                <div class="value">${record.helper_name || "Não informado"}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">📊 Telemetria</div>
            <div class="telemetry-grid">
              <div class="gauge-container">
                <div class="gauge-label">Comb. Inicial</div>
                <img src="${getFuelGaugeDataUrl(record.initial_fuel_level)}" alt="Combustível Inicial" style="width: 80px; height: 100px;" />
              </div>
              <div class="gauge-container">
                <div class="gauge-label">Comb. Final</div>
                <img src="${getFuelGaugeDataUrl(record.final_fuel_level || record.initial_fuel_level)}" alt="Combustível Final" style="width: 80px; height: 100px;" />
              </div>
              </div>
              <div class="telemetry-table">
                <h4>Horímetro</h4>
                <div class="telemetry-row">
                  <span class="label">Inicial</span>
                  <span class="value">${record.initial_horimeter ?? "-"}</span>
                </div>
                <div class="telemetry-row">
                  <span class="label">Final</span>
                  <span class="value">${record.final_horimeter ?? "-"}</span>
                </div>
                <div class="telemetry-row" style="background: #fef3c7; margin: 3px -6px -6px; padding: 4px 6px; border-radius: 0 0 4px 4px;">
                  <span class="label" style="font-weight: 600;">Trab.</span>
                  <span class="value" style="color: #d97706;">
                    ${record.initial_horimeter && record.final_horimeter 
                      ? (record.final_horimeter - record.initial_horimeter).toFixed(1) + "h"
                      : "-"}
                  </span>
                </div>
              </div>
              <div class="telemetry-table">
                <h4>Quilometragem</h4>
                <div class="telemetry-row">
                  <span class="label">Inicial</span>
                  <span class="value">${record.initial_km ?? "-"}</span>
                </div>
                <div class="telemetry-row">
                  <span class="label">Final</span>
                  <span class="value">${record.final_km ?? "-"}</span>
                </div>
                <div class="telemetry-row" style="background: #fef3c7; margin: 3px -6px -6px; padding: 4px 6px; border-radius: 0 0 4px 4px;">
                  <span class="label" style="font-weight: 600;">Perc.</span>
                  <span class="value" style="color: #d97706;">
                    ${record.initial_km && record.final_km 
                      ? (record.final_km - record.initial_km).toFixed(1) + " km"
                      : "-"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">🔄 Histórico de Status</div>
            <table>
              <thead>
                <tr>
                  <th style="width: 60px;">Horário</th>
                  <th>Status</th>
                  <th>Alterado por</th>
                </tr>
              </thead>
              <tbody>
                ${statusHistoryHtml}
              </tbody>
            </table>
          </div>

          <div class="section">
            <div class="section-title">💧 Pontos de Abastecimento</div>
            <table>
              <thead>
                <tr>
                  <th>Ponto</th>
                  <th style="width: 60px;">Início</th>
                  <th style="width: 60px;">Fim</th>
                  <th style="width: 60px;">Duração</th>
                </tr>
              </thead>
              <tbody>
                ${refuelingPointsHtml}
              </tbody>
            </table>
          </div>

          <div class="footer">
            <p>Relatório gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} | Sistema Sucena OpsHub</p>
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
