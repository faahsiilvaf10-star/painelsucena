import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Filter, Clock, Wrench, Activity, PauseCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEquipment, useEquipmentStopHistory } from "@/hooks/useEquipment";
import { format, subDays, isWithinInterval, parseISO, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2 } from "lucide-react";

const getStatusInfo = (stopReason: string) => {
  switch (stopReason) {
    case "none":
    case "operando":
      return {
        label: "Operando",
        color: "bg-green-500/10 text-green-600 border-green-500/30",
        icon: <Activity className="h-3 w-3" />,
      };
    case "maintenance":
    case "manutencao_corretiva":
      return {
        label: "Manutenção Corretiva",
        color: "bg-red-500/10 text-red-600 border-red-500/30",
        icon: <Wrench className="h-3 w-3" />,
      };
    case "manutencao_preventiva":
      return {
        label: "Manutenção Preventiva",
        color: "bg-orange-500/10 text-orange-600 border-orange-500/30",
        icon: <Wrench className="h-3 w-3" />,
      };
    case "aguardando_frente_servico":
      return {
        label: "Aguardando Frente",
        color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
        icon: <PauseCircle className="h-3 w-3" />,
      };
    case "fim_turno":
      return {
        label: "Fim de Turno",
        color: "bg-blue-500/10 text-blue-600 border-blue-500/30",
        icon: <Clock className="h-3 w-3" />,
      };
    case "vistoria":
      return {
        label: "Vistoria",
        color: "bg-purple-500/10 text-purple-600 border-purple-500/30",
        icon: <Wrench className="h-3 w-3" />,
      };
    default:
      return {
        label: stopReason || "Desconhecido",
        color: "bg-gray-500/10 text-gray-600 border-gray-500/30",
        icon: <Activity className="h-3 w-3" />,
      };
  }
};

const formatDuration = (minutes: number | null) => {
  if (!minutes) return "-";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}min`;
  }
  return `${mins}min`;
};

type FilterPeriod = "today" | "7days" | "30days" | "all";

export default function RelatoriosMotorista() {
  const navigate = useNavigate();
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>("7days");
  const [searchTerm, setSearchTerm] = useState("");

  // Get selected vehicle from localStorage
  const selectedVehicleId = localStorage.getItem("selectedVehicleId");

  const { data: equipment = [] } = useEquipment();
  const { data: history = [], isLoading } = useEquipmentStopHistory(selectedVehicleId || undefined);

  // Find the selected vehicle
  const selectedVehicle = equipment.find(eq => eq.id === selectedVehicleId);

  // Filter history based on period and search
  const filteredHistory = useMemo(() => {
    let filtered = history;

    // Filter by period
    const now = new Date();
    switch (filterPeriod) {
      case "today":
        filtered = filtered.filter(item => {
          const itemDate = parseISO(item.started_at);
          return isWithinInterval(itemDate, {
            start: startOfDay(now),
            end: endOfDay(now),
          });
        });
        break;
      case "7days":
        filtered = filtered.filter(item => {
          const itemDate = parseISO(item.started_at);
          return isWithinInterval(itemDate, {
            start: startOfDay(subDays(now, 7)),
            end: endOfDay(now),
          });
        });
        break;
      case "30days":
        filtered = filtered.filter(item => {
          const itemDate = parseISO(item.started_at);
          return isWithinInterval(itemDate, {
            start: startOfDay(subDays(now, 30)),
            end: endOfDay(now),
          });
        });
        break;
      case "all":
      default:
        // No date filter
        break;
    }

    // Filter by search term (in description or status)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item => {
        const statusInfo = getStatusInfo(item.stop_reason);
        return (
          statusInfo.label.toLowerCase().includes(term) ||
          (item.defect_description && item.defect_description.toLowerCase().includes(term))
        );
      });
    }

    return filtered;
  }, [history, filterPeriod, searchTerm]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b shadow-sm">
        <div className="flex items-center gap-3 p-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/painel-motorista")}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate">Relatórios</h1>
            {selectedVehicle && (
              <p className="text-xs text-muted-foreground truncate">
                {selectedVehicle.name} • {selectedVehicle.plate}
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto space-y-4">
        {/* Filters */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Period Filter */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <Select value={filterPeriod} onValueChange={(value) => setFilterPeriod(value as FilterPeriod)}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="7days">Últimos 7 dias</SelectItem>
                  <SelectItem value="30days">Últimos 30 dias</SelectItem>
                  <SelectItem value="all">Todo o histórico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search Filter */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por status ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* History List */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Histórico de Paradas
              </span>
              <Badge variant="secondary" className="text-xs">
                {filteredHistory.length} registro{filteredHistory.length !== 1 ? "s" : ""}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !selectedVehicleId ? (
              <div className="py-6 text-center text-muted-foreground">
                <p className="text-sm">Nenhum veículo selecionado.</p>
                <p className="text-xs mt-1">Volte e selecione um veículo para ver o histórico.</p>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum registro encontrado</p>
                <p className="text-xs mt-1">Ajuste os filtros ou aguarde novos registros.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredHistory.map((item) => {
                  const statusInfo = getStatusInfo(item.stop_reason);
                  const startDate = parseISO(item.started_at);
                  const endDate = item.ended_at ? parseISO(item.ended_at) : null;

                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg bg-muted/50 border space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <Badge variant="outline" className={`${statusInfo.color} shrink-0`}>
                          <span className="mr-1">{statusInfo.icon}</span>
                          {statusInfo.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDuration(item.duration_minutes)}
                        </span>
                      </div>

                      <div className="text-xs text-muted-foreground space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Início:</span>
                          <span>
                            {format(startDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        {endDate ? (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Fim:</span>
                            <span>
                              {format(endDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-amber-600">Em andamento</span>
                          </div>
                        )}
                      </div>

                      {item.defect_description && (
                        <div className="text-xs bg-background/50 p-2 rounded border-l-2 border-red-500/50">
                          <span className="font-medium text-red-600">Problema: </span>
                          <span className="text-foreground">{item.defect_description}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
