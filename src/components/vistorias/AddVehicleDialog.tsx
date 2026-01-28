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
import { useCreateVehicleInspection, DATE_FIELDS } from "@/hooks/useVehicleInspections";
import { useAuth } from "@/hooks/useAuth";

interface AddVehicleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type DateFieldState = {
  vistoria: Date | undefined;
  laudo_opacidade: Date | undefined;
  laudo_mecanico: Date | undefined;
  plano_manutencao: Date | undefined;
  cronografo: Date | undefined;
};

export function AddVehicleDialog({ open, onOpenChange }: AddVehicleDialogProps) {
  const { user } = useAuth();
  const createVehicle = useCreateVehicleInspection();
  const [openPickers, setOpenPickers] = useState<Record<string, boolean>>({});
  
  const [formData, setFormData] = useState({
    placa: "",
    modelo_veiculo: "",
    numero_cracha: "",
  });

  const [dates, setDates] = useState<DateFieldState>({
    vistoria: undefined,
    laudo_opacidade: undefined,
    laudo_mecanico: undefined,
    plano_manutencao: undefined,
    cronografo: undefined,
  });

  const resetForm = () => {
    setFormData({
      placa: "",
      modelo_veiculo: "",
      numero_cracha: "",
    });
    setDates({
      vistoria: undefined,
      laudo_opacidade: undefined,
      laudo_mecanico: undefined,
      plano_manutencao: undefined,
      cronografo: undefined,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Você precisa estar logado");
      return;
    }

    try {
      await createVehicle.mutateAsync({
        placa: formData.placa.toUpperCase(),
        modelo_veiculo: formData.modelo_veiculo.toUpperCase(),
        numero_cracha: formData.numero_cracha,
        vistoria: dates.vistoria ? format(dates.vistoria, "yyyy-MM-dd") : null,
        laudo_opacidade: dates.laudo_opacidade ? format(dates.laudo_opacidade, "yyyy-MM-dd") : null,
        laudo_mecanico: dates.laudo_mecanico ? format(dates.laudo_mecanico, "yyyy-MM-dd") : null,
        plano_manutencao: dates.plano_manutencao ? format(dates.plano_manutencao, "yyyy-MM-dd") : null,
        cronografo: dates.cronografo ? format(dates.cronografo, "yyyy-MM-dd") : null,
        created_by: user.id,
      });
      
      toast.success("Veículo adicionado!");
      resetForm();
      onOpenChange(false);
    } catch {
      toast.error("Erro ao adicionar veículo");
    }
  };

  const togglePicker = (key: string, value: boolean) => {
    setOpenPickers((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-medium">Novo Veículo</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {/* Basic Info */}
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

          {/* Date Fields */}
          <div className="pt-2 border-t">
            <h4 className="text-sm font-medium text-muted-foreground mb-4">Datas de Vencimento</h4>
            <div className="grid grid-cols-2 gap-4">
              {DATE_FIELDS.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {field.label}
                  </Label>
                  <Popover 
                    open={openPickers[field.key]} 
                    onOpenChange={(val) => togglePicker(field.key, val)}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "h-11 w-full justify-start text-left font-normal",
                          !dates[field.key] && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dates[field.key]
                          ? format(dates[field.key]!, "dd/MM/yyyy")
                          : "Selecionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dates[field.key]}
                        onSelect={(date) => {
                          setDates((prev) => ({ ...prev, [field.key]: date }));
                          togglePicker(field.key, false);
                        }}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              ))}
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
