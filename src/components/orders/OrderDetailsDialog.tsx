import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Clock, Package, User, History, X, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Order, OrderStatus, useOrderHistory, useUpdateOrderStatus, useDeleteOrder } from "@/hooks/useOrders";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface OrderDetailsDialogProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string }> = {
  solicitado: { label: "Solicitado", color: "bg-yellow-500" },
  aprovado: { label: "Aprovado", color: "bg-blue-500" },
  a_caminho: { label: "A Caminho", color: "bg-purple-500" },
  entregue: { label: "Entregue", color: "bg-green-500" },
  cancelado: { label: "Cancelado", color: "bg-red-500" },
};

const UNIT_LABELS: Record<string, string> = {
  unidade: "Unidade(s)",
  centimetros: "Centímetros",
  metros: "Metros",
  quilos: "Quilos",
  litros: "Litros",
  pacotes: "Pacotes",
  caixas: "Caixas",
  pecas: "Peças",
};

const CARGO_LABELS: Record<string, string> = {
  aux_administrativo: "Aux. Administrativo",
  aux_almoxarifado: "Aux. Almoxarifado",
};

export function OrderDetailsDialog({ order, open, onOpenChange }: OrderDetailsDialogProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { toast } = useToast();
  const updateStatus = useUpdateOrderStatus();
  const deleteOrder = useDeleteOrder();
  const { data: history } = useOrderHistory(order?.id || "");

  if (!order) return null;

  const canChangeStatus = 
    user?.id === order.mentioned_user_id ||
    profile?.cargo === "aux_administrativo" ||
    profile?.cargo === "aux_almoxarifado";

  const canDelete = user?.id === order.requester_id && order.status === "solicitado";

  const handleStatusChange = async (newStatus: OrderStatus) => {
    try {
      await updateStatus.mutateAsync({ orderId: order.id, newStatus });
      toast({ title: "Status atualizado!" });
    } catch {
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteOrder.mutateAsync(order.id);
      toast({ title: "Pedido excluído!" });
      onOpenChange(false);
    } catch {
      toast({ title: "Erro ao excluir pedido", variant: "destructive" });
    }
  };

  const allImages = [
    ...(order.photo_urls || []),
    ...(order.ai_generated_image_url ? [order.ai_generated_image_url] : []),
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Detalhes do Pedido
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-6">
              {/* Product Info */}
              <div>
                <h3 className="text-xl font-bold">{order.product_name}</h3>
                {order.description && (
                  <p className="text-muted-foreground mt-1">{order.description}</p>
                )}
              </div>

              {/* Images */}
              {allImages.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Imagens</h4>
                  <div className="flex flex-wrap gap-2">
                    {allImages.map((url, index) => (
                      <div key={index} className="relative w-24 h-24">
                        <img
                          src={url}
                          alt={`Imagem ${index + 1}`}
                          className="w-full h-full object-cover rounded-md"
                        />
                        {url === order.ai_generated_image_url && (
                          <span className="absolute bottom-0 left-0 right-0 bg-primary/80 text-primary-foreground text-[10px] text-center py-0.5 rounded-b-md">
                            IA
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <span className="text-muted-foreground">Quantidade</span>
                  <p className="font-medium">
                    {order.quantity} {UNIT_LABELS[order.quantity_unit]}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground">Status</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${STATUS_CONFIG[order.status].color}`} />
                    <span className="font-medium">{STATUS_CONFIG[order.status].label}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <User className="w-3 h-3" /> Solicitante
                  </span>
                  <p className="font-medium">{order.requester_name}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Data da Solicitação
                  </span>
                  <p className="font-medium">
                    {format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                {order.expected_date && (
                  <div className="space-y-1">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Previsão de Entrega
                    </span>
                    <p className="font-medium">
                      {format(new Date(order.expected_date), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                )}
                {order.mentioned_cargo && (
                  <div className="space-y-1">
                    <span className="text-muted-foreground">Encaminhado para</span>
                    <p className="font-medium">{CARGO_LABELS[order.mentioned_cargo]}</p>
                  </div>
                )}
              </div>

              {/* Status Change */}
              {canChangeStatus && order.status !== "entregue" && order.status !== "cancelado" && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Alterar Status</h4>
                    <Select value={order.status} onValueChange={(v) => handleStatusChange(v as OrderStatus)}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solicitado">Solicitado</SelectItem>
                        <SelectItem value="aprovado">Aprovado</SelectItem>
                        <SelectItem value="a_caminho">A Caminho</SelectItem>
                        <SelectItem value="entregue">Entregue</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {/* History */}
              {history && history.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-1">
                      <History className="w-4 h-4" /> Histórico
                    </h4>
                    <div className="space-y-2">
                      {history.map((h) => (
                        <div key={h.id} className="text-sm border-l-2 border-muted pl-3 py-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{h.changed_by_name}</span>
                            <span className="text-muted-foreground">alterou para</span>
                            <Badge variant="outline">{STATUS_CONFIG[h.new_status].label}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(h.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Delete Button */}
              {canDelete && (
                <>
                  <Separator />
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir Pedido
                  </Button>
                </>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Pedido?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O pedido será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
