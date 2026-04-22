import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Target, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { usePlanejamentoMetas } from "@/hooks/usePlanejamentoMetas";

export function PlanejamentoProgressCard() {
  const { data: metas, isLoading } = usePlanejamentoMetas();

  const stats = useMemo(() => {
    const items = (metas ?? []).filter(
      (m) => !m.is_section_header && Number(m.meta) > 0,
    );
    const total = items.length;
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
    return { total, concluidas, faltam, avancoGeral };
  }, [metas]);

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
        />
        <Stat
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          label="Concluídas"
          value={stats.concluidas}
          tone="success"
        />
        <Stat
          icon={<AlertCircle className="h-3.5 w-3.5" />}
          label="Faltam"
          value={stats.faltam}
          tone="warning"
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
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "muted" | "success" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "warning"
      ? "text-amber-600 dark:text-amber-400"
      : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-2 text-center">
      <div className={`flex items-center justify-center gap-1 ${toneClass}`}>
        {icon}
        <span className="text-base font-bold">{value}</span>
      </div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
        {label}
      </p>
    </div>
  );
}

export default PlanejamentoProgressCard;
