import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type OrderStatus = 'solicitado' | 'aprovado' | 'a_caminho' | 'entregue' | 'cancelado';
export type QuantityUnit = 'unidade' | 'centimetros' | 'metros' | 'quilos' | 'litros' | 'pacotes' | 'caixas' | 'pecas' | 'par' | 'rolo' | 'saco' | 'galao' | 'balde' | 'metro_quadrado' | 'metro_cubico';

export interface Order {
  id: string;
  order_number: string;
  requester_id: string;
  requester_name: string;
  product_name: string;
  description: string | null;
  quantity: number;
  quantity_unit: QuantityUnit;
  expected_date: string | null;
  status: OrderStatus;
  photo_urls: string[];
  ai_generated_image_url: string | null;
  mentioned_user_id: string | null;
  mentioned_cargo: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderHistory {
  id: string;
  order_id: string;
  previous_status: OrderStatus | null;
  new_status: OrderStatus;
  changed_by: string;
  changed_by_name: string;
  notes: string | null;
  created_at: string;
}

export interface CreateOrderData {
  product_name: string;
  description?: string;
  quantity: number;
  quantity_unit: QuantityUnit;
  expected_date?: string;
  photo_urls?: string[];
  ai_generated_image_url?: string;
  mentioned_user_id?: string;
  mentioned_cargo?: string;
}

export const useOrders = () => {
  return useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Order[];
    },
  });
};

export const useMyOrders = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["my-orders", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("requester_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Order[];
    },
    enabled: !!user?.id,
  });
};

export const usePendingOrders = () => {
  return useQuery({
    queryKey: ["pending-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .in("status", ["solicitado", "aprovado", "a_caminho"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Order[];
    },
  });
};

export const useOrderHistory = (orderId: string) => {
  return useQuery({
    queryKey: ["order-history", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_history")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as OrderHistory[];
    },
    enabled: !!orderId,
  });
};

export const useCreateOrder = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (orderData: CreateOrderData) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      // Get user's profile for name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .single();

      const { data, error } = await supabase
        .from("orders")
        .insert({
          ...orderData,
          requester_id: user.id,
          requester_name: profile?.full_name || "Usuário",
        })
        .select()
        .single();

      if (error) throw error;

      // Create notification for mentioned user
      if (orderData.mentioned_user_id) {
        await supabase.from("notifications").insert({
          user_id: orderData.mentioned_user_id,
          title: "📦 Novo Pedido - Aguardando Solicitação",
          message: `${profile?.full_name || "Alguém"} fez um pedido de ${orderData.quantity} ${orderData.quantity_unit === "unidade" ? "unidade(s)" : orderData.quantity_unit} de "${orderData.product_name}" e está aguardando sua análise.`,
          type: "order",
          reference_id: data.id,
          reference_type: "order",
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      queryClient.invalidateQueries({ queryKey: ["pending-orders"] });
    },
  });
};

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      orderId,
      newStatus,
      notes,
    }: {
      orderId: string;
      newStatus: OrderStatus;
      notes?: string;
    }) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      // Get current order
      const { data: currentOrder } = await supabase
        .from("orders")
        .select("status, requester_id")
        .eq("id", orderId)
        .single();

      // Get user's profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .single();

      // Update order status
      const { data, error } = await supabase
        .from("orders")
        .update({ status: newStatus, notes })
        .eq("id", orderId)
        .select()
        .single();

      if (error) throw error;

      // Create history entry
      await supabase.from("order_history").insert({
        order_id: orderId,
        previous_status: currentOrder?.status,
        new_status: newStatus,
        changed_by: user.id,
        changed_by_name: profile?.full_name || "Usuário",
        notes,
      });

      // Notify requester of status change
      if (currentOrder?.requester_id && currentOrder.requester_id !== user.id) {
        const statusLabels: Record<OrderStatus, string> = {
          solicitado: "Solicitado",
          aprovado: "Aprovado ✅",
          a_caminho: "A Caminho 🚚",
          entregue: "Entregue 📬",
          cancelado: "Cancelado ❌",
        };

        await supabase.from("notifications").insert({
          user_id: currentOrder.requester_id,
          title: "📦 Atualização de Pedido",
          message: `Seu pedido foi atualizado para: ${statusLabels[newStatus]}`,
          type: "order",
          reference_id: orderId,
          reference_type: "order",
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      queryClient.invalidateQueries({ queryKey: ["pending-orders"] });
      queryClient.invalidateQueries({ queryKey: ["order-history"] });
    },
  });
};

export const useUpdateOrderQuantity = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      orderId,
      newQuantity,
      newUnit,
      notes,
    }: {
      orderId: string;
      newQuantity: number;
      newUnit?: QuantityUnit;
      notes?: string;
    }) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      // Get current order
      const { data: currentOrder } = await supabase
        .from("orders")
        .select("quantity, quantity_unit, requester_id")
        .eq("id", orderId)
        .single();

      if (!currentOrder) throw new Error("Pedido não encontrado");

      // Get user's profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .single();

      const updateData: { quantity: number; quantity_unit?: QuantityUnit } = {
        quantity: newQuantity,
      };
      if (newUnit) updateData.quantity_unit = newUnit;

      // Update order quantity
      const { data, error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", orderId)
        .select()
        .single();

      if (error) throw error;

      // Create history entry for quantity change
      await supabase.from("order_history").insert({
        order_id: orderId,
        previous_status: null,
        new_status: "solicitado", // Required field, use current status
        changed_by: user.id,
        changed_by_name: profile?.full_name || "Usuário",
        notes: notes || `Quantidade alterada de ${currentOrder.quantity} para ${newQuantity}`,
        previous_quantity: currentOrder.quantity,
        new_quantity: newQuantity,
        previous_unit: currentOrder.quantity_unit,
        new_unit: newUnit || currentOrder.quantity_unit,
        change_type: "quantity",
      });

      // Notify requester
      if (currentOrder.requester_id !== user.id) {
        await supabase.from("notifications").insert({
          user_id: currentOrder.requester_id,
          title: "📦 Quantidade Alterada",
          message: `A quantidade do seu pedido foi alterada de ${currentOrder.quantity} para ${newQuantity}`,
          type: "order",
          reference_id: orderId,
          reference_type: "order",
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      queryClient.invalidateQueries({ queryKey: ["pending-orders"] });
      queryClient.invalidateQueries({ queryKey: ["order-history"] });
    },
  });
};

export const useDeleteOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      queryClient.invalidateQueries({ queryKey: ["pending-orders"] });
    },
  });
};

export const uploadOrderPhoto = async (file: File): Promise<string> => {
  const fileExt = file.name.split(".").pop();
  const fileName = `${crypto.randomUUID()}.${fileExt}`;

  const { error } = await supabase.storage
    .from("order-photos")
    .upload(fileName, file);

  if (error) throw error;

  const { data } = supabase.storage
    .from("order-photos")
    .getPublicUrl(fileName);

  return data.publicUrl;
};
