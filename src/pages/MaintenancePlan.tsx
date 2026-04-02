import { useState } from "react";
import { EditablePageTitle } from "@/components/cms/EditablePageTitle";
import Layout from "@/components/layout/Layout";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Wrench,
  AlertTriangle,
  CheckCircle,
  Clock,
  Gauge,
  Calendar,
  TrendingUp,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMaintenancePlan, MaintenancePlanEquipment } from "@/hooks/useMaintenancePlan";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function MaintenancePlan() {
  const { maintenanceData, alertEquipment, isLoading, initializePlan, resetMaintenance } =
    useMaintenancePlan();
  const [initializingId, setInitializingId] = useState<string | null>(null);

  const handleInitialize = async (equipment: MaintenancePlanEquipment) => {
    if (!equipment.current_horimeter) {
      toast.error("Equipamento sem horímetro registrado. Inicie um turno primeiro.");
      return;
    }
    
    setInitializingId(equipment.equipment_id);
    try {
      await initializePlan.mutateAsync({
        equipmentId: equipment.equipment_id,
        plate: equipment.plate,
        equipmentName: equipment.equipment_name,
        baseHorimeter: equipment.current_horimeter,
      });
      toast.success("Plano de manutenção iniciado!");
    } catch (error) {
      console.error("Error initializing plan:", error);
      toast.error("Erro ao iniciar plano");
    } finally {
      setInitializingId(null);
    }
  };

  const getStatusBadge = (status: "ok" | "warning" | "critical") => {
    switch (status) {
      case "critical":
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Manutenção Urgente
          </Badge>
        );
      case "warning":
        return (
          <Badge variant="secondary" className="gap-1 bg-amber-500/20 text-amber-600 dark:text-amber-400">
            <Clock className="h-3 w-3" />
            Atenção
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="gap-1 bg-green-500/20 text-green-600 dark:text-green-400">
            <CheckCircle className="h-3 w-3" />
            OK
          </Badge>
        );
    }
  };

  const getProgressColor = (status: "ok" | "warning" | "critical") => {
    switch (status) {
      case "critical":
        return "bg-red-500";
      case "warning":
        return "bg-amber-500";
      default:
        return "bg-green-500";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Layout>
    <div className="container mx-auto px-3 sm:px-6 py-3 sm:py-6 space-y-4 sm:space-y-6 max-w-full overflow-x-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wrench className="h-6 w-6 text-primary" />
            Plano de Manutenção
          </h1>
          <p className="text-muted-foreground">
            Acompanhamento de manutenção preventiva a cada 700 horas
          </p>
        </div>
      </div>

      {/* Alert Cards */}
      {alertEquipment.length > 0 && (
        <Card className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
              Equipamentos Precisando de Atenção ({alertEquipment.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {alertEquipment.map((eq) => (
                <div
                  key={eq.equipment_id}
                  className={cn(
                    "p-4 rounded-lg border",
                    eq.status === "critical"
                      ? "border-red-500/50 bg-red-50/50 dark:bg-red-950/20"
                      : "border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{eq.equipment_name}</span>
                    {getStatusBadge(eq.status)}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">Placa: {eq.plate}</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Horas restantes:</span>
                      <span className="font-medium">{eq.hours_remaining.toFixed(0)}h</span>
                    </div>
                    {eq.days_until_maintenance != null && (
                      <div className="flex justify-between">
                        <span>Dias estimados:</span>
                        <span className="font-medium">
                          {eq.days_until_maintenance <= 0
                            ? "Agora!"
                            : `${eq.days_until_maintenance} dias`}
                        </span>
                      </div>
                    )}
                    {eq.estimated_maintenance_date && (
                      <div className="flex justify-between">
                        <span>Data estimada:</span>
                        <span className="font-medium">
                          {format(eq.estimated_maintenance_date, "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Gauge className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Equipamentos</p>
                <p className="text-2xl font-bold">{maintenanceData.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Em Dia</p>
                <p className="text-2xl font-bold text-green-600">
                  {maintenanceData.filter((eq) => eq.status === "ok").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Atenção (5 dias)</p>
                <p className="text-2xl font-bold text-amber-600">
                  {maintenanceData.filter((eq) => eq.status === "warning").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Urgente</p>
                <p className="text-2xl font-bold text-red-600">
                  {maintenanceData.filter((eq) => eq.status === "critical").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Equipment Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Todos os Equipamentos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Equipamento</TableHead>
                <TableHead>Placa</TableHead>
                <TableHead className="text-center">Horímetro Atual</TableHead>
                <TableHead className="text-center">Horas Usadas</TableHead>
                <TableHead className="text-center">Progresso</TableHead>
                <TableHead className="text-center">Média/Dia</TableHead>
                <TableHead className="text-center">Dias Restantes</TableHead>
                <TableHead className="text-center">Data Estimada</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {maintenanceData.map((eq) => {
                const progressPercent = Math.min(100, (eq.hours_used / eq.target_hours) * 100);
                const hasValidPlan = eq.id !== "";
                
                return (
                  <TableRow key={eq.equipment_id}>
                    <TableCell className="font-medium">{eq.equipment_name}</TableCell>
                    <TableCell className="font-mono text-sm">{eq.plate}</TableCell>
                    <TableCell className="text-center">
                      {eq.current_horimeter != null ? (
                        <span className="font-medium">{eq.current_horimeter.toFixed(0)}h</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {hasValidPlan ? (
                        <span className="font-medium">{eq.hours_used.toFixed(0)}h</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center min-w-[120px]">
                      {hasValidPlan ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="space-y-1">
                                <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                                  <div
                                    className={cn("h-full transition-all", getProgressColor(eq.status))}
                                    style={{ width: `${progressPercent}%` }}
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {eq.hours_used.toFixed(0)} / {eq.target_hours}h
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                {eq.hours_remaining.toFixed(0)}h restantes para manutenção
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-muted-foreground text-xs">Não iniciado</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {eq.avg_hours_per_day > 0 ? (
                        <span className="text-sm">{eq.avg_hours_per_day.toFixed(1)}h</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {eq.days_until_maintenance != null ? (
                        <span
                          className={cn(
                            "font-medium",
                            eq.days_until_maintenance <= 0
                              ? "text-red-600"
                              : eq.days_until_maintenance <= 5
                              ? "text-amber-600"
                              : ""
                          )}
                        >
                          {eq.days_until_maintenance <= 0
                            ? "Agora!"
                            : `${eq.days_until_maintenance} dias`}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {eq.estimated_maintenance_date ? (
                        <div className="flex items-center justify-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">
                            {format(eq.estimated_maintenance_date, "dd/MM/yyyy", {
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {hasValidPlan ? (
                        getStatusBadge(eq.status)
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          Pendente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {!hasValidPlan ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleInitialize(eq)}
                          disabled={initializingId === eq.equipment_id || !eq.current_horimeter}
                        >
                          {initializingId === eq.equipment_id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Iniciar
                            </>
                          )}
                        </Button>
                      ) : (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center justify-center">
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Monitorando desde {eq.base_horimeter.toFixed(0)}h</p>
                              {eq.last_maintenance_date && (
                                <p className="text-xs text-muted-foreground">
                                  Última manutenção:{" "}
                                  {format(new Date(eq.last_maintenance_date), "dd/MM/yyyy", {
                                    locale: ptBR,
                                  })}
                                </p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
    </Layout>
  );
}
