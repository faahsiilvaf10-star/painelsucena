import Layout from "@/components/layout/Layout";
import { EquipmentTimeline } from "@/components/equipamentos/EquipmentTimeline";
import { Truck, Construction, Plus, Loader2, Droplets, Container, Car } from "lucide-react";
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

const equipmentTypeOptions: { value: EquipmentType; label: string; icon: React.ReactNode; color: string }[] = [
  { value: "pipa", label: "Caminhão Pipa", icon: <Droplets className="w-5 h-5" />, color: "bg-blue-500" },
  { value: "munk", label: "Caminhão Munk", icon: <Container className="w-5 h-5" />, color: "bg-orange-500" },
  { value: "camionete", label: "Camionete", icon: <Car className="w-5 h-5" />, color: "bg-gray-500" },
];

const Equipamentos = () => {
  const { data: equipment, isLoading } = useEquipment();
  const createEquipment = useCreateEquipment();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    plate: "",
    driver: "",
    helper: "",
    equipment_type: "pipa" as EquipmentType,
    start_hour: 8,
    end_hour: 16,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createEquipment.mutateAsync(formData);
      toast.success("Equipamento adicionado com sucesso!");
      setOpen(false);
      setFormData({
        name: "",
        plate: "",
        driver: "",
        helper: "",
        equipment_type: "pipa",
        start_hour: 8,
        end_hour: 16,
      });
    } catch (error) {
      toast.error("Erro ao adicionar equipamento");
    }
  };

  return (
    <Layout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
              <Construction className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Equipamentos em Operação
              </h1>
              <p className="text-muted-foreground mt-1">
                Acompanhe o status dos equipamentos em tempo real
              </p>
            </div>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Adicionar Equipamento
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Novo Equipamento</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Equipment Type Selection */}
                <div className="space-y-2">
                  <Label>Tipo de Equipamento</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {equipmentTypeOptions.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, equipment_type: type.value })}
                        className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                          formData.equipment_type === type.value
                            ? `border-primary ${type.color} text-white`
                            : "border-border bg-muted/50 text-muted-foreground hover:border-primary/50"
                        }`}
                      >
                        {type.icon}
                        <span className="text-xs font-medium text-center">{type.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Equipamento</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={`Ex: ${equipmentTypeLabels[formData.equipment_type]} 01`}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plate">Placa</Label>
                  <Input
                    id="plate"
                    value={formData.plate}
                    onChange={(e) => setFormData({ ...formData, plate: e.target.value.toUpperCase() })}
                    placeholder="Ex: ABC-1234"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="driver">Motorista</Label>
                  <Input
                    id="driver"
                    value={formData.driver}
                    onChange={(e) => setFormData({ ...formData, driver: e.target.value })}
                    placeholder="Nome do motorista"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="helper">Ajudante</Label>
                  <Input
                    id="helper"
                    value={formData.helper}
                    onChange={(e) => setFormData({ ...formData, helper: e.target.value })}
                    placeholder="Nome do ajudante"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_hour">Hora Início</Label>
                    <Input
                      id="start_hour"
                      type="number"
                      min={0}
                      max={23}
                      value={formData.start_hour}
                      onChange={(e) => setFormData({ ...formData, start_hour: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_hour">Hora Fim</Label>
                    <Input
                      id="end_hour"
                      type="number"
                      min={0}
                      max={23}
                      value={formData.end_hour}
                      onChange={(e) => setFormData({ ...formData, end_hour: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={createEquipment.isPending}>
                  {createEquipment.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar Equipamento"
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Equipment Grid */}
        <div className="grid gap-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : equipment && equipment.length > 0 ? (
            equipment.map((eq) => (
              <EquipmentTimeline key={eq.id} equipment={eq} />
            ))
          ) : (
            <div className="bg-muted/50 rounded-xl p-8 text-center">
              <Truck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Nenhum equipamento cadastrado
              </h3>
              <p className="text-muted-foreground mb-4">
                Adicione seu primeiro equipamento para começar a monitorar.
              </p>
              <Button onClick={() => setOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Adicionar Equipamento
              </Button>
            </div>
          )}
        </div>

        {/* Info Card */}
        <div className="bg-muted/50 rounded-xl p-4 flex items-start gap-3">
          <Truck className="w-5 h-5 text-primary mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Como funciona</p>
            <p>
              O equipamento se move ao longo da linha do tempo conforme o horário atual.
              A posição indica o progresso da operação diária. Clique no status para registrar paradas.
              Use o ícone de edição para alterar placa, motorista e ajudante.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Equipamentos;
