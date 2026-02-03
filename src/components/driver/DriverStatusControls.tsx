import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Pause, 
  CloudRain, 
  Fuel, 
  Clock, 
  Loader2,
  CirclePlay
} from "lucide-react";
import { useEquipment, useUpdateEquipmentStatus, type StopReason } from "@/hooks/useEquipment";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface StatusButton {
  id: StopReason | "start_shift";
  label: string;
  icon: React.ReactNode;
  color: string;
  activeColor: string;
}

const statusButtons: StatusButton[] = [
  {
    id: "start_shift",
    label: "Iniciar Turno",
    icon: <Play className="w-5 h-5" />,
    color: "bg-green-500 hover:bg-green-600 text-white",
    activeColor: "bg-green-600 ring-2 ring-green-300",
  },
  {
    id: "waiting",
    label: "Aguardando Frente",
    icon: <Pause className="w-5 h-5" />,
    color: "bg-amber-500 hover:bg-amber-600 text-white",
    activeColor: "bg-amber-600 ring-2 ring-amber-300",
  },
  {
    id: "rain",
    label: "Chuva",
    icon: <CloudRain className="w-5 h-5" />,
    color: "bg-blue-500 hover:bg-blue-600 text-white",
    activeColor: "bg-blue-600 ring-2 ring-blue-300",
  },
  {
    id: "fuel",
    label: "Combustível",
    icon: <Fuel className="w-5 h-5" />,
    color: "bg-orange-500 hover:bg-orange-600 text-white",
    activeColor: "bg-orange-600 ring-2 ring-orange-300",
  },
  {
    id: "none",
    label: "Operar",
    icon: <CirclePlay className="w-5 h-5" />,
    color: "bg-emerald-500 hover:bg-emerald-600 text-white",
    activeColor: "bg-emerald-600 ring-2 ring-emerald-300",
  },
];

const getStatusLabel = (stopReason: StopReason | null | undefined): string => {
  switch (stopReason) {
    case "none":
      return "Operando";
    case "waiting":
      return "Aguardando Frente";
    case "rain":
      return "Parado - Chuva";
    case "fuel":
      return "Abastecendo Combustível";
    case "maintenance":
      return "Manutenção";
    case "end_of_shift":
      return "Fim de Turno";
    case "end_of_day":
      return "Fim do Dia";
    default:
      return "Desconhecido";
  }
};

const getStatusColor = (stopReason: StopReason | null | undefined): string => {
  switch (stopReason) {
    case "none":
      return "bg-green-500";
    case "waiting":
      return "bg-amber-500";
    case "rain":
      return "bg-blue-500";
    case "fuel":
      return "bg-orange-500";
    case "maintenance":
      return "bg-red-500";
    case "end_of_shift":
    case "end_of_day":
      return "bg-zinc-500";
    default:
      return "bg-muted";
  }
};

export function DriverStatusControls() {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  
  const { data: equipment = [] } = useEquipment();
  const updateStatus = useUpdateEquipmentStatus();

  useEffect(() => {
    const vehicleId = localStorage.getItem("selectedVehicleId");
    setSelectedVehicleId(vehicleId);
  }, []);

  const currentEquipment = equipment.find(eq => eq.id === selectedVehicleId);

  const handleStatusChange = async (newStatus: StopReason | "start_shift") => {
    if (!currentEquipment || !selectedVehicleId) {
      toast.error("Nenhum veículo selecionado");
      return;
    }

    // "start_shift" is equivalent to "none" (operating)
    const actualStatus: StopReason = newStatus === "start_shift" ? "none" : newStatus;

    // Don't update if already in this status
    if (currentEquipment.stop_reason === actualStatus) {
      toast.info("Equipamento já está neste status");
      return;
    }

    setIsUpdating(newStatus);

    try {
      await updateStatus.mutateAsync({
        id: selectedVehicleId,
        stop_reason: actualStatus,
        stop_start_time: actualStatus === "none" ? null : new Date().toISOString(),
        previousStopReason: currentEquipment.stop_reason as StopReason,
        previousStopStartTime: currentEquipment.stop_start_time,
      });

      const statusLabel = actualStatus === "none" ? "Operando" : getStatusLabel(actualStatus);
      toast.success(`Status alterado para: ${statusLabel}`);
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Erro ao atualizar status");
    } finally {
      setIsUpdating(null);
    }
  };

  if (!currentEquipment) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <Clock className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Nenhum veículo selecionado
          </p>
        </CardContent>
      </Card>
    );
  }

  const currentStatus = currentEquipment.stop_reason as StopReason || "none";
  const isOperating = currentStatus === "none";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">
            Status do Turno
          </CardTitle>
          <Badge 
            className={`${getStatusColor(currentStatus)} text-white border-0`}
          >
            {getStatusLabel(currentStatus)}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium">{currentEquipment.name}</span>
          <span>•</span>
          <span className="font-mono">{currentEquipment.plate}</span>
          {currentEquipment.stop_start_time && !isOperating && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {format(new Date(currentEquipment.stop_start_time), "HH:mm", { locale: ptBR })}
              </span>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Status buttons grid */}
        <div className="grid grid-cols-2 gap-2">
          {statusButtons.map((button) => {
            const isActive = 
              (button.id === "start_shift" && currentStatus === "none") ||
              (button.id === "none" && currentStatus === "none") ||
              (button.id !== "start_shift" && button.id !== "none" && currentStatus === button.id);
            
            const isLoading = isUpdating === button.id;
            
            // Hide "Iniciar Turno" if already operating, show "Operar" instead
            if (button.id === "start_shift" && isOperating) return null;
            // Hide "Operar" if already operating
            if (button.id === "none" && isOperating) return null;

            return (
              <Button
                key={button.id}
                variant="outline"
                className={`h-auto py-3 px-3 flex flex-col items-center gap-1.5 ${
                  isActive ? button.activeColor : button.color
                }`}
                onClick={() => handleStatusChange(button.id)}
                disabled={isLoading || isActive}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  button.icon
                )}
                <span className="text-xs font-medium">{button.label}</span>
              </Button>
            );
          })}
        </div>

        {/* Info text */}
        <p className="text-xs text-muted-foreground text-center">
          Toque no status para registrar a mudança
        </p>
      </CardContent>
    </Card>
  );
}
