import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  ArrowDownCircle, 
  ArrowUpCircle, 
  RefreshCw, 
  User, 
  Truck, 
  MapPin,
  History
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useAllMovements, InventoryMovement } from "@/hooks/useInventory";

interface MovementHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MOVEMENT_CONFIG = {
  entrada: { icon: ArrowDownCircle, color: "text-green-500", bg: "bg-green-500/10", label: "Entrada" },
  saida: { icon: ArrowUpCircle, color: "text-red-500", bg: "bg-red-500/10", label: "Saída" },
  ajuste: { icon: RefreshCw, color: "text-yellow-500", bg: "bg-yellow-500/10", label: "Ajuste" },
};

const DESTINATION_ICONS = {
  employee: User,
  equipment: Truck,
  area: MapPin,
};

export function MovementHistoryDialog({ open, onOpenChange }: MovementHistoryDialogProps) {
  const { data: movements, isLoading } = useAllMovements();

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const groupMovementsByDate = (movements: InventoryMovement[]) => {
    const groups: Record<string, InventoryMovement[]> = {};
    
    movements?.forEach((mov) => {
      const date = format(new Date(mov.created_at), "yyyy-MM-dd");
      if (!groups[date]) groups[date] = [];
      groups[date].push(mov);
    });

    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  };

  const groupedMovements = groupMovementsByDate(movements || []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Movimentações
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando histórico...
            </div>
          ) : groupedMovements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma movimentação registrada
            </div>
          ) : (
            <div className="space-y-6">
              {groupedMovements.map(([date, movs]) => (
                <div key={date}>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 sticky top-0 bg-background py-1">
                    {format(new Date(date), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  </h3>
                  <div className="space-y-3">
                    {movs.map((mov) => {
                      const config = MOVEMENT_CONFIG[mov.movement_type];
                      const Icon = config.icon;
                      const DestIcon = mov.destination_type ? DESTINATION_ICONS[mov.destination_type] : null;

                      return (
                        <div
                          key={mov.id}
                          className={`p-3 rounded-lg border ${config.bg}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-full ${config.bg}`}>
                              <Icon className={`h-4 w-4 ${config.color}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-medium truncate">
                                  {mov.inventory_items?.name || "Item removido"}
                                </p>
                                <Badge variant="outline" className={config.color}>
                                  {config.label}
                                </Badge>
                              </div>
                              
                              <div className="mt-1 text-sm text-muted-foreground">
                                <span className="font-medium">
                                  {mov.movement_type === "ajuste" 
                                    ? `${mov.previous_quantity} → ${mov.new_quantity}`
                                    : `${mov.movement_type === "entrada" ? "+" : "-"}${mov.quantity}`
                                  }
                                </span>
                                <span className="mx-2">•</span>
                                <span>por {mov.moved_by_name}</span>
                              </div>

                              {mov.destination_name && DestIcon && (
                                <div className="mt-2 flex items-center gap-1 text-sm">
                                  <DestIcon className="h-3 w-3" />
                                  <span>
                                    {mov.destination_type === "employee" && "Funcionário: "}
                                    {mov.destination_type === "equipment" && "Equipamento: "}
                                    {mov.destination_type === "area" && "Área: "}
                                    {mov.destination_name}
                                  </span>
                                </div>
                              )}

                              {mov.reason && (
                                <p className="mt-2 text-sm text-muted-foreground italic">
                                  "{mov.reason}"
                                </p>
                              )}

                              <p className="mt-1 text-xs text-muted-foreground">
                                {formatDate(mov.created_at)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
