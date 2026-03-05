import { useState, useMemo, useCallback, useRef } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePluviometriaYear } from "@/hooks/usePluviometria";
import { CloudRain, Leaf, FileDown } from "lucide-react";
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
    if (!spreadsheetRef.current) return;
    toast.info("Gerando PDF...");
    try {
      const { jsPDF } = await import("jspdf");
      const canvas = await html2canvas(spreadsheetRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("l", "mm", "a4");
      const pdfW = pdf.internal.pageSize.getWidth() - 20;
      const pdfH = (canvas.height * pdfW) / canvas.width;
      pdf.addImage(imgData, "PNG", 10, 10, pdfW, pdfH);
      pdf.save(`pluviometria-${setor}-${ano}.pdf`);
      toast.success("PDF exportado!");
    } catch {
      toast.error("Erro ao gerar PDF");
    }
  }, [setor, ano]);

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
      <div ref={spreadsheetRef} className="overflow-x-auto border-2 border-[#00873e] rounded">
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
    <div className="container mx-auto p-4 space-y-4 max-w-[1400px]">
      <div className="flex items-center gap-3">
        <Leaf className="w-7 h-7 text-[#00873e]" />
        <h1 className="text-2xl font-bold">Meio Ambiente</h1>
      </div>

      <Tabs defaultValue="pluviometria">
        <TabsList>
          <TabsTrigger value="pluviometria" className="gap-2">
            <CloudRain className="w-4 h-4" /> Pluviometria
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
