 import { useState } from "react";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogTrigger,
 } from "@/components/ui/dialog";
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from "@/components/ui/select";
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
 import { Edit, Plus, Loader2, Trash2, Clock, Pencil } from "lucide-react";
 import { toast } from "sonner";
import { format, startOfDay, endOfDay } from "date-fns";
import { 
  useAddStatusToHistory, 
  useRemoveStatusFromHistory, 
  useUpdateStatusInHistory,
  StatusHistoryEntry,
  useDailyShiftRecords
} from "@/hooks/useDailyShiftRecords";
import { useEquipmentStopHistory } from "@/hooks/useEquipment";
import { useProfile } from "@/hooks/useProfile";
 import { ScrollArea } from "@/components/ui/scroll-area";
 import { Badge } from "@/components/ui/badge";
 import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
 
 interface AdminStatusEditorProps {
   equipmentId: string;
   equipmentName: string;
   shiftDate?: string;
 }
 
const STATUS_OPTIONS = [
  { value: "operando", label: "Operando" },
  { value: "waiting_front", label: "Aguardando Frente" },
  { value: "aguardando_frente_servico", label: "Aguardando Frente de Serviço" },
  { value: "maintenance", label: "Manutenção" },
  { value: "manutencao_corretiva", label: "Manutenção Corretiva" },
  { value: "manutencao_preventiva", label: "Manutenção Preventiva" },
  { value: "vistoria", label: "Vistoria" },
  { value: "abastecimento", label: "Abastecendo" },
  { value: "rain", label: "Parado (Chuva)" },
  { value: "end_of_shift", label: "Fim de Turno" },
  { value: "fim_turno", label: "Fim de Turno" },
  { value: "end_of_day", label: "Abastecendo" },
] as const;

const ALL_STATUS_LABELS: Record<string, string> = {
  operando: "Operando",
  waiting_front: "Aguardando Frente",
  waiting: "Aguardando Frente",
  aguardando_frente_servico: "Aguardando Frente de Serviço",
  maintenance: "Manutenção",
  manutencao_corretiva: "Manutenção Corretiva",
  manutencao_preventiva: "Manutenção Preventiva",
  vistoria: "Vistoria",
  abastecimento: "Abastecendo",
  rain: "Parado (Chuva)",
  end_of_shift: "Fim de Turno",
  fim_turno: "Fim de Turno",
  end_of_day: "Abastecendo",
  none: "Sem Status",
};

const getStatusLabel = (status: string) => {
  return ALL_STATUS_LABELS[status] || status;
};

const getStatusColor = (status: string) => {
  if (status === "operando" || status === "none") return "bg-green-500 text-white";
  if (status === "abastecimento" || status === "end_of_day") return "bg-cyan-500 text-white";
  if (status === "maintenance" || status === "manutencao_corretiva") return "bg-red-500 text-white";
  if (status === "manutencao_preventiva") return "bg-amber-500 text-white";
  if (status === "vistoria") return "bg-purple-500 text-white";
  if (status === "end_of_shift" || status === "fim_turno") return "bg-blue-500 text-white";
  if (status === "waiting" || status === "waiting_front" || status === "aguardando_frente_servico") return "bg-yellow-500 text-black";
  if (status === "rain") return "bg-sky-500 text-white";
  return "";
};
 
 export function AdminStatusEditor({ equipmentId, equipmentName, shiftDate }: AdminStatusEditorProps) {
   const [isOpen, setIsOpen] = useState(false);
   const [activeTab, setActiveTab] = useState<string>("list");
   
   // Add new status state
   const [selectedStatus, setSelectedStatus] = useState<string>("");
   const [statusTime, setStatusTime] = useState<string>("");
   const [description, setDescription] = useState<string>("");
   const [isSubmitting, setIsSubmitting] = useState(false);
   
   // Edit status state
   const [editingIndex, setEditingIndex] = useState<number | null>(null);
   const [editStatus, setEditStatus] = useState<string>("");
   const [editTime, setEditTime] = useState<string>("");
   const [editDescription, setEditDescription] = useState<string>("");
   
   // Delete confirmation state
   const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
 
   const addStatusToHistory = useAddStatusToHistory();
   const removeStatusFromHistory = useRemoveStatusFromHistory();
   const updateStatusInHistory = useUpdateStatusInHistory();
   const { data: profile } = useProfile();
   
    const today = new Date().toISOString().split("T")[0];
    const targetDate = shiftDate || today;
    
    // Fetch records for target date AND without date filter as fallback
    const { data: dateRecords = [] } = useDailyShiftRecords(targetDate);
    const { data: allRecords = [] } = useDailyShiftRecords();
    
    // Also fetch from equipment_stop_history (the source of "Movimentações de Hoje")
    const { data: stopHistory = [] } = useEquipmentStopHistory(equipmentId);
    
    // Try to find record for the target date first, then fall back to most recent record for this equipment
    const currentRecord = dateRecords.find((r) => r.equipment_id === equipmentId) 
      || allRecords.find((r) => r.equipment_id === equipmentId);
    const effectiveDate = currentRecord?.shift_date || targetDate;
    const shiftStatusHistory = currentRecord?.status_history || [];
    
    // Build merged history: combine daily_shift_records status_history with equipment_stop_history
    const mergedHistory = (() => {
      const dateStart = startOfDay(new Date(effectiveDate));
      const dateEnd = endOfDay(new Date(effectiveDate));
      
      // Get stop history entries for this date
      const todayStopHistory = stopHistory.filter((sh) => {
        const startedAt = new Date(sh.started_at);
        return startedAt >= dateStart && startedAt <= dateEnd;
      });
      
      // Convert stop history to StatusHistoryEntry format
      const fromStopHistory: StatusHistoryEntry[] = todayStopHistory.map((sh) => ({
        status: sh.stop_reason,
        timestamp: sh.started_at,
        changed_by: sh.changed_by_driver || undefined,
        description: sh.defect_description || undefined,
      }));
      
      // Merge: use stop history as base, then add any shift entries not already represented
      const allEntries = [...fromStopHistory];
      
      // Add shift history entries that don't have a matching stop history entry (within 2min tolerance)
      for (const entry of shiftStatusHistory) {
        const entryTime = new Date(entry.timestamp).getTime();
        const hasDuplicate = fromStopHistory.some((sh) => {
          const shTime = new Date(sh.timestamp).getTime();
          return Math.abs(entryTime - shTime) < 120000 && sh.status === entry.status;
        });
        if (!hasDuplicate) {
          allEntries.push(entry);
        }
      }
      
      // Sort by timestamp ascending
      return allEntries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    })();
    
    const statusHistory = mergedHistory;
 
   const handleAddSubmit = async () => {
     if (!selectedStatus || !statusTime) {
       toast.error("Selecione o status e o horário");
       return;
     }
 
     setIsSubmitting(true);
 
     try {
        const timestamp = new Date(`${effectiveDate}T${statusTime}:00`).toISOString();

        await addStatusToHistory.mutateAsync({
          equipmentId,
          status: selectedStatus,
          changedBy: profile?.full_name ? `${profile.full_name} (Admin)` : "Admin",
          description: description || undefined,
          customTimestamp: timestamp,
          shiftDate: effectiveDate,
        });
 
       toast.success("Status adicionado com sucesso!");
       setSelectedStatus("");
       setStatusTime("");
       setDescription("");
       setActiveTab("list");
     } catch (error) {
       console.error("Error adding status:", error);
       toast.error("Erro ao adicionar status");
     } finally {
       setIsSubmitting(false);
     }
   };
 
   const handleStartEdit = (index: number, entry: StatusHistoryEntry) => {
     setEditingIndex(index);
     setEditStatus(entry.status);
     const time = new Date(entry.timestamp);
     setEditTime(format(time, "HH:mm"));
     setEditDescription(entry.description || "");
   };
 
   const handleCancelEdit = () => {
     setEditingIndex(null);
     setEditStatus("");
     setEditTime("");
     setEditDescription("");
   };
 
   const handleSaveEdit = async () => {
     if (editingIndex === null || !editTime) return;
 
     setIsSubmitting(true);
 
     try {
       const newTimestamp = new Date(`${effectiveDate}T${editTime}:00`).toISOString();
 
       await updateStatusInHistory.mutateAsync({
         equipmentId,
         statusIndex: editingIndex,
         newStatus: editStatus,
         newTimestamp,
         newDescription: editDescription,
          shiftDate: effectiveDate,
       });
 
       toast.success("Status atualizado com sucesso!");
       handleCancelEdit();
     } catch (error) {
       console.error("Error updating status:", error);
       toast.error("Erro ao atualizar status");
     } finally {
       setIsSubmitting(false);
     }
   };
 
   const handleDelete = async () => {
     if (deleteIndex === null) return;
 
     try {
       await removeStatusFromHistory.mutateAsync({
         equipmentId,
         statusIndex: deleteIndex,
         shiftDate: effectiveDate,
       });
 
       toast.success("Status removido com sucesso!");
       setDeleteIndex(null);
     } catch (error) {
       console.error("Error removing status:", error);
       toast.error("Erro ao remover status");
     }
   };
 
   return (
     <>
       <Dialog open={isOpen} onOpenChange={setIsOpen}>
         <DialogTrigger asChild>
           <Button variant="ghost" size="sm" className="h-7 text-xs">
             <Edit className="h-3 w-3 mr-1" />
             Editar
           </Button>
         </DialogTrigger>
         <DialogContent className="sm:max-w-[500px]">
           <DialogHeader>
             <DialogTitle>Gerenciar Status - {equipmentName}</DialogTitle>
           </DialogHeader>
           
           <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
             <TabsList className="grid w-full grid-cols-2">
               <TabsTrigger value="list">Histórico</TabsTrigger>
               <TabsTrigger value="add">Adicionar</TabsTrigger>
             </TabsList>
             
             <TabsContent value="list" className="mt-4">
               {statusHistory.length === 0 ? (
                 <div className="text-center py-8 text-muted-foreground">
                   <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                   <p className="text-sm">Nenhum status registrado</p>
                 </div>
               ) : (
                 <ScrollArea className="h-[300px] pr-4">
                   <div className="space-y-2">
                     {statusHistory.map((entry, index) => (
                       <div
                         key={index}
                         className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30"
                       >
                         {editingIndex === index ? (
                           <div className="flex-1 space-y-3">
                             <div className="grid grid-cols-2 gap-2">
                               <div>
                                 <Label className="text-xs">Status</Label>
                                 <Select value={editStatus} onValueChange={setEditStatus}>
                                   <SelectTrigger className="h-8">
                                     <SelectValue />
                                   </SelectTrigger>
                                   <SelectContent>
                                     {STATUS_OPTIONS.map((option) => (
                                       <SelectItem key={option.value} value={option.value}>
                                         {option.label}
                                       </SelectItem>
                                     ))}
                                   </SelectContent>
                                 </Select>
                               </div>
                               <div>
                                 <Label className="text-xs">Horário</Label>
                                 <Input
                                   type="time"
                                   value={editTime}
                                   onChange={(e) => setEditTime(e.target.value)}
                                   className="h-8"
                                 />
                               </div>
                             </div>
                             <div>
                               <Label className="text-xs">Descrição</Label>
                               <Input
                                 value={editDescription}
                                 onChange={(e) => setEditDescription(e.target.value)}
                                 placeholder="Descrição (opcional)"
                                 className="h-8"
                               />
                             </div>
                             <div className="flex gap-2">
                               <Button
                                 size="sm"
                                 onClick={handleSaveEdit}
                                 disabled={isSubmitting}
                                 className="h-7"
                               >
                                 {isSubmitting ? (
                                   <Loader2 className="h-3 w-3 animate-spin" />
                                 ) : (
                                   "Salvar"
                                 )}
                               </Button>
                               <Button
                                 size="sm"
                                 variant="outline"
                                 onClick={handleCancelEdit}
                                 className="h-7"
                               >
                                 Cancelar
                               </Button>
                             </div>
                           </div>
                         ) : (
                           <>
                             <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="text-xs font-mono">
                                    {format(new Date(entry.timestamp), "HH:mm")}
                                  </Badge>
                                  <Badge className={`text-xs ${getStatusColor(entry.status)}`}>
                                    {getStatusLabel(entry.status)}
                                  </Badge>
                                </div>
                               {entry.description && (
                                 <p className="text-xs text-muted-foreground mt-1 truncate">
                                   {entry.description}
                                 </p>
                               )}
                               {entry.changed_by && (
                                 <p className="text-xs text-muted-foreground/70 mt-0.5">
                                   por {entry.changed_by}
                                 </p>
                               )}
                             </div>
                             <div className="flex gap-1">
                               <Button
                                 variant="ghost"
                                 size="icon"
                                 className="h-7 w-7"
                                 onClick={() => handleStartEdit(index, entry)}
                               >
                                 <Pencil className="h-3 w-3" />
                               </Button>
                               <Button
                                 variant="ghost"
                                 size="icon"
                                 className="h-7 w-7 text-destructive hover:text-destructive"
                                 onClick={() => setDeleteIndex(index)}
                               >
                                 <Trash2 className="h-3 w-3" />
                               </Button>
                             </div>
                           </>
                         )}
                       </div>
                     ))}
                   </div>
                 </ScrollArea>
               )}
             </TabsContent>
             
             <TabsContent value="add" className="mt-4">
               <div className="space-y-4">
                 <div className="space-y-2">
                   <Label htmlFor="status">Status</Label>
                   <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                     <SelectTrigger>
                       <SelectValue placeholder="Selecione o status" />
                     </SelectTrigger>
                     <SelectContent>
                       {STATUS_OPTIONS.map((option) => (
                         <SelectItem key={option.value} value={option.value}>
                           {option.label}
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                 </div>
 
                 <div className="space-y-2">
                   <Label htmlFor="time">Horário</Label>
                   <Input
                     id="time"
                     type="time"
                     value={statusTime}
                     onChange={(e) => setStatusTime(e.target.value)}
                     className="w-full"
                   />
                 </div>
 
                 <div className="space-y-2">
                   <Label htmlFor="description">Descrição (opcional)</Label>
                   <Input
                     id="description"
                     placeholder="Ex: Ponto 1, Problema no motor..."
                     value={description}
                     onChange={(e) => setDescription(e.target.value)}
                   />
                 </div>
 
                 <Button
                   className="w-full"
                   onClick={handleAddSubmit}
                   disabled={isSubmitting || !selectedStatus || !statusTime}
                 >
                   {isSubmitting ? (
                     <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                   ) : (
                     <Plus className="h-4 w-4 mr-2" />
                   )}
                   Adicionar Status
                 </Button>
               </div>
             </TabsContent>
           </Tabs>
         </DialogContent>
       </Dialog>
 
       <AlertDialog open={deleteIndex !== null} onOpenChange={() => setDeleteIndex(null)}>
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle>Remover Status</AlertDialogTitle>
             <AlertDialogDescription>
               Tem certeza que deseja remover este status do histórico? Esta ação não pode ser desfeita.
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel>Cancelar</AlertDialogCancel>
             <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
               Remover
             </AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>
     </>
   );
 }