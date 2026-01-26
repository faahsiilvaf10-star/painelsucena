import { AlertTriangle, Car, Calendar } from "lucide-react";
import { format, parseISO, isValid, isBefore, addDays, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useVehicleInspections } from "@/hooks/useVehicleInspections";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function VehicleExpiryBanner() {
  const { data: vehicles, isLoading } = useVehicleInspections();

  if (isLoading || !vehicles) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const warningDate = addDays(today, 15);

  const expiredVehicles = vehicles.filter((v) => {
    if (!v.validade_cracha) return false;
    try {
      const date = parseISO(v.validade_cracha);
      if (!isValid(date)) return false;
      return isBefore(date, today);
    } catch {
      return false;
    }
  });

  const expiringVehicles = vehicles.filter((v) => {
    if (!v.validade_cracha) return false;
    try {
      const date = parseISO(v.validade_cracha);
      if (!isValid(date)) return false;
      return !isBefore(date, today) && isBefore(date, warningDate);
    } catch {
      return false;
    }
  });

  if (expiredVehicles.length === 0 && expiringVehicles.length === 0) return null;

  const formatDate = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      if (!isValid(date)) return dateStr;
      return format(date, "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const getDaysText = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      if (!isValid(date)) return "";
      const days = differenceInDays(date, today);
      if (days < 0) return `(vencido há ${Math.abs(days)} dia${Math.abs(days) !== 1 ? "s" : ""})`;
      if (days === 0) return "(vence hoje)";
      return `(em ${days} dia${days !== 1 ? "s" : ""})`;
    } catch {
      return "";
    }
  };

  return (
    <div className="space-y-3 mb-6 animate-fade-in">
      {/* Expired Vehicles */}
      {expiredVehicles.length > 0 && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-red-500/20">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-2">
                <h3 className="font-semibold text-red-500 flex items-center gap-2">
                  <Car className="w-4 h-4" />
                  Crachás Vencidos ({expiredVehicles.length})
                </h3>
                <Link to="/vistorias-equipamentos">
                  <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-400 hover:bg-red-500/10">
                    Ver todos
                  </Button>
                </Link>
              </div>
              <div className="space-y-1.5">
                {expiredVehicles.slice(0, 5).map((vehicle) => (
                  <div
                    key={vehicle.id}
                    className="flex items-center gap-2 text-sm text-red-400/90"
                  >
                    <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="font-mono font-medium">{vehicle.placa}</span>
                    <span className="text-muted-foreground">-</span>
                    <span className="truncate">{vehicle.modelo_veiculo}</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="whitespace-nowrap">
                      {formatDate(vehicle.validade_cracha)} {getDaysText(vehicle.validade_cracha)}
                    </span>
                  </div>
                ))}
                {expiredVehicles.length > 5 && (
                  <p className="text-xs text-red-400/70 mt-2">
                    +{expiredVehicles.length - 5} veículo(s) com crachá vencido
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expiring Soon Vehicles */}
      {expiringVehicles.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-2">
                <h3 className="font-semibold text-amber-500 flex items-center gap-2">
                  <Car className="w-4 h-4" />
                  Crachás Vencendo em 15 dias ({expiringVehicles.length})
                </h3>
                <Link to="/vistorias-equipamentos">
                  <Button variant="ghost" size="sm" className="text-amber-500 hover:text-amber-400 hover:bg-amber-500/10">
                    Ver todos
                  </Button>
                </Link>
              </div>
              <div className="space-y-1.5">
                {expiringVehicles.slice(0, 5).map((vehicle) => (
                  <div
                    key={vehicle.id}
                    className="flex items-center gap-2 text-sm text-amber-400/90"
                  >
                    <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="font-mono font-medium">{vehicle.placa}</span>
                    <span className="text-muted-foreground">-</span>
                    <span className="truncate">{vehicle.modelo_veiculo}</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="whitespace-nowrap">
                      {formatDate(vehicle.validade_cracha)} {getDaysText(vehicle.validade_cracha)}
                    </span>
                  </div>
                ))}
                {expiringVehicles.length > 5 && (
                  <p className="text-xs text-amber-400/70 mt-2">
                    +{expiringVehicles.length - 5} veículo(s) com crachá vencendo
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
