import { useState } from "react";
import { format, parseISO, isValid, isBefore, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Pencil, Trash2, Check, X, CalendarIcon } from "lucide-react";
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
} from "@/hooks/useVehicleInspections";
import { useIsAdmin } from "@/hooks/useUserRole";

interface VehicleInspectionTableProps {
  vehicles: VehicleInspection[];
}

export function VehicleInspectionTable({ vehicles }: VehicleInspectionTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<VehicleInspection>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  
  const updateVehicle = useUpdateVehicleInspection();
  const deleteVehicle = useDeleteVehicleInspection();
  const { isAdmin } = useIsAdmin();

  const startEdit = (vehicle: VehicleInspection) => {
    setEditingId(vehicle.id);
    setEditData({
      placa: vehicle.placa,
      modelo_veiculo: vehicle.modelo_veiculo,
      numero_cracha: vehicle.numero_cracha,
      validade_cracha: vehicle.validade_cracha,
    });
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

  const getExpiryStatus = (dateStr: string) => {
    if (!dateStr || dateStr === "00/00/0000") return "unknown";
    
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

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    try {
      const date = parseISO(dateStr);
      if (!isValid(date)) return dateStr;
      return format(date, "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Placa</TableHead>
              <TableHead className="font-semibold">Modelo do Veículo</TableHead>
              <TableHead className="font-semibold">Nº Crachá</TableHead>
              <TableHead className="font-semibold">Validade Crachá</TableHead>
              <TableHead className="text-right font-semibold">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles.map((vehicle) => {
              const isEditing = editingId === vehicle.id;
              const expiryStatus = getExpiryStatus(vehicle.validade_cracha);
              
              return (
                <TableRow key={vehicle.id} className="hover:bg-muted/30">
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
                  <TableCell>
                    {isEditing ? (
                      <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "h-8 w-36 justify-start text-left font-normal",
                              !editData.validade_cracha && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {editData.validade_cracha
                              ? formatDate(editData.validade_cracha)
                              : "Selecionar"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={editData.validade_cracha ? parseISO(editData.validade_cracha) : undefined}
                            onSelect={(date) => {
                              if (date) {
                                setEditData({ ...editData, validade_cracha: format(date, "yyyy-MM-dd") });
                              }
                              setDatePickerOpen(false);
                            }}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-sm font-medium",
                          expiryStatus === "expired" && "bg-red-500/10 text-red-500",
                          expiryStatus === "warning" && "bg-amber-500/10 text-amber-500",
                          expiryStatus === "valid" && "bg-green-500/10 text-green-500",
                          expiryStatus === "unknown" && "bg-muted text-muted-foreground"
                        )}
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(vehicle.validade_cracha)}
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
