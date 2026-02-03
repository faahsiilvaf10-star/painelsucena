import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Clock, 
  CloudRain, 
  Fuel, 
  Activity,
  Loader2
} from "lucide-react";
import { useEquipment, useUpdateEquipmentStatus, useEquipmentStopHistory } from "@/hooks/useEquipment";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type DriverStopReason = "none" | "aguardando_frente_servico" | "rain" | "combustivel";

interface StatusButton {
  id: DriverStopReason | "iniciar_turno" | "operar";
  label: string;
  icon: React.ReactNode;
  color: string;
  action: DriverStopReason;
}

const statusButtons: StatusButton[] = [
  {
    id: "iniciar_turno",
    label: "Iniciar Turno",
    icon: <Play className="h-5 w-5" />,
    color: "bg-green-500 hover:bg-green-600 text-white",
    action: "none",
  },
  {
    id: "aguardando_frente_servico",
    label: "Aguardando Frente",
    icon: <Clock className="h-5 w-5" />,
    color: "bg-yellow-500 hover:bg-yellow-600 text-white",
    action: "aguardando_frente_servico",
  },
  {
    id: "rain",
    label: "Chuva",
    icon: <CloudRain className="h-5 w-5" />,
    color: "bg-blue-500 hover:bg-blue-600 text-white",
    action: "rain",
  },
  {
    id: "combustivel",
    label: "Combustível",
    icon: <Fuel className="h-5 w-5" />,
    color: "bg-orange-500 hover:bg-orange-600 text-white",
    action: "combustivel",
  },
  {
    id: "operar",
    label: "Operar",
    icon: <Activity className="h-5 w-5" />,
    color: "bg-emerald-500 hover:bg-emerald-600 text-white",
    action: "none",
  },
];

const getStatusLabel = (stopReason: string | null) => {
  switch (stopReason) {
    case "none":
    case null:
      return { label: "Operando", color: "bg-green-500" };
    case "aguardando_frente_servico":
      return { label: "Aguardando Frente", color: "bg-yellow-500" };
    case "rain":
      return { label: "Parado (Chuva)", color: "bg-blue-500" };
    case "combustivel":
      return { label: "Abastecendo", color: "bg-orange-500" };
    case "maintenance":
    case "manutencao_corretiva":
      return { label: "Manutenção", color: "bg-red-500" };
    case "fim_turno":
      return { label: "Fim de Turno", color: "bg-gray-500" };
    default:
      return { label: "Parado", color: "bg-gray-500" };
  }
};

export function DriverStatusButtons() {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const { data: equipment = [], isLoading } = useEquipment();
  const updateStatus = useUpdateEquipmentStatus();
  const { data: stopHistory = [] } = useEquipmentStopHistory(selectedVehicleId || undefined);

  useEffect(() => {
    const vehicleId = localStorage.getItem("selectedVehicleId");
    setSelectedVehicleId(vehicleId);
  }, []);

  const selectedVehicle = equipment.find((eq) => eq.id === selectedVehicleId);
  const currentStatus = selectedVehicle?.stop_reason || "none";
  const statusInfo = getStatusLabel(currentStatus);

  // Get the current active stop from history (ended_at is null)
  const activeStop = stopHistory.find((h) => h.ended_at === null);

  const handleStatusChange = async (newStatus: DriverStopReason) => {
    if (!selectedVehicleId || !selectedVehicle) {
      toast.error("Nenhum veículo selecionado");
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
      });

      const statusLabels: Record<string, string> = {
        none: "Operando",
        aguardando_frente_servico: "Aguardando Frente",
        rain: "Parado por Chuva",
        combustivel: "Abastecendo",
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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Controle de Turno</CardTitle>
          <Badge className={`${statusInfo.color} text-white`}>
            {statusInfo.label}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium">{selectedVehicle.name}</span>
          <span>•</span>
          <span className="font-mono text-xs">{selectedVehicle.plate}</span>
        </div>
        {activeStop && (
          <p className="text-xs text-muted-foreground mt-1">
            Desde: {format(new Date(activeStop.started_at), "HH:mm", { locale: ptBR })}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          {statusButtons.map((btn) => {
            const isCurrentStatus = 
              (btn.action === "none" && currentStatus === "none") ||
              (btn.action !== "none" && currentStatus === btn.action);
            
            // "Iniciar Turno" only shows when equipment is NOT operating (e.g., fim_turno or first start)
            // "Operar" shows when equipment is stopped (not "none")
            const isOperating = currentStatus === "none";
            
            if (btn.id === "iniciar_turno" && isOperating) return null;
            if (btn.id === "operar" && isOperating) return null;

            return (
              <Button
                key={btn.id}
                variant="outline"
                className={`h-auto py-3 flex flex-col items-center gap-1 ${
                  isCurrentStatus ? "ring-2 ring-primary" : ""
                } ${btn.color}`}
                onClick={() => handleStatusChange(btn.action)}
                disabled={isUpdating || isCurrentStatus}
              >
                {isUpdating ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  btn.icon
                )}
                <span className="text-xs font-medium">{btn.label}</span>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
