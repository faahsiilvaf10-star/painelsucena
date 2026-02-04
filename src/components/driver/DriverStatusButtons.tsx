import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Play, 
  Clock, 
  CloudRain, 
  Fuel, 
  Loader2,
  Power,
  Gauge,
  Car,
  Info,
  AlertCircle,
  WifiOff
} from "lucide-react";
import { useEquipment, useUpdateEquipmentStatus, useEquipmentStopHistory, type StopReason } from "@/hooks/useEquipment";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FuelLevelGauge, type FuelLevel } from "./FuelLevelGauge";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { useCreateShiftRecord, useUpdateShiftRecord, useAddStatusToHistory } from "@/hooks/useDailyShiftRecords";
import { useCreateEquipmentMovement } from "@/hooks/useEquipmentMovements";

type DriverStopReason = StopReason;

interface StatusButton {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  action: DriverStopReason;
}

const statusButtons: StatusButton[] = [
  {
    id: "none",
    label: "Operar",
    icon: <Play className="h-6 w-6" />,
    color: "bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white",
    action: "none",
  },
  {
    id: "waiting",
    label: "Aguardando",
    icon: <Clock className="h-6 w-6" />,
    color: "bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700 text-white",
    action: "waiting",
  },
  {
    id: "rain",
    label: "Chuva",
    icon: <CloudRain className="h-6 w-6" />,
    color: "bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white",
    action: "rain",
  },
  {
    id: "end_of_day",
    label: "Combustível",
    icon: <Fuel className="h-6 w-6" />,
    color: "bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white",
    action: "end_of_day",
  },
];

const getStatusLabel = (stopReason: string | null) => {
  switch (stopReason) {
    case "none":
    case null:
      return { label: "Operando", color: "bg-green-500" };
    case "waiting":
      return { label: "Aguardando Frente", color: "bg-yellow-500" };
    case "rain":
      return { label: "Parado (Chuva)", color: "bg-blue-500" };
    case "end_of_day":
      return { label: "Abastecendo", color: "bg-orange-500" };
    case "maintenance":
      return { label: "Manutenção", color: "bg-red-500" };
    case "end_of_shift":
      return { label: "Fim de Turno", color: "bg-gray-500" };
    default:
      return { label: "Parado", color: "bg-gray-500" };
  }
};

export function DriverStatusButtons() {
  const navigate = useNavigate();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [fuelLevel, setFuelLevel] = useState<FuelLevel>("half");
  const [showEndShiftDialog, setShowEndShiftDialog] = useState(false);
  const [showStartShiftDialog, setShowStartShiftDialog] = useState(false);
  const [endShiftFuelLevel, setEndShiftFuelLevel] = useState<FuelLevel>("half");
  const [endShiftHorimeter, setEndShiftHorimeter] = useState("");
  const [endShiftKm, setEndShiftKm] = useState("");
  const [startShiftHorimeter, setStartShiftHorimeter] = useState("");
  const [startShiftKm, setStartShiftKm] = useState("");
  const [initialHorimeter, setInitialHorimeter] = useState<string | null>(null);
  const [initialKm, setInitialKm] = useState<string | null>(null);
  const [endShiftError, setEndShiftError] = useState<string | null>(null);
  const { data: equipment = [], isLoading } = useEquipment();
  const { data: profile } = useProfile();
  const updateStatus = useUpdateEquipmentStatus();
  const { data: stopHistory = [] } = useEquipmentStopHistory(selectedVehicleId || undefined);
  const { isOnline, addPendingAction } = useOfflineSync();
  const createShiftRecord = useCreateShiftRecord();
  const updateShiftRecord = useUpdateShiftRecord();
  const addStatusToHistory = useAddStatusToHistory();
  const createEquipmentMovement = useCreateEquipmentMovement();

  useEffect(() => {
    const vehicleId = localStorage.getItem("selectedVehicleId");
    setSelectedVehicleId(vehicleId);
    
    // Load initial values from localStorage if they exist
    if (vehicleId) {
      const storedHorimeter = localStorage.getItem(`shift_horimeter_${vehicleId}`);
      const storedKm = localStorage.getItem(`shift_km_${vehicleId}`);
      setInitialHorimeter(storedHorimeter);
      setInitialKm(storedKm);
    }
  }, []);

  const selectedVehicle = equipment.find((eq) => eq.id === selectedVehicleId);
  const currentStatus = (selectedVehicle?.stop_reason || "none") as string;
  const statusInfo = getStatusLabel(currentStatus);
  
  // Check if equipment is in maintenance mode (blocks all other buttons except "Operar")
  const isInMaintenance = currentStatus === "maintenance";
  
  // Check if shift has been started (has initial values)
  const shiftStarted = initialHorimeter !== null && initialKm !== null;

  // Get the current active stop from history (ended_at is null)
  const activeStop = stopHistory.find((h) => h.ended_at === null);

  const validateEndShiftValues = (): boolean => {
    setEndShiftError(null);
    
    if (initialHorimeter && endShiftHorimeter) {
      const initialH = parseFloat(initialHorimeter);
      const finalH = parseFloat(endShiftHorimeter);
      if (finalH < initialH) {
        setEndShiftError(`Horímetro final (${finalH}) deve ser maior ou igual ao inicial (${initialH})`);
        return false;
      }
    }
    
    if (initialKm && endShiftKm) {
      const initialK = parseFloat(initialKm);
      const finalK = parseFloat(endShiftKm);
      if (finalK < initialK) {
        setEndShiftError(`KM final (${finalK}) deve ser maior ou igual ao inicial (${initialK})`);
        return false;
      }
    }
    
    return true;
  };

  const handleEndOfShift = async () => {
    if (!selectedVehicleId || !selectedVehicle) {
      toast.error("Nenhum veículo selecionado");
      return;
    }

    if (!validateEndShiftValues()) {
      return;
    }

    setIsUpdating(true);
    try {
      const now = new Date().toISOString();
      const today = now.split("T")[0];

      // Update the equipment status to end_of_shift
      await updateStatus.mutateAsync({
        id: selectedVehicleId,
        stop_reason: "end_of_shift" as any,
        stop_start_time: now,
        previousStopReason: currentStatus as any,
        previousStopStartTime: selectedVehicle.stop_start_time,
        changed_by_driver: profile?.full_name || null,
      });

      // Update the daily shift record with final values
      await updateShiftRecord.mutateAsync({
        equipment_id: selectedVehicleId,
        shift_date: today,
        final_horimeter: endShiftHorimeter ? parseFloat(endShiftHorimeter) : undefined,
        final_km: endShiftKm ? parseFloat(endShiftKm) : undefined,
        final_fuel_level: endShiftFuelLevel,
        shift_end_time: now,
      });

      // Automatically register equipment exit (saída) in equipment_movements
      // This will trigger the announcement for all users and update "Entrada e Saída" page
      try {
        await createEquipmentMovement.mutateAsync({
          equipment_name: selectedVehicle.name,
          plate: selectedVehicle.plate,
          movement_type: "saida",
          exit_reason: "fim_turno",
          observation: `Fim de turno - Combustível: ${getFuelLevelLabel(endShiftFuelLevel)}${endShiftHorimeter ? `, Horímetro: ${endShiftHorimeter}` : ""}${endShiftKm ? `, KM: ${endShiftKm}` : ""}`,
        });
      } catch (movementError) {
        console.error("Error creating equipment movement:", movementError);
        // Don't block the end of shift if movement creation fails
      }

      // Clear the driver field from the equipment
      await supabase
        .from("equipment")
        .update({ driver: "" })
        .eq("id", selectedVehicleId);

      // Clear the selected vehicle and shift data from localStorage
      localStorage.removeItem("selectedVehicleId");
      localStorage.removeItem(`shift_horimeter_${selectedVehicleId}`);
      localStorage.removeItem(`shift_km_${selectedVehicleId}`);

      setShowEndShiftDialog(false);
      
      const details = [
        `Combustível: ${getFuelLevelLabel(endShiftFuelLevel)}`,
        endShiftHorimeter && `Horímetro: ${endShiftHorimeter}`,
        endShiftKm && `KM: ${endShiftKm}`,
      ].filter(Boolean).join(" | ");
      
      toast.success(`Fim de turno registrado. ${details}`);
      
      // Navigate to vehicle selection page
      navigate("/selecao-veiculo", { replace: true });
    } catch (error) {
      console.error("Error ending shift:", error);
      toast.error("Erro ao registrar fim de turno");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStartShift = async () => {
    if (!selectedVehicleId || !selectedVehicle) {
      toast.error("Nenhum veículo selecionado");
      return;
    }

    if (!startShiftHorimeter || !startShiftKm) {
      toast.error("Preencha o Horímetro e KM inicial");
      return;
    }

    setIsUpdating(true);
    try {
      const now = new Date().toISOString();

      // Save initial values to localStorage
      localStorage.setItem(`shift_horimeter_${selectedVehicleId}`, startShiftHorimeter);
      localStorage.setItem(`shift_km_${selectedVehicleId}`, startShiftKm);
      setInitialHorimeter(startShiftHorimeter);
      setInitialKm(startShiftKm);

      // Create daily shift record in the database
      await createShiftRecord.mutateAsync({
        equipment_id: selectedVehicleId,
        equipment_name: selectedVehicle.name,
        plate: selectedVehicle.plate,
        driver_name: profile?.full_name || "Motorista",
        helper_name: selectedVehicle.helper || undefined,
        initial_horimeter: parseFloat(startShiftHorimeter),
        initial_km: parseFloat(startShiftKm),
        initial_fuel_level: fuelLevel,
      });

      // Automatically register equipment entry (entrada) in equipment_movements
      // This will trigger the announcement for all users and update "Entrada e Saída" page
      try {
        await createEquipmentMovement.mutateAsync({
          equipment_name: selectedVehicle.name,
          plate: selectedVehicle.plate,
          movement_type: "entrada",
          observation: `Início de turno - Horímetro: ${startShiftHorimeter}, KM: ${startShiftKm}, Combustível: ${getFuelLevelLabel(fuelLevel)}`,
        });
      } catch (movementError) {
        console.error("Error creating equipment movement:", movementError);
        // Don't block the start of shift if movement creation fails
      }

      await updateStatus.mutateAsync({
        id: selectedVehicleId,
        stop_reason: "none" as any,
        stop_start_time: null,
        previousStopReason: currentStatus as any,
        previousStopStartTime: selectedVehicle.stop_start_time,
        changed_by_driver: profile?.full_name || null,
      });

      setShowStartShiftDialog(false);
      toast.success(`Turno iniciado! Horímetro: ${startShiftHorimeter} | KM: ${startShiftKm}`);
    } catch (error) {
      console.error("Error starting shift:", error);
      toast.error("Erro ao iniciar turno");
    } finally {
      setIsUpdating(false);
    }
  };

  const getFuelLevelLabel = (level: FuelLevel): string => {
    const labels: Record<FuelLevel, string> = {
      empty: "Vazio",
      quarter: "1/4",
      half: "1/2",
      three_quarters: "3/4",
      full: "Cheio",
    };
    return labels[level];
  };

  const handleStatusChange = async (newStatus: DriverStopReason) => {
    if (!selectedVehicleId || !selectedVehicle) {
      toast.error("Nenhum veículo selecionado");
      return;
    }

    // Handle end_of_shift - show dialog instead of immediate action
    if (newStatus === "end_of_shift") {
      setEndShiftFuelLevel("half"); // Reset to default
      setEndShiftHorimeter(initialHorimeter || ""); // Pre-fill with initial value
      setEndShiftKm(initialKm || ""); // Pre-fill with initial value
      setEndShiftError(null);
      setShowEndShiftDialog(true);
      return;
    }

    // Handle starting shift (going to "none" status) - show dialog if shift not started
    if (newStatus === "none" && !shiftStarted) {
      setStartShiftHorimeter("");
      setStartShiftKm("");
      setShowStartShiftDialog(true);
      return;
    }

    setIsUpdating(true);
    const now = new Date().toISOString();
    const statusLabels: Record<string, string> = {
      none: "Operando",
      waiting: "Aguardando Frente",
      rain: "Parado por Chuva",
      end_of_day: "Abastecendo",
      end_of_shift: "Fim de Turno",
    };

    // If offline, save action locally
    if (!isOnline) {
      addPendingAction("equipment_status", {
        id: selectedVehicleId,
        stop_reason: newStatus,
        stop_start_time: newStatus !== "none" ? now : null,
      });
      
      // Also save stop history action
      if (newStatus !== "none") {
        addPendingAction("stop_history", {
          equipment_id: selectedVehicleId,
          stop_reason: newStatus,
          started_at: now,
          changed_by_driver: profile?.full_name || null,
        });
      }
      
      toast.success(
        <div className="flex items-center gap-2">
          <WifiOff className="h-4 w-4" />
          <span>Salvo offline: {statusLabels[newStatus] || newStatus}</span>
        </div>
      );
      setIsUpdating(false);
      return;
    }

    try {
      await updateStatus.mutateAsync({
        id: selectedVehicleId,
        stop_reason: newStatus as any,
        stop_start_time: newStatus !== "none" ? now : null,
        previousStopReason: currentStatus as any,
        previousStopStartTime: selectedVehicle.stop_start_time,
        changed_by_driver: profile?.full_name || null,
      });

      toast.success(`Status alterado para: ${statusLabels[newStatus] || newStatus}`);
    } catch (error) {
      console.error("Error updating status:", error);
      
      // If online request fails, save offline
      addPendingAction("equipment_status", {
        id: selectedVehicleId,
        stop_reason: newStatus,
        stop_start_time: newStatus !== "none" ? now : null,
      });
      
      toast.warning("Erro de conexão. Alteração salva para sincronizar depois.");
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!selectedVehicle) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-muted-foreground">
          <p className="text-sm">Nenhum veículo selecionado</p>
          <p className="text-xs mt-1">Faça login novamente para selecionar um veículo</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-md">
        <CardHeader className="pb-3 px-4 pt-4">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base font-semibold">Controle de Turno</CardTitle>
            <Badge className={`${statusInfo.color} text-white text-xs px-2.5 py-0.5`}>
              {statusInfo.label}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
            <span className="font-medium truncate">{selectedVehicle.name}</span>
            <span>•</span>
            <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{selectedVehicle.plate}</span>
          </div>
          {activeStop && (
            <p className="text-xs text-muted-foreground mt-1.5">
              Desde: {format(new Date(activeStop.started_at), "HH:mm", { locale: ptBR })}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-4 px-4 pb-4">
          {/* Offline Banner */}
          {!isOnline && (
            <Alert className="bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800 py-2">
              <WifiOff className="h-4 w-4 text-orange-500" />
              <AlertDescription className="text-xs text-orange-700 dark:text-orange-300 ml-2">
                Modo offline - alterações serão sincronizadas quando conectar
              </AlertDescription>
            </Alert>
          )}

          {/* Fuel Level Gauge */}
          <div className="flex flex-col items-center gap-3 py-2">
            <FuelLevelGauge
              selectedLevel={fuelLevel}
              onLevelChange={setFuelLevel}
              disabled={isUpdating}
            />
          </div>

          {/* Maintenance Mode Alert */}
          {isInMaintenance && (
            <Alert className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 py-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-xs text-red-700 dark:text-red-300 ml-2">
                Equipamento em manutenção - apenas "Operar" disponível para retomar
              </AlertDescription>
            </Alert>
          )}

          {/* Status Control Buttons - Larger touch targets */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
            {statusButtons.map((button) => {
              // If in maintenance, only "Operar" (none) button is enabled
              const isDisabledByMaintenance = isInMaintenance && button.action !== "none";
              const isCurrentStatus = currentStatus === button.action;
              
              return (
                <Button
                  key={button.id}
                  variant="outline"
                  className={`h-auto min-h-[60px] py-3 flex flex-col items-center gap-1.5 touch-manipulation transition-transform active:scale-95 ${
                    isCurrentStatus ? "ring-2 ring-primary ring-offset-2" : ""
                  } ${isDisabledByMaintenance ? "opacity-50 cursor-not-allowed bg-muted" : button.color}`}
                  onClick={() => handleStatusChange(button.action)}
                  disabled={isUpdating || isCurrentStatus || isDisabledByMaintenance}
                >
                  {isUpdating ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    button.icon
                  )}
                  <span className="text-xs font-semibold">{button.label}</span>
                </Button>
              );
            })}
          </div>

          {/* End of Shift Button - Prominent and easy to tap */}
          <Button
            variant="outline"
            className={`w-full h-auto min-h-[52px] py-3 flex items-center justify-center gap-2.5 touch-manipulation transition-transform active:scale-95 ${
              currentStatus === "end_of_shift" ? "ring-2 ring-primary ring-offset-2" : ""
            } ${isInMaintenance ? "opacity-50 cursor-not-allowed bg-muted" : "bg-gray-600 hover:bg-gray-700 active:bg-gray-800 text-white border-gray-600"}`}
            onClick={() => handleStatusChange("end_of_shift" as StopReason)}
            disabled={isUpdating || currentStatus === "end_of_shift" || isInMaintenance}
          >
            {isUpdating ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Power className="h-5 w-5" />
            )}
            <span className="text-sm font-semibold">Fim de Turno</span>
          </Button>
        </CardContent>
      </Card>

      {/* Start Shift Dialog with Horimeter and KM */}
      <Dialog open={showStartShiftDialog} onOpenChange={setShowStartShiftDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-emerald-500" />
              Iniciar Turno
            </DialogTitle>
            <DialogDescription>
              Informe os dados iniciais do equipamento
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Legend */}
            <Alert className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
              <Info className="h-4 w-4 text-blue-500" />
              <AlertDescription className="text-xs text-blue-700 dark:text-blue-300">
                Registre o horímetro e quilometragem antes de iniciar o turno. 
                Estes valores serão usados para validação no fim do turno.
              </AlertDescription>
            </Alert>

            {/* Horimeter and KM inputs - REQUIRED */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="start-horimeter" className="text-xs flex items-center gap-1.5">
                  <Gauge className="h-3.5 w-3.5" />
                  Horímetro Inicial <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="start-horimeter"
                  type="number"
                  placeholder="Ex: 1234"
                  value={startShiftHorimeter}
                  onChange={(e) => setStartShiftHorimeter(e.target.value)}
                  disabled={isUpdating}
                  className={`h-9 ${!startShiftHorimeter ? 'border-destructive/50 focus-visible:ring-destructive' : ''}`}
                  required
                />
                {!startShiftHorimeter && (
                  <p className="text-[10px] text-destructive">Campo obrigatório</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="start-km" className="text-xs flex items-center gap-1.5">
                  <Car className="h-3.5 w-3.5" />
                  KM Inicial <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="start-km"
                  type="number"
                  placeholder="Ex: 45678"
                  value={startShiftKm}
                  onChange={(e) => setStartShiftKm(e.target.value)}
                  disabled={isUpdating}
                  className={`h-9 ${!startShiftKm ? 'border-destructive/50 focus-visible:ring-destructive' : ''}`}
                  required
                />
                {!startShiftKm && (
                  <p className="text-[10px] text-destructive">Campo obrigatório</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowStartShiftDialog(false)}
              disabled={isUpdating}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleStartShift}
              disabled={isUpdating || !startShiftHorimeter || !startShiftKm}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700"
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Iniciar Turno
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* End of Shift Dialog with Fuel Level, Horimeter and KM */}
      <Dialog open={showEndShiftDialog} onOpenChange={setShowEndShiftDialog}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Power className="h-5 w-5" />
              Finalizar Turno
            </DialogTitle>
            <DialogDescription>
              Informe os dados finais do equipamento
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Fuel Level Gauge */}
            <div className="flex justify-center">
              <FuelLevelGauge
                selectedLevel={endShiftFuelLevel}
                onLevelChange={setEndShiftFuelLevel}
                disabled={isUpdating}
              />
            </div>

            {/* Legend showing initial values */}
            {(initialHorimeter || initialKm) && (
              <Alert className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
                <Info className="h-4 w-4 text-amber-500" />
                <AlertDescription className="text-xs text-amber-700 dark:text-amber-300">
                  <strong>Valores iniciais do turno:</strong>
                  <br />
                  Horímetro: {initialHorimeter || "N/A"} | KM: {initialKm || "N/A"}
                  <br />
                  <span className="text-[10px]">Os valores finais devem ser iguais ou maiores que os iniciais.</span>
                </AlertDescription>
              </Alert>
            )}

            {/* Error message */}
            {endShiftError && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {endShiftError}
                </AlertDescription>
              </Alert>
            )}

            {/* Horimeter and KM inputs - REQUIRED */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
              <div className="space-y-1.5">
                <Label htmlFor="horimeter" className="text-xs flex items-center gap-1.5">
                  <Gauge className="h-3.5 w-3.5" />
                  Horímetro Final <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="horimeter"
                  type="number"
                  placeholder={initialHorimeter ? `Mín: ${initialHorimeter}` : "Ex: 1234"}
                  value={endShiftHorimeter}
                  onChange={(e) => {
                    setEndShiftHorimeter(e.target.value);
                    setEndShiftError(null);
                  }}
                  disabled={isUpdating}
                  className={`h-9 ${!endShiftHorimeter ? 'border-destructive/50 focus-visible:ring-destructive' : ''}`}
                  required
                />
                {!endShiftHorimeter && (
                  <p className="text-[10px] text-destructive">Campo obrigatório</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="km" className="text-xs flex items-center gap-1.5">
                  <Car className="h-3.5 w-3.5" />
                  KM Final <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="km"
                  type="number"
                  placeholder={initialKm ? `Mín: ${initialKm}` : "Ex: 45678"}
                  value={endShiftKm}
                  onChange={(e) => {
                    setEndShiftKm(e.target.value);
                    setEndShiftError(null);
                  }}
                  disabled={isUpdating}
                  className={`h-9 ${!endShiftKm ? 'border-destructive/50 focus-visible:ring-destructive' : ''}`}
                  required
                />
                {!endShiftKm && (
                  <p className="text-[10px] text-destructive">Campo obrigatório</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowEndShiftDialog(false)}
              disabled={isUpdating}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleEndOfShift}
              disabled={isUpdating || !endShiftHorimeter || !endShiftKm}
              className="w-full sm:w-auto bg-gray-600 hover:bg-gray-700"
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Power className="h-4 w-4 mr-2" />
              )}
              Confirmar Fim de Turno
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
