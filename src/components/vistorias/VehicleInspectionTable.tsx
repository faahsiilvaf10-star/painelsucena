import { useState } from "react";
import { format, parseISO, isValid, isBefore, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Pencil, Trash2, Check, X, CalendarIcon, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  VehicleInspection,
  useUpdateVehicleInspection,
  useDeleteVehicleInspection,
  DATE_FIELDS,
  DateFieldKey,
} from "@/hooks/useVehicleInspections";
import { useIsAdmin } from "@/hooks/useUserRole";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface VehicleInspectionTableProps {
  vehicles: VehicleInspection[];
}

export function VehicleInspectionTable({ vehicles }: VehicleInspectionTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<VehicleInspection>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [openPickers, setOpenPickers] = useState<Record<string, boolean>>({});
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  const updateVehicle = useUpdateVehicleInspection();
  const deleteVehicle = useDeleteVehicleInspection();
  const { isAdmin } = useIsAdmin();

  const startEdit = (vehicle: VehicleInspection) => {
    setEditingId(vehicle.id);
    setEditData({
      placa: vehicle.placa,
      modelo_veiculo: vehicle.modelo_veiculo,
      numero_cracha: vehicle.numero_cracha,
      vistoria: vehicle.vistoria,
      laudo_opacidade: vehicle.laudo_opacidade,
      laudo_mecanico: vehicle.laudo_mecanico,
      plano_manutencao: vehicle.plano_manutencao,
    });
    // Expand the row being edited
    setExpandedRows((prev) => new Set([...prev, vehicle.id]));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEdit = async () => {
    if (!editingId) return;
    
    try {
      await updateVehicle.mutateAsync({
        id: editingId,
        ...editData,
      });
      toast.success("Veículo atualizado!");
      setEditingId(null);
      setEditData({});
    } catch {
      toast.error("Erro ao atualizar veículo");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    try {
      await deleteVehicle.mutateAsync(deleteId);
      toast.success("Veículo removido!");
      setDeleteId(null);
    } catch {
      toast.error("Erro ao remover veículo");
    }
  };

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getExpiryStatus = (dateStr: string | null) => {
    if (!dateStr) return "unknown";
    
    try {
      const date = parseISO(dateStr);
      if (!isValid(date)) return "unknown";
      
      const today = new Date();
      const warningDate = addDays(today, 30);
      
      if (isBefore(date, today)) return "expired";
      if (isBefore(date, warningDate)) return "warning";
      return "valid";
    } catch {
      return "unknown";
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      const date = parseISO(dateStr);
      if (!isValid(date)) return dateStr;
      return format(date, "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateStr || "-";
    }
  };

  const togglePicker = (key: string, value: boolean) => {
    setOpenPickers((prev) => ({ ...prev, [key]: value }));
  };

  // Count how many dates are in warning/expired state
  const getVehicleAlertCount = (vehicle: VehicleInspection) => {
    return DATE_FIELDS.reduce((count, field) => {
      const status = getExpiryStatus(vehicle[field.key]);
      return status === "expired" || status === "warning" ? count + 1 : count;
    }, 0);
  };

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-8"></TableHead>
              <TableHead className="font-semibold">Placa</TableHead>
              <TableHead className="font-semibold">Modelo</TableHead>
              <TableHead className="font-semibold">Nº Crachá</TableHead>
              <TableHead className="font-semibold text-center">Alertas</TableHead>
              <TableHead className="text-right font-semibold">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles.map((vehicle) => {
              const isEditing = editingId === vehicle.id;
              const isExpanded = expandedRows.has(vehicle.id);
              const alertCount = getVehicleAlertCount(vehicle);
              
              return (
                <Collapsible key={vehicle.id} asChild open={isExpanded}>
                  <>
                    <TableRow className="hover:bg-muted/30">
                      <TableCell>
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => toggleRow(vehicle.id)}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editData.placa || ""}
                            onChange={(e) => setEditData({ ...editData, placa: e.target.value.toUpperCase() })}
                            className="h-8 w-28"
                          />
                        ) : (
                          <span className="font-mono font-medium">{vehicle.placa}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editData.modelo_veiculo || ""}
                            onChange={(e) => setEditData({ ...editData, modelo_veiculo: e.target.value.toUpperCase() })}
                            className="h-8 w-40"
                          />
                        ) : (
                          vehicle.modelo_veiculo
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editData.numero_cracha || ""}
                            onChange={(e) => setEditData({ ...editData, numero_cracha: e.target.value })}
                            className="h-8 w-36 font-mono"
                          />
                        ) : (
                          <span className="font-mono text-muted-foreground">{vehicle.numero_cracha}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {alertCount > 0 ? (
                          <span className="inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full bg-red-500/20 text-red-500 text-xs font-medium">
                            {alertCount}
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full bg-green-500/20 text-green-500 text-xs font-medium">
                            OK
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-green-500 hover:text-green-400 hover:bg-green-500/10"
                              onClick={saveEdit}
                              disabled={updateVehicle.isPending}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={cancelEdit}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => startEdit(vehicle)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {isAdmin && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-muted-foreground hover:text-red-500"
                                onClick={() => setDeleteId(vehicle.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                    <CollapsibleContent asChild>
                      <TableRow className="bg-muted/20 hover:bg-muted/30">
                        <TableCell colSpan={6} className="p-4">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {DATE_FIELDS.map((field) => {
                              const value = vehicle[field.key];
                              const editValue = editData[field.key as DateFieldKey];
                              const status = getExpiryStatus(isEditing ? editValue || null : value);
                              const pickerKey = `${vehicle.id}-${field.key}`;
                              
                              return (
                                <div key={field.key} className="space-y-1.5">
                                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                    {field.label}
                                  </span>
                                  {isEditing ? (
                                    <Popover 
                                      open={openPickers[pickerKey]} 
                                      onOpenChange={(val) => togglePicker(pickerKey, val)}
                                    >
                                      <PopoverTrigger asChild>
                                        <Button
                                          variant="outline"
                                          className={cn(
                                            "h-9 w-full justify-start text-left font-normal",
                                            !editValue && "text-muted-foreground"
                                          )}
                                        >
                                          <CalendarIcon className="mr-2 h-4 w-4" />
                                          {editValue ? formatDate(editValue) : "Selecionar"}
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-auto p-0" align="start">
                                        <CalendarComponent
                                          mode="single"
                                          selected={editValue ? parseISO(editValue) : undefined}
                                          onSelect={(date) => {
                                            setEditData({ 
                                              ...editData, 
                                              [field.key]: date ? format(date, "yyyy-MM-dd") : null 
                                            });
                                            togglePicker(pickerKey, false);
                                          }}
                                          initialFocus
                                          className={cn("p-3 pointer-events-auto")}
                                        />
                                      </PopoverContent>
                                    </Popover>
                                  ) : (
                                    <span
                                      className={cn(
                                        "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-sm font-medium w-full",
                                        status === "expired" && "bg-red-500/10 text-red-500",
                                        status === "warning" && "bg-amber-500/10 text-amber-500",
                                        status === "valid" && "bg-green-500/10 text-green-500",
                                        status === "unknown" && "bg-muted text-muted-foreground"
                                      )}
                                    >
                                      <Calendar className="w-3.5 h-3.5" />
                                      {formatDate(value)}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </TableCell>
                      </TableRow>
                    </CollapsibleContent>
                  </>
                </Collapsible>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover veículo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O veículo será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
