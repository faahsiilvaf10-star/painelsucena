import { useState } from "react";
import { Plus, Package, ClipboardList, History } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateOrderDialog } from "@/components/orders/CreateOrderDialog";
import { OrderCard } from "@/components/orders/OrderCard";
import { OrderDetailsDialog } from "@/components/orders/OrderDetailsDialog";
import { useOrders, useMyOrders, usePendingOrders, Order } from "@/hooks/useOrders";
import { useProfile } from "@/hooks/useProfile";

export default function Pedidos() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { data: profile } = useProfile();
  const { data: allOrders, isLoading: loadingAll } = useOrders();
  const { data: myOrders, isLoading: loadingMy } = useMyOrders();
  const { data: pendingOrders, isLoading: loadingPending } = usePendingOrders();

  const isResponsible = profile?.cargo === "aux_administrativo" || profile?.cargo === "aux_almoxarifado";

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
    setDetailsOpen(true);
  };

  const renderOrderList = (orders: Order[] | undefined, isLoading: boolean, emptyMessage: string) => {
    if (isLoading) {
      return (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      );
    }

    if (!orders || orders.length === 0) {
      return (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>{emptyMessage}</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-3">
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} onClick={() => handleOrderClick(order)} />
        ))}
      </div>
    );
  };

  return (
    <Layout>
      <div className="container mx-auto py-6 px-4 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="w-7 h-7 text-primary" />
              Pedidos
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie suas solicitações de materiais
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Pedido
          </Button>
        </div>

        <Tabs defaultValue="meus" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="meus" className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              <span className="hidden sm:inline">Meus Pedidos</span>
              <span className="sm:hidden">Meus</span>
            </TabsTrigger>
            <TabsTrigger value="pendentes" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">Pendentes</span>
              <span className="sm:hidden">Pend.</span>
            </TabsTrigger>
            <TabsTrigger value="historico" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">Histórico</span>
              <span className="sm:hidden">Hist.</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="meus" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Meus Pedidos</CardTitle>
              </CardHeader>
              <CardContent>
                {renderOrderList(myOrders, loadingMy, "Você ainda não fez nenhum pedido")}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pendentes" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Pedidos Pendentes</CardTitle>
              </CardHeader>
              <CardContent>
                {renderOrderList(
                  pendingOrders,
                  loadingPending,
                  isResponsible
                    ? "Nenhum pedido pendente para processar"
                    : "Nenhum pedido pendente"
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="historico" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Histórico Completo</CardTitle>
              </CardHeader>
              <CardContent>
                {renderOrderList(allOrders, loadingAll, "Nenhum pedido encontrado")}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <CreateOrderDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
      <OrderDetailsDialog order={selectedOrder} open={detailsOpen} onOpenChange={setDetailsOpen} />
    </Layout>
  );
}
