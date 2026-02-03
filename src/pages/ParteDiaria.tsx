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
import { Truck, Plus, Loader2, Trash2, User, Clock, AlertCircle } from "lucide-react";
import { useEquipment, useCreateEquipment, useDeleteEquipment } from "@/hooks/useEquipment";
import { useEquipmentMovements } from "@/hooks/useEquipmentMovements";
import { useIsAdmin } from "@/hooks/useUserRole";
import { useProfile } from "@/hooks/useProfile";
import { VehicleIcon } from "@/components/equipamentos/VehicleIcons";
import { format } from "date-fns";
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
  const createEquipment = useCreateEquipment();
  const deleteEquipment = useDeleteEquipment();
  const { isAdmin } = useIsAdmin();
  const { data: profile } = useProfile();

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

  const getStatusBadge = (stopReason: string | null) => {
    if (!stopReason || stopReason === "none") {
      return <Badge className="bg-green-500 text-white">Operando</Badge>;
    }
    switch (stopReason) {
      case "maintenance":
        return <Badge className="bg-orange-500 text-white">Manutenção</Badge>;
      case "waiting_front":
        return <Badge className="bg-yellow-500 text-black">Aguardando Frente</Badge>;
      case "end_of_shift":
        return <Badge className="bg-blue-500 text-white">Fim de Turno</Badge>;
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

  // Get status timeline for each vehicle
  const getVehicleTimeline = (vehicleId: string, plate: string) => {
    const todayMovements = getTodayMovements(plate);
    const vehicle = driverVehicles.find((v) => v.id === vehicleId);

    return {
      driver: vehicle?.driver || null,
      currentStatus: vehicle?.stop_reason || "none",
      stopStartTime: vehicle?.stop_start_time,
      movements: todayMovements,
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
                          {getStatusBadge(timeline.currentStatus)}
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

                        {/* Today's Movements Timeline */}
                        {timeline.movements.length > 0 && (
                          <div className="border-t pt-3">
                            <p className="text-xs font-medium text-muted-foreground mb-2">
                              Movimentações de Hoje
                            </p>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {timeline.movements.map((movement, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-2 text-xs"
                                >
                                  <span className="font-mono text-muted-foreground w-12">
                                    {movement.movement_time.slice(0, 5)}
                                  </span>
                                  <Badge
                                    variant={
                                      movement.movement_type === "entrada"
                                        ? "default"
                                        : "secondary"
                                    }
                                    className="text-xs"
                                  >
                                    {movement.movement_type === "entrada"
                                      ? "Entrada"
                                      : "Saída"}
                                  </Badge>
                                  {movement.exit_reason && (
                                    <span className="text-muted-foreground truncate">
                                      {movement.exit_reason}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {timeline.movements.length === 0 && !timeline.driver && (
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
                          <TableCell>{getStatusBadge(vehicle.stop_reason)}</TableCell>
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
