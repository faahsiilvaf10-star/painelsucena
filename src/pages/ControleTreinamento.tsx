import { useMemo, useState } from "react";
import Layout from "@/components/layout/Layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { GraduationCap, Search, CalendarDays, RefreshCw, Download } from "lucide-react";
import ExcelJS from "exceljs";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface NrTraining {
  id: string;
  matricula: string | null;
  status: string;
  collaborator_name: string;
  role: string | null;
  area: string | null;
  training: "NR20" | "NR35";
  training_date: string | null;
  validity_days: number | null;
}

const daysRemaining = (dateStr: string | null, validity: number | null) => {
  if (!dateStr) return null;
  const v = validity ?? 730;
  const expiry = new Date(dateStr + "T00:00:00");
  expiry.setDate(expiry.getDate() + v);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return { days: diff, expiry };
};

const statusBadge = (days: number | null) => {
  if (days === null) return <Badge variant="outline">Sem registro</Badge>;
  if (days < 0) return <Badge className="bg-red-600 hover:bg-red-700">Vencido ({Math.abs(days)}d)</Badge>;
  if (days <= 30) return <Badge className="bg-orange-500 hover:bg-orange-600">{days} dias</Badge>;
  if (days <= 90) return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-black">{days} dias</Badge>;
  return <Badge className="bg-green-600 hover:bg-green-700">{days} dias</Badge>;
};

const ControleTreinamento = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<NrTraining | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editValidity, setEditValidity] = useState<number>(730);

  const { data: trainings = [], isLoading } = useQuery({
    queryKey: ["nr-trainings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nr_trainings")
        .select("*")
        .order("collaborator_name");
      if (error) throw error;
      return data as NrTraining[];
    },
  });

  const updateMut = useMutation({
    mutationFn: async (payload: { id: string; training_date: string; validity_days: number }) => {
      const { error } = await supabase
        .from("nr_trainings")
        .update({
          training_date: payload.training_date,
          validity_days: payload.validity_days,
        })
        .eq("id", payload.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nr-trainings"] });
      toast({ title: "Data atualizada", description: "Os dias restantes foram recalculados." });
      setEditing(null);
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return trainings;
    return trainings.filter(
      (t) =>
        t.collaborator_name.toLowerCase().includes(term) ||
        (t.role ?? "").toLowerCase().includes(term) ||
        (t.matricula ?? "").toLowerCase().includes(term),
    );
  }, [trainings, search]);

  const nr20 = filtered.filter((t) => t.training === "NR20");
  const nr35 = filtered.filter((t) => t.training === "NR35");

  const openEdit = (t: NrTraining) => {
    setEditing(t);
    setEditDate(t.training_date ?? format(new Date(), "yyyy-MM-dd"));
    setEditValidity(t.validity_days ?? 730);
  };

  const renderTable = (rows: NrTraining[]) => (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left">
              <th className="px-3 py-2 font-semibold">Matrícula</th>
              <th className="px-3 py-2 font-semibold">Colaborador</th>
              <th className="px-3 py-2 font-semibold">Função</th>
              <th className="px-3 py-2 font-semibold">Área</th>
              <th className="px-3 py-2 font-semibold">Data Treinamento</th>
              <th className="px-3 py-2 font-semibold">Validade (dias)</th>
              <th className="px-3 py-2 font-semibold">Próx. Reciclagem</th>
              <th className="px-3 py-2 font-semibold">Dias Restantes</th>
              <th className="px-3 py-2 font-semibold">Ação</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => {
              const r = daysRemaining(t.training_date, t.validity_days);
              return (
                <tr key={t.id} className="border-t hover:bg-muted/30">
                  <td className="px-3 py-2">{t.matricula ?? "-"}</td>
                  <td className="px-3 py-2 font-medium">{t.collaborator_name}</td>
                  <td className="px-3 py-2 text-xs">{t.role ?? "-"}</td>
                  <td className="px-3 py-2 text-xs">{t.area ?? "-"}</td>
                  <td className="px-3 py-2">
                    {t.training_date
                      ? format(new Date(t.training_date + "T00:00:00"), "dd/MM/yyyy")
                      : "-"}
                  </td>
                  <td className="px-3 py-2">{t.validity_days ?? 730}</td>
                  <td className="px-3 py-2">
                    {r ? format(r.expiry, "dd/MM/yyyy") : "-"}
                  </td>
                  <td className="px-3 py-2">{statusBadge(r?.days ?? null)}</td>
                  <td className="px-3 py-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(t)}>
                      <RefreshCw className="h-3 w-3 mr-1" /> Atualizar
                    </Button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">
                  Nenhum registro encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );

  const stats = (rows: NrTraining[]) => {
    let vencidos = 0,
      proximos = 0,
      ok = 0,
      sem = 0;
    rows.forEach((t) => {
      const r = daysRemaining(t.training_date, t.validity_days);
      if (r === null) sem++;
      else if (r.days < 0) vencidos++;
      else if (r.days <= 30) proximos++;
      else ok++;
    });
    return { vencidos, proximos, ok, sem, total: rows.length };
  };

  const s20 = stats(nr20);
  const s35 = stats(nr35);

  const [downloading, setDownloading] = useState(false);

  const handleDownloadExcel = async () => {
    try {
      setDownloading(true);
      const res = await fetch("/templates/Controle_de_Treinamentos_Hydro_Alunorte.xlsx");
      if (!res.ok) throw new Error("Template não encontrado");
      const buf = await res.arrayBuffer();
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buf);

      const fillSheet = (sheetName: string, items: NrTraining[]) => {
        const ws = wb.getWorksheet(sheetName);
        if (!ws) return;
        // Limpa linhas a partir da 3 (mantém cabeçalho linhas 1-2)
        const lastRow = ws.actualRowCount;
        for (let r = lastRow; r >= 3; r--) {
          ws.spliceRows(r, 1);
        }
        items.forEach((t, idx) => {
          const rowIdx = idx + 3;
          const row = ws.getRow(rowIdx);
          row.getCell(1).value = t.matricula ? (isNaN(Number(t.matricula)) ? t.matricula : Number(t.matricula)) : null;
          row.getCell(2).value = t.status || "Ativo";
          row.getCell(3).value = t.collaborator_name;
          row.getCell(4).value = t.role ?? "";
          row.getCell(5).value = t.area ?? "";
          row.getCell(6).value = t.training === "NR20" ? "NR 20" : "NR 35";
          if (t.training_date) {
            const d = new Date(t.training_date + "T00:00:00");
            row.getCell(7).value = d;
            row.getCell(7).numFmt = "dd/mm/yyyy";
          }
          row.getCell(8).value = t.validity_days ?? 730;
          // Fórmulas dinâmicas para Próx. Reciclagem (I) e Dias Restantes (J)
          if (t.training_date) {
            row.getCell(9).value = { formula: `G${rowIdx}+H${rowIdx}` } as any;
            row.getCell(9).numFmt = "dd/mm/yyyy";
            row.getCell(10).value = { formula: `I${rowIdx}-$L$2` } as any;
          } else {
            row.getCell(9).value = "NA";
            row.getCell(10).value = "NA";
          }
          row.commit();
        });
      };

      fillSheet("NR 20 (2)", nr20);
      fillSheet("NR 35", nr35);

      const out = await wb.xlsx.writeBuffer();
      const blob = new Blob([out], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Controle_de_Treinamentos_Hydro_Alunorte_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: "Excel gerado", description: "Download iniciado." });
    } catch (e: any) {
      toast({ title: "Erro ao gerar Excel", description: e.message, variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-[calc(100vh-4rem)] p-4 md:p-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="p-2 rounded-xl bg-gradient-to-br from-[#c9a84c] to-[#f0d78c] text-[#1a1a1a]">
            <GraduationCap className="h-7 w-7" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#c9a84c]">
            Controle de Treinamento
          </h1>
          <Button
            onClick={handleDownloadExcel}
            disabled={downloading || isLoading}
            className="ml-auto bg-green-600 hover:bg-green-700"
          >
            <Download className="h-4 w-4 mr-2" />
            {downloading ? "Gerando..." : "Baixar Excel"}
          </Button>
        </div>

        <div className="relative mb-4 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, função ou matrícula..."
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : (
          <Tabs defaultValue="nr20" className="w-full">
            <TabsList className="grid grid-cols-2 max-w-md mb-4">
              <TabsTrigger value="nr20">
                NR 20 <Badge variant="secondary" className="ml-2">{s20.total}</Badge>
              </TabsTrigger>
              <TabsTrigger value="nr35">
                NR 35 <Badge variant="secondary" className="ml-2">{s35.total}</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="nr20" className="space-y-4">
              <StatsRow s={s20} />
              {renderTable(nr20)}
            </TabsContent>
            <TabsContent value="nr35" className="space-y-4">
              <StatsRow s={s35} />
              {renderTable(nr35)}
            </TabsContent>
          </Tabs>
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <CalendarDays className="inline h-5 w-5 mr-2" />
              Atualizar Treinamento {editing?.training}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Colaborador: <strong>{editing?.collaborator_name}</strong>
            </p>
            <div className="space-y-2">
              <Label>Nova Data do Treinamento</Label>
              <Input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Validade (dias)</Label>
              <Input
                type="number"
                value={editValidity}
                onChange={(e) => setEditValidity(Number(e.target.value))}
              />
            </div>
            {editDate && (
              <div className="bg-muted/50 p-3 rounded-md text-sm">
                <strong>Próxima Reciclagem:</strong>{" "}
                {format(
                  new Date(
                    new Date(editDate + "T00:00:00").getTime() +
                      editValidity * 24 * 60 * 60 * 1000,
                  ),
                  "dd 'de' MMMM 'de' yyyy",
                  { locale: ptBR },
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() =>
                editing &&
                updateMut.mutate({
                  id: editing.id,
                  training_date: editDate,
                  validity_days: editValidity,
                })
              }
              disabled={updateMut.isPending || !editDate}
            >
              {updateMut.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

const StatsRow = ({
  s,
}: {
  s: { vencidos: number; proximos: number; ok: number; sem: number; total: number };
}) => (
  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
    <Card className="p-3">
      <div className="text-xs text-muted-foreground">Total</div>
      <div className="text-2xl font-bold">{s.total}</div>
    </Card>
    <Card className="p-3 border-green-500/40">
      <div className="text-xs text-muted-foreground">Em dia</div>
      <div className="text-2xl font-bold text-green-600">{s.ok}</div>
    </Card>
    <Card className="p-3 border-yellow-500/40">
      <div className="text-xs text-muted-foreground">Próx. 30 dias</div>
      <div className="text-2xl font-bold text-yellow-600">{s.proximos}</div>
    </Card>
    <Card className="p-3 border-red-500/40">
      <div className="text-xs text-muted-foreground">Vencidos</div>
      <div className="text-2xl font-bold text-red-600">{s.vencidos}</div>
    </Card>
    <Card className="p-3">
      <div className="text-xs text-muted-foreground">Sem registro</div>
      <div className="text-2xl font-bold text-muted-foreground">{s.sem}</div>
    </Card>
  </div>
);

export default ControleTreinamento;
