import { useMemo, useState } from "react";
import { format, startOfDay, startOfWeek, startOfMonth, endOfDay, endOfWeek, endOfMonth, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Share2, Calendar, Clock, Wrench, CloudRain, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEquipment, useEquipmentStopHistory, type Equipment, type EquipmentStopHistory } from "@/hooks/useEquipment";
import { toast } from "sonner";
import { getBrazilNorthDate } from "@/lib/timezone";

const stopReasonLabels: Record<string, string> = {
  none: "Operando",
  maintenance: "Manutenção",
  waiting: "Aguardando",
  rain: "Chuva",
  end_of_day: "Fim do dia",
  end_of_shift: "Fim de Turno",
};

const stopReasonColors: Record<string, string> = {
  none: "bg-green-500",
  maintenance: "bg-orange-500",
  waiting: "bg-yellow-500",
  rain: "bg-blue-500",
  end_of_day: "bg-slate-500",
  end_of_shift: "bg-purple-500",
};

const stopReasonIcons: Record<string, React.ReactNode> = {
  none: <Play className="w-3 h-3" />,
  maintenance: <Wrench className="w-3 h-3" />,
  waiting: <Clock className="w-3 h-3" />,
  rain: <CloudRain className="w-3 h-3" />,
  end_of_day: <Pause className="w-3 h-3" />,
  end_of_shift: <Pause className="w-3 h-3" />,
};

type FilterPeriod = "daily" | "weekly" | "monthly";

interface EquipmentStats {
  equipment: Equipment;
  totalStopMinutes: number;
  stopsByReason: Record<string, number>;
  stops: EquipmentStopHistory[];
}

export function EquipmentReport() {
  const [period, setPeriod] = useState<FilterPeriod>("daily");
  const { data: equipment } = useEquipment();
  const { data: allHistory } = useEquipmentStopHistory();

  const dateRange = useMemo(() => {
    const now = getBrazilNorthDate();
    switch (period) {
      case "daily":
        return { start: startOfDay(now), end: endOfDay(now) };
      case "weekly":
        return { start: startOfWeek(now, { locale: ptBR }), end: endOfWeek(now, { locale: ptBR }) };
      case "monthly":
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  }, [period]);

  const filteredHistory = useMemo(() => {
    if (!allHistory) return [];
    return allHistory.filter(stop => {
      const stopDate = new Date(stop.started_at);
      return isWithinInterval(stopDate, { start: dateRange.start, end: dateRange.end });
    });
  }, [allHistory, dateRange]);

  const equipmentStats = useMemo((): EquipmentStats[] => {
    if (!equipment) return [];
    
    return equipment.map(eq => {
      const stops = filteredHistory.filter(h => h.equipment_id === eq.id);
      const stopsByReason: Record<string, number> = {};
      let totalStopMinutes = 0;

      stops.forEach(stop => {
        const minutes = stop.duration_minutes || 0;
        totalStopMinutes += minutes;
        stopsByReason[stop.stop_reason] = (stopsByReason[stop.stop_reason] || 0) + minutes;
      });

      return { equipment: eq, totalStopMinutes, stopsByReason, stops };
    });
  }, [equipment, filteredHistory]);

  const totalStats = useMemo(() => {
    const totalHoursAvailable = (equipment?.length || 0) * 8 * (period === "daily" ? 1 : period === "weekly" ? 5 : 22);
    const totalMinutesAvailable = totalHoursAvailable * 60;
    const totalStopMinutes = equipmentStats.reduce((acc, s) => acc + s.totalStopMinutes, 0);
    const totalOperatingMinutes = Math.max(0, totalMinutesAvailable - totalStopMinutes);
    
    const stopsByReason: Record<string, number> = {};
    equipmentStats.forEach(s => {
      Object.entries(s.stopsByReason).forEach(([reason, minutes]) => {
        stopsByReason[reason] = (stopsByReason[reason] || 0) + minutes;
      });
    });

    return {
      totalHoursAvailable,
      totalOperatingMinutes,
      totalStopMinutes,
      stopsByReason,
      operatingPercent: totalMinutesAvailable > 0 ? (totalOperatingMinutes / totalMinutesAvailable) * 100 : 0,
    };
  }, [equipmentStats, equipment?.length, period]);

  const formatDuration = (minutes: number) => {
    if (minutes >= 60) {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return `${h}h${m > 0 ? `${m}m` : ''}`;
    }
    return `${minutes}min`;
  };

  const periodLabels: Record<FilterPeriod, string> = {
    daily: "Hoje",
    weekly: "Esta Semana",
    monthly: "Este Mês",
  };

  const generateWhatsAppReport = () => {
    const periodLabel = periodLabels[period];
    const dateStr = format(new Date(), "dd/MM/yyyy", { locale: ptBR });
    
    let message = `📊 *RELATÓRIO DE EQUIPAMENTOS*\n`;
    message += `📅 ${periodLabel} - ${dateStr}\n\n`;
    
    message += `⏱️ *RESUMO GERAL*\n`;
    message += `✅ Operando: ${formatDuration(totalStats.totalOperatingMinutes)} (${totalStats.operatingPercent.toFixed(0)}%)\n`;
    message += `⏸️ Parado: ${formatDuration(totalStats.totalStopMinutes)}\n\n`;

    if (Object.keys(totalStats.stopsByReason).length > 0) {
      message += `📋 *PARADAS POR MOTIVO*\n`;
      Object.entries(totalStats.stopsByReason).forEach(([reason, minutes]) => {
        const emoji = reason === "maintenance" ? "🔧" : reason === "waiting" ? "⏳" : reason === "rain" ? "🌧️" : "⏹️";
        message += `${emoji} ${stopReasonLabels[reason] || reason}: ${formatDuration(minutes)}\n`;
      });
      message += `\n`;
    }

    message += `🚛 *POR EQUIPAMENTO*\n`;
    equipmentStats.forEach(stat => {
      const operatingMinutes = 8 * 60 * (period === "daily" ? 1 : period === "weekly" ? 5 : 22) - stat.totalStopMinutes;
      message += `\n*${stat.equipment.name}* (${stat.equipment.plate})\n`;
      message += `  ✅ Operando: ${formatDuration(Math.max(0, operatingMinutes))}\n`;
      if (stat.totalStopMinutes > 0) {
        message += `  ⏸️ Parado: ${formatDuration(stat.totalStopMinutes)}\n`;
        Object.entries(stat.stopsByReason).forEach(([reason, minutes]) => {
          message += `    - ${stopReasonLabels[reason] || reason}: ${formatDuration(minutes)}\n`;
        });
      }
    });

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, "_blank");
    toast.success("Relatório gerado para WhatsApp!");
  };

  return (
    <div className="space-y-4">
      {/* Legend */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium">Legenda</CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <div className="flex flex-wrap gap-3">
            {Object.entries(stopReasonLabels).map(([key, label]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded-full ${stopReasonColors[key]}`} />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-green-500/10">
                <Play className="w-4 h-4 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Operando</p>
                <p className="text-lg font-bold text-green-600">{formatDuration(totalStats.totalOperatingMinutes)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-orange-500/10">
                <Wrench className="w-4 h-4 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Manutenção</p>
                <p className="text-lg font-bold text-orange-600">{formatDuration(totalStats.stopsByReason.maintenance || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-yellow-500/10">
                <Clock className="w-4 h-4 text-yellow-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Aguardando</p>
                <p className="text-lg font-bold text-yellow-600">{formatDuration(totalStats.stopsByReason.waiting || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-blue-500/10">
                <CloudRain className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Chuva</p>
                <p className="text-lg font-bold text-blue-600">{formatDuration(totalStats.stopsByReason.rain || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History Tabs */}
      <Card>
        <CardHeader className="py-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Histórico de Paradas
          </CardTitle>
          <Button size="sm" variant="outline" onClick={generateWhatsAppReport} className="gap-2">
            <Share2 className="w-4 h-4" />
            WhatsApp
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as FilterPeriod)}>
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="daily">Diário</TabsTrigger>
              <TabsTrigger value="weekly">Semanal</TabsTrigger>
              <TabsTrigger value="monthly">Mensal</TabsTrigger>
            </TabsList>

            <TabsContent value={period} className="mt-0">
              <div className="text-xs text-muted-foreground mb-3">
                {format(dateRange.start, "dd/MM", { locale: ptBR })} - {format(dateRange.end, "dd/MM/yyyy", { locale: ptBR })}
              </div>
              
              <ScrollArea className="h-[300px]">
                {filteredHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Nenhuma parada registrada neste período
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredHistory.map((stop) => {
                      const eq = equipment?.find(e => e.id === stop.equipment_id);
                      return (
                        <div key={stop.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                          <div className={`w-2 h-8 rounded-full ${stopReasonColors[stop.stop_reason] || 'bg-gray-500'}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">{eq?.name || "Equipamento"}</span>
                              <Badge variant="outline" className="text-[10px] px-1.5">
                                {eq?.plate}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                              {stopReasonIcons[stop.stop_reason]}
                              <span>{stopReasonLabels[stop.stop_reason] || stop.stop_reason}</span>
                              <span>•</span>
                              <span>{format(new Date(stop.started_at), "dd/MM HH:mm", { locale: ptBR })}</span>
                              {stop.ended_at && (
                                <>
                                  <span>→</span>
                                  <span>{format(new Date(stop.ended_at), "HH:mm", { locale: ptBR })}</span>
                                </>
                              )}
                            </div>
                          </div>
                          {stop.duration_minutes && (
                            <Badge variant="secondary" className="text-xs">
                              {formatDuration(stop.duration_minutes)}
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
