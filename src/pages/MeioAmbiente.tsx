import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePluviometria } from "@/hooks/usePluviometria";
import { CloudRain, Droplets, Leaf } from "lucide-react";
import { toast } from "sonner";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const SETORES = [
  { value: "campo", label: "Campo" },
  { value: "canteiro", label: "Canteiro" },
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function PluviometriaGrid({ setor, ano, mes }: { setor: string; ano: number; mes: number }) {
  const { data: records, isLoading, upsert } = usePluviometria(setor, ano, mes);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

  const daysInMonth = getDaysInMonth(ano, mes);
  const dayValues = useMemo(() => {
    const map = new Map<number, number>();
    records?.forEach((r) => map.set(r.dia, Number(r.mm)));
    return map;
  }, [records]);

  // Calculate consecutive rain days color
  const dayColors = useMemo(() => {
    const colors = new Map<number, string>();
    for (let d = 1; d <= daysInMonth; d++) {
      const val = dayValues.get(d);
      if (val === undefined || val === null) continue; // no data = no color

      // Check if this day is part of 2+ consecutive rain days
      let hasConsecutive = false;
      // Check with previous day
      const prev = dayValues.get(d - 1);
      if (prev !== undefined && prev !== null && prev > 0 && val > 0) hasConsecutive = true;
      // Check with next day
      const next = dayValues.get(d + 1);
      if (next !== undefined && next !== null && next > 0 && val > 0) hasConsecutive = true;

      if (val > 0 && hasConsecutive) {
        colors.set(d, "bg-green-500/20 text-green-700 dark:text-green-400");
      } else {
        colors.set(d, "bg-red-500/20 text-red-700 dark:text-red-400");
      }
    }
    return colors;
  }, [dayValues, daysInMonth]);

  const totalMensal = useMemo(() => {
    let total = 0;
    dayValues.forEach((v) => (total += v));
    return total;
  }, [dayValues]);

  const handleSave = (dia: number) => {
    const val = parseFloat(editValue);
    if (isNaN(val) || val < 0) {
      toast.error("Valor inválido");
      return;
    }
    upsert.mutate({ dia, mm: val }, {
      onSuccess: () => {
        toast.success(`Dia ${dia} atualizado: ${val}mm`);
        setEditingDay(null);
        setEditValue("");
      },
      onError: () => toast.error("Erro ao salvar"),
    });
  };

  if (isLoading) {
    return <div className="flex justify-center p-8 text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="overflow-x-auto max-h-[70vh] overflow-y-auto border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 bg-background z-10 min-w-[80px]">Dia</TableHead>
            <TableHead className="min-w-[120px]">mm (Chuva)</TableHead>
            <TableHead className="min-w-[100px]">Status</TableHead>
            <TableHead className="min-w-[100px]">Ação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((dia) => {
            const val = dayValues.get(dia);
            const color = dayColors.get(dia);
            const isEditing = editingDay === dia;

            return (
              <TableRow key={dia} className={color || ""}>
                <TableCell className="font-bold sticky left-0 bg-inherit z-10">
                  {dia}/{mes.toString().padStart(2, "0")}
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        step={0.1}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-24 h-8"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSave(dia);
                          if (e.key === "Escape") { setEditingDay(null); setEditValue(""); }
                        }}
                        autoFocus
                      />
                      <span className="text-xs text-muted-foreground">mm</span>
                    </div>
                  ) : (
                    <span className="font-medium">
                      {val !== undefined ? `${val} mm` : "—"}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {val !== undefined && val > 0 && color?.includes("green") && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400">
                      <CloudRain className="w-3.5 h-3.5" /> Acumulado
                    </span>
                  )}
                  {val !== undefined && color?.includes("red") && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400">
                      <Droplets className="w-3.5 h-3.5" /> {val > 0 ? "Isolado" : "Sem chuva"}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <div className="flex gap-1">
                      <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => handleSave(dia)}>
                        Salvar
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setEditingDay(null); setEditValue(""); }}>
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => {
                        setEditingDay(dia);
                        setEditValue(val !== undefined ? String(val) : "");
                      }}
                    >
                      Editar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
          <TableRow className="bg-muted/50 font-bold">
            <TableCell className="sticky left-0 bg-muted/50 z-10">TOTAL</TableCell>
            <TableCell>{totalMensal} mm</TableCell>
            <TableCell colSpan={2} />
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

export default function MeioAmbiente() {
  const currentDate = new Date();
  const [setor, setSetor] = useState("campo");
  const [ano, setAno] = useState(currentDate.getFullYear());
  const [mes, setMes] = useState(currentDate.getMonth() + 1);

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Leaf className="w-7 h-7 text-green-600" />
        <h1 className="text-2xl font-bold">Meio Ambiente</h1>
      </div>

      <Tabs defaultValue="pluviometria">
        <TabsList>
          <TabsTrigger value="pluviometria" className="gap-2">
            <CloudRain className="w-4 h-4" /> Pluviometria
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pluviometria">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CloudRain className="w-5 h-5" />
                Controle de Precipitação
              </CardTitle>
              <div className="flex flex-wrap gap-3 pt-2">
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

                <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MESES.map((m, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4 text-xs">
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-green-500/20 text-green-700 dark:text-green-400 font-medium">
                  <CloudRain className="w-3 h-3" /> 2+ dias seguidos = Acumulado (verde)
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-red-500/20 text-red-700 dark:text-red-400 font-medium">
                  <Droplets className="w-3 h-3" /> Sem acúmulo = Vermelho
                </span>
              </div>
              <PluviometriaGrid setor={setor} ano={ano} mes={mes} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
