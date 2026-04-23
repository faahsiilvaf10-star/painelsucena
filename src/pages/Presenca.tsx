import { useMemo, useState } from "react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Eye,
  Copy,
  Check,
  Share2,
  Users,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useRHEfetivo } from "@/hooks/useRHEfetivo";
import {
  useAttendanceAreaAssignments,
  type AttendanceArea,
} from "@/hooks/useAttendanceAreaAssignments";
import type { Colaborador } from "@/data/efetivoData";

const toTitleCase = (name: string) =>
  name
    .toLowerCase()
    .split(" ")
    .map((w) => (w.length ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");

const formatDateBR = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("pt-BR");
};

const AREAS: { id: AttendanceArea; label: string; header: string }[] = [
  { id: "gabiao", label: "Área Gabião", header: "✳️  ÁREA GABIÃO  ✳️" },
  { id: "jardinagem", label: "Área Jardinagem", header: "🌿  ÁREA JARDINAGEM  🌿" },
  { id: "adm", label: "Área ADM", header: "🏢  ÁREA ADM  🏢" },
];

const SUPPORT_ROLES = [
  "TECNICO DE SEGURANÇA DO TRABALHO",
  "ENGENHEIRO DE SEGURANÇA DO TRABALHO",
  "ENCARREGADO GERAL",
  "ENCARREGADO DE FRENTE DE SERVIÇO",
];

const EXECUTION_ORDER = [
  "OFICIAL POLIVALENTE",
  "POLIVALENTE",
  "MEIO OFICIAL",
  "MEIA OFICIAL",
  "AJUDANTE",
  "JARDINEIRO",
  "MOTORISTA DE CAMINHÃO PIPA",
  "MOTORISTA DE CAMINHÃO MUNCK",
  "SINALEIRO RIGGER",
  "SINALEIRO",
  "MECANICO",
  "MECÂNICO MONTADOR",
  "ELETRICISTA",
  "AJUDANTE DE ELETRICISTA",
  "AUXILIAR DE ELÉTRICA",
  "APONTADOR",
  "PLANEJADOR",
  "ENGENHEIRO FLORESTAL",
  "TECNICO DE MEIO AMBIENTE",
  "AUXILIAR DE ALMOXARIFE",
];

const ROLE_LABELS: Record<string, string> = {
  "OFICIAL POLIVALENTE": "OFICIAL POLIVALENTE",
  POLIVALENTE: "POLIVALENTES",
  "MEIO OFICIAL": "MEIA OFICIAL",
  "MEIA OFICIAL": "MEIA OFICIAL",
  AJUDANTE: "AJUDANTE",
  JARDINEIRO: "JARDINEIRO",
  "MOTORISTA DE CAMINHÃO PIPA": "MOTORISTA DO PIPA",
  "MOTORISTA DE CAMINHÃO MUNCK": "MOTORISTA DO MUNCK",
  "SINALEIRO RIGGER": "SINALEIRO",
  SINALEIRO: "SINALEIRO",
  MECANICO: "MECÂNICO",
  "MECÂNICO MONTADOR": "MECÂNICO MONTADOR",
  ELETRICISTA: "ELETRICISTA",
  "AJUDANTE DE ELETRICISTA": "AJUDANTE DE ELÉTRICA",
  "AUXILIAR DE ELÉTRICA": "AUXILIAR DE ELÉTRICA",
  APONTADOR: "APONTADOR",
  PLANEJADOR: "PLANEJADOR",
  "ENGENHEIRO FLORESTAL": "ENGENHEIRO FLORESTAL",
  "TECNICO DE MEIO AMBIENTE": "TÉCNICO DE MEIO AMBIENTE",
  "AUXILIAR DE ALMOXARIFE": "AUXILIAR DE ALMOXARIFE",
};

const Presenca = () => {
  const { data: rhData, isLoading } = useRHEfetivo();
  const {
    data: assignments,
    assignMutation,
    removeMutation,
  } = useAttendanceAreaAssignments();

  const [date, setDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [activeArea, setActiveArea] = useState<AttendanceArea>("gabiao");
  const [absentByArea, setAbsentByArea] = useState<
    Record<AttendanceArea, Set<number>>
  >({
    gabiao: new Set(),
    jardinagem: new Set(),
    adm: new Set(),
  });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addEmployeeId, setAddEmployeeId] = useState<string>("");
  const [addArea, setAddArea] = useState<AttendanceArea>("gabiao");
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState("");

  const allColaboradores: Colaborador[] = useMemo(() => {
    const list = rhData?.colaboradores ?? [];
    return [...list].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [rhData]);

  // Map: employee_id -> area
  const employeeAreaMap = useMemo(() => {
    const map = new Map<number, AttendanceArea>();
    (assignments ?? []).forEach((a) => map.set(a.employee_id, a.area));
    return map;
  }, [assignments]);

  // Funcionários da área ativa
  const areaEmployees = useMemo(
    () =>
      allColaboradores.filter((c) => employeeAreaMap.get(c.id) === activeArea),
    [allColaboradores, employeeAreaMap, activeArea]
  );

  // Não atribuídos (para o diálogo de adicionar)
  const unassignedEmployees = useMemo(
    () => allColaboradores.filter((c) => !employeeAreaMap.has(c.id)),
    [allColaboradores, employeeAreaMap]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return areaEmployees;
    return areaEmployees.filter(
      (c) =>
        c.nome.toLowerCase().includes(q) ||
        (c.funcao || "").toLowerCase().includes(q)
    );
  }, [areaEmployees, search]);

  const toggleAbsent = (id: number) => {
    setAbsentByArea((prev) => {
      const next = { ...prev, [activeArea]: new Set(prev[activeArea]) };
      if (next[activeArea].has(id)) next[activeArea].delete(id);
      else next[activeArea].add(id);
      return next;
    });
  };

  const markAllPresent = () =>
    setAbsentByArea((prev) => ({ ...prev, [activeArea]: new Set() }));
  const markAllAbsent = () =>
    setAbsentByArea((prev) => ({
      ...prev,
      [activeArea]: new Set(areaEmployees.map((c) => c.id)),
    }));

  const absentSet = absentByArea[activeArea];
  const presentCount = areaEmployees.length - absentSet.size;
  const absentCount = absentSet.size;

  const handleAddAssign = async () => {
    if (!addEmployeeId) {
      toast.error("Selecione um funcionário");
      return;
    }
    const emp = allColaboradores.find((c) => c.id === Number(addEmployeeId));
    if (!emp) return;
    try {
      await assignMutation.mutateAsync({
        employee_id: emp.id,
        employee_name: emp.nome,
        area: addArea,
      });
      toast.success(`${toTitleCase(emp.nome)} adicionado`);
      setAddEmployeeId("");
      setAddOpen(false);
    } catch (e) {
      toast.error("Erro ao adicionar");
    }
  };

  const handleRemove = async (id: number) => {
    try {
      await removeMutation.mutateAsync(id);
      toast.success("Removido da área");
    } catch {
      toast.error("Erro ao remover");
    }
  };

  // Gera relatório de uma área
  const buildReportForArea = (area: AttendanceArea): string => {
    const list = allColaboradores.filter(
      (c) => employeeAreaMap.get(c.id) === area
    );
    const absents = absentByArea[area];
    const isPresent = (c: Colaborador) => !absents.has(c.id);
    const header = AREAS.find((a) => a.id === area)!.header;

    const lines: string[] = [];
    lines.push(header);
    lines.push("");

    // Suporte
    const tst = list.find(
      (c) =>
        (c.funcao === "TECNICO DE SEGURANÇA DO TRABALHO" ||
          c.funcao === "ENGENHEIRO DE SEGURANÇA DO TRABALHO") &&
        isPresent(c)
    );
    const encGeral = list.find(
      (c) => c.funcao === "ENCARREGADO GERAL" && isPresent(c)
    );
    const enc = list.find(
      (c) => c.funcao === "ENCARREGADO DE FRENTE DE SERVIÇO" && isPresent(c)
    );

    if (tst || encGeral || enc) {
      lines.push("✴️EQUIPE DE SUPORTE✴️");
      lines.push("");
      if (tst) {
        lines.push(`🙋 TST : ${toTitleCase(tst.nome)}`);
        lines.push("");
      }
      if (encGeral) {
        lines.push(`🙋 ENC GERAL: ${toTitleCase(encGeral.nome)}`);
        lines.push("");
      }
      if (enc) {
        lines.push(`🙋 ENC: ${toTitleCase(enc.nome)}`);
        lines.push("");
      }
    }

    // Execução
    const exec = list.filter(
      (c) => !SUPPORT_ROLES.includes((c.funcao || "").toUpperCase())
    );
    if (exec.length > 0) {
      lines.push("✴️EQUIPE DE EXECUÇÃO✴️");
      lines.push("");
      const groups = new Map<string, Colaborador[]>();
      exec.forEach((c) => {
        const role = (c.funcao || "").toUpperCase();
        if (!groups.has(role)) groups.set(role, []);
        groups.get(role)!.push(c);
      });
      const orderedRoles = [
        ...EXECUTION_ORDER.filter((r) => groups.has(r)),
        ...Array.from(groups.keys()).filter((r) => !EXECUTION_ORDER.includes(r)),
      ];
      orderedRoles.forEach((role) => {
        const items = groups.get(role)!;
        const label = ROLE_LABELS[role] || role;
        lines.push(`👷 ${label}:`);
        lines.push("");
        items.forEach((c) => {
          const mark = isPresent(c) ? "✅" : "❌";
          lines.push(`${toTitleCase(c.nome)} ${mark}`);
          lines.push("");
        });
      });
    }

    const ausentes = list.filter((c) => !isPresent(c));
    const presentes = list.length - ausentes.length;
    lines.push("───────────────────────────");
    lines.push(
      `✅ Presentes: ${presentes}  |  ❌ Ausentes: ${ausentes.length}  |  👥 Total: ${list.length}`
    );
    return lines.join("\n").trim();
  };

  const reportText = useMemo(() => {
    const parts: string[] = [];
    parts.push(`📅 Data: ${formatDateBR(date)}`);
    parts.push("");
    AREAS.forEach((a) => {
      const list = allColaboradores.filter(
        (c) => employeeAreaMap.get(c.id) === a.id
      );
      if (list.length === 0) return;
      parts.push(buildReportForArea(a.id));
      parts.push("");
      parts.push("");
    });
    return parts.join("\n").trim();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, allColaboradores, employeeAreaMap, absentByArea]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
      toast.success("Relatório copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Erro ao copiar");
    }
  };

  const handleWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(reportText)}`;
    window.open(url, "_blank");
  };

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Lista de Presença
            </h1>
            <p className="text-sm text-muted-foreground">
              Marque presentes/ausentes por área e gere o relatório completo.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-auto"
            />
          </div>
        </div>

        <Tabs
          value={activeArea}
          onValueChange={(v) => setActiveArea(v as AttendanceArea)}
        >
          <TabsList className="grid grid-cols-3 w-full max-w-2xl">
            {AREAS.map((a) => {
              const count = allColaboradores.filter(
                (c) => employeeAreaMap.get(c.id) === a.id
              ).length;
              return (
                <TabsTrigger key={a.id} value={a.id}>
                  {a.label}
                  <span className="ml-2 text-xs opacity-70">({count})</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {AREAS.map((a) => (
            <TabsContent key={a.id} value={a.id} className="space-y-4 mt-4">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <Users className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <div className="text-xs text-muted-foreground">Total</div>
                      <div className="text-xl font-bold">
                        {areaEmployees.length}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Presentes
                      </div>
                      <div className="text-xl font-bold">{presentCount}</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <XCircle className="w-5 h-5 text-destructive" />
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Ausentes
                      </div>
                      <div className="text-xl font-bold text-destructive">
                        {absentCount}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  placeholder="Buscar por nome ou função..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="max-w-xs"
                />
                <Button variant="outline" size="sm" onClick={markAllPresent}>
                  Todos presentes
                </Button>
                <Button variant="outline" size="sm" onClick={markAllAbsent}>
                  Todos ausentes
                </Button>

                <Dialog open={addOpen} onOpenChange={setAddOpen}>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      className="gap-2"
                      onClick={() => setAddArea(a.id)}
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar funcionário
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Adicionar à lista de presença</DialogTitle>
                      <DialogDescription>
                        Selecione o funcionário e a área para a qual ele será
                        atribuído.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium mb-1 block">
                          Funcionário
                        </label>
                        <Select
                          value={addEmployeeId}
                          onValueChange={setAddEmployeeId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um funcionário" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            {unassignedEmployees.length === 0 ? (
                              <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                                Todos os funcionários já estão atribuídos.
                              </div>
                            ) : (
                              unassignedEmployees.map((c) => (
                                <SelectItem key={c.id} value={String(c.id)}>
                                  {toTitleCase(c.nome)} —{" "}
                                  <span className="text-xs text-muted-foreground">
                                    {c.funcao}
                                  </span>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">
                          Área
                        </label>
                        <Select
                          value={addArea}
                          onValueChange={(v) =>
                            setAddArea(v as AttendanceArea)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {AREAS.map((ar) => (
                              <SelectItem key={ar.id} value={ar.id}>
                                {ar.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setAddOpen(false)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleAddAssign}
                        disabled={
                          !addEmployeeId || assignMutation.isPending
                        }
                      >
                        Adicionar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <div className="ml-auto">
                  <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        <Eye className="w-4 h-4" />
                        Pré-visualizar
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>
                          Pré-visualização do Relatório
                        </DialogTitle>
                        <DialogDescription>
                          Inclui todas as áreas preenchidas (Gabião,
                          Jardinagem, ADM).
                        </DialogDescription>
                      </DialogHeader>
                      <ScrollArea className="h-[60vh] rounded-md border bg-muted/30 p-4">
                        <pre className="text-sm font-mono whitespace-pre-wrap leading-relaxed">
                          {reportText}
                        </pre>
                      </ScrollArea>
                      <DialogFooter className="gap-2">
                        <Button
                          variant="outline"
                          onClick={handleCopy}
                          className="gap-2"
                        >
                          {copied ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                          {copied ? "Copiado!" : "Copiar"}
                        </Button>
                        <Button onClick={handleWhatsApp} className="gap-2">
                          <Share2 className="w-4 h-4" />
                          Enviar WhatsApp
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {a.label} — {filtered.length} funcionário(s)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Carregando...
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground space-y-2">
                      <p>Nenhum funcionário nesta área.</p>
                      <p className="text-xs">
                        Use "Adicionar funcionário" para incluir alguém.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filtered.map((c) => {
                        const absent = absentSet.has(c.id);
                        return (
                          <div
                            key={c.id}
                            className="flex items-center gap-3 py-3 hover:bg-muted/40 px-2 rounded transition"
                          >
                            <Checkbox
                              checked={absent}
                              onCheckedChange={() => toggleAbsent(c.id)}
                              aria-label="Marcar como ausente"
                            />
                            <div className="flex-1 min-w-0">
                              <div
                                className={`font-medium truncate ${
                                  absent
                                    ? "line-through text-muted-foreground"
                                    : ""
                                }`}
                              >
                                {toTitleCase(c.nome)}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {c.funcao}
                              </div>
                            </div>
                            <span className="text-lg" aria-hidden>
                              {absent ? "❌" : "✅"}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemove(c.id)}
                              title="Remover desta área"
                            >
                              <Trash2 className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </Layout>
  );
};

export default Presenca;
