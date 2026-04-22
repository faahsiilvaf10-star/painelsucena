import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import ExcelJS from "exceljs";
import type { Colaborador } from "@/data/efetivoData";
import type { AbsenceRow, AbsenceReason } from "@/hooks/useAbsenceReasons";

interface Props {
  year: number;
  month: number;
  colaboradores: Colaborador[];
  absences: AbsenceRow[];
}

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// Sigla curta padrão usada em relatórios de presença
const reasonShort = (r: string): string => {
  const map: Record<string, string> = {
    "Falta": "F",
    "Atestado": "AT",
    "Treinamento": "TR",
    "Folga por Exame": "FE",
    "Folga": "FG",
    "Afastado": "AF",
    "Licença Maternidade/Paternidade": "LM",
    "INSS": "IN",
    "Folga de Campo": "FC",
    "Licença Casamento": "LC",
    "Licença Morte": "LO",
  };
  return map[r] || r.slice(0, 2).toUpperCase();
};

// Cores ARGB (hex sem #) por motivo - tons suaves p/ legibilidade
const REASON_FILL: Record<string, string> = {
  "Falta": "FFFECACA",
  "Atestado": "FFFEF3C7",
  "Treinamento": "FFDBEAFE",
  "Folga por Exame": "FFE9D5FF",
  "Folga": "FFD1FAE5",
  "Afastado": "FFFED7AA",
  "Licença Maternidade/Paternidade": "FFFBCFE8",
  "INSS": "FFCFFAFE",
  "Folga de Campo": "FFCCFBF1",
  "Licença Casamento": "FFFFE4E6",
  "Licença Morte": "FFE2E8F0",
};

const REASON_FONT: Record<string, string> = {
  "Falta": "FFB91C1C",
  "Atestado": "FFB45309",
  "Treinamento": "FF1D4ED8",
  "Folga por Exame": "FF7E22CE",
  "Folga": "FF047857",
  "Afastado": "FFC2410C",
  "Licença Maternidade/Paternidade": "FFBE185D",
  "INSS": "FF0E7490",
  "Folga de Campo": "FF0F766E",
  "Licença Casamento": "FFBE123C",
  "Licença Morte": "FF334155",
};

const ALL_REASONS: AbsenceReason[] = [
  "Falta", "Atestado", "Treinamento", "Folga por Exame", "Folga", "Afastado",
  "Licença Maternidade/Paternidade", "INSS", "Folga de Campo", "Licença Casamento", "Licença Morte",
];

export const ExportRelatorioPresencaExcel = ({ year, month, colaboradores, absences }: Props) => {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    if (!colaboradores.length) {
      toast.error("Sem colaboradores para exportar");
      return;
    }
    setLoading(true);
    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = "OpsHub";
      wb.created = new Date();
      const ws = wb.addWorksheet(`${MONTH_NAMES[month - 1]} ${year}`, {
        views: [{ state: "frozen", xSplit: 3, ySplit: 4 }],
      });

      const daysInMonth = new Date(year, month, 0).getDate();
      const dayList = Array.from({ length: daysInMonth }, (_, i) => i + 1);

      // Map absences: empKey -> date -> row
      const absMap = new Map<string, Map<string, AbsenceRow>>();
      absences.forEach((a) => {
        if (!absMap.has(a.employee_id)) absMap.set(a.employee_id, new Map());
        absMap.get(a.employee_id)!.set(a.date, a);
      });
      const empKey = (c: Colaborador) => String(c.matricula || c.id);

      const totalCols = 3 + daysInMonth + ALL_REASONS.length + 1 + 2; // matr, nome, função + dias + motivos + total + CID + Observações

      // Title
      ws.mergeCells(1, 1, 1, totalCols);
      const titleCell = ws.getCell(1, 1);
      titleCell.value = `RELATÓRIO DE PRESENÇA — ${MONTH_NAMES[month - 1].toUpperCase()} / ${year}`;
      titleCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };
      titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
      ws.getRow(1).height = 26;

      // Subtitle
      ws.mergeCells(2, 1, 2, totalCols);
      const subCell = ws.getCell(2, 1);
      subCell.value = `Total de colaboradores: ${colaboradores.length}   •   Gerado em ${new Date().toLocaleString("pt-BR")}`;
      subCell.font = { name: "Arial", size: 10, italic: true, color: { argb: "FF475569" } };
      subCell.alignment = { horizontal: "center", vertical: "middle" };
      ws.getRow(2).height = 18;

      // Header row 1 - groups
      ws.mergeCells(3, 1, 4, 1);
      ws.mergeCells(3, 2, 4, 2);
      ws.mergeCells(3, 3, 4, 3);
      ws.getCell(3, 1).value = "MATRÍCULA";
      ws.getCell(3, 2).value = "COLABORADOR";
      ws.getCell(3, 3).value = "FUNÇÃO";

      ws.mergeCells(3, 4, 3, 3 + daysInMonth);
      ws.getCell(3, 4).value = "DIAS DO MÊS";
      ws.mergeCells(3, 4 + daysInMonth, 3, 3 + daysInMonth + ALL_REASONS.length);
      ws.getCell(3, 4 + daysInMonth).value = "TOTAIS POR MOTIVO";
      ws.mergeCells(3, totalCols, 4, totalCols);
      ws.getCell(3, totalCols).value = "TOTAL\nAUSÊNCIAS";

      // Header row 2 - days + reasons
      dayList.forEach((d, idx) => {
        const cell = ws.getCell(4, 4 + idx);
        cell.value = String(d).padStart(2, "0");
      });
      ALL_REASONS.forEach((r, idx) => {
        const cell = ws.getCell(4, 4 + daysInMonth + idx);
        cell.value = reasonShort(r);
      });

      // Style headers
      const headerStyle = (row: number) => {
        const r = ws.getRow(row);
        r.eachCell((cell) => {
          cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
          cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } };
          cell.border = {
            top: { style: "thin", color: { argb: "FF1E293B" } },
            left: { style: "thin", color: { argb: "FF1E293B" } },
            bottom: { style: "thin", color: { argb: "FF1E293B" } },
            right: { style: "thin", color: { argb: "FF1E293B" } },
          };
        });
      };
      headerStyle(3);
      headerStyle(4);
      ws.getRow(3).height = 22;
      ws.getRow(4).height = 22;

      // Data rows
      colaboradores.forEach((c, i) => {
        const rowIdx = 5 + i;
        const row = ws.getRow(rowIdx);
        const empMap = absMap.get(empKey(c));

        row.getCell(1).value = c.matricula || "";
        row.getCell(2).value = c.nome;
        row.getCell(3).value = c.funcao;

        const reasonCounts: Record<string, number> = {};
        let totalAus = 0;

        dayList.forEach((d, idx) => {
          const date = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const abs = empMap?.get(date);
          const cell = row.getCell(4 + idx);
          if (abs) {
            cell.value = reasonShort(abs.reason);
            const fill = REASON_FILL[abs.reason] || "FFE2E8F0";
            const font = REASON_FONT[abs.reason] || "FF1E293B";
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
            cell.font = { name: "Arial", size: 9, bold: true, color: { argb: font } };
            reasonCounts[abs.reason] = (reasonCounts[abs.reason] || 0) + 1;
            totalAus++;
          } else {
            cell.value = "•";
            cell.font = { name: "Arial", size: 9, color: { argb: "FF94A3B8" } };
          }
          cell.alignment = { horizontal: "center", vertical: "middle" };
        });

        // Reason totals
        ALL_REASONS.forEach((r, idx) => {
          const cell = row.getCell(4 + daysInMonth + idx);
          const v = reasonCounts[r] || 0;
          cell.value = v || "";
          cell.alignment = { horizontal: "center", vertical: "middle" };
          if (v > 0) {
            cell.font = { name: "Arial", size: 9, bold: true, color: { argb: REASON_FONT[r] } };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: REASON_FILL[r] } };
          } else {
            cell.font = { name: "Arial", size: 9, color: { argb: "FFCBD5E1" } };
          }
        });

        const totalCell = row.getCell(totalCols);
        totalCell.value = totalAus || "";
        totalCell.font = { name: "Arial", size: 10, bold: true, color: { argb: totalAus ? "FFB91C1C" : "FFCBD5E1" } };
        totalCell.alignment = { horizontal: "center", vertical: "middle" };
        totalCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };

        // Row styling
        row.getCell(1).font = { name: "Arial", size: 9, bold: true };
        row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
        row.getCell(2).font = { name: "Arial", size: 10, bold: true };
        row.getCell(2).alignment = { horizontal: "left", vertical: "middle" };
        row.getCell(3).font = { name: "Arial", size: 9, color: { argb: "FF475569" } };
        row.getCell(3).alignment = { horizontal: "left", vertical: "middle" };

        // Zebra
        if (i % 2 === 1) {
          for (let col = 1; col <= 3; col++) {
            const cc = row.getCell(col);
            if (!cc.fill || (cc.fill as ExcelJS.FillPattern).fgColor === undefined) {
              cc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
            }
          }
        }

        // Borders for all cells in this row
        for (let col = 1; col <= totalCols; col++) {
          const cc = row.getCell(col);
          cc.border = {
            top: { style: "thin", color: { argb: "FFE2E8F0" } },
            left: { style: "thin", color: { argb: "FFE2E8F0" } },
            bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
            right: { style: "thin", color: { argb: "FFE2E8F0" } },
          };
        }
        row.height = 18;
      });

      // Totals row
      const totalsRowIdx = 5 + colaboradores.length;
      const totalsRow = ws.getRow(totalsRowIdx);
      ws.mergeCells(totalsRowIdx, 1, totalsRowIdx, 3);
      totalsRow.getCell(1).value = "TOTAIS";
      totalsRow.getCell(1).alignment = { horizontal: "right", vertical: "middle" };
      totalsRow.getCell(1).font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
      totalsRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };

      // Daily totals (count of absences per day)
      dayList.forEach((d, idx) => {
        const date = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        let count = 0;
        absences.forEach((a) => { if (a.date === date) count++; });
        const cell = totalsRow.getCell(4 + idx);
        cell.value = count || "";
        cell.font = { name: "Arial", size: 9, bold: true, color: { argb: count ? "FFFFFFFF" : "FFCBD5E1" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });

      // Reason totals row
      ALL_REASONS.forEach((r, idx) => {
        const count = absences.filter((a) => a.reason === r).length;
        const cell = totalsRow.getCell(4 + daysInMonth + idx);
        cell.value = count || "";
        cell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });

      const grandTotalCell = totalsRow.getCell(totalCols);
      grandTotalCell.value = absences.length || "";
      grandTotalCell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      grandTotalCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFB91C1C" } };
      grandTotalCell.alignment = { horizontal: "center", vertical: "middle" };
      totalsRow.height = 22;

      // Legend (below)
      const legendStart = totalsRowIdx + 2;
      ws.mergeCells(legendStart, 1, legendStart, Math.min(totalCols, 6));
      const legTitle = ws.getCell(legendStart, 1);
      legTitle.value = "LEGENDA";
      legTitle.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      legTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } };
      legTitle.alignment = { horizontal: "left", vertical: "middle", indent: 1 };

      ALL_REASONS.forEach((r, idx) => {
        const lr = ws.getRow(legendStart + 1 + idx);
        lr.getCell(1).value = reasonShort(r);
        lr.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: REASON_FILL[r] } };
        lr.getCell(1).font = { name: "Arial", size: 10, bold: true, color: { argb: REASON_FONT[r] } };
        lr.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
        ws.mergeCells(legendStart + 1 + idx, 2, legendStart + 1 + idx, 6);
        lr.getCell(2).value = r;
        lr.getCell(2).font = { name: "Arial", size: 10 };
        lr.getCell(2).alignment = { horizontal: "left", vertical: "middle", indent: 1 };
      });

      // Column widths
      ws.getColumn(1).width = 12;
      ws.getColumn(2).width = 38;
      ws.getColumn(3).width = 26;
      for (let i = 0; i < daysInMonth; i++) ws.getColumn(4 + i).width = 4.5;
      for (let i = 0; i < ALL_REASONS.length; i++) ws.getColumn(4 + daysInMonth + i).width = 5.5;
      ws.getColumn(totalCols).width = 9;

      // Print setup
      ws.pageSetup = {
        orientation: "landscape",
        paperSize: 9,
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: { left: 0.3, right: 0.3, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
      };

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Relatorio_Presenca_${MONTH_NAMES[month - 1]}_${year}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Excel exportado com sucesso");
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao exportar: " + (e?.message || "falha"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleExport} disabled={loading} variant="outline" size="sm" className="gap-2">
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
      Exportar Excel
    </Button>
  );
};

export default ExportRelatorioPresencaExcel;
