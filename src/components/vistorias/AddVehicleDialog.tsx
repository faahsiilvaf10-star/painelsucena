import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCreateVehicleInspection } from "@/hooks/useVehicleInspections";
import { useAuth } from "@/hooks/useAuth";

interface AddVehicleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddVehicleDialog({ open, onOpenChange }: AddVehicleDialogProps) {
  const { user } = useAuth();
  const createVehicle = useCreateVehicleInspection();
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    placa: "",
    modelo_veiculo: "",
    numero_cracha: "",
    validade_cracha: undefined as Date | undefined,
  });

  const resetForm = () => {
    setFormData({
      placa: "",
      modelo_veiculo: "",
      numero_cracha: "",
      validade_cracha: undefined,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Você precisa estar logado");
      return;
    }

    if (!formData.validade_cracha) {
      toast.error("Selecione a data de validade");
      return;
    }

    try {
      await createVehicle.mutateAsync({
        placa: formData.placa.toUpperCase(),
        modelo_veiculo: formData.modelo_veiculo.toUpperCase(),
        numero_cracha: formData.numero_cracha,
        validade_cracha: format(formData.validade_cracha, "yyyy-MM-dd"),
        created_by: user.id,
      });
      
      toast.success("Veículo adicionado!");
      resetForm();
      onOpenChange(false);
    } catch {
      toast.error("Erro ao adicionar veículo");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-medium">Novo Veículo</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="placa" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Placa
              </Label>
              <Input
                id="placa"
                value={formData.placa}
                onChange={(e) => setFormData({ ...formData, placa: e.target.value.toUpperCase() })}
                placeholder="ABC-1234"
                className="h-11"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modelo" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Modelo do Veículo
              </Label>
              <Input
                id="modelo"
                value={formData.modelo_veiculo}
                onChange={(e) => setFormData({ ...formData, modelo_veiculo: e.target.value.toUpperCase() })}
                placeholder="MARCOPOLO"
                className="h-11"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cracha" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Nº Crachá
              </Label>
              <Input
                id="cracha"
                value={formData.numero_cracha}
                onChange={(e) => setFormData({ ...formData, numero_cracha: e.target.value })}
                placeholder="140000070738"
                className="h-11 font-mono"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Validade Crachá
              </Label>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "h-11 w-full justify-start text-left font-normal",
                      !formData.validade_cracha && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.validade_cracha
                      ? format(formData.validade_cracha, "dd/MM/yyyy")
                      : "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.validade_cracha}
                    onSelect={(date) => {
                      setFormData({ ...formData, validade_cracha: date });
                      setDatePickerOpen(false);
                    }}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Button type="submit" className="w-full h-11" disabled={createVehicle.isPending}>
            {createVehicle.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Adicionar Veículo"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
