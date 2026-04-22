import { ArrowUp, ArrowDown } from "lucide-react";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { getBrazilNorthDate, getBrazilNorthMonthYear } from "@/lib/timezone";

const cargoDefinitions = [
  { id: "preposto", tarefas: ["p1", "p2", "p3", "p4", "p5"] },
  { id: "encarregado-geral", tarefas: ["eg1", "eg2", "eg3"] },
  { id: "encarregado-i", tarefas: ["e1-1", "e1-2", "e1-3"] },
  { id: "encarregado-ii", tarefas: ["e2-1", "e2-2", "e2-3"] },
  { id: "tecnico-seguranca-i", tarefas: ["ts1-1", "ts1-2", "ts1-3", "ts1-4", "ts1-5", "ts1-6"] },
  { id: "tecnico-seguranca-ii", tarefas: ["ts2-1", "ts2-2", "ts2-3", "ts2-4", "ts2-5", "ts2-6"] },
];

export function MatrixGauge() {
  const [completed, setCompleted] = useState(0);
  const [total, setTotal] = useState(0);
  const [percentage, setPercentage] = useState(0);
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const monthYear = getBrazilNorthMonthYear();
        const { data, error } = await supabase
          .from("matrix_task_completions")
          .select("task_id")
          .eq("month_year", monthYear);
        if (error) throw error;

        const completedIds = new Set(data?.map((d: any) => d.task_id) || []);
        const totalTasks = cargoDefinitions.reduce((s, c) => s + c.tarefas.length, 0);
        const completedTasks = cargoDefinitions.reduce(
          (s, c) => s + c.tarefas.filter((t) => completedIds.has(t)).length,
          0
        );
        const pct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        setTotal(totalTasks);
        setCompleted(completedTasks);
        setPercentage(pct);
      } catch (err) {
        console.error("Error fetching matrix gauge:", err);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(percentage), 100);
    return () => clearTimeout(t);
  }, [percentage]);

  const size = 200;
  const stroke = 16;
  const r = (size - stroke) / 2;
  const c = r * 2 * Math.PI;
  const dash = (animated / 100) * c;

  const monthLabel = format(getBrazilNorthDate(), "MMMM", { locale: ptBR });
  const TrendIcon = percentage >= 50 ? ArrowUp : ArrowDown;
  const trendColor =
    percentage >= 50
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-orange-600 dark:text-orange-400";

  return (
    <div className="relative flex flex-col items-center justify-between rounded-2xl p-5 h-full bg-card border border-border shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground self-start">
        Matriz · {monthLabel}
      </p>

      <div className="relative" style={{ width: size, height: size }}>
        <svg height={size} width={size}>
          <circle
            stroke="hsl(var(--muted))"
            fill="transparent"
            strokeWidth={stroke}
            r={r}
            cx={size / 2}
            cy={size / 2}
          />
          <circle
            stroke="url(#matrixOrange)"
            fill="transparent"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c - dash}`}
            r={r}
            cx={size / 2}
            cy={size / 2}
            style={{
              transform: "rotate(-90deg)",
              transformOrigin: "50% 50%",
              transition: "stroke-dasharray 1s ease-out",
            }}
          />
          <defs>
            <linearGradient id="matrixOrange" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(28, 95%, 60%)" />
              <stop offset="100%" stopColor="hsl(20, 90%, 50%)" />
            </linearGradient>
          </defs>
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-extrabold leading-none text-foreground">
            {percentage}%
          </span>
          <span className="text-sm font-semibold text-muted-foreground mt-1">
            {completed}/{total}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center text-center mt-2">
        <span className="text-sm text-muted-foreground">Tarefas concluídas</span>
        <div className="flex items-baseline gap-1.5 mt-0.5">
          <span className="text-xl font-bold text-foreground">{completed}</span>
          <span className="text-sm text-muted-foreground">de {total}</span>
          <span className={`ml-1 inline-flex items-center text-xs font-semibold ${trendColor}`}>
            <TrendIcon className="h-3 w-3" />
            {percentage}%
          </span>
        </div>
      </div>
    </div>
  );
}
