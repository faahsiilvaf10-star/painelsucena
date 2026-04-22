import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Target, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { usePlanejamentoMetas, type PlanejamentoMeta } from "@/hooks/usePlanejamentoMetas";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type FilterKind = "total" | "concluidas" | "faltam";

const FILTER_LABELS: Record<FilterKind, string> = {
  total: "Todas as metas",
  concluidas: "Metas concluídas",
  faltam: "Metas que faltam bater",
};

export function PlanejamentoProgressCard() {
  const { data: metas, isLoading } = usePlanejamentoMetas();
  const [openFilter, setOpenFilter] = useState<FilterKind | null>(null);

  const items = useMemo(
    () =>
      (metas ?? []).filter(
        (m) => !m.is_section_header && Number(m.meta) > 0,
      ),
    [metas],
  );

  const stats = useMemo(() => {
    let concluidas = 0;
    let faltam = 0;
    let somaMeta = 0;
    let somaReal = 0;
    for (const m of items) {
      const meta = Number(m.meta) || 0;
      const real = Number(m.realizado) || 0;
      somaMeta += meta;
      somaReal += real;
      if (meta > 0 && real >= meta) concluidas++;
      else faltam++;
    }
    const avancoGeral =
      somaMeta > 0 ? Math.min(100, Math.round((somaReal / somaMeta) * 100)) : 0;
    return { total: items.length, concluidas, faltam, avancoGeral };
  }, [items]);

  const filteredItems = useMemo(() => {
    if (!openFilter) return [];
    if (openFilter === "total") return items;
    if (openFilter === "concluidas")
      return items.filter((m) => Number(m.realizado) >= Number(m.meta));
    return items.filter((m) => Number(m.realizado) < Number(m.meta));
  }, [items, openFilter]);

  const ringSize = 140;
  const strokeWidth = 12;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (stats.avancoGeral / 100) * circumference;

  return (
    <div className="rounded-2xl p-5 h-full flex flex-col bg-card border border-border shadow-sm transition-transform hover:scale-[1.01]">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Avanço Mensal
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Metas do Planejamento
          </p>
        </div>
        <Link
          to="/planejamento"
          className="text-xs text-primary hover:underline inline-flex items-center gap-1"
        >
          Ver tudo <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="flex items-center justify-center my-2">
        <div className="relative">
          <svg height={ringSize} width={ringSize}>
            <circle
              stroke="hsl(var(--muted))"
              fill="transparent"
              strokeWidth={strokeWidth}
              r={radius}
              cx={ringSize / 2}
              cy={ringSize / 2}
            />
            <circle
              stroke="hsl(var(--primary))"
              fill="transparent"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={offset}
              r={radius}
              cx={ringSize / 2}
              cy={ringSize / 2}
              style={{
                transform: "rotate(-90deg)",
                transformOrigin: "50% 50%",
                transition: "stroke-dashoffset 1s ease-out",
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-extrabold text-foreground">
              {isLoading ? "—" : `${stats.avancoGeral}%`}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Avanço
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-2">
        <Stat
          icon={<Target className="h-3.5 w-3.5" />}
          label="Total"
          value={stats.total}
          tone="muted"
          onClick={() => setOpenFilter("total")}
        />
        <Stat
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          label="Concluídas"
          value={stats.concluidas}
          tone="success"
          onClick={() => setOpenFilter("concluidas")}
        />
        <Stat
          icon={<AlertCircle className="h-3.5 w-3.5" />}
          label="Faltam"
          value={stats.faltam}
          tone="warning"
          onClick={() => setOpenFilter("faltam")}
        />
      </div>

      <div className="mt-3">
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-1000"
            style={{ width: `${stats.avancoGeral}%` }}
          />
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          {stats.concluidas} de {stats.total} metas concluídas
        </p>
      </div>

      <Dialog open={!!openFilter} onOpenChange={(o) => !o && setOpenFilter(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {openFilter ? FILTER_LABELS[openFilter] : ""}
            </DialogTitle>
            <DialogDescription>
              {filteredItems.length}{" "}
              {filteredItems.length === 1 ? "meta" : "metas"}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto pr-2 space-y-2">
            {filteredItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma meta nesta categoria.
              </p>
            ) : (
              filteredItems.map((m) => <MetaItem key={m.id} meta={m} />)
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetaItem({ meta }: { meta: PlanejamentoMeta }) {
  const m = Number(meta.meta) || 0;
  const r = Number(meta.realizado) || 0;
  const p = m > 0 ? Math.min(100, (r / m) * 100) : 0;
  const completed = m > 0 && r >= m;
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {meta.linha !== null && (
            <Badge variant="outline" className="font-mono text-xs shrink-0">
              {meta.linha}
            </Badge>
          )}
          {completed ? (
            <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-300 shrink-0">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Concluída
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs shrink-0">
              <AlertCircle className="w-3 h-3 mr-1" /> Em andamento
            </Badge>
          )}
        </div>
      </div>
      <p className="mt-2 text-sm font-medium leading-snug">{meta.atividade}</p>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          <span className="font-semibold text-foreground">
            {r.toLocaleString("pt-BR")}
          </span>
          {" / "}
          <span>{m.toLocaleString("pt-BR")}</span>
          {meta.unidade ? ` ${meta.unidade}` : ""}
        </span>
        <span
          className={cn(
            "font-bold tabular-nums",
            completed ? "text-emerald-600" : "text-amber-600",
          )}
        >
          {p.toFixed(1)}%
        </span>
      </div>
      <Progress value={p} className="h-1.5 mt-1.5" />
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  tone,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "muted" | "success" | "warning";
  onClick?: () => void;
}) {
  const toneClass =
    tone === "success"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "warning"
      ? "text-amber-600 dark:text-amber-400"
      : "text-foreground";
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-border bg-muted/30 p-2 text-center min-w-0 hover:bg-muted/60 hover:border-primary/40 transition-colors cursor-pointer"
    >
      <div className={`flex items-center justify-center gap-1 ${toneClass}`}>
        {icon}
        <span className="text-base font-bold leading-none">{value}</span>
      </div>
      <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground mt-1 leading-tight whitespace-nowrap">
        {label}
      </p>
    </button>
  );
}

export default PlanejamentoProgressCard;
