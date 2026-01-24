import { useState, useEffect, useMemo, useCallback } from "react";
import { Pause, Play, Wrench, CloudRain, Clock, User, Edit2, Check, X, Trash2, MoreVertical, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useUpdateEquipmentStatus, useUpdateEquipment, useDeleteEquipment, useEquipmentStopHistory, type StopReason, type Equipment } from "@/hooks/useEquipment";
import { VehicleIcon } from "./VehicleIcons";
import { toast } from "sonner";

const stopReasonLabels: Record<StopReason, string> = {
  none: "Operando",
  maintenance: "Manutenção",
  waiting: "Aguardando",
  rain: "Chuva",
  end_of_shift: "Fim de Turno",
};

const stopReasonColors: Record<string, string> = {
  none: "bg-green-500",
  maintenance: "bg-orange-500",
  waiting: "bg-yellow-500",
  rain: "bg-blue-500",
  end_of_day: "bg-slate-500",
  end_of_shift: "bg-purple-500",
};

const stopReasonLabelsExtended: Record<string, string> = {
  none: "Operando",
  maintenance: "Manutenção",
  waiting: "Aguardando",
  rain: "Chuva",
  end_of_day: "Fim do dia",
  end_of_shift: "Fim de Turno",
};

const stopReasonIcons: Record<StopReason, React.ReactNode> = {
  none: <Play className="w-3.5 h-3.5" />,
  maintenance: <Wrench className="w-3.5 h-3.5" />,
  waiting: <Clock className="w-3.5 h-3.5" />,
  rain: <CloudRain className="w-3.5 h-3.5" />,
  end_of_shift: <LogOut className="w-3.5 h-3.5" />,
};

interface EquipmentTimelineProps {
  equipment: Equipment;
}

export function EquipmentTimeline({ equipment }: EquipmentTimelineProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editData, setEditData] = useState({
    plate: equipment.plate,
    driver: equipment.driver,
    helper: equipment.helper,
  });
  
  const updateStatus = useUpdateEquipmentStatus();
  const updateEquipment = useUpdateEquipment();
  const deleteEquipment = useDeleteEquipment();
  const { data: stopHistory } = useEquipmentStopHistory(equipment.id);

  const stopReason = (equipment.stop_reason || "none") as StopReason;
  const stopStartTime = equipment.stop_start_time ? new Date(equipment.stop_start_time) : null;
  const equipmentType = equipment.equipment_type || "pipa";

  // Filter today's stops for this equipment
  const todayStops = useMemo(() => {
    if (!stopHistory) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return stopHistory
      .filter(stop => {
        const stopDate = new Date(stop.started_at);
        stopDate.setHours(0, 0, 0, 0);
        return stopDate.getTime() === today.getTime() && stop.ended_at;
      })
      .map(stop => {
        const startTime = new Date(stop.started_at);
        const endTime = new Date(stop.ended_at!);
        
        const startHour = startTime.getHours() + startTime.getMinutes() / 60;
        const endHour = endTime.getHours() + endTime.getMinutes() / 60;
        
        const totalHours = equipment.end_hour - equipment.start_hour;
        const startPos = Math.max(0, ((startHour - equipment.start_hour) / totalHours) * 100);
        const endPos = Math.min(100, ((endHour - equipment.start_hour) / totalHours) * 100);
        
        return {
          ...stop,
          startPos,
          width: Math.max(1, endPos - startPos),
          startTime: startTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          endTime: endTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        };
      });
  }, [stopHistory, equipment.start_hour, equipment.end_hour]);

  useEffect(() => {
    setEditData({ plate: equipment.plate, driver: equipment.driver, helper: equipment.helper });
  }, [equipment]);

  // Check for auto end-of-shift at 16:30
  const checkAutoEndOfShift = useCallback(async () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    // At 16:30, automatically set to end_of_shift if currently operating
    if (hours === 16 && minutes === 30 && stopReason === "none") {
      try {
        await updateStatus.mutateAsync({
          id: equipment.id,
          stop_reason: "end_of_shift",
          stop_start_time: now.toISOString(),
          previousStopReason: stopReason,
          previousStopStartTime: equipment.stop_start_time,
        });
        toast.info(`${equipment.name}: Fim de Turno automático`);
      } catch {
        console.error("Erro ao aplicar fim de turno automático");
      }
    }
  }, [equipment.id, equipment.name, equipment.stop_start_time, stopReason, updateStatus]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
      checkAutoEndOfShift();
    }, 60000);
    
    // Check immediately on mount
    checkAutoEndOfShift();
    
    return () => clearInterval(interval);
  }, [checkAutoEndOfShift]);

  const position = useMemo(() => {
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    const currentDecimal = hours + minutes / 60;
    if (currentDecimal < equipment.start_hour) return 0;
    if (currentDecimal > equipment.end_hour) return 100;
    return ((currentDecimal - equipment.start_hour) / (equipment.end_hour - equipment.start_hour)) * 100;
  }, [currentTime, equipment.start_hour, equipment.end_hour]);

  const hourMarkers = useMemo(() => {
    const markers = [];
    for (let h = equipment.start_hour; h <= equipment.end_hour; h += 2) {
      markers.push({ hour: h, position: ((h - equipment.start_hour) / (equipment.end_hour - equipment.start_hour)) * 100 });
    }
    if (markers[markers.length - 1]?.hour !== equipment.end_hour) {
      markers.push({ hour: equipment.end_hour, position: 100 });
    }
    return markers;
  }, [equipment.start_hour, equipment.end_hour]);

  const formatHour = (hour: number) => `${hour.toString().padStart(2, "0")}h`;

  const handleStopChange = async (reason: StopReason) => {
    try {
      await updateStatus.mutateAsync({
        id: equipment.id,
        stop_reason: reason,
        stop_start_time: reason === "none" ? null : new Date().toISOString(),
        previousStopReason: stopReason,
        previousStopStartTime: equipment.stop_start_time,
      });
      toast.success(reason === "none" ? "Operação retomada" : `${stopReasonLabels[reason]}`);
    } catch {
      toast.error("Erro ao atualizar status");
    }
  };

  const handleSaveEdit = async () => {
    try {
      await updateEquipment.mutateAsync({ id: equipment.id, ...editData });
      toast.success("Atualizado!");
      setIsEditing(false);
    } catch {
      toast.error("Erro ao atualizar");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteEquipment.mutateAsync(equipment.id);
      toast.success("Equipamento removido!");
    } catch {
      toast.error("Erro ao remover");
    }
  };

  const getStopDuration = () => {
    if (!stopStartTime) return null;
    const diff = Math.floor((currentTime.getTime() - stopStartTime.getTime()) / 60000);
    return diff >= 60 ? `${Math.floor(diff / 60)}h${diff % 60}m` : `${diff}min`;
  };

  const isStopped = stopReason !== "none";

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
      {/* Compact Header */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <VehicleIcon type={equipmentType} isStopped={isStopped} size="sm" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground truncate">{equipment.name}</h3>
              <Badge variant={isStopped ? "destructive" : "default"} className={`text-[10px] px-1.5 py-0 ${!isStopped ? 'bg-green-600' : ''}`}>
                {stopReasonLabels[stopReason]}
              </Badge>
            </div>
            {isEditing ? (
              <div className="flex items-center gap-2 mt-1">
                <Input value={editData.plate} onChange={(e) => setEditData({ ...editData, plate: e.target.value.toUpperCase() })} className="h-6 w-20 text-xs" />
                <Input value={editData.driver} onChange={(e) => setEditData({ ...editData, driver: e.target.value })} className="h-6 w-24 text-xs" placeholder="Motorista" />
                <Input value={editData.helper} onChange={(e) => setEditData({ ...editData, helper: e.target.value })} className="h-6 w-24 text-xs" placeholder="Ajudante" />
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleSaveEdit}><Check className="w-3 h-3 text-green-500" /></Button>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setIsEditing(false)}><X className="w-3 h-3 text-red-500" /></Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium">{equipment.plate}</span>
                <span>•</span>
                <User className="w-3 h-3" />
                <span className="truncate">{equipment.driver}</span>
                {equipment.helper && (
                  <>
                    <span>•</span>
                    <span className="truncate">{equipment.helper}</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleStopChange("none")} className="gap-2">
              <Play className="w-4 h-4 text-green-500" /> Operando
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStopChange("maintenance")} className="gap-2">
              <Wrench className="w-4 h-4 text-orange-500" /> Manutenção
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStopChange("waiting")} className="gap-2">
              <Clock className="w-4 h-4 text-yellow-500" /> Aguardando
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStopChange("rain")} className="gap-2">
              <CloudRain className="w-4 h-4 text-blue-500" /> Chuva
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStopChange("end_of_shift")} className="gap-2">
              <LogOut className="w-4 h-4 text-purple-500" /> Fim de Turno
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setIsEditing(true)} className="gap-2">
              <Edit2 className="w-4 h-4" /> Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="gap-2 text-destructive">
              <Trash2 className="w-4 h-4" /> Remover
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Quick Status Buttons */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {(Object.keys(stopReasonLabels) as StopReason[]).map((reason) => (
          <Button
            key={reason}
            size="sm"
            variant={stopReason === reason ? "default" : "outline"}
            className={`h-7 px-2.5 gap-1.5 text-xs font-medium transition-all ${
              stopReason === reason 
                ? `${stopReasonColors[reason]} text-white border-transparent hover:opacity-90` 
                : `hover:${stopReasonColors[reason]} hover:text-white`
            }`}
            onClick={() => handleStopChange(reason)}
          >
            {stopReasonIcons[reason]}
            {stopReasonLabels[reason]}
          </Button>
        ))}
      </div>

      {/* Compact Timeline */}
      <TooltipProvider>
        <div className="relative h-12">
          {/* Track Background */}
          <div className="absolute left-0 right-0 top-5 h-2.5 bg-muted rounded-full overflow-hidden">
            {/* Current progress (green for operating) */}
            <div
              className={`absolute left-0 top-0 h-full transition-all duration-500 ${isStopped ? stopReasonColors[stopReason] : 'bg-green-500/30'}`}
              style={{ width: `${position}%` }}
            />
            
            {/* Past stop segments */}
            {todayStops.map((stop, index) => (
              <Tooltip key={stop.id || index}>
                <TooltipTrigger asChild>
                  <div
                    className={`absolute top-0 h-full ${stopReasonColors[stop.stop_reason] || 'bg-gray-500'} opacity-90 cursor-pointer hover:opacity-100 transition-opacity border-r border-background/50`}
                    style={{
                      left: `${stop.startPos}%`,
                      width: `${stop.width}%`,
                    }}
                  />
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <div className="font-semibold">{stopReasonLabelsExtended[stop.stop_reason] || stop.stop_reason}</div>
                  <div className="text-muted-foreground">{stop.startTime} - {stop.endTime}</div>
                  {stop.duration_minutes && (
                    <div className="text-muted-foreground">
                      {stop.duration_minutes >= 60 
                        ? `${Math.floor(stop.duration_minutes / 60)}h${stop.duration_minutes % 60}m`
                        : `${stop.duration_minutes}min`
                      }
                    </div>
                  )}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>

        {/* Vehicle */}
        <div className="absolute transition-all duration-500" style={{ left: `calc(${Math.min(Math.max(position, 5), 95)}% - 20px)`, top: '-2px' }}>
          <div className={`flex flex-col items-center ${!isStopped ? 'animate-bounce-slow' : ''}`}>
            <div className="text-[8px] font-bold bg-card border border-border px-1 rounded shadow-sm mb-0.5">
              {equipment.plate}
            </div>
            <VehicleIcon type={equipmentType} isStopped={isStopped} size="sm" />
          </div>
        </div>

        {/* Hour Markers */}
        {hourMarkers.map(({ hour, position: pos }) => (
          <div key={hour} className="absolute top-8 -translate-x-1/2" style={{ left: `${pos}%` }}>
            <span className="text-[10px] text-muted-foreground">{formatHour(hour)}</span>
          </div>
        ))}
        </div>
      </TooltipProvider>

      {/* Footer */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {isStopped && stopStartTime && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
              <Pause className="w-2.5 h-2.5" /> {getStopDuration()}
            </Badge>
          )}
          <span>{formatHour(equipment.start_hour)} - {formatHour(equipment.end_hour)}</span>
        </div>
        <span className="text-xs font-medium">{Math.round(position)}%</span>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Equipamento</AlertDialogTitle>
            <AlertDialogDescription>
              Remover <strong>{equipment.name}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
