import { useState, useMemo, useCallback, useRef } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePluviometriaYear } from "@/hooks/usePluviometria";
import { CloudRain, Leaf, FileDown, Droplets } from "lucide-react";
import AbastecimentoCaixaDagua from "@/components/meioambiente/AbastecimentoCaixaDagua";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import logoSucenaEmpreendimentos from "@/assets/logo-sucena-empreendimentos.png";

const MESES = [
  "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO",
  "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO",
];

const SETORES = [
  { value: "campo", label: "CAMPO" },
  { value: "canteiro", label: "CANTEIRO" },
];

const PERIODOS: Record<string, string> = {
  campo: "08:00H ÀS 08:00H",
  canteiro: "08:00H ÀS 17:00H",
};

function PluviometriaSpreadsheet({ setor, ano }: { setor: string; ano: number }) {
  const { data: records, isLoading, upsert, remove } = usePluviometriaYear(setor, ano);
  const [editingCell, setEditingCell] = useState<{ mes: number; dia: number } | null>(null);
  const [editValue, setEditValue] = useState("");
  const spreadsheetRef = useRef<HTMLDivElement>(null);
  // Build lookup: key "mes-dia" -> mm
  const lookup = useMemo(() => {
    const map = new Map<string, number>();
    records?.forEach((r) => map.set(`${r.mes}-${r.dia}`, Number(r.mm)));
    return map;
  }, [records]);

  // For each month, compute consecutive rain colors
  const cellColors = useMemo(() => {
    const colors = new Map<string, "green" | "red">();
    for (let m = 1; m <= 12; m++) {
      for (let d = 1; d <= 31; d++) {
        const key = `${m}-${d}`;
        const val = lookup.get(key);
        if (val === undefined) continue;

        let hasConsecutive = false;
        const prev = lookup.get(`${m}-${d - 1}`);
        if (prev !== undefined && prev > 0 && val > 0) hasConsecutive = true;
        const next = lookup.get(`${m}-${d + 1}`);
        if (next !== undefined && next > 0 && val > 0) hasConsecutive = true;

        if (val > 0 && hasConsecutive) {
          colors.set(key, "green");
        } else {
          colors.set(key, "red");
        }
      }
    }
    return colors;
  }, [lookup]);

  // Totals per month
  const monthTotals = useMemo(() => {
    const totals = new Map<number, number>();
    for (let m = 1; m <= 12; m++) {
      let total = 0;
      for (let d = 1; d <= 31; d++) {
        const val = lookup.get(`${m}-${d}`);
        if (val !== undefined) total += val;
      }
      totals.set(m, total);
    }
    return totals;
  }, [lookup]);

  const totalAnual = useMemo(() => {
    let t = 0;
    monthTotals.forEach((v) => (t += v));
    return t;
  }, [monthTotals]);

  const handleSave = useCallback((mes: number, dia: number, value: string) => {
    // If empty, delete the record to clear the cell
    if (value.trim() === "") {
      remove.mutate({ mes, dia }, {
        onSuccess: () => {
          toast.success(`${MESES[mes - 1]} dia ${dia}: apagado`);
          setEditingCell(null);
          setEditValue("");
        },
        onError: () => toast.error("Erro ao apagar"),
      });
      return;
    }
    const val = parseFloat(value);
    if (isNaN(val) || val < 0) {
      toast.error("Valor inválido");
      return;
    }
    upsert.mutate({ mes, dia, mm: val }, {
      onSuccess: () => {
        toast.success(`${MESES[mes - 1]} dia ${dia}: ${val}mm`);
        setEditingCell(null);
        setEditValue("");
      },
      onError: () => toast.error("Erro ao salvar"),
    });
  }, [upsert, remove]);

  const handleExportPDF = useCallback(async () => {
    toast.info("Gerando PDF...");
    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF("l", "mm", "a4");
      const pageW = pdf.internal.pageSize.getWidth(); // 297
      const pageH = pdf.internal.pageSize.getHeight(); // 210
      const margin = 5;
      const usableW = pageW - margin * 2;

      // --- Header ---
      const green = "#00873e";
      pdf.setFontSize(14);
      pdf.setTextColor(green);
      pdf.setFont("helvetica", "bold");
      pdf.text("PLANILHA DE CONTROLE DE PRECIPITAÇÃO", margin, margin + 8);

      pdf.setFontSize(14);
      pdf.setTextColor("#000000");
      pdf.text(`ANO ${ano}`, pageW / 2 - 10, margin + 8);

      // Load logo
      try {
        const logoImg = new Image();
        logoImg.crossOrigin = "anonymous";
        await new Promise<void>((resolve) => {
          logoImg.onload = () => resolve();
          logoImg.onerror = () => resolve();
          logoImg.src = "/logo-sucena-empreendimentos.png";
        });
        if (logoImg.complete && logoImg.naturalWidth > 0) {
          const logoH = 12;
          const logoW = (logoImg.naturalWidth / logoImg.naturalHeight) * logoH;
          pdf.addImage(logoImg, "PNG", pageW - margin - logoW, margin, logoW, logoH);
        }
      } catch {}

      // Setor / Período
      pdf.setFontSize(9);
      pdf.setTextColor(green);
      pdf.setFont("helvetica", "bold");
      pdf.text("SETOR", margin, margin + 15);
      pdf.setDrawColor(green);
      pdf.rect(margin + 14, margin + 11.5, 25, 5);
      pdf.setTextColor("#000000");
      pdf.setFont("helvetica", "bold");
      pdf.text(setor.toUpperCase(), margin + 16, margin + 15);

      pdf.setTextColor(green);
      pdf.text("PERÍODO", margin + 50, margin + 15);
      pdf.rect(margin + 66, margin + 11.5, 35, 5);
      pdf.setTextColor("#000000");
      pdf.text(PERIODOS[setor], margin + 68, margin + 15);

      // --- Table ---
      const tableTop = margin + 22;
      const monthColW = 22;
      const totalColW = 14;
      const dayColW = (usableW - monthColW - totalColW) / 31;
      const rowH = 5.5;
      const headerH = 7;

      // Header row
      pdf.setFillColor(green);
      pdf.rect(margin, tableTop, usableW, headerH, "F");
      pdf.setTextColor("#ffffff");
      pdf.setFontSize(6);
      pdf.setFont("helvetica", "bold");
      pdf.text("MÊS/DIA", margin + 1, tableTop + 4.5);
      for (let d = 1; d <= 31; d++) {
        const x = margin + monthColW + (d - 1) * dayColW;
        pdf.text(String(d), x + dayColW / 2, tableTop + 4.5, { align: "center" });
      }
      pdf.text("TOTAL", margin + monthColW + 31 * dayColW + 1, tableTop + 3.5);
      pdf.text("MENSAL", margin + monthColW + 31 * dayColW + 1, tableTop + 6);

      // Data rows
      const dataTop = tableTop + headerH;
      MESES.forEach((mesName, idx) => {
        const mesNum = idx + 1;
        const y = dataTop + idx * rowH;

        // Row border
        pdf.setDrawColor("#c0c0c0");
        pdf.setLineWidth(0.1);
        pdf.rect(margin, y, usableW, rowH);

        // Month name
        pdf.setTextColor("#000000");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(6);
        pdf.text(mesName, margin + 1, y + 3.8);

        // Day cells
        for (let d = 1; d <= 31; d++) {
          const key = `${mesNum}-${d}`;
          const val = lookup.get(key);
          const cellX = margin + monthColW + (d - 1) * dayColW;
          const color = cellColors.get(key);

          // Cell border
          pdf.setDrawColor("#d0d0d0");
          pdf.setLineWidth(0.1);
          pdf.rect(cellX, y, dayColW, rowH);

          if (color === "green") {
            pdf.setFillColor("#00873e");
            pdf.rect(cellX, y, dayColW, rowH, "F");
          } else if (color === "red") {
            pdf.setFillColor("#c00000");
            pdf.rect(cellX, y, dayColW, rowH, "F");
          }

          if (val !== undefined) {
            pdf.setTextColor(color ? "#ffffff" : "#000000");
            pdf.setFont("helvetica", color ? "bold" : "normal");
            pdf.setFontSize(5.5);
            pdf.text(String(val), cellX + dayColW / 2, y + 3.8, { align: "center" });
          }
        }

        // Monthly total
        const totalX = margin + monthColW + 31 * dayColW;
        pdf.setDrawColor("#c0c0c0");
        pdf.rect(totalX, y, totalColW, rowH);
        pdf.setTextColor("#000000");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(6);
        pdf.text(String(monthTotals.get(mesNum) || 0), totalX + totalColW / 2, y + 3.8, { align: "center" });
      });

      // --- Legend ---
      const legendY = dataTop + 12 * rowH + 4;

      // Yellow square
      pdf.setFillColor("#facc15");
      pdf.rect(margin, legendY, 3, 3, "F");
      pdf.setTextColor("#000000");
      pdf.setFontSize(6);
      pdf.setFont("helvetica", "normal");
      pdf.text("COLETA FORA DO HORÁRIO", margin + 5, legendY + 2.5);

      // Red square
      pdf.setFillColor("#c00000");
      pdf.rect(margin, legendY + 5, 3, 3, "F");
      pdf.text("SEM COLETA", margin + 5, legendY + 7.5);

      // Green square
      pdf.setFillColor("#00873e");
      pdf.rect(margin, legendY + 10, 3, 3, "F");
      pdf.text("VALOR ACUMULADO PARA O DIA POSTERIOR", margin + 5, legendY + 12.5);

      // Total Anual
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(green);
      pdf.text(String(totalAnual), pageW - margin - 25, legendY + 5, { align: "center" });
      pdf.setDrawColor(green);
      pdf.setLineWidth(0.5);
      pdf.rect(pageW - margin - 38, legendY + 7, 26, 10);
      pdf.setFontSize(7);
      pdf.setTextColor("#000000");
      pdf.text("TOTAL", pageW - margin - 25, legendY + 12, { align: "center" });
      pdf.text("ANUAL", pageW - margin - 25, legendY + 15, { align: "center" });

      pdf.save(`pluviometria-${setor}-${ano}.pdf`);
      toast.success("PDF exportado!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar PDF");
    }
  }, [setor, ano, lookup, cellColors, monthTotals, totalAnual]);

  if (isLoading) {
    return <div className="flex justify-center p-8 text-muted-foreground">Carregando...</div>;
  }

  const cellBg = (key: string) => {
    const color = cellColors.get(key);
    if (color === "green") return "bg-[#00873e]";
    if (color === "red") return "bg-[#c00000]";
    return "";
  };

  const cellText = (key: string) => {
    const color = cellColors.get(key);
    if (color === "green" || color === "red") return "text-white font-semibold";
    return "";
  };

  return (
    <div>
      <div className="flex justify-end mb-2">
        <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-2">
          <FileDown className="w-4 h-4" /> Exportar PDF
        </Button>
      </div>
      <div ref={spreadsheetRef} className="border-2 border-[#00873e] rounded">
      {/* Header */}
      <div className="bg-white dark:bg-card p-3 border-b-2 border-[#00873e]">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#00873e] tracking-wide">
            PLANILHA DE CONTROLE DE PRECIPITAÇÃO
          </h2>
          <span className="text-lg font-bold">ANO {ano}</span>
          <img src={logoSucenaEmpreendimentos} alt="Sucena Empreendimentos" className="h-14 object-contain" />
        </div>
        <div className="flex items-center gap-8 mt-1 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#00873e]">SETOR</span>
            <span className="border border-[#00873e] px-3 py-0.5 font-semibold bg-white dark:bg-card min-w-[120px]">
              {setor.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#00873e]">PERÍODO</span>
            <span className="border border-[#00873e] px-3 py-0.5 font-semibold bg-white dark:bg-card">
              {PERIODOS[setor]}
            </span>
          </div>
        </div>
      </div>

      {/* Spreadsheet grid */}
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-[#00873e] text-white">
            <th className="border border-[#00873e] px-1 py-1 text-left sticky left-0 bg-[#00873e] z-10 min-w-[90px] text-xs font-bold">
              MÊS/DIA
            </th>
            {Array.from({ length: 31 }, (_, i) => (
              <th key={i + 1} className="border border-[#00873e] px-0.5 py-1 text-center min-w-[28px] text-xs font-bold">
                {i + 1}
              </th>
            ))}
            <th className="border border-[#00873e] px-1 py-1 text-center min-w-[50px] text-xs font-bold">
              TOTAL<br />MENSAL
            </th>
          </tr>
        </thead>
        <tbody>
          {MESES.map((mesName, idx) => {
            const mesNum = idx + 1;
            return (
              <tr key={mesNum} className="hover:bg-muted/30">
                <td className="border border-[#00873e] px-1 py-0.5 font-bold text-xs sticky left-0 bg-white dark:bg-card z-10">
                  {mesName}
                </td>
                {Array.from({ length: 31 }, (_, d) => {
                  const dia = d + 1;
                  const key = `${mesNum}-${dia}`;
                  const val = lookup.get(key);
                  const isEditing = editingCell?.mes === mesNum && editingCell?.dia === dia;

                  return (
                    <td
                      key={dia}
                      className={`border border-[#00873e]/50 px-0 py-0 text-center cursor-pointer ${cellBg(key)} ${cellText(key)}`}
                      onClick={() => {
                        if (!isEditing) {
                          setEditingCell({ mes: mesNum, dia });
                          setEditValue(val !== undefined ? String(val) : "");
                        }
                      }}
                    >
                      {isEditing ? (
                        <Input
                          type="number"
                          min={0}
                          step={0.1}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full h-6 text-xs text-center p-0 border-0 rounded-none bg-yellow-100 dark:bg-yellow-900"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSave(mesNum, dia, editValue);
                            if (e.key === "Escape") { setEditingCell(null); setEditValue(""); }
                            if (e.key === "Tab") {
                              e.preventDefault();
                              handleSave(mesNum, dia, editValue);
                            }
                          }}
                          onBlur={() => {
                            handleSave(mesNum, dia, editValue);
                          }}
                          autoFocus
                        />
                      ) : (
                        <span className="text-[10px] leading-tight">
                          {val !== undefined ? val : ""}
                        </span>
                      )}
                    </td>
                  );
                })}
                <td className="border border-[#00873e] px-1 py-0.5 text-center font-bold text-xs bg-white dark:bg-card">
                  {monthTotals.get(mesNum) || 0}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Legend + Total Anual */}
      <div className="border-t-2 border-[#00873e] p-3 bg-white dark:bg-card flex items-end justify-between">
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 bg-yellow-400 border border-muted" />
            <span>COLETA FORA DO HORÁRIO</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 bg-[#c00000] border border-muted" />
            <span>SEM COLETA</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 bg-[#00873e] border border-muted" />
            <span>VALOR ACUMULADO PARA O DIA POSTERIOR</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-[#00873e]">{totalAnual}</div>
          <div className="border-2 border-[#00873e] px-3 py-1 text-xs font-bold mt-1">
            TOTAL<br />ANUAL
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

export default function MeioAmbiente() {
  const currentDate = new Date();
  const [setor, setSetor] = useState("campo");
  const [ano, setAno] = useState(currentDate.getFullYear());

  return (
    <div className="mx-auto p-4 space-y-4 w-full overflow-x-auto">
      <div className="flex items-center gap-3">
        <Leaf className="w-7 h-7 text-[#00873e]" />
        <h1 className="text-2xl font-bold">Meio Ambiente</h1>
      </div>

      <Tabs defaultValue="pluviometria">
        <TabsList>
          <TabsTrigger value="pluviometria" className="gap-2">
            <CloudRain className="w-4 h-4" /> Pluviometria
          </TabsTrigger>
          <TabsTrigger value="abastecimento" className="gap-2">
            <Droplets className="w-4 h-4" /> Caixa D'Água
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pluviometria">
          <div className="flex flex-wrap gap-3 mb-4">
            <Select value={setor} onValueChange={setSetor}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SETORES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026, 2027].map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <PluviometriaSpreadsheet setor={setor} ano={ano} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
