import { useEquipment } from "@/hooks/useEquipment";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VehicleIcon } from "@/components/equipamentos/VehicleIcons";
import { Loader2, Truck, Activity, Wrench, Clock, PauseCircle } from "lucide-react";

const getStatusInfo = (stopReason: string | null) => {
  switch (stopReason) {
    case "none":
    case null:
      return {
        label: "Operando",
        color: "bg-green-500/10 text-green-600 border-green-500/30",
        icon: <Activity className="h-3 w-3" />,
      };
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
        label: "Desconhecido",
        color: "bg-gray-500/10 text-gray-600 border-gray-500/30",
        icon: <Truck className="h-3 w-3" />,
      };
  }
};

export function EquipmentStatusList() {
  const { data: equipment = [], isLoading } = useEquipment();

  // Filter only pipa and munk vehicles
  const vehicles = equipment.filter(
    (eq) => eq.equipment_type === "pipa" || eq.equipment_type === "munk"
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (vehicles.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-muted-foreground">
          <Truck className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhum veículo cadastrado</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Truck className="h-4 w-4" />
          Status dos Veículos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {vehicles.map((vehicle) => {
          const statusInfo = getStatusInfo(vehicle.stop_reason);
          
          return (
            <div
              key={vehicle.id}
              className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
            >
              <div className="p-2 rounded-lg bg-background">
                <VehicleIcon
                  type={vehicle.equipment_type as "pipa" | "munk" | "camionete" | "onibus"}
                  size="sm"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{vehicle.name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">{vehicle.plate}</span>
                  {vehicle.driver && (
                    <>
                      <span>•</span>
                      <span className="truncate">{vehicle.driver}</span>
                    </>
                  )}
                </div>
              </div>
              <Badge variant="outline" className={`${statusInfo.color} shrink-0 text-xs`}>
                <span className="mr-1">{statusInfo.icon}</span>
                {statusInfo.label}
              </Badge>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
