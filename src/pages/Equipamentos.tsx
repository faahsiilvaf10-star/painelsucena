import Layout from "@/components/layout/Layout";
import { EquipmentTimeline } from "@/components/equipamentos/EquipmentTimeline";
import { Truck, Plus, Loader2, Droplets, Container, Car, StopCircle } from "lucide-react";
import { useEquipment, useCreateEquipment } from "@/hooks/useEquipment";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { EquipmentType, equipmentTypeLabels } from "@/components/equipamentos/VehicleIcons";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const equipmentTypeOptions: { value: EquipmentType; label: string; icon: React.ReactNode; color: string }[] = [
  { value: "pipa", label: "Pipa", icon: <Droplets className="w-4 h-4" />, color: "bg-blue-500" },
  { value: "munk", label: "Munk", icon: <Container className="w-4 h-4" />, color: "bg-orange-500" },
  { value: "camionete", label: "Camionete", icon: <Car className="w-4 h-4" />, color: "bg-gray-500" },
];

const Equipamentos = () => {
  const { data: equipment, isLoading } = useEquipment();
  const createEquipment = useCreateEquipment();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [isStoppingAll, setIsStoppingAll] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    plate: "",
    driver: "",
    helper: "",
    equipment_type: "pipa" as EquipmentType,
    start_hour: 8,
    end_hour: 16,
  });

  const handleAutoStopAll = async () => {
    setIsStoppingAll(true);
    try {
      const { data, error } = await supabase.functions.invoke("auto-stop-equipment");
      if (error) throw error;
      toast.success(`Parada automática executada! ${data?.processed || 0} equipamento(s) processado(s).`);
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
    } catch (err) {
      console.error("Erro ao executar parada automática:", err);
      toast.error("Erro ao executar parada automática");
    } finally {
      setIsStoppingAll(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createEquipment.mutateAsync(formData);
      toast.success("Equipamento adicionado!");
      setOpen(false);
      setFormData({ name: "", plate: "", driver: "", helper: "", equipment_type: "pipa", start_hour: 8, end_hour: 16 });
    } catch {
      toast.error("Erro ao adicionar");
    }
  };

  return (
    <Layout>
      <div className="space-y-4 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Equipamentos em Operação</h1>
            <p className="text-sm text-muted-foreground">Acompanhe o status em tempo real</p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={handleAutoStopAll}
              disabled={isStoppingAll}
            >
              {isStoppingAll ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <StopCircle className="w-4 h-4" />
              )}
              Parar Todos
            </Button>
            
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="w-4 h-4" /> Adicionar
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Novo Equipamento</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs">Tipo</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {equipmentTypeOptions.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, equipment_type: type.value })}
                        className={`flex items-center justify-center gap-2 p-2 rounded-lg border-2 transition-all text-sm ${
                          formData.equipment_type === type.value
                            ? `border-primary ${type.color} text-white`
                            : "border-border bg-muted/50 hover:border-primary/50"
                        }`}
                      >
                        {type.icon}
                        <span className="font-medium">{type.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="name" className="text-xs">Nome</Label>
                    <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: Pipa 01" required />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="plate" className="text-xs">Placa</Label>
                    <Input id="plate" value={formData.plate} onChange={(e) => setFormData({ ...formData, plate: e.target.value.toUpperCase() })} placeholder="ABC-1234" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="driver" className="text-xs">Motorista</Label>
                    <Input id="driver" value={formData.driver} onChange={(e) => setFormData({ ...formData, driver: e.target.value })} required />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="helper" className="text-xs">Ajudante</Label>
                    <Input id="helper" value={formData.helper} onChange={(e) => setFormData({ ...formData, helper: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Início</Label>
                    <Input type="number" min={0} max={23} value={formData.start_hour} onChange={(e) => setFormData({ ...formData, start_hour: parseInt(e.target.value) })} required />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Fim</Label>
                    <Input type="number" min={0} max={23} value={formData.end_hour} onChange={(e) => setFormData({ ...formData, end_hour: parseInt(e.target.value) })} required />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={createEquipment.isPending}>
                  {createEquipment.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Equipment List */}
        <div className="grid gap-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : equipment && equipment.length > 0 ? (
            equipment.map((eq) => <EquipmentTimeline key={eq.id} equipment={eq} />)
          ) : (
            <div className="bg-muted/50 rounded-xl p-6 text-center">
              <Truck className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-3">Nenhum equipamento cadastrado</p>
              <Button onClick={() => setOpen(true)} size="sm" className="gap-2">
                <Plus className="w-4 h-4" /> Adicionar
              </Button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Equipamentos;
