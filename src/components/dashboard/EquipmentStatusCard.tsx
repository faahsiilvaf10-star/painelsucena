import { Truck, Wrench, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEquipment, type Equipment, type StopReason } from "@/hooks/useEquipment";
import { Link } from "react-router-dom";

const getEquipmentTypeColor = (type: string) => {
  switch (type) {
    case "pipa":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "munk":
      return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    case "camionete":
      return "bg-green-500/20 text-green-400 border-green-500/30";
    case "onibus":
      return "bg-indigo-500/20 text-indigo-400 border-indigo-500/30";
    default:
      return "bg-gray-500/20 text-gray-400 border-gray-500/30";
  }
};

const getEquipmentTypeLabel = (type: string) => {
  switch (type) {
    case "pipa":
      return "Pipa";
    case "munk":
      return "Munk";
    case "camionete":
      return "Camionete";
    case "onibus":
      return "Ônibus";
    default:
      return type;
  }
};

interface EquipmentListProps {
  equipment: Equipment[];
  emptyMessage: string;
}

const EquipmentList = ({ equipment, emptyMessage }: EquipmentListProps) => {
  if (equipment.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {equipment.map((eq) => (
        <div
          key={eq.id}
          className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
        >
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={`text-xs ${getEquipmentTypeColor(eq.equipment_type)}`}
            >
              {getEquipmentTypeLabel(eq.equipment_type)}
            </Badge>
            <span className="font-medium text-sm">{eq.name}</span>
          </div>
          <span className="text-xs text-muted-foreground">{eq.plate}</span>
        </div>
      ))}
    </div>
  );
};

export function EquipmentStatusCard() {
  const { data: equipment, isLoading } = useEquipment();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="animate-pulse">
          <CardHeader className="pb-3">
            <div className="h-6 bg-muted rounded w-40" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-muted rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="animate-pulse">
          <CardHeader className="pb-3">
            <div className="h-6 bg-muted rounded w-40" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-10 bg-muted rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const inOperation = equipment?.filter((eq) => eq.stop_reason === "none") || [];
  const inMaintenance = equipment?.filter((eq) => eq.stop_reason === "maintenance") || [];

  const stopped = equipment?.filter((eq) => eq.stop_reason !== "none" && eq.stop_reason !== "maintenance") || [];

  return (
    <div className="space-y-4 mb-8 animate-fade-in">
      {/* Summary Stats Row */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card className="border-green-500/30 bg-gradient-to-br from-green-500/5 to-transparent p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-green-500/20">
              <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Em Operação</p>
              <p className="text-lg sm:text-2xl font-bold text-green-500">{inOperation.length}</p>
            </div>
          </div>
        </Card>
        
        <Card className="border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-transparent p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-orange-500/20">
              <Wrench className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Manutenção</p>
              <p className="text-lg sm:text-2xl font-bold text-orange-500">{inMaintenance.length}</p>
            </div>
          </div>
        </Card>
        
        <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-500/20">
              <Truck className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Parados</p>
              <p className="text-lg sm:text-2xl font-bold text-emerald-500">{stopped.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Detailed Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Equipment in Operation */}
        <Card className="border-green-500/30 bg-gradient-to-br from-green-500/5 to-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <div className="p-1.5 sm:p-2 rounded-lg bg-green-500/20">
                <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
              </div>
              <span>Em Operação</span>
              <Badge variant="secondary" className="ml-auto bg-green-500/20 text-green-400 text-xs">
                {inOperation.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EquipmentList
              equipment={inOperation}
              emptyMessage="Nenhum equipamento em operação"
            />
            <Link
              to="/equipamentos"
              className="block mt-4 text-xs text-center text-muted-foreground hover:text-foreground transition-colors"
            >
              Ver todos os equipamentos →
            </Link>
          </CardContent>
        </Card>

        {/* Equipment in Maintenance */}
        <Card className="border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <div className="p-1.5 sm:p-2 rounded-lg bg-orange-500/20">
                <Wrench className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
              </div>
              <span>Em Manutenção</span>
              <Badge variant="secondary" className="ml-auto bg-orange-500/20 text-orange-400 text-xs">
                {inMaintenance.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EquipmentList
              equipment={inMaintenance}
              emptyMessage="Nenhum equipamento em manutenção"
            />
            <Link
              to="/equipamentos"
              className="block mt-4 text-xs text-center text-muted-foreground hover:text-foreground transition-colors"
            >
              Ver todos os equipamentos →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
