import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowDownCircle, ArrowUpCircle, Clock, History } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { EquipmentMovement } from "@/hooks/useEquipmentMovements";

const EXIT_REASON_LABELS: Record<string, string> = {
  manutencao_corretiva: "Manutenção Corretiva",
  manutencao_preventiva: "Manutenção Preventiva",
  vistoria: "Vistoria",
  operando: "Operando",
  aguardando_frente_servico: "Aguardando Frente de Serviço",
  fim_turno: "Fim de Turno",
};

interface Props {
  equipmentName: string;
  plate: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EquipmentMovementHistoryDialog({ equipmentName, plate, open, onOpenChange }: Props) {
  const { data: movements = [], isLoading } = useQuery({
    queryKey: ["equipment-movements-by-plate", plate],
    queryFn: async (): Promise<EquipmentMovement[]> => {
      const { data, error } = await supabase
        .from("equipment_movements")
        .select("*")
        .eq("plate", plate)
        .order("movement_date", { ascending: false })
        .order("movement_time", { ascending: false });

      if (error) throw error;
      return (data || []) as EquipmentMovement[];
    },
    enabled: open,
    staleTime: 0,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Histórico de Movimentações
          </DialogTitle>
        </DialogHeader>

        <div className="bg-muted/50 p-3 rounded-lg mb-4">
          <p className="font-medium">{equipmentName}</p>
          <p className="text-sm text-muted-foreground">Placa: <span className="font-semibold font-mono">{plate}</span></p>
          <p className="text-sm text-muted-foreground">Total de registros: <span className="font-semibold">{movements.length}</span></p>
        </div>

        <ScrollArea className="h-[400px] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">Carregando...</p>
            </div>
          ) : movements.length > 0 ? (
            <div className="space-y-3">
              {movements.map((m) => (
                <div key={m.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {m.movement_type === "entrada" ? (
                        <ArrowDownCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <ArrowUpCircle className="h-4 w-4 text-red-500" />
                      )}
                      <Badge
                        variant="outline"
                        className={
                          m.movement_type === "entrada"
                            ? "bg-green-500/10 text-green-600 border-green-500/30"
                            : "bg-red-500/10 text-red-600 border-red-500/30"
                        }
                      >
                        {m.movement_type === "entrada" ? "Entrada" : "Saída"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {format(new Date(m.movement_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                      {" "}
                      {m.movement_time}
                    </div>
                  </div>

                  {m.movement_type === "saida" && m.exit_reason && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Motivo:</span>{" "}
                      <span className="font-medium">{EXIT_REASON_LABELS[m.exit_reason] || m.exit_reason}</span>
                    </p>
                  )}

                  {m.problem_description && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Descrição:</span>{" "}
                      {m.problem_description}
                    </p>
                  )}

                  {m.observation && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Observação:</span>{" "}
                      {m.observation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">Nenhuma movimentação registrada</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
