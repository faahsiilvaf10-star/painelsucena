import { useState, useEffect, useMemo } from "react";
import { Pause, Play, Wrench, CloudRain, Clock, User, CreditCard, Edit2, Check, X, Trash2, MoreVertical } from "lucide-react";
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
import { useUpdateEquipmentStatus, useUpdateEquipment, useDeleteEquipment, type StopReason, type Equipment } from "@/hooks/useEquipment";
import { VehicleIcon, equipmentTypeLabels } from "./VehicleIcons";
import { toast } from "sonner";

const stopReasonLabels: Record<StopReason, string> = {
  none: "Operando",
  maintenance: "Manutenção",
  waiting: "Aguardando",
  rain: "Chuva",
};

const stopReasonColors: Record<StopReason, string> = {
  none: "bg-green-500",
  maintenance: "bg-orange-500",
  waiting: "bg-yellow-500",
  rain: "bg-blue-500",
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

  const stopReason = (equipment.stop_reason || "none") as StopReason;
  const stopStartTime = equipment.stop_start_time ? new Date(equipment.stop_start_time) : null;
  const equipmentType = equipment.equipment_type || "pipa";

  useEffect(() => {
    setEditData({ plate: equipment.plate, driver: equipment.driver, helper: equipment.helper });
  }, [equipment]);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

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

      {/* Compact Timeline */}
      <div className="relative h-12">
        {/* Track */}
        <div className="absolute left-0 right-0 top-5 h-1.5 bg-muted rounded-full">
          <div
            className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${isStopped ? stopReasonColors[stopReason] : 'bg-green-500'}`}
            style={{ width: `${position}%` }}
          />
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
