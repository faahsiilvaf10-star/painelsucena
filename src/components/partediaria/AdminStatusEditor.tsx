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
import { Edit, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAddStatusToHistory } from "@/hooks/useDailyShiftRecords";
import { useProfile } from "@/hooks/useProfile";

interface AdminStatusEditorProps {
  equipmentId: string;
  equipmentName: string;
  shiftDate?: string; // Optional: for editing past records
}

const STATUS_OPTIONS = [
  { value: "operando", label: "Operando" },
  { value: "waiting_front", label: "Aguardando Frente" },
  { value: "maintenance", label: "Manutenção" },
  { value: "abastecimento", label: "Abastecendo" },
  { value: "rain", label: "Parado (Chuva)" },
  { value: "end_of_shift", label: "Fim de Turno" },
] as const;

export function AdminStatusEditor({ equipmentId, equipmentName, shiftDate }: AdminStatusEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [statusTime, setStatusTime] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addStatusToHistory = useAddStatusToHistory();
  const { data: profile } = useProfile();

  const handleSubmit = async () => {
    if (!selectedStatus || !statusTime) {
      toast.error("Selecione o status e o horário");
      return;
    }

    setIsSubmitting(true);

    try {
      // Build the timestamp using the target date and the selected time
      const targetDate = shiftDate || new Date().toISOString().split("T")[0];
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
      setIsOpen(false);
      setSelectedStatus("");
      setStatusTime("");
      setDescription("");
    } catch (error) {
      console.error("Error adding status:", error);
      toast.error("Erro ao adicionar status");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 text-xs">
          <Edit className="h-3 w-3 mr-1" />
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar Status - {equipmentName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
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
            onClick={handleSubmit}
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
      </DialogContent>
    </Dialog>
  );
}
