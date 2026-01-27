import Layout from "@/components/layout/Layout";
import { EquipmentTimeline } from "@/components/equipamentos/EquipmentTimeline";
import { EquipmentReport } from "@/components/equipamentos/EquipmentReport";
import { PreviousDaySummary } from "@/components/equipamentos/PreviousDaySummary";
import { ExportWeeklyHistoryButton } from "@/components/equipamentos/ExportWeeklyHistoryButton";
import { EquipmentOperationChart } from "@/components/equipamentos/EquipmentOperationChart";
import { Truck, Plus, Loader2, Droplets, Container, Car, StopCircle, Activity } from "lucide-react";
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
import { EquipmentType } from "@/components/equipamentos/VehicleIcons";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const equipmentTypeOptions: { value: EquipmentType; label: string; icon: React.ReactNode }[] = [
  { value: "pipa", label: "Pipa", icon: <Droplets className="w-5 h-5" /> },
  { value: "munk", label: "Munk", icon: <Container className="w-5 h-5" /> },
  { value: "camionete", label: "Camionete", icon: <Car className="w-5 h-5" /> },
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

  const operatingCount = equipment?.filter(eq => eq.stop_reason === "none" || !eq.stop_reason).length || 0;
  const stoppedCount = equipment?.filter(eq => eq.stop_reason && eq.stop_reason !== "none").length || 0;

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
      <div className="space-y-4 sm:space-y-6 px-4 sm:px-6 py-4 sm:py-6 animate-fade-in">
        {/* Previous Day Summary (Morning only) */}
        <PreviousDaySummary />

        {/* Minimal Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-2.5 rounded-xl bg-primary/10 shrink-0">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">Equipamentos</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">Monitoramento em tempo real</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {equipment && equipment.length > 0 && (
              <ExportWeeklyHistoryButton equipment={equipment} />
            )}
            
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground hover:text-foreground"
              onClick={handleAutoStopAll}
              disabled={isStoppingAll}
            >
              {isStoppingAll ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <StopCircle className="w-4 h-4" />
              )}
              <span className="ml-2 hidden sm:inline">Encerrar Todos</span>
            </Button>
            
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2 shadow-sm">
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Novo</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-lg font-medium">Novo Equipamento</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-5 pt-2">
                  {/* Equipment Type Selection */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tipo</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {equipmentTypeOptions.map((type) => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, equipment_type: type.value })}
                          className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                            formData.equipment_type === type.value
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {type.icon}
                          <span className="text-xs font-medium">{type.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Name and Plate */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nome</Label>
                      <Input 
                        id="name" 
                        value={formData.name} 
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                        placeholder="Pipa 01" 
                        className="h-11"
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="plate" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Placa</Label>
                      <Input 
                        id="plate" 
                        value={formData.plate} 
                        onChange={(e) => setFormData({ ...formData, plate: e.target.value.toUpperCase() })} 
                        placeholder="ABC-1234" 
                        className="h-11"
                        required 
                      />
                    </div>
                  </div>

                  {/* Driver and Helper */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="driver" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Motorista</Label>
                      <Input 
                        id="driver" 
                        value={formData.driver} 
                        onChange={(e) => setFormData({ ...formData, driver: e.target.value })} 
                        className="h-11"
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="helper" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ajudante</Label>
                      <Input 
                        id="helper" 
                        value={formData.helper} 
                        onChange={(e) => setFormData({ ...formData, helper: e.target.value })} 
                        className="h-11"
                      />
                    </div>
                  </div>

                  {/* Hours */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Início (h)</Label>
                      <Input 
                        type="number" 
                        min={0} 
                        max={23} 
                        value={formData.start_hour} 
                        onChange={(e) => setFormData({ ...formData, start_hour: parseInt(e.target.value) })} 
                        className="h-11"
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Fim (h)</Label>
                      <Input 
                        type="number" 
                        min={0} 
                        max={23} 
                        value={formData.end_hour} 
                        onChange={(e) => setFormData({ ...formData, end_hour: parseInt(e.target.value) })} 
                        className="h-11"
                        required 
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full h-11" disabled={createEquipment.isPending}>
                    {createEquipment.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Adicionar Equipamento"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Summary */}
        {equipment && equipment.length > 0 && (
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{operatingCount}</span> operando
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{stoppedCount}</span> parado
              </span>
            </div>
            <div className="h-4 w-px bg-border" />
            <span className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{equipment.length}</span> total
            </span>
          </div>
        )}

        {/* Equipment List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
                <span className="text-sm text-muted-foreground">Carregando...</span>
              </div>
            </div>
          ) : equipment && equipment.length > 0 ? (
            equipment.map((eq) => <EquipmentTimeline key={eq.id} equipment={eq} />)
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="p-4 rounded-2xl bg-muted/50 mb-4">
                <Truck className="w-10 h-10 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">Nenhum equipamento</h3>
              <p className="text-sm text-muted-foreground text-center mb-4">
                Adicione seu primeiro equipamento para começar o monitoramento
              </p>
              <Button onClick={() => setOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" /> Adicionar Equipamento
              </Button>
            </div>
          )}
        </div>

        {/* Operation Chart */}
        {equipment && equipment.length > 0 && <EquipmentOperationChart />}

        {/* Report Section */}
        {equipment && equipment.length > 0 && <EquipmentReport />}
      </div>
    </Layout>
  );
};

export default Equipamentos;
