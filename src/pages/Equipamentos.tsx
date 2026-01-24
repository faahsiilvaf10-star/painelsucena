import Layout from "@/components/layout/Layout";
import { EquipmentTimeline } from "@/components/equipamentos/EquipmentTimeline";
import { Truck, Construction } from "lucide-react";

const Equipamentos = () => {
  return (
    <Layout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
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

        {/* Equipment Grid */}
        <div className="grid gap-6">
          <EquipmentTimeline 
            name="Caminhão Pipa 01" 
            plate="ABC-1234"
            driver="João Silva"
            helper="Carlos Santos"
            startHour={8} 
            endHour={16} 
          />
        </div>

        {/* Info Card */}
        <div className="bg-muted/50 rounded-xl p-4 flex items-start gap-3">
          <Truck className="w-5 h-5 text-primary mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Como funciona</p>
            <p>
              O equipamento se move ao longo da linha do tempo conforme o horário atual.
              A posição indica o progresso da operação diária entre 08:00 e 16:00.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Equipamentos;
