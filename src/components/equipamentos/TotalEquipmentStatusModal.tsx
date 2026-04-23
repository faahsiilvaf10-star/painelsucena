import { Truck, Info, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEquipment } from "@/hooks/useEquipment";
import { useJardinagemEquipment } from "@/hooks/useJardinagemEquipment";
import { useEquipmentCurrentlyOut } from "@/hooks/useEquipmentMovements";
import { VehicleIcon } from "@/components/equipamentos/VehicleIcons";
import { Loader2 } from "lucide-react";

export function TotalEquipmentStatusModal() {
  const { data: equipment = [], isLoading: loadingEq } = useEquipment();
  const { data: jardinagemEquipment = [], isLoading: loadingJardinagem } = useJardinagemEquipment();
  const { data: equipmentOut = [], isLoading: loadingOut } = useEquipmentCurrentlyOut();

  const isLoading = loadingEq || loadingJardinagem || loadingOut;

  // Map to store movement reason for regular equipment
  const movementReasonMap: Record<string, { reason: string; obs: string | null; exit_reason: string | null }> = {};
  equipmentOut.forEach((m) => {
    const reasonLabels: Record<string, string> = {
      manutencao_corretiva: "Manutenção Corretiva",
      manutencao_preventiva: "Manutenção Preventiva",
      vistoria: "Vistoria",
      operando: "Operando",
      aguardando_frente_servico: "Aguardando Frente de Serviço",
      fim_turno: "Fim de Turno",
    };
    movementReasonMap[m.plate] = {
      reason: reasonLabels[m.exit_reason || ""] || "Saída Registrada",
      obs: m.observation,
      exit_reason: m.exit_reason
    };
  });

  // Combine lists
  const combinedEquipment = [
    ...equipment.map((eq) => {
      const mov = movementReasonMap[eq.plate];
      const isActuallyOut = mov && 
                   !["fim_turno", "operando", "aguardando_frente_servico"].includes(mov.exit_reason || "");
      
      return {
        id: eq.id,
        name: eq.name,
        type: eq.equipment_type,
        status: isActuallyOut ? "Fora" : "Ativo",
        reason: isActuallyOut ? mov.reason : "No Canteiro",
        category: "Frota Pesada",
        plate: eq.plate
      };
    }),
    ...jardinagemEquipment.map((eq) => ({
      id: eq.id,
      name: eq.name,
      type: "jardinagem",
      status: eq.status === "entrou" ? "Ativo" : "Fora",
      reason: eq.status === "entrou" ? "No Canteiro" : "Trabalho Externo / Saída",
      category: "Jardinagem",
      plate: "-"
    }))
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 bg-primary/10 hover:bg-primary/20 border-primary/30 transition-all">
          <Info className="h-4 w-4 text-primary" />
          <span className="font-semibold">Status 17 Equipamentos</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <div className="p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
              <Truck className="h-7 w-7 text-primary" />
              Status Geral dos 17 Equipamentos
            </DialogTitle>
            <p className="text-muted-foreground">Visão consolidada de toda a frota e equipamentos de jardinagem</p>
          </DialogHeader>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-6 mt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex flex-col items-center">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mb-1" />
                  <p className="text-xs text-green-600 font-medium uppercase tracking-wider">Ativos</p>
                  <p className="text-3xl font-bold text-green-700">
                    {combinedEquipment.filter(e => e.status === "Ativo").length}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 flex flex-col items-center">
                  <AlertCircle className="h-5 w-5 text-orange-600 mb-1" />
                  <p className="text-xs text-orange-600 font-medium uppercase tracking-wider">Fora / Parados</p>
                  <p className="text-3xl font-bold text-orange-700">
                    {combinedEquipment.filter(e => e.status === "Fora").length}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex flex-col items-center">
                  <Truck className="h-5 w-5 text-primary mb-1" />
                  <p className="text-xs text-primary font-medium uppercase tracking-wider">Frota Pesada</p>
                  <p className="text-3xl font-bold text-primary">
                    {combinedEquipment.filter(e => e.category === "Frota Pesada").length}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 flex flex-col items-center">
                  <Info className="h-5 w-5 text-purple-600 mb-1" />
                  <p className="text-xs text-purple-600 font-medium uppercase tracking-wider">Jardinagem</p>
                  <p className="text-3xl font-bold text-purple-700">
                    {combinedEquipment.filter(e => e.category === "Jardinagem").length}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border overflow-hidden bg-card">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead className="font-semibold text-foreground">Equipamento</TableHead>
                        <TableHead className="hidden sm:table-cell font-semibold text-foreground">Categoria</TableHead>
                        <TableHead className="font-semibold text-foreground text-center">Status</TableHead>
                        <TableHead className="font-semibold text-foreground">Motivo / Local</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {combinedEquipment.map((eq) => (
                        <TableRow key={eq.id} className="hover:bg-muted/20 border-border/50">
                          <TableCell className="py-4">
                            {eq.category === "Frota Pesada" ? (
                              <div className="p-1.5 rounded-lg bg-primary/5">
                                <VehicleIcon
                                  type={eq.type as any}
                                  size="sm"
                                />
                              </div>
                            ) : (
                              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600">
                                <Info className="h-4 w-4" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex flex-col">
                              <span className="font-semibold text-sm">{eq.name}</span>
                              {eq.plate !== "-" && (
                                <span className="text-[11px] font-mono text-muted-foreground mt-0.5">
                                  PLACA: {eq.plate}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell py-4">
                            <Badge variant="outline" className="text-[10px] font-medium border-border/50 bg-muted/30">
                              {eq.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4 text-center">
                            <Badge
                              className={eq.status === "Ativo" 
                                ? "bg-green-500 hover:bg-green-600 text-white border-none shadow-sm px-3" 
                                : "bg-orange-500 hover:bg-orange-600 text-white border-none shadow-sm px-3"}
                            >
                              {eq.status === "Ativo" ? "ATIVO" : "FORA"}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4 text-xs font-medium text-muted-foreground italic">
                            {eq.reason}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
