import { useState, useRef } from "react";
import { FileText, Loader2, CalendarRange } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { getLogoBase64 } from "@/lib/pdfLogo";
import { supabase } from "@/integrations/supabase/client";
import { getBrazilNorthTodayString } from "@/lib/timezone";

const EXIT_REASON_LABELS: Record<string, string> = {
  manutencao_corretiva: "Manutenção Corretiva",
  manutencao_preventiva: "Manutenção Preventiva",
  vistoria: "Vistoria",
  operando: "Operando",
  aguardando_frente_servico: "Aguardando Frente de Serviço",
  fim_turno: "Fim de Turno",
};

export function ExportMovementsHistoryPdfButton() {
  const today = getBrazilNorthTodayString();
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!startDate || !endDate) {
      toast.error("Selecione as datas de início e fim");
      return;
    }
    if (startDate > endDate) {
      toast.error("Data de início deve ser anterior à data final");
      return;
    }

    setIsExporting(true);
    try {
      const logoBase64 = await getLogoBase64();

      // Fetch vehicle movements in the date range
      const { data: movements, error } = await supabase
        .from("equipment_movements")
        .select("*")
        .gte("movement_date", startDate)
        .lte("movement_date", endDate)
        .order("movement_date", { ascending: true })
        .order("movement_time", { ascending: true });

      if (error) throw error;

      // Fetch jardinagem announcements for the date range (jardinagem doesn't have a movement history table)
      // We'll query announcements that match jardinagem patterns
      const { data: jardinagemEquipment } = await supabase
        .from("jardinagem_equipment")
        .select("*")
        .order("name");

      const startLabel = format(new Date(startDate + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR });
      const endLabel = format(new Date(endDate + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR });
      const now = new Date();
      const dateStr = format(now, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

      // Group movements by date
      const movementsByDate: Record<string, typeof movements> = {};
      (movements || []).forEach((m: any) => {
        if (!movementsByDate[m.movement_date]) {
          movementsByDate[m.movement_date] = [];
        }
        movementsByDate[m.movement_date].push(m);
      });

      const sortedDates = Object.keys(movementsByDate).sort();

      const buildMovementRows = (movs: any[]) => {
        return movs.map((m: any) => {
          const isEntrada = m.movement_type === "entrada";
          const emoji = isEntrada ? "🟢" : "🔴";
          const typeLabel = isEntrada ? "ENTRADA" : "SAÍDA";
          const badgeClass = isEntrada
            ? "background: #dcfce7; color: #166534;"
            : "background: #ffedd5; color: #c2410c;";
          const reasonBadge = !isEntrada && m.exit_reason
            ? `<span class="badge" style="background: #fef3c7; color: #92400e;">${EXIT_REASON_LABELS[m.exit_reason] || m.exit_reason}</span>`
            : "-";

          return `
            <tr>
              <td>${m.movement_time || "-"}</td>
              <td><strong>${m.equipment_name}</strong></td>
              <td class="mono">${m.plate}</td>
              <td><span class="badge" style="${badgeClass}">${emoji} ${typeLabel}</span></td>
              <td>${reasonBadge}</td>
              <td>${m.problem_description || "-"}</td>
              <td>${m.observation || "-"}</td>
            </tr>
          `;
        }).join("");
      };

      const vehicleSectionsHtml = sortedDates.length === 0
        ? '<p style="padding: 10px; color: #666;">Nenhuma movimentação de veículos no período selecionado.</p>'
        : sortedDates.map(date => {
          const dateFormatted = format(new Date(date + "T12:00:00"), "EEEE, dd/MM/yyyy", { locale: ptBR });
          const movs = movementsByDate[date];
          const entradas = movs.filter((m: any) => m.movement_type === "entrada").length;
          const saidas = movs.filter((m: any) => m.movement_type === "saida").length;

          return `
            <div class="date-section">
              <div class="date-header">
                📅 ${dateFormatted}
                <span class="date-stats">
                  <span style="color: #166534;">🟢 ${entradas} entrada${entradas !== 1 ? 's' : ''}</span> |
                  <span style="color: #c2410c;">🔴 ${saidas} saída${saidas !== 1 ? 's' : ''}</span>
                </span>
              </div>
              <table>
                <thead>
                  <tr>
                    <th style="width: 70px;">Hora</th>
                    <th>Equipamento</th>
                    <th style="width: 90px;">Placa</th>
                    <th style="width: 100px;">Tipo</th>
                    <th>Motivo</th>
                    <th>Problema</th>
                    <th>Observação</th>
                  </tr>
                </thead>
                <tbody>
                  ${buildMovementRows(movs)}
                </tbody>
              </table>
            </div>
          `;
        }).join("");

      // Jardinagem section - show current status only since there's no history table
      const jardinagemHtml = (jardinagemEquipment && jardinagemEquipment.length > 0) ? `
        <div class="section">
          <div class="section-title jard">🌿 Equipamentos de Jardinagem - Status Atual</div>
          <table>
            <thead>
              <tr>
                <th style="width: 40px;">#</th>
                <th>Equipamento</th>
                <th style="width: 100px;">Status</th>
                <th>Última Atualização</th>
              </tr>
            </thead>
            <tbody>
              ${jardinagemEquipment.map((eq: any, idx: number) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td><strong>${eq.name}</strong></td>
                  <td><span class="badge" style="${eq.status === 'entrou' ? 'background: #dcfce7; color: #166534;' : 'background: #ffedd5; color: #c2410c;'}">${eq.status === 'entrou' ? '🟢 Entrou' : '🔴 Saiu'}</span></td>
                  <td>${format(new Date(eq.status_changed_at), "dd/MM/yyyy HH:mm")}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      ` : '';

      // Summary
      const totalEntradas = (movements || []).filter((m: any) => m.movement_type === "entrada").length;
      const totalSaidas = (movements || []).filter((m: any) => m.movement_type === "saida").length;
      const uniqueEquipments = new Set((movements || []).map((m: any) => m.plate)).size;

      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("Popup bloqueado. Permita popups para exportar.");
        return;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Histórico de Movimentações - ${startLabel} a ${endLabel}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 20px; font-size: 11px; color: #333; }
            .header { display: flex; align-items: center; gap: 20px; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px; }
            .logo { height: 50px; }
            .title { flex: 1; }
            .title h1 { font-size: 16px; margin-bottom: 4px; }
            .title p { color: #666; font-size: 11px; }
            .summary { display: flex; gap: 20px; margin-bottom: 20px; padding: 12px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e2e8f0; }
            .summary-item { text-align: center; flex: 1; }
            .summary-item .number { font-size: 22px; font-weight: bold; }
            .summary-item .label { font-size: 10px; color: #666; margin-top: 2px; }
            .section { margin-bottom: 20px; }
            .section-title { font-size: 13px; font-weight: bold; margin-bottom: 10px; padding: 8px; background: #f5f5f5; border-left: 4px solid #333; }
            .section-title.jard { border-left-color: #22c55e; }
            .date-section { margin-bottom: 15px; }
            .date-header { font-size: 12px; font-weight: bold; padding: 6px 10px; background: #eef2ff; border-left: 4px solid #6366f1; margin-bottom: 5px; display: flex; justify-content: space-between; align-items: center; }
            .date-stats { font-size: 10px; font-weight: normal; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
            th, td { border: 1px solid #ddd; padding: 5px 8px; text-align: left; font-size: 10px; }
            th { background: #f9f9f9; font-weight: bold; }
            .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold; white-space: nowrap; }
            .mono { font-family: monospace; }
            .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #666; border-top: 1px solid #ddd; padding-top: 15px; }
            @media print { 
              body { padding: 10px; }
              .date-section { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${logoBase64}" alt="Logo" class="logo" />
            <div class="title">
              <h1>Histórico de Movimentações de Equipamentos</h1>
              <p>Período: ${startLabel} a ${endLabel} | Gerado em: ${dateStr}</p>
            </div>
          </div>

          <div class="summary">
            <div class="summary-item">
              <div class="number" style="color: #166534;">${totalEntradas}</div>
              <div class="label">Entradas</div>
            </div>
            <div class="summary-item">
              <div class="number" style="color: #c2410c;">${totalSaidas}</div>
              <div class="label">Saídas</div>
            </div>
            <div class="summary-item">
              <div class="number" style="color: #6366f1;">${uniqueEquipments}</div>
              <div class="label">Equipamentos</div>
            </div>
            <div class="summary-item">
              <div class="number">${sortedDates.length}</div>
              <div class="label">Dias com Movim.</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">🚛 Movimentações de Veículos</div>
            ${vehicleSectionsHtml}
          </div>

          ${jardinagemHtml}

          <div class="footer">
            <p>OBRA: 460001269 | Sucena Engenharia</p>
          </div>
        </body>
        </html>
      `);

      printWindow.document.close();
      setTimeout(() => printWindow.print(), 500);
      toast.success("PDF gerado com sucesso!");
      setOpen(false);
    } catch (err) {
      console.error("Erro ao exportar:", err);
      toast.error("Erro ao gerar PDF");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <FileText className="h-4 w-4" />
          Exportar PDF
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5 text-primary" />
            Exportar Histórico de Movimentações
          </DialogTitle>
          <DialogDescription>
            Selecione o período para gerar o relatório completo de entradas e saídas.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label>Data Início</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Data Fim</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleExport} disabled={isExporting} className="gap-2">
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            Gerar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
