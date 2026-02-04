import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Clock, 
  CloudRain, 
  Fuel, 
  Activity,
  Loader2,
  Power
} from "lucide-react";
import { useEquipment, useUpdateEquipmentStatus, useEquipmentStopHistory, type StopReason } from "@/hooks/useEquipment";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ShiftStartGauge } from "./ShiftStartGauge";

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
    id: "waiting",
    label: "Aguardando Frente",
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
  {
    id: "operar",
    label: "Operar",
    icon: <Activity className="h-5 w-5" />,
    color: "bg-emerald-500 hover:bg-emerald-600 text-white",
    action: "none",
  },
  {
    id: "end_of_shift",
    label: "Fim de Turno",
    icon: <Power className="h-5 w-5" />,
    color: "bg-gray-500 hover:bg-gray-600 text-white",
    action: "end_of_shift",
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
  const [gaugeStatus, setGaugeStatus] = useState<StopReason>("none");
  const [hasStartedShift, setHasStartedShift] = useState(false);
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

  // Sync gauge status with current equipment status
  useEffect(() => {
    if (selectedVehicle) {
      const validGaugeStatuses: StopReason[] = ["none", "waiting", "rain", "end_of_day"];
      const stopReason = selectedVehicle.stop_reason as StopReason;
      if (validGaugeStatuses.includes(stopReason)) {
        setGaugeStatus(stopReason);
      }
    }
  }, [selectedVehicle?.stop_reason]);

  // Check if shift is currently active (not ended)
  useEffect(() => {
    // Show gauge only when status is end_of_shift or when there's no active stop today
    if (selectedVehicle) {
      const isShiftEnded = selectedVehicle.stop_reason === "end_of_shift";
      
      // If there's activity today and not in end_of_shift state, shift is started
      if (stopHistory.length > 0) {
        const today = new Date().toDateString();
        const hasActivityToday = stopHistory.some(h => 
          new Date(h.started_at).toDateString() === today
        );
        // Shift is started if there's activity today AND we're not in end_of_shift state
        setHasStartedShift(hasActivityToday && !isShiftEnded);
      } else {
        setHasStartedShift(false);
      }
    }
  }, [stopHistory, selectedVehicle]);

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

      toast.success("Fim de turno registrado. Veículo liberado.");
      
      // Navigate to vehicle selection page
      navigate("/selecao-veiculo", { replace: true });
    } catch (error) {
      console.error("Error ending shift:", error);
      toast.error("Erro ao registrar fim de turno");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStatusChange = async (newStatus: DriverStopReason) => {
    if (!selectedVehicleId || !selectedVehicle) {
      toast.error("Nenhum veículo selecionado");
      return;
    }

    // Handle end_of_shift separately
    if (newStatus === "end_of_shift") {
      await handleEndOfShift();
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

  // Function to start shift with selected gauge status
  const handleStartShift = async () => {
    if (!selectedVehicleId || !selectedVehicle) {
      toast.error("Nenhum veículo selecionado");
      return;
    }

    setIsUpdating(true);
    try {
      const now = new Date().toISOString();

      await updateStatus.mutateAsync({
        id: selectedVehicleId,
        stop_reason: gaugeStatus as any,
        stop_start_time: gaugeStatus !== "none" ? now : null,
        previousStopReason: currentStatus as any,
        previousStopStartTime: selectedVehicle.stop_start_time,
        changed_by_driver: profile?.full_name || null,
      });

      const statusLabels: Record<string, string> = {
        none: "Operando",
        waiting: "Aguardando Frente",
        rain: "Parado por Chuva",
        end_of_day: "Abastecendo",
      };

      setHasStartedShift(true);
      toast.success(`Turno iniciado: ${statusLabels[gaugeStatus] || gaugeStatus}`);
    } catch (error) {
      console.error("Error starting shift:", error);
      toast.error("Erro ao iniciar turno");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
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
        {/* Always show Gauge for selecting initial status */}
        <div className="flex flex-col items-center gap-3 py-2">
          <ShiftStartGauge
            selectedStatus={gaugeStatus}
            onStatusChange={(status) => {
              setGaugeStatus(status);
              // Auto-apply the status change
              handleStatusChange(status);
            }}
            disabled={isUpdating}
          />
        </div>

        {/* Additional action buttons */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
          {/* End of Shift Button */}
          <Button
            variant="outline"
            className={`h-auto py-2 sm:py-3 flex flex-col items-center gap-0.5 sm:gap-1 col-span-2 ${
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
            <span className="text-[10px] sm:text-xs font-medium">Fim de Turno</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
