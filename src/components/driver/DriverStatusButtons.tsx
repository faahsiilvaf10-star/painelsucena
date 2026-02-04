import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Power
} from "lucide-react";
import { useEquipment, useUpdateEquipmentStatus, useEquipmentStopHistory, type StopReason } from "@/hooks/useEquipment";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FuelLevelGauge, type FuelLevel } from "./FuelLevelGauge";

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
    icon: <Play className="h-5 w-5" />,
    color: "bg-emerald-500 hover:bg-emerald-600 text-white",
    action: "none",
  },
  {
    id: "waiting",
    label: "Aguardando",
    icon: <Clock className="h-5 w-5" />,
    color: "bg-yellow-500 hover:bg-yellow-600 text-white",
    action: "waiting",
  },
  {
    id: "rain",
    label: "Chuva",
    icon: <CloudRain className="h-5 w-5" />,
    color: "bg-blue-500 hover:bg-blue-600 text-white",
    action: "rain",
  },
  {
    id: "end_of_day",
    label: "Combustível",
    icon: <Fuel className="h-5 w-5" />,
    color: "bg-orange-500 hover:bg-orange-600 text-white",
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
  const [endShiftFuelLevel, setEndShiftFuelLevel] = useState<FuelLevel>("half");
  const { data: equipment = [], isLoading } = useEquipment();
  const { data: profile } = useProfile();
  const updateStatus = useUpdateEquipmentStatus();
  const { data: stopHistory = [] } = useEquipmentStopHistory(selectedVehicleId || undefined);

  useEffect(() => {
    const vehicleId = localStorage.getItem("selectedVehicleId");
    setSelectedVehicleId(vehicleId);
  }, []);

  const selectedVehicle = equipment.find((eq) => eq.id === selectedVehicleId);
  const currentStatus = (selectedVehicle?.stop_reason || "none") as string;
  const statusInfo = getStatusLabel(currentStatus);

  // Get the current active stop from history (ended_at is null)
  const activeStop = stopHistory.find((h) => h.ended_at === null);

  const handleEndOfShift = async () => {
    if (!selectedVehicleId || !selectedVehicle) {
      toast.error("Nenhum veículo selecionado");
      return;
    }

    setIsUpdating(true);
    try {
      const now = new Date().toISOString();

      // Update the equipment status to end_of_shift
      await updateStatus.mutateAsync({
        id: selectedVehicleId,
        stop_reason: "end_of_shift" as any,
        stop_start_time: now,
        previousStopReason: currentStatus as any,
        previousStopStartTime: selectedVehicle.stop_start_time,
        changed_by_driver: profile?.full_name || null,
      });

      // Clear the driver field from the equipment
      await supabase
        .from("equipment")
        .update({ driver: "" })
        .eq("id", selectedVehicleId);

      // Clear the selected vehicle from localStorage
      localStorage.removeItem("selectedVehicleId");

      setShowEndShiftDialog(false);
      toast.success(`Fim de turno registrado. Combustível: ${getFuelLevelLabel(endShiftFuelLevel)}`);
      
      // Navigate to vehicle selection page
      navigate("/selecao-veiculo", { replace: true });
    } catch (error) {
      console.error("Error ending shift:", error);
      toast.error("Erro ao registrar fim de turno");
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
      setShowEndShiftDialog(true);
      return;
    }

    setIsUpdating(true);
    try {
      const now = new Date().toISOString();

      await updateStatus.mutateAsync({
        id: selectedVehicleId,
        stop_reason: newStatus as any,
        stop_start_time: newStatus !== "none" ? now : null,
        previousStopReason: currentStatus as any,
        previousStopStartTime: selectedVehicle.stop_start_time,
        changed_by_driver: profile?.full_name || null,
      });

      const statusLabels: Record<string, string> = {
        none: "Operando",
        waiting: "Aguardando Frente",
        rain: "Parado por Chuva",
        end_of_day: "Abastecendo",
        end_of_shift: "Fim de Turno",
      };

      toast.success(`Status alterado para: ${statusLabels[newStatus] || newStatus}`);
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Erro ao atualizar status");
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
      <Card>
        <CardHeader className="pb-2 px-3 pt-3 sm:px-6 sm:pt-6">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm sm:text-base">Controle de Turno</CardTitle>
            <Badge className={`${statusInfo.color} text-white text-[10px] sm:text-xs`}>
              {statusInfo.label}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
            <span className="font-medium truncate">{selectedVehicle.name}</span>
            <span>•</span>
            <span className="font-mono text-[10px] sm:text-xs">{selectedVehicle.plate}</span>
          </div>
          {activeStop && (
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
              Desde: {format(new Date(activeStop.started_at), "HH:mm", { locale: ptBR })}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-3 px-3 pb-3 sm:px-6 sm:pb-6">
          {/* Fuel Level Gauge */}
          <div className="flex flex-col items-center gap-3 py-2">
            <FuelLevelGauge
              selectedLevel={fuelLevel}
              onLevelChange={setFuelLevel}
              disabled={isUpdating}
            />
          </div>

          {/* Status Control Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
            {statusButtons.map((button) => (
              <Button
                key={button.id}
                variant="outline"
                className={`h-auto py-2 sm:py-3 flex flex-col items-center gap-0.5 sm:gap-1 ${
                  currentStatus === button.action ? "ring-2 ring-primary" : ""
                } ${button.color}`}
                onClick={() => handleStatusChange(button.action)}
                disabled={isUpdating || currentStatus === button.action}
              >
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                ) : (
                  button.icon
                )}
                <span className="text-[10px] sm:text-xs font-medium">{button.label}</span>
              </Button>
            ))}
          </div>

          {/* End of Shift Button */}
          <Button
            variant="outline"
            className={`w-full h-auto py-2 sm:py-3 flex items-center justify-center gap-2 ${
              currentStatus === "end_of_shift" ? "ring-2 ring-primary" : ""
            } bg-gray-500 hover:bg-gray-600 text-white`}
            onClick={() => handleStatusChange("end_of_shift" as StopReason)}
            disabled={isUpdating || currentStatus === "end_of_shift"}
          >
            {isUpdating ? (
              <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
            ) : (
              <Power className="h-4 w-4 sm:h-5 sm:w-5" />
            )}
            <span className="text-xs sm:text-sm font-medium">Fim de Turno</span>
          </Button>
        </CardContent>
      </Card>

      {/* End of Shift Dialog with Fuel Level */}
      <Dialog open={showEndShiftDialog} onOpenChange={setShowEndShiftDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Power className="h-5 w-5" />
              Finalizar Turno
            </DialogTitle>
            <DialogDescription>
              Selecione o nível de combustível ao finalizar o turno
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-center py-4">
            <FuelLevelGauge
              selectedLevel={endShiftFuelLevel}
              onLevelChange={setEndShiftFuelLevel}
              disabled={isUpdating}
            />
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
              disabled={isUpdating}
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
