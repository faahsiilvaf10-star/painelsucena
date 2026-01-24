import { useState, useEffect, useMemo, useCallback } from "react";
import { Pause, Play, Wrench, CloudRain, Clock, User, Edit2, Check, X, Trash2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { getBrazilNorthDate, getBrazilNorthMidnight } from "@/lib/timezone";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  none: { label: "Operando", color: "text-green-600", bg: "bg-green-500", icon: <Play className="w-3 h-3" /> },
  maintenance: { label: "Manutenção", color: "text-orange-600", bg: "bg-orange-500", icon: <Wrench className="w-3 h-3" /> },
  waiting: { label: "Aguardando", color: "text-amber-600", bg: "bg-amber-500", icon: <Clock className="w-3 h-3" /> },
  rain: { label: "Chuva", color: "text-blue-600", bg: "bg-blue-500", icon: <CloudRain className="w-3 h-3" /> },
  end_of_day: { label: "Fim do dia", color: "text-slate-600", bg: "bg-slate-500", icon: <Pause className="w-3 h-3" /> },
  end_of_shift: { label: "Fim de Turno", color: "text-purple-600", bg: "bg-purple-500", icon: <Pause className="w-3 h-3" /> },
};

const quickStatusOptions: StopReason[] = ["none", "maintenance", "waiting", "rain"];

interface EquipmentTimelineProps {
  equipment: Equipment;
}

export function EquipmentTimeline({ equipment }: EquipmentTimelineProps) {
  const [currentTime, setCurrentTime] = useState(getBrazilNorthDate());
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
  const status = statusConfig[stopReason] || statusConfig.none;

  const todayStops = useMemo(() => {
    if (!stopHistory) return [];
    const today = getBrazilNorthMidnight();
    
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

  const checkAutoEndOfShift = useCallback(async () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
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

  const formatHour = (hour: number) => `${hour.toString().padStart(2, "0")}:00`;

  const handleStopChange = async (reason: StopReason) => {
    try {
      await updateStatus.mutateAsync({
        id: equipment.id,
        stop_reason: reason,
        stop_start_time: reason === "none" ? null : new Date().toISOString(),
        previousStopReason: stopReason,
        previousStopStartTime: equipment.stop_start_time,
      });
      toast.success(reason === "none" ? "Operação retomada" : statusConfig[reason].label);
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
    return diff >= 60 ? `${Math.floor(diff / 60)}h ${diff % 60}m` : `${diff}min`;
  };

  const isStopped = stopReason !== "none";

  return (
    <div className="group bg-card border border-border rounded-2xl p-5 transition-all hover:shadow-lg hover:border-primary/20">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className={`relative p-3 rounded-xl transition-colors ${isStopped ? 'bg-muted' : 'bg-green-500/10'}`}>
            <VehicleIcon type={equipmentType} isStopped={isStopped} size="sm" />
            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${status.bg}`} />
          </div>
          
          <div className="min-w-0 flex-1">
            {isEditing ? (
              <div className="flex items-center gap-2 flex-wrap">
                <Input 
                  value={editData.plate} 
                  onChange={(e) => setEditData({ ...editData, plate: e.target.value.toUpperCase() })} 
                  className="h-8 w-24 text-sm" 
                  placeholder="Placa"
                />
                <Input 
                  value={editData.driver} 
                  onChange={(e) => setEditData({ ...editData, driver: e.target.value })} 
                  className="h-8 w-28 text-sm" 
                  placeholder="Motorista" 
                />
                <Input 
                  value={editData.helper} 
                  onChange={(e) => setEditData({ ...editData, helper: e.target.value })} 
                  className="h-8 w-28 text-sm" 
                  placeholder="Ajudante" 
                />
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={handleSaveEdit}>
                  <Check className="w-4 h-4 text-green-600" />
                </Button>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setIsEditing(false)}>
                  <X className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-foreground">{equipment.name}</h3>
                  <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    {equipment.plate}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <User className="w-3.5 h-3.5" />
                  <span>{equipment.driver}</span>
                  {equipment.helper && (
                    <>
                      <span className="text-border">•</span>
                      <span>{equipment.helper}</span>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${status.color} bg-current/10`}>
            {status.icon}
            <span>{status.label}</span>
            {isStopped && stopStartTime && (
              <span className="opacity-70">• {getStopDuration()}</span>
            )}
          </div>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => setIsEditing(true)} className="gap-2">
                <Edit2 className="w-4 h-4" /> Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="gap-2 text-destructive focus:text-destructive">
                <Trash2 className="w-4 h-4" /> Remover
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Quick Status Buttons */}
      <div className="flex items-center gap-2 mb-4">
        {quickStatusOptions.map((reason) => {
          const config = statusConfig[reason];
          const isActive = stopReason === reason;
          return (
            <button
              key={reason}
              onClick={() => handleStopChange(reason)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isActive 
                  ? `${config.bg} text-white shadow-sm` 
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {config.icon}
              {config.label}
            </button>
          );
        })}
      </div>

      {/* Timeline */}
      <TooltipProvider>
        <div className="relative h-14 px-1">
          {/* Track */}
          <div className="absolute left-0 right-0 top-5 h-2 bg-muted rounded-full overflow-hidden">
            {/* Progress */}
            <div
              className={`absolute left-0 top-0 h-full transition-all duration-500 ${isStopped ? status.bg : 'bg-green-500'}`}
              style={{ width: `${position}%`, opacity: isStopped ? 0.6 : 0.3 }}
            />
            
            {/* Past stops */}
            {todayStops.map((stop, index) => {
              const stopConfig = statusConfig[stop.stop_reason] || statusConfig.none;
              return (
                <Tooltip key={stop.id || index}>
                  <TooltipTrigger asChild>
                    <div
                      className={`absolute top-0 h-full ${stopConfig.bg} cursor-pointer hover:opacity-100 transition-opacity`}
                      style={{
                        left: `${stop.startPos}%`,
                        width: `${stop.width}%`,
                        opacity: 0.8,
                      }}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    <p className="font-medium">{stopConfig.label}</p>
                    <p className="text-muted-foreground">{stop.startTime} → {stop.endTime}</p>
                    {stop.duration_minutes && (
                      <p className="text-muted-foreground">
                        {stop.duration_minutes >= 60 
                          ? `${Math.floor(stop.duration_minutes / 60)}h ${stop.duration_minutes % 60}m`
                          : `${stop.duration_minutes}min`
                        }
                      </p>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>

          {/* Vehicle Marker */}
          <div 
            className="absolute transition-all duration-500" 
            style={{ left: `calc(${Math.min(Math.max(position, 3), 97)}% - 14px)`, top: '0' }}
          >
            <div className={`flex flex-col items-center ${!isStopped ? 'animate-bounce-slow' : ''}`}>
              <div className="w-7 h-7 rounded-full bg-card border-2 border-primary shadow-md flex items-center justify-center">
                <VehicleIcon type={equipmentType} isStopped={isStopped} size="xs" />
              </div>
            </div>
          </div>

          {/* Hour Labels */}
          <div className="absolute left-0 right-0 top-9 flex justify-between">
            <span className="text-[10px] text-muted-foreground">{formatHour(equipment.start_hour)}</span>
            <span className="text-[10px] font-medium text-foreground">{Math.round(position)}%</span>
            <span className="text-[10px] text-muted-foreground">{formatHour(equipment.end_hour)}</span>
          </div>
        </div>
      </TooltipProvider>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Equipamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{equipment.name}</strong>? Esta ação não pode ser desfeita.
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
