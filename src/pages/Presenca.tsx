import { useMemo, useState } from "react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Eye, Copy, Check, Share2, Users, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useRHEfetivo } from "@/hooks/useRHEfetivo";
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

// Funções de Suporte (TST, Encarregado Geral, Encarregado de Frente)
const SUPPORT_ROLES = [
  "TECNICO DE SEGURANÇA DO TRABALHO",
  "ENGENHEIRO DE SEGURANÇA DO TRABALHO",
  "ENCARREGADO GERAL",
  "ENCARREGADO DE FRENTE DE SERVIÇO",
];

// Ordem das funções de execução para o relatório
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
  const { data, isLoading } = useRHEfetivo();
  const [date, setDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [absentIds, setAbsentIds] = useState<Set<number>>(new Set());
  const [previewOpen, setPreviewOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState("");

  const colaboradores: Colaborador[] = useMemo(() => {
    const list = data?.colaboradores ?? [];
    return [...list].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return colaboradores;
    return colaboradores.filter(
      (c) =>
        c.nome.toLowerCase().includes(q) ||
        (c.funcao || "").toLowerCase().includes(q)
    );
  }, [colaboradores, search]);

  const toggleAbsent = (id: number) => {
    setAbsentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const markAllPresent = () => setAbsentIds(new Set());
  const markAllAbsent = () => setAbsentIds(new Set(colaboradores.map((c) => c.id)));

  const presentCount = colaboradores.length - absentIds.size;
  const absentCount = absentIds.size;

  // Agrupa por função para o relatório
  const reportText = useMemo(() => {
    const isPresent = (c: Colaborador) => !absentIds.has(c.id);

    // Suporte
    const tst = colaboradores.find(
      (c) =>
        (c.funcao === "TECNICO DE SEGURANÇA DO TRABALHO" ||
          c.funcao === "ENGENHEIRO DE SEGURANÇA DO TRABALHO") &&
        isPresent(c)
    );
    const encGeral = colaboradores.find(
      (c) => c.funcao === "ENCARREGADO GERAL" && isPresent(c)
    );
    const enc = colaboradores.find(
      (c) => c.funcao === "ENCARREGADO DE FRENTE DE SERVIÇO" && isPresent(c)
    );

    const lines: string[] = [];
    lines.push(`📅 Data: ${formatDateBR(date)}`);
    lines.push("");
    lines.push("✳️  ÁREA GABIÃO  ✳️");
    lines.push("");
    lines.push("✴️EQUIPE DE SUPORTE✴️");
    lines.push("");
    lines.push(`🙋 TST : ${tst ? toTitleCase(tst.nome) : "-"}`);
    lines.push("");
    lines.push(`🙋 ENC GERAL: ${encGeral ? toTitleCase(encGeral.nome) : "-"}`);
    lines.push("");
    lines.push(`🙋 ENC: ${enc ? toTitleCase(enc.nome) : "-"}`);
    lines.push("");
    lines.push("✴️EQUIPE DE EXECUÇÃO✴️");
    lines.push("");

    // Agrupa por função (apenas execução)
    const groups = new Map<string, Colaborador[]>();
    colaboradores.forEach((c) => {
      const role = (c.funcao || "").toUpperCase();
      if (SUPPORT_ROLES.includes(role)) return;
      if (!groups.has(role)) groups.set(role, []);
      groups.get(role)!.push(c);
    });

    // Ordena os grupos pela ordem definida + extras no final
    const orderedRoles = [
      ...EXECUTION_ORDER.filter((r) => groups.has(r)),
      ...Array.from(groups.keys()).filter((r) => !EXECUTION_ORDER.includes(r)),
    ];

    orderedRoles.forEach((role) => {
      const list = groups.get(role)!;
      const label = ROLE_LABELS[role] || role;
      lines.push(`👷 ${label}:`);
      lines.push("");
      list.forEach((c) => {
        const mark = isPresent(c) ? "✅" : "❌";
        lines.push(`${toTitleCase(c.nome)} ${mark}`);
        lines.push("");
      });
    });

    // Lista geral de ausentes (resumo)
    const ausentes = colaboradores.filter((c) => !isPresent(c));
    if (ausentes.length > 0) {
      lines.push("───────────────────────────");
      lines.push("");
      lines.push(`❌ AUSENTES (${ausentes.length}):`);
      ausentes.forEach((c) => {
        lines.push(`   • ${toTitleCase(c.nome)} — ${c.funcao || ""}`);
      });
      lines.push("");
    }

    lines.push("───────────────────────────");
    lines.push(`✅ Presentes: ${presentCount}  |  ❌ Ausentes: ${absentCount}  |  👥 Total: ${colaboradores.length}`);

    return lines.join("\n").trim();
  }, [colaboradores, absentIds, date, presentCount, absentCount]);

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
              Marque os ausentes com X e gere o relatório para WhatsApp.
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

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Users className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Total</div>
                <div className="text-xl font-bold">{colaboradores.length}</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <div>
                <div className="text-xs text-muted-foreground">Presentes</div>
                <div className="text-xl font-bold text-green-600">{presentCount}</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <XCircle className="w-5 h-5 text-destructive" />
              <div>
                <div className="text-xs text-muted-foreground">Ausentes</div>
                <div className="text-xl font-bold text-destructive">{absentCount}</div>
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
          <div className="ml-auto flex gap-2">
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Eye className="w-4 h-4" />
                  Pré-visualizar
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Pré-visualização do Relatório</DialogTitle>
                  <DialogDescription>
                    Formato pronto para WhatsApp — ✅ presentes / ❌ ausentes
                  </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] rounded-md border bg-muted/30 p-4">
                  <pre className="text-sm font-mono whitespace-pre-wrap leading-relaxed">
                    {reportText}
                  </pre>
                </ScrollArea>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={handleCopy} className="gap-2">
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copiado!" : "Copiar"}
                  </Button>
                  <Button onClick={handleWhatsApp} className="gap-2">
                    <Share2 className="w-4 h-4" />
                    Enviar WhatsApp
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Lista */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Funcionários do Efetivo ({filtered.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum colaborador encontrado.
              </div>
            ) : (
              <div className="divide-y">
                {filtered.map((c) => {
                  const absent = absentIds.has(c.id);
                  return (
                    <label
                      key={c.id}
                      className="flex items-center gap-3 py-3 cursor-pointer hover:bg-muted/40 px-2 rounded transition"
                    >
                      <Checkbox
                        checked={absent}
                        onCheckedChange={() => toggleAbsent(c.id)}
                        aria-label="Marcar como ausente"
                      />
                      <div className="flex-1 min-w-0">
                        <div
                          className={`font-medium truncate ${
                            absent ? "line-through text-muted-foreground" : ""
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
                    </label>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Presenca;
