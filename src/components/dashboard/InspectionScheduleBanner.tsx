import { useInspectionSchedule } from "@/hooks/useInspectionSchedule";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { HardHat, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getDaysUntilEventBrazilNorth, parseDateForBrazilNorth } from "@/lib/timezone";

export function InspectionScheduleBanner() {
  const { schedule } = useInspectionSchedule();

  if (!schedule) return null;

  const inspDate = parseDateForBrazilNorth(schedule.next_inspection_date);
  const daysUntil = getDaysUntilEventBrazilNorth(schedule.next_inspection_date);

  // Only show when within 3 days (including past/today)
  if (daysUntil > 3) return null;

  const isOverdue = daysUntil < 0;
  const isToday = daysUntil === 0;
  const timeStr = schedule.next_inspection_time?.slice(0, 5) || "08:00";
  const dateStr = format(inspDate, "dd/MM/yyyy (EEEE)", { locale: ptBR });

  const urgencyClass = isOverdue
    ? "border-destructive/50 bg-destructive/10"
    : isToday
    ? "border-orange-500/50 bg-orange-500/10"
    : "border-yellow-500/50 bg-yellow-500/10";

  const iconColor = isOverdue ? "text-destructive" : isToday ? "text-orange-500" : "text-yellow-500";

  const message = isOverdue
    ? `Inspeção atrasada! Era prevista para ${dateStr} às ${timeStr}`
    : isToday
    ? `Inspeção de canteiro HOJE às ${timeStr}`
    : `Inspeção de canteiro em ${daysUntil} dia${daysUntil > 1 ? "s" : ""} — ${dateStr} às ${timeStr}`;

  return (
    <Card className={`border ${urgencyClass} animate-fade-in`}>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`p-2 rounded-lg ${isOverdue ? "bg-destructive/20" : isToday ? "bg-orange-500/20" : "bg-yellow-500/20"}`}>
          {isOverdue || isToday ? (
            <AlertTriangle className={`h-5 w-5 ${iconColor} ${isToday ? "animate-pulse" : ""}`} />
          ) : (
            <HardHat className={`h-5 w-5 ${iconColor}`} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${iconColor}`}>
            {isOverdue ? "⚠️ Inspeção Atrasada" : "📋 Próxima Inspeção de Canteiro"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{message}</p>
        </div>
      </CardContent>
    </Card>
  );
}
