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

      const movementsRows = todayMovements
        .sort((a, b) => a.movement_time.localeCompare(b.movement_time))
        .map(
          (m) => `
            <tr>
              <td>${m.movement_time.slice(0, 5)}</td>
              <td>
                <span class="badge ${m.movement_type === "entrada" ? "badge-entrada" : "badge-saida"}">
                  ${m.movement_type === "entrada" ? "Entrada" : "Saída"}
                </span>
              </td>
              <td>${getExitReasonLabel(m.exit_reason)}</td>
              <td>${m.observation || "-"}</td>
            </tr>
          `
        )
        .join("");

      const stopsRows = todayStops
        .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime())
        .map(
          (stop) => `
            <tr>
              <td>${format(new Date(stop.started_at), "HH:mm", { locale: ptBR })}</td>
              <td>${stop.ended_at ? format(new Date(stop.ended_at), "HH:mm", { locale: ptBR }) : "Em andamento"}</td>
              <td>${getStatusLabel(stop.stop_reason)}</td>
              <td>${formatDuration(stop.duration_minutes)}</td>
              <td>${stop.defect_description || "-"}</td>
            </tr>
          `
        )
        .join("");

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <title>Parte Diária - ${equipment.name}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              color: #333;
              font-size: 11px;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              padding-bottom: 15px;
              border-bottom: 2px solid #333;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .header .logo {
              max-height: 50px;
              max-width: 140px;
              object-fit: contain;
            }
            .header-info { 
              text-align: right; 
            }
            .header-info h1 {
              font-size: 20px;
              margin-bottom: 5px;
            }
            .header-info p {
              font-size: 12px;
              color: #666;
            }
            .vehicle-info {
              background: #f5f5f5;
              padding: 15px;
              border-radius: 8px;
              margin-bottom: 20px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .vehicle-main {
              display: flex;
              flex-direction: column;
              gap: 5px;
            }
            .vehicle-name {
              font-size: 18px;
              font-weight: bold;
            }
            .vehicle-plate {
              font-family: monospace;
              font-size: 14px;
              color: #666;
            }
            .vehicle-type {
              font-size: 12px;
              color: #888;
              text-transform: uppercase;
            }
            .vehicle-status {
              text-align: right;
            }
            .status-badge {
              display: inline-block;
              padding: 6px 12px;
              border-radius: 20px;
              font-weight: bold;
              font-size: 11px;
            }
            .status-operando { background: #22c55e; color: white; }
            .status-manutencao { background: #f97316; color: white; }
            .status-aguardando { background: #eab308; color: black; }
            .status-fim-turno { background: #3b82f6; color: white; }
            .status-chuva { background: #0ea5e9; color: white; }
            .status-abastecimento { background: #06b6d4; color: white; }
            
            .driver-info {
              display: flex;
              gap: 30px;
              margin-bottom: 20px;
              padding: 10px 15px;
              background: #fafafa;
              border-left: 4px solid #333;
            }
            .driver-info div {
              display: flex;
              flex-direction: column;
            }
            .driver-info label {
              font-size: 10px;
              color: #888;
              text-transform: uppercase;
            }
            .driver-info span {
              font-weight: bold;
              font-size: 13px;
            }
            
            .section-title {
              font-size: 14px;
              font-weight: bold;
              margin: 20px 0 10px 0;
              padding-bottom: 5px;
              border-bottom: 1px solid #ddd;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 15px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px 6px;
              text-align: left;
              font-size: 10px;
            }
            th {
              background-color: #f5f5f5;
              font-weight: bold;
              text-transform: uppercase;
              font-size: 9px;
            }
            tr:nth-child(even) {
              background-color: #fafafa;
            }
            
            .badge {
              display: inline-block;
              padding: 2px 8px;
              border-radius: 10px;
              font-size: 9px;
              font-weight: bold;
            }
            .badge-entrada { background: #22c55e; color: white; }
            .badge-saida { background: #6b7280; color: white; }
            
            .summary-box {
              display: flex;
              gap: 20px;
              margin-bottom: 20px;
            }
            .summary-item {
              flex: 1;
              padding: 12px;
              background: #f5f5f5;
              border-radius: 8px;
              text-align: center;
            }
            .summary-item label {
              display: block;
              font-size: 10px;
              color: #888;
              text-transform: uppercase;
              margin-bottom: 5px;
            }
            .summary-item span {
              font-size: 18px;
              font-weight: bold;
            }
            .summary-item.green span { color: #22c55e; }
            .summary-item.orange span { color: #f97316; }
            
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 10px;
              color: #666;
              padding-top: 15px;
              border-top: 1px solid #ddd;
            }
            
            .empty-message {
              text-align: center;
              color: #888;
              padding: 20px;
              font-style: italic;
            }
            
            @media print {
              body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" class="logo" />` : "<div></div>"}
            <div class="header-info">
              <h1>Parte Diária</h1>
              <p>${format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
            </div>
          </div>
          
          <div class="vehicle-info">
            <div class="vehicle-main">
              <span class="vehicle-name">${equipment.name}</span>
              <span class="vehicle-plate">${equipment.plate}</span>
              <span class="vehicle-type">${equipment.equipment_type === "pipa" ? "Caminhão Pipa" : "Caminhão Munk"}</span>
            </div>
            <div class="vehicle-status">
              <span class="status-badge ${(() => {
                const reason = equipment.stop_reason as string | null;
                if (!reason || reason === "none" || reason === "operando") return "status-operando";
                if (reason === "maintenance") return "status-manutencao";
                if (reason === "waiting" || reason === "waiting_front") return "status-aguardando";
                if (reason === "end_of_shift") return "status-fim-turno";
                if (reason === "rain") return "status-chuva";
                if (reason === "abastecimento") return "status-abastecimento";
                return "";
              })()}">
                ${getStatusLabel(equipment.stop_reason as string | null)}
              </span>
            </div>
          </div>
          
          <div class="driver-info">
            <div>
              <label>Motorista</label>
              <span>${equipment.driver || "Não vinculado"}</span>
            </div>
            <div>
              <label>Ajudante</label>
              <span>${equipment.helper || "Não informado"}</span>
            </div>
            <div>
              <label>Horário de Trabalho</label>
              <span>${String(equipment.start_hour).padStart(2, "0")}:00 - ${String(equipment.end_hour).padStart(2, "0")}:00</span>
            </div>
          </div>
          
          <div class="summary-box">
            <div class="summary-item">
              <label>Movimentações</label>
              <span>${todayMovements.length}</span>
            </div>
            <div class="summary-item">
              <label>Paradas</label>
              <span>${todayStops.length}</span>
            </div>
            <div class="summary-item orange">
              <label>Tempo Parado</label>
              <span>${formatDuration(totalStopMinutes)}</span>
            </div>
          </div>
          
          <h3 class="section-title">Movimentações do Dia</h3>
          ${
            todayMovements.length > 0
              ? `
                <table>
                  <thead>
                    <tr>
                      <th>Hora</th>
                      <th>Tipo</th>
                      <th>Motivo</th>
                      <th>Observação</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${movementsRows}
                  </tbody>
                </table>
              `
              : '<p class="empty-message">Nenhuma movimentação registrada hoje</p>'
          }
          
          <h3 class="section-title">Histórico de Paradas</h3>
          ${
            todayStops.length > 0
              ? `
                <table>
                  <thead>
                    <tr>
                      <th>Início</th>
                      <th>Fim</th>
                      <th>Motivo</th>
                      <th>Duração</th>
                      <th>Descrição</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${stopsRows}
                  </tbody>
                </table>
              `
              : '<p class="empty-message">Nenhuma parada registrada hoje</p>'
          }
          
          <div class="footer">
            Painel Sucena - Sistema de Gestão • Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();

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
