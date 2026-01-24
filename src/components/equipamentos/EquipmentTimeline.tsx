import { useState, useEffect, useMemo } from "react";
import { Pause, Play, Wrench, CloudRain, Clock, User, CreditCard, Edit2, Check, X, Trash2 } from "lucide-react";
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
import { VehicleIcon, equipmentTypeLabels, equipmentTypeColors } from "./VehicleIcons";
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

  // Update edit data when equipment changes
  useEffect(() => {
    setEditData({
      plate: equipment.plate,
      driver: equipment.driver,
      helper: equipment.helper,
    });
  }, [equipment]);

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

  const handleSaveEdit = async () => {
    try {
      await updateEquipment.mutateAsync({
        id: equipment.id,
        ...editData,
      });
      toast.success("Informações atualizadas!");
      setIsEditing(false);
    } catch (error) {
      toast.error("Erro ao atualizar informações");
    }
  };

  const handleCancelEdit = () => {
    setEditData({
      plate: equipment.plate,
      driver: equipment.driver,
      helper: equipment.helper,
    });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    try {
      await deleteEquipment.mutateAsync(equipment.id);
      toast.success("Equipamento removido com sucesso!");
    } catch (error) {
      toast.error("Erro ao remover equipamento");
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
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${isStopped ? stopReasonColors[stopReason] : equipmentTypeColors[equipmentType]}`}>
            <VehicleIcon type={equipmentType} isStopped={isStopped} className="w-8 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-foreground">{equipment.name}</h3>
              <Badge variant="secondary" className="text-xs">
                {equipmentTypeLabels[equipmentType]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Operação: {formatHour(equipment.start_hour)} - {formatHour(equipment.end_hour)}
            </p>
          </div>
        </div>

        {/* Equipment Details - Editable */}
        <div className="flex flex-wrap items-center gap-3">
          {isEditing ? (
            <>
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                <Input
                  value={editData.plate}
                  onChange={(e) => setEditData({ ...editData, plate: e.target.value })}
                  className="w-28 h-8 text-sm"
                  placeholder="Placa"
                />
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <Input
                  value={editData.driver}
                  onChange={(e) => setEditData({ ...editData, driver: e.target.value })}
                  className="w-32 h-8 text-sm"
                  placeholder="Motorista"
                />
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <Input
                  value={editData.helper}
                  onChange={(e) => setEditData({ ...editData, helper: e.target.value })}
                  className="w-32 h-8 text-sm"
                  placeholder="Ajudante"
                />
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSaveEdit} disabled={updateEquipment.isPending}>
                  <Check className="w-4 h-4 text-green-500" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancelEdit}>
                  <X className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </>
          ) : (
            <>
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
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIsEditing(true)}>
                <Edit2 className="w-4 h-4 text-muted-foreground" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setShowDeleteDialog(true)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
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
      <div className="relative pt-24 pb-8">
        {/* Progress Background */}
        <div className="absolute left-0 right-0 h-3 bg-muted rounded-full overflow-hidden" style={{ top: '5.5rem' }}>
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

        {/* Animated Vehicle with info above */}
        <div
          className={`absolute transition-all duration-1000 ease-linear`}
          style={{ left: `calc(${position}% - 28px)`, top: '0' }}
        >
          <div className="relative flex flex-col items-center">
            {/* Plate and Driver Info above vehicle */}
            <div className="flex flex-col items-center gap-1 mb-2">
              <div className={`text-[10px] font-bold px-2 py-0.5 rounded-md shadow-md ${
                isStopped 
                  ? `${stopReasonColors[stopReason]} text-white` 
                  : 'bg-primary text-primary-foreground'
              }`}>
                {equipment.plate}
              </div>
              <div className="text-[9px] text-muted-foreground bg-card/90 px-2 py-0.5 rounded shadow-sm border border-border whitespace-nowrap">
                <User className="w-2.5 h-2.5 inline mr-1" />
                {equipment.driver}
              </div>
            </div>

            {/* Vehicle Body */}
            <div className={isStopped ? "" : "animate-bounce-slow"}>
              <VehicleIcon type={equipmentType} isStopped={isStopped} />
              
              {/* Stop reason icon overlay */}
              {isStopped && (
                <div className={`absolute -top-1 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full ${stopReasonColors[stopReason]} flex items-center justify-center`}>
                  {stopReason === "maintenance" && <Wrench className="w-3 h-3 text-white" />}
                  {stopReason === "waiting" && <Clock className="w-3 h-3 text-white" />}
                  {stopReason === "rain" && <CloudRain className="w-3 h-3 text-white" />}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Hour Markers */}
        <div className="absolute left-0 right-0" style={{ top: '6.5rem' }}>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Equipamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{equipment.name}</strong>? 
              Esta ação não pode ser desfeita e todo o histórico de paradas será perdido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
