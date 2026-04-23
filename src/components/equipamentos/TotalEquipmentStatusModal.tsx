import { useState } from "react";
import { Truck, MapPin, ExternalLink, Info } from "lucide-react";
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
  const movementReasonMap: Record<string, { reason: string; obs: string | null }> = {};
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
      obs: m.observation
    };
  });

  // Combine lists
  const combinedEquipment = [
    ...equipment.map((eq) => {
      const isOut = movementReasonMap[eq.plate] && 
                   !["fim_turno", "operando", "aguardando_frente_servico"].includes(equipmentOut.find(m => m.plate === eq.plate)?.exit_reason || "");
      
      return {
        id: eq.id,
        name: eq.name,
        type: eq.equipment_type,
        status: isOut ? "Fora" : "Ativo",
        reason: isOut ? movementReasonMap[eq.plate]?.reason : "Em Operação / No Canteiro",
        category: "Pesado",
        plate: eq.plate
      };
    }),
    ...jardinagemEquipment.map((eq) => ({
      id: eq.id,
      name: eq.name,
      type: "jardinagem",
      status: eq.status === "entrou" ? "Ativo" : "Fora",
      reason: eq.status === "entrou" ? "No Canteiro" : "Saída Registrada",
      category: "Jardinagem",
      plate: "-"
    }))
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 bg-primary/5 hover:bg-primary/10 border-primary/20">
          <Info className="h-4 w-4 text-primary" />
          <span className="hidden sm:inline">Status Geral (17)</span>
          <span className="sm:hidden">Status (17)</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Truck className="h-6 w-6 text-primary" />
            Status dos 17 Equipamentos
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-green-50 border border-green-100">
                <p className="text-xs text-green-600 font-medium">Ativos</p>
                <p className="text-2xl font-bold text-green-700">
                  {combinedEquipment.filter(e => e.status === "Ativo").length}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-orange-50 border border-orange-100">
                <p className="text-xs text-orange-600 font-medium">Fora</p>
                <p className="text-2xl font-bold text-orange-700">
                  {combinedEquipment.filter(e => e.status === "Fora").length}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                <p className="text-xs text-blue-600 font-medium">Pesados</p>
                <p className="text-2xl font-bold text-blue-700">
                  {combinedEquipment.filter(e => e.category === "Pesado").length}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-purple-50 border border-purple-100">
                <p className="text-xs text-purple-600 font-medium">Jardinagem</p>
                <p className="text-2xl font-bold text-purple-700">
                  {combinedEquipment.filter(e => e.category === "Jardinagem").length}
                </p>
              </div>
            </div>

            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Equipamento</TableHead>
                    <TableHead className="hidden sm:table-cell">Categoria</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Motivo / Observação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {combinedEquipment.map((eq) => (
                    <TableRow key={eq.id} className="hover:bg-muted/30">
                      <TableCell>
                        {eq.category === "Pesado" ? (
                          <VehicleIcon
                            type={eq.type as any}
                            size="sm"
                          />
                        ) : (
                          <div className="p-1 rounded bg-purple-100 text-purple-600">
                            <Truck className="h-4 w-4" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{eq.name}</span>
                          {eq.plate !== "-" && <span className="text-[10px] font-mono text-muted-foreground">{eq.plate}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline" className="text-[10px] font-normal">
                          {eq.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={eq.status === "Ativo" ? "default" : "secondary"}
                          className={eq.status === "Ativo" 
                            ? "bg-green-500 hover:bg-green-600" 
                            : "bg-orange-500 hover:bg-orange-600 text-white"}
                        >
                          {eq.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {eq.reason}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
