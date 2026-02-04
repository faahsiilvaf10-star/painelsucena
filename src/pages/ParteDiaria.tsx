import { useState } from "react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Truck, Plus, Loader2, Trash2, User, Clock, AlertCircle, Droplets, FileText, Calendar, Fuel, Gauge, Route } from "lucide-react";
import { ExportEquipmentPdfButton } from "@/components/equipamentos/ExportEquipmentPdfButton";
import { ExportDailyShiftPdfButton } from "@/components/equipamentos/ExportDailyShiftPdfButton";
import { useEquipment, useCreateEquipment, useDeleteEquipment, useEquipmentStopHistory } from "@/hooks/useEquipment";
import { useEquipmentMovements } from "@/hooks/useEquipmentMovements";
import { useDailyShiftRecords } from "@/hooks/useDailyShiftRecords";
import { useIsAdmin } from "@/hooks/useUserRole";
import { useProfile } from "@/hooks/useProfile";
import { VehicleIcon } from "@/components/equipamentos/VehicleIcons";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function ParteDiaria() {
  const { data: equipment = [], isLoading: isLoadingEquipment } = useEquipment();
  const { data: movements = [], isLoading: isLoadingMovements } = useEquipmentMovements();
  const { data: stopHistory = [] } = useEquipmentStopHistory();
  const { data: shiftRecords = [], isLoading: isLoadingRecords } = useDailyShiftRecords();
  const createEquipment = useCreateEquipment();
  const deleteEquipment = useDeleteEquipment();
  const { isAdmin } = useIsAdmin();
  const { data: profile } = useProfile();
  const [selectedReportDate, setSelectedReportDate] = useState(format(new Date(), "yyyy-MM-dd"));

  // Check if user can edit (admin or aux_administrativo)
  const canEdit = isAdmin || profile?.cargo === "aux_administrativo";

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newEquipment, setNewEquipment] = useState({
    name: "",
    plate: "",
    equipment_type: "pipa" as "pipa" | "munk",
  });

  // Filter only Pipa and Munk vehicles (driver vehicles)
  const driverVehicles = equipment.filter(
    (eq) => eq.equipment_type === "pipa" || eq.equipment_type === "munk"
  );

  const handleCreateEquipment = async () => {
    if (!newEquipment.name || !newEquipment.plate) {
      toast.error("Preencha todos os campos");
      return;
    }

    try {
      await createEquipment.mutateAsync({
        name: newEquipment.name,
        plate: newEquipment.plate.toUpperCase(),
        equipment_type: newEquipment.equipment_type,
        driver: "",
        helper: "",
        start_hour: 8,
        end_hour: 16,
      });

      toast.success("Equipamento cadastrado com sucesso!");
      setNewEquipment({ name: "", plate: "", equipment_type: "pipa" });
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error creating equipment:", error);
      toast.error("Erro ao cadastrar equipamento");
    }
  };

  const handleDeleteEquipment = async (id: string) => {
    try {
      await deleteEquipment.mutateAsync(id);
      toast.success("Equipamento removido com sucesso!");
    } catch (error) {
      console.error("Error deleting equipment:", error);
      toast.error("Erro ao remover equipamento");
    }
  };

  const getStatusBadge = (stopReason: string | null, vehicleId?: string, hasDriver?: boolean) => {
    // Only show "Operando" if there's a driver AND the status is none/operando
    if (!stopReason || stopReason === "none" || stopReason === "operando") {
      if (hasDriver) {
        return <Badge className="bg-green-500 text-white">Operando</Badge>;
      } else {
        return <Badge className="bg-gray-500 text-white">Sem Motorista</Badge>;
      }
    }
    switch (stopReason) {
      case "maintenance":
        return <Badge className="bg-orange-500 text-white">Manutenção</Badge>;
      case "waiting":
        // Vehicle selected but driver hasn't clicked "Operar" yet
        return <Badge className="bg-yellow-500 text-black">Aguardando Início</Badge>;
      case "waiting_front":
        return <Badge className="bg-yellow-500 text-black">Aguardando Frente</Badge>;
      case "end_of_shift":
        return <Badge className="bg-blue-500 text-white">Fim de Turno</Badge>;
      case "end_of_day":
        return <Badge className="bg-orange-500 text-white">Combustível</Badge>;
      case "rain":
        return <Badge className="bg-sky-500 text-white">Chuva</Badge>;
      case "abastecimento":
        // Find the current refueling point from stop history
        if (vehicleId) {
          const currentRefueling = stopHistory.find(
            (h) => h.equipment_id === vehicleId && 
                   h.stop_reason === "abastecimento" && 
                   !h.ended_at
          );
          if (currentRefueling?.defect_description) {
            const pointMatch = currentRefueling.defect_description.match(/Ponto: (.+)/);
            if (pointMatch) {
              return (
                <Badge className="bg-cyan-500 text-white flex items-center gap-1">
                  <Droplets className="h-3 w-3" />
                  Abastecimento - Ponto {pointMatch[1]}
                </Badge>
              );
            }
          }
        }
        return (
          <Badge className="bg-cyan-500 text-white flex items-center gap-1">
            <Droplets className="h-3 w-3" />
            Abastecimento
          </Badge>
        );
      default:
        return <Badge variant="secondary">{stopReason}</Badge>;
    }
  };

  const getEquipmentTypeLabel = (type: string) => {
    switch (type) {
      case "pipa":
        return "Pipa";
      case "munk":
        return "Munk";
      default:
        return type;
    }
  };

  // Get today's movements for each vehicle
  const getTodayMovements = (plate: string) => {
    const today = format(new Date(), "yyyy-MM-dd");
    return movements
      .filter((m) => m.plate === plate && m.movement_date === today)
      .sort((a, b) => a.movement_time.localeCompare(b.movement_time));
  };

  // Get status label for stop history entries (synced with PDF labels)
  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      none: "Operando",
      operando: "Operando",
      waiting: "Aguardando Frente",
      waiting_front: "Aguardando Frente",
      aguardando_frente_servico: "Aguardando Frente",
      rain: "Parado (Chuva)",
      end_of_day: "Abastecendo",
      abastecimento: "Abastecendo",
      maintenance: "Manutenção",
      manutencao_corretiva: "Manutenção Corretiva",
      manutencao_preventiva: "Manutenção Preventiva",
      vistoria: "Vistoria",
      end_of_shift: "Fim de Turno",
      fim_turno: "Fim de Turno",
    };
    return labels[status] || status;
  };

  // Get today's status history for each vehicle (filter consecutive duplicates)
  const getTodayStatusHistory = (vehicleId: string) => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const sorted = stopHistory
      .filter((h) => {
        const startedAt = new Date(h.started_at);
        return h.equipment_id === vehicleId && startedAt >= todayStart;
      })
      .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime());
    
    // Filter out consecutive duplicates (same status AND same description)
    return sorted.filter((entry, index, arr) => {
      if (index === 0) return true;
      const prev = arr[index - 1];
      return entry.stop_reason !== prev.stop_reason || entry.defect_description !== prev.defect_description;
    });
  };

  // Get status timeline for each vehicle
  const getVehicleTimeline = (vehicleId: string, plate: string) => {
    const todayMovements = getTodayMovements(plate);
    const todayStatusHistory = getTodayStatusHistory(vehicleId);
    const vehicle = driverVehicles.find((v) => v.id === vehicleId);

    return {
      driver: vehicle?.driver || null,
      currentStatus: vehicle?.stop_reason || "none",
      stopStartTime: vehicle?.stop_start_time,
      movements: todayMovements,
      statusHistory: todayStatusHistory,
    };
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Parte Diária</h1>
            <p className="text-muted-foreground">
              Gestão de equipamentos e acompanhamento de status dos motoristas
            </p>
          </div>
        </div>

        <Tabs defaultValue="status" className="space-y-4">
          <TabsList>
            <TabsTrigger value="status">Status dos Veículos</TabsTrigger>
            <TabsTrigger value="relatorios">Relatórios do Dia</TabsTrigger>
            {canEdit && (
              <TabsTrigger value="equipamentos">Cadastro de Equipamentos</TabsTrigger>
            )}
          </TabsList>

          {/* Status Tab */}
          <TabsContent value="status" className="space-y-4">
            {isLoadingEquipment || isLoadingMovements ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : driverVehicles.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Truck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Nenhum veículo cadastrado. Cadastre veículos na aba "Cadastro de Equipamentos".
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {driverVehicles.map((vehicle) => {
                  const timeline = getVehicleTimeline(vehicle.id, vehicle.plate);

                  return (
                    <Card key={vehicle.id} className="overflow-hidden">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                              <VehicleIcon
                                type={vehicle.equipment_type as "pipa" | "munk"}
                                size="md"
                              />
                            </div>
                            <div>
                              <CardTitle className="text-lg">{vehicle.name}</CardTitle>
                              <p className="text-sm text-muted-foreground font-mono">
                                {vehicle.plate}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <ExportEquipmentPdfButton
                              equipment={vehicle}
                              movements={movements.filter((m) => m.plate === vehicle.plate)}
                              stopHistory={stopHistory.filter((h) => h.equipment_id === vehicle.id)}
                            />
                            {getStatusBadge(timeline.currentStatus, vehicle.id, !!timeline.driver)}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Driver Info */}
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Motorista:</span>
                          <span className="font-medium">
                            {timeline.driver || "Não vinculado"}
                          </span>
                        </div>

                        {/* Stop Time */}
                        {timeline.currentStatus !== "none" && timeline.stopStartTime && (
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Parado desde:</span>
                            <span className="font-medium">
                              {format(new Date(timeline.stopStartTime), "HH:mm", {
                                locale: ptBR,
                              })}
                            </span>
                          </div>
                        )}

                        {/* Today's Status History Timeline */}
                        {timeline.statusHistory.length > 0 && (
                          <div className="border-t pt-3">
                            <p className="text-xs font-medium text-muted-foreground mb-2">
                              Movimentações de Hoje
                            </p>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {timeline.statusHistory.map((status, idx) => {
                                const statusLabel = getStatusLabel(status.stop_reason);
                                const isOperando = status.stop_reason === "operando" || status.stop_reason === "none";
                                const isAbastecimento = status.stop_reason === "abastecimento" || status.stop_reason === "end_of_day";
                                const isMaintenance = status.stop_reason === "maintenance";
                                const isEndOfShift = status.stop_reason === "end_of_shift" || status.stop_reason === "fim_turno";
                                const isWaiting = status.stop_reason === "waiting" || status.stop_reason === "waiting_front";
                                const isRain = status.stop_reason === "rain";
                                
                                return (
                                  <div
                                    key={status.id || idx}
                                    className="flex items-center gap-2 text-xs"
                                  >
                                    <span className="font-mono text-muted-foreground w-12">
                                      {format(new Date(status.started_at), "HH:mm", { locale: ptBR })}
                                    </span>
                                    <Badge
                                      className={`text-xs ${
                                        isOperando ? "bg-green-500 text-white" :
                                        isAbastecimento ? "bg-cyan-500 text-white" :
                                        isMaintenance ? "bg-orange-500 text-white" :
                                        isEndOfShift ? "bg-blue-500 text-white" :
                                        isWaiting ? "bg-yellow-500 text-black" :
                                        isRain ? "bg-sky-500 text-white" :
                                        ""
                                      }`}
                                    >
                                      {statusLabel}
                                    </Badge>
                                    {status.defect_description && (
                                      <span className="text-muted-foreground truncate max-w-[120px]" title={status.defect_description}>
                                        {status.defect_description}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {timeline.statusHistory.length === 0 && !timeline.driver && (
                          <div className="flex items-center gap-2 text-sm text-amber-600">
                            <AlertCircle className="h-4 w-4" />
                            <span>Aguardando seleção do motorista</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="relatorios" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Relatórios Diários de Turno
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="report-date" className="text-sm text-muted-foreground whitespace-nowrap">
                      Filtrar por data:
                    </Label>
                    <Input
                      id="report-date"
                      type="date"
                      value={selectedReportDate}
                      onChange={(e) => setSelectedReportDate(e.target.value)}
                      className="w-auto"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingRecords ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  (() => {
                    const filteredRecords = shiftRecords.filter(
                      (record) => record.shift_date === selectedReportDate
                    );

                    if (filteredRecords.length === 0) {
                      return (
                        <div className="text-center py-12">
                          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                          <p className="text-muted-foreground">
                            Nenhum registro encontrado para {format(new Date(selectedReportDate + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}.
                          </p>
                          <p className="text-sm text-muted-foreground mt-2">
                            Os relatórios são gerados automaticamente quando os motoristas iniciam seus turnos.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {filteredRecords.map((record) => {
                          const hoursWorked = record.initial_horimeter && record.final_horimeter
                            ? (record.final_horimeter - record.initial_horimeter).toFixed(1)
                            : null;
                          const kmTraveled = record.initial_km && record.final_km
                            ? (record.final_km - record.initial_km).toFixed(1)
                            : null;

                          return (
                            <Card key={record.id} className="overflow-hidden border-2">
                              <CardHeader className="pb-3 bg-muted/30">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                      <Truck className="h-5 w-5" />
                                    </div>
                                    <div>
                                      <CardTitle className="text-lg">{record.equipment_name}</CardTitle>
                                      <p className="text-sm text-muted-foreground font-mono">
                                        {record.plate}
                                      </p>
                                    </div>
                                  </div>
                                  <ExportDailyShiftPdfButton record={record} />
                                </div>
                              </CardHeader>
                              <CardContent className="pt-4 space-y-4">
                                {/* Team */}
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase">Motorista</p>
                                    <p className="font-medium text-sm">{record.driver_name}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase">Ajudante</p>
                                    <p className="font-medium text-sm">{record.helper_name || "-"}</p>
                                  </div>
                                </div>

                                {/* Telemetry */}
                                <div className="grid grid-cols-3 gap-3">
                                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                                    <Gauge className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                                    <p className="text-xs text-muted-foreground">Horímetro</p>
                                    <p className="font-bold text-sm">
                                      {hoursWorked ? `${hoursWorked}h` : "-"}
                                    </p>
                                  </div>
                                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                                    <Route className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                                    <p className="text-xs text-muted-foreground">KM</p>
                                    <p className="font-bold text-sm">
                                      {kmTraveled ? `${kmTraveled} km` : "-"}
                                    </p>
                                  </div>
                                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                                    <Fuel className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                                    <p className="text-xs text-muted-foreground">Combustível</p>
                                    <p className="font-bold text-sm capitalize">
                                      {record.final_fuel_level || record.initial_fuel_level || "-"}
                                    </p>
                                  </div>
                                </div>

                                {/* Stats Summary */}
                                <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {record.status_history.length} alterações de status
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Droplets className="h-3 w-3" />
                                    {record.refueling_points.length} abastecimentos
                                  </span>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    );
                  })()
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Equipment Registration Tab */}
          {canEdit && (
          <TabsContent value="equipamentos" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Equipamentos Cadastrados
                </CardTitle>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Equipamento
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Cadastrar Novo Equipamento</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nome do Equipamento</Label>
                        <Input
                          id="name"
                          placeholder="Ex: PIPA 01"
                          value={newEquipment.name}
                          onChange={(e) =>
                            setNewEquipment({ ...newEquipment, name: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="plate">Placa</Label>
                        <Input
                          id="plate"
                          placeholder="Ex: ABC1D23"
                          value={newEquipment.plate}
                          onChange={(e) =>
                            setNewEquipment({
                              ...newEquipment,
                              plate: e.target.value.toUpperCase(),
                            })
                          }
                          maxLength={7}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="type">Tipo</Label>
                        <Select
                          value={newEquipment.equipment_type}
                          onValueChange={(value: "pipa" | "munk") =>
                            setNewEquipment({ ...newEquipment, equipment_type: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pipa">Pipa</SelectItem>
                            <SelectItem value="munk">Munk</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        className="w-full"
                        onClick={handleCreateEquipment}
                        disabled={createEquipment.isPending}
                      >
                        {createEquipment.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4 mr-2" />
                        )}
                        Cadastrar
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {isLoadingEquipment ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : driverVehicles.length === 0 ? (
                  <div className="text-center py-8">
                    <Truck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      Nenhum equipamento cadastrado
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Equipamento</TableHead>
                        <TableHead>Placa</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Motorista Atual</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {driverVehicles.map((vehicle) => (
                        <TableRow key={vehicle.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <VehicleIcon
                                type={vehicle.equipment_type as "pipa" | "munk"}
                                size="sm"
                              />
                              {vehicle.name}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono">{vehicle.plate}</TableCell>
                          <TableCell>
                            {getEquipmentTypeLabel(vehicle.equipment_type)}
                          </TableCell>
                          <TableCell>
                            {vehicle.driver || (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(vehicle.stop_reason, vehicle.id)}</TableCell>
                          <TableCell className="text-right">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  disabled={!!vehicle.driver}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remover Equipamento</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja remover o equipamento{" "}
                                    <strong>{vehicle.name}</strong>? Esta ação não pode
                                    ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteEquipment(vehicle.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Remover
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          )}
        </Tabs>
      </div>
    </Layout>
  );
}
