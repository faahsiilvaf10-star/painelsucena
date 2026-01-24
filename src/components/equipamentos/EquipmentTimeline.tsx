import { useState, useEffect, useMemo } from "react";
import { Truck, Pause, Play, Wrench, CloudRain, Clock, User, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUpdateEquipmentStatus, type StopReason, type Equipment } from "@/hooks/useEquipment";
import { toast } from "sonner";

const stopReasonLabels: Record<StopReason, string> = {
  none: "Em operação",
  maintenance: "Parada para Manutenção",
  waiting: "Aguardando Frente de Serviço",
  rain: "Parada por Chuva",
};

const stopReasonColors: Record<StopReason, string> = {
  none: "bg-green-500",
  maintenance: "bg-orange-500",
  waiting: "bg-yellow-500",
  rain: "bg-blue-500",
};

const stopReasonIcons: Record<StopReason, React.ReactNode> = {
  none: <Play className="w-4 h-4" />,
  maintenance: <Wrench className="w-4 h-4" />,
  waiting: <Clock className="w-4 h-4" />,
  rain: <CloudRain className="w-4 h-4" />,
};

interface EquipmentTimelineProps {
  equipment: Equipment;
}

export function EquipmentTimeline({ equipment }: EquipmentTimelineProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const updateStatus = useUpdateEquipmentStatus();

  const stopReason = (equipment.stop_reason || "none") as StopReason;
  const stopStartTime = equipment.stop_start_time ? new Date(equipment.stop_start_time) : null;

  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Calculate position based on current time
  const position = useMemo(() => {
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    const currentDecimal = hours + minutes / 60;

    if (currentDecimal < equipment.start_hour) return 0;
    if (currentDecimal > equipment.end_hour) return 100;

    const totalDuration = equipment.end_hour - equipment.start_hour;
    const elapsed = currentDecimal - equipment.start_hour;
    return (elapsed / totalDuration) * 100;
  }, [currentTime, equipment.start_hour, equipment.end_hour]);

  // Generate hour markers
  const hourMarkers = useMemo(() => {
    const markers = [];
    for (let h = equipment.start_hour; h <= equipment.end_hour; h++) {
      const pos = ((h - equipment.start_hour) / (equipment.end_hour - equipment.start_hour)) * 100;
      markers.push({ hour: h, position: pos });
    }
    return markers;
  }, [equipment.start_hour, equipment.end_hour]);

  const formatHour = (hour: number) => {
    return `${hour.toString().padStart(2, "0")}:00`;
  };

  const handleStopChange = async (reason: StopReason) => {
    try {
      await updateStatus.mutateAsync({
        id: equipment.id,
        stop_reason: reason,
        stop_start_time: reason === "none" ? null : new Date().toISOString(),
        previousStopReason: stopReason,
        previousStopStartTime: equipment.stop_start_time,
      });
      toast.success(
        reason === "none" 
          ? "Operação retomada" 
          : `Status alterado para: ${stopReasonLabels[reason]}`
      );
    } catch (error) {
      toast.error("Erro ao atualizar status");
    }
  };

  const getStopDuration = () => {
    if (!stopStartTime) return null;
    const diff = Math.floor((currentTime.getTime() - stopStartTime.getTime()) / 60000);
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
  };

  const isStopped = stopReason !== "none";

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
      {/* Header with Equipment Info */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${isStopped ? stopReasonColors[stopReason] : 'bg-primary/10'}`}>
            <Truck className={`w-6 h-6 ${isStopped ? 'text-white' : 'text-primary'}`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">{equipment.name}</h3>
            <p className="text-sm text-muted-foreground">
              Operação: {formatHour(equipment.start_hour)} - {formatHour(equipment.end_hour)}
            </p>
          </div>
        </div>

        {/* Equipment Details */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-lg">
            <CreditCard className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{equipment.plate}</span>
          </div>
          <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-lg">
            <User className="w-4 h-4 text-primary" />
            <span className="text-sm text-foreground">{equipment.driver}</span>
          </div>
          <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-lg">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-foreground">{equipment.helper}</span>
          </div>
        </div>
      </div>

      {/* Stop Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-6 pb-4 border-b border-border">
        <span className="text-sm font-medium text-muted-foreground">Status:</span>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant={isStopped ? "destructive" : "default"} 
              size="sm"
              className={`gap-2 ${!isStopped ? 'bg-green-600 hover:bg-green-700' : ''}`}
              disabled={updateStatus.isPending}
            >
              {stopReasonIcons[stopReason]}
              {stopReasonLabels[stopReason]}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => handleStopChange("none")} className="gap-2">
              <Play className="w-4 h-4 text-green-500" />
              Retomar Operação
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStopChange("maintenance")} className="gap-2">
              <Wrench className="w-4 h-4 text-orange-500" />
              Parada para Manutenção
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStopChange("waiting")} className="gap-2">
              <Clock className="w-4 h-4 text-yellow-500" />
              Aguardando Frente de Serviço
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStopChange("rain")} className="gap-2">
              <CloudRain className="w-4 h-4 text-blue-500" />
              Parada por Chuva
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {isStopped && stopStartTime && (
          <Badge variant="outline" className="gap-1">
            <Pause className="w-3 h-3" />
            Parado há {getStopDuration()}
          </Badge>
        )}
      </div>

      {/* Timeline Container */}
      <div className="relative pt-16 pb-8">
        {/* Progress Background */}
        <div className="absolute left-0 right-0 h-3 bg-muted rounded-full overflow-hidden">
          {/* Progress Fill */}
          <div
            className={`absolute left-0 top-0 h-full rounded-full transition-all duration-1000 ${
              isStopped 
                ? `${stopReasonColors[stopReason]}` 
                : 'bg-gradient-to-r from-primary to-primary/70'
            }`}
            style={{ width: `${position}%` }}
          />
        </div>

        {/* Animated Truck */}
        <div
          className={`absolute -top-2 transition-all duration-1000 ease-linear`}
          style={{ left: `calc(${position}% - 24px)` }}
        >
          <div className="relative">
            {/* Truck Body */}
            <div className={isStopped ? "" : "animate-bounce-slow"}>
              <svg
                width="48"
                height="32"
                viewBox="0 0 48 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={`drop-shadow-lg ${isStopped ? 'opacity-70' : ''}`}
              >
                {/* Truck Cabin */}
                <rect
                  x="28"
                  y="8"
                  width="16"
                  height="14"
                  rx="2"
                  className="fill-primary"
                />
                {/* Cabin Window */}
                <rect
                  x="32"
                  y="10"
                  width="10"
                  height="6"
                  rx="1"
                  className="fill-primary-foreground/80"
                />
                {/* Tank Body */}
                <ellipse
                  cx="16"
                  cy="15"
                  rx="14"
                  ry="8"
                  className="fill-blue-500"
                />
                {/* Tank Highlight */}
                <ellipse
                  cx="16"
                  cy="12"
                  rx="10"
                  ry="3"
                  className="fill-blue-400/50"
                />
                {/* Water Label */}
                <text
                  x="16"
                  y="17"
                  textAnchor="middle"
                  className="fill-white text-[6px] font-bold"
                >
                  ÁGUA
                </text>
                {/* Wheels */}
                <circle cx="10" cy="24" r="4" className="fill-gray-800" />
                <circle cx="10" cy="24" r="2" className="fill-gray-600" />
                <circle cx="36" cy="24" r="4" className="fill-gray-800" />
                <circle cx="36" cy="24" r="2" className="fill-gray-600" />
                {/* Wheel spokes animation - only when moving */}
                {!isStopped && (
                  <>
                    <g className="origin-center animate-spin-slow" style={{ transformOrigin: '10px 24px' }}>
                      <line x1="10" y1="22" x2="10" y2="26" className="stroke-gray-400" strokeWidth="0.5" />
                      <line x1="8" y1="24" x2="12" y2="24" className="stroke-gray-400" strokeWidth="0.5" />
                    </g>
                    <g className="origin-center animate-spin-slow" style={{ transformOrigin: '36px 24px' }}>
                      <line x1="36" y1="22" x2="36" y2="26" className="stroke-gray-400" strokeWidth="0.5" />
                      <line x1="34" y1="24" x2="38" y2="24" className="stroke-gray-400" strokeWidth="0.5" />
                    </g>
                  </>
                )}
              </svg>
              
              {/* Stop reason icon overlay */}
              {isStopped && (
                <div className={`absolute -top-1 left-5 w-5 h-5 rounded-full ${stopReasonColors[stopReason]} flex items-center justify-center`}>
                  {stopReason === "maintenance" && <Wrench className="w-3 h-3 text-white" />}
                  {stopReason === "waiting" && <Clock className="w-3 h-3 text-white" />}
                  {stopReason === "rain" && <CloudRain className="w-3 h-3 text-white" />}
                </div>
              )}
            </div>
            {/* Current Time Badge */}
            <div className={`absolute -top-8 left-1/2 -translate-x-1/2 text-xs font-bold px-2 py-1 rounded-lg whitespace-nowrap shadow-lg ${
              isStopped 
                ? `${stopReasonColors[stopReason]} text-white` 
                : 'bg-primary text-primary-foreground'
            }`}>
              {currentTime.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        </div>

        {/* Hour Markers */}
        <div className="absolute left-0 right-0 top-8">
          {hourMarkers.map(({ hour, position: pos }) => (
            <div
              key={hour}
              className="absolute flex flex-col items-center"
              style={{ left: `${pos}%`, transform: "translateX(-50%)" }}
            >
              <div className="w-0.5 h-4 bg-border" />
              <span className="mt-2 text-xs text-muted-foreground font-medium">
                {formatHour(hour)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Status Footer */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            position === 0 ? 'bg-muted-foreground' :
            position >= 100 ? 'bg-muted-foreground' :
            isStopped ? stopReasonColors[stopReason] :
            'bg-green-500 animate-pulse'
          }`} />
          <span className="text-sm text-muted-foreground">
            {position === 0 && "Aguardando início"}
            {position > 0 && position < 100 && !isStopped && "Em operação"}
            {position > 0 && position < 100 && isStopped && stopReasonLabels[stopReason]}
            {position >= 100 && "Operação concluída"}
          </span>
        </div>
        <span className="text-sm font-medium text-foreground">
          {Math.round(position)}% concluído
        </span>
      </div>
    </div>
  );
}
