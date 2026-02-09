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
 import { format } from "date-fns";
 import { 
   useAddStatusToHistory, 
   useRemoveStatusFromHistory, 
   useUpdateStatusInHistory,
   StatusHistoryEntry,
   useDailyShiftRecords
 } from "@/hooks/useDailyShiftRecords";
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
   
   const targetDate = shiftDate || new Date().toISOString().split("T")[0];
   const { data: records = [] } = useDailyShiftRecords(targetDate);
   const currentRecord = records.find((r) => r.equipment_id === equipmentId);
   const statusHistory = currentRecord?.status_history || [];
 
   const handleAddSubmit = async () => {
     if (!selectedStatus || !statusTime) {
       toast.error("Selecione o status e o horário");
       return;
     }
 
     setIsSubmitting(true);
 
     try {
       const timestamp = new Date(`${targetDate}T${statusTime}:00`).toISOString();
 
       await addStatusToHistory.mutateAsync({
         equipmentId,
         status: selectedStatus,
         changedBy: profile?.full_name ? `${profile.full_name} (Admin)` : "Admin",
         description: description || undefined,
         customTimestamp: timestamp,
         shiftDate: targetDate,
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
       const newTimestamp = new Date(`${targetDate}T${editTime}:00`).toISOString();
 
       await updateStatusInHistory.mutateAsync({
         equipmentId,
         statusIndex: editingIndex,
         newStatus: editStatus,
         newTimestamp,
         newDescription: editDescription,
         shiftDate: targetDate,
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
         shiftDate: targetDate,
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
                                 <Badge variant="secondary" className="text-xs">
                                   {format(new Date(entry.timestamp), "HH:mm")}
                                 </Badge>
                                 <span className="font-medium text-sm">
                                   {getStatusLabel(entry.status)}
                                 </span>
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