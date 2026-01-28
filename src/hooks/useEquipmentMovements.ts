import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { getBrazilNorthTodayString } from "@/lib/timezone";
import { startOfMonth, endOfMonth, format } from "date-fns";

export type MovementType = "entrada" | "saida";
export type ExitReason = "manutencao_corretiva" | "manutencao_preventiva" | "vistoria";

export interface EquipmentMovement {
  id: string;
  equipment_name: string;
  plate: string;
  movement_type: MovementType;
  movement_date: string;
  movement_time: string;
  exit_reason: ExitReason | null;
  problem_description: string | null;
  observation: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface EquipmentMovementInsert {
  equipment_name: string;
  plate: string;
  movement_type: MovementType;
  movement_date?: string;
  movement_time?: string;
  exit_reason?: ExitReason | null;
  problem_description?: string | null;
  observation?: string | null;
}

export function useEquipmentMovements(date?: string) {
  const targetDate = date || getBrazilNorthTodayString();

  return useQuery({
    queryKey: ["equipment-movements", targetDate],
    queryFn: async (): Promise<EquipmentMovement[]> => {
      const { data, error } = await supabase
        .from("equipment_movements")
        .select("*")
        .eq("movement_date", targetDate)
        .order("movement_time", { ascending: false });

      if (error) throw error;
      return (data || []) as EquipmentMovement[];
    },
    staleTime: 0,
    refetchOnMount: "always",
  });
}

export function useAllEquipmentMovements() {
  return useQuery({
    queryKey: ["equipment-movements-all"],
    queryFn: async (): Promise<EquipmentMovement[]> => {
      const { data, error } = await supabase
        .from("equipment_movements")
        .select("*")
        .order("movement_date", { ascending: false })
        .order("movement_time", { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data || []) as EquipmentMovement[];
    },
    staleTime: 0,
    refetchOnMount: "always",
  });
}

// Get all entries ever recorded
export function useAllEntries() {
  return useQuery({
    queryKey: ["equipment-movements-all-entries"],
    queryFn: async (): Promise<EquipmentMovement[]> => {
      const { data, error } = await supabase
        .from("equipment_movements")
        .select("*")
        .eq("movement_type", "entrada")
        .order("movement_date", { ascending: false })
        .order("movement_time", { ascending: false });

      if (error) throw error;
      return (data || []) as EquipmentMovement[];
    },
    staleTime: 0,
    refetchOnMount: "always",
    gcTime: 0, // Don't cache
  });
}

// Get equipment currently out (saida without a subsequent entrada)
export function useEquipmentCurrentlyOut() {
  return useQuery({
    queryKey: ["equipment-movements-currently-out"],
    queryFn: async () => {
      // Get all movements ordered by date and time
      const { data, error } = await supabase
        .from("equipment_movements")
        .select("*")
        .order("movement_date", { ascending: true })
        .order("movement_time", { ascending: true });

      if (error) throw error;

      const movements = (data || []) as EquipmentMovement[];
      
      // Track last movement per equipment (by plate)
      const lastMovementByPlate: Record<string, EquipmentMovement> = {};
      
      movements.forEach((m) => {
        lastMovementByPlate[m.plate] = m;
      });
      
      // Filter only those whose last movement was "saida"
      const currentlyOut = Object.values(lastMovementByPlate).filter(
        (m) => m.movement_type === "saida"
      );
      
      // Sort by exit date (most recent first)
      return currentlyOut.sort((a, b) => {
        const dateCompare = b.movement_date.localeCompare(a.movement_date);
        if (dateCompare !== 0) return dateCompare;
        return b.movement_time.localeCompare(a.movement_time);
      });
    },
    staleTime: 0,
    refetchOnMount: "always",
    gcTime: 0, // Don't cache
  });
}

export function useCreateEquipmentMovement() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (movement: EquipmentMovementInsert) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("equipment_movements")
        .insert({
          ...movement,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment-movements"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-movements-all"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-movements-all-entries"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-movements-currently-out"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-movements-weekly"] });
      toast.success("Movimento registrado com sucesso!");
    },
    onError: (error) => {
      console.error("Error creating movement:", error);
      toast.error("Erro ao registrar movimento");
    },
  });
}

export function useDeleteEquipmentMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("equipment_movements")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment-movements"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-movements-all"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-movements-all-entries"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-movements-currently-out"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-movements-weekly"] });
      toast.success("Movimento excluído!");
    },
    onError: (error) => {
      console.error("Error deleting movement:", error);
      toast.error("Erro ao excluir movimento");
    },
  });
}

export function useTodayMovementsSummary() {
  const today = getBrazilNorthTodayString();

  return useQuery({
    queryKey: ["equipment-movements-summary", today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment_movements")
        .select("movement_type")
        .eq("movement_date", today);

      if (error) throw error;

      const movements = data || [];
      const entradas = movements.filter((m) => m.movement_type === "entrada").length;
      const saidas = movements.filter((m) => m.movement_type === "saida").length;

      return {
        entradas,
        saidas,
        noCanteiro: entradas - saidas,
      };
    },
  });
}

export function useWeeklyEquipmentMovements(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["equipment-movements-weekly", startDate, endDate],
    queryFn: async (): Promise<EquipmentMovement[]> => {
      const { data, error } = await supabase
        .from("equipment_movements")
        .select("*")
        .gte("movement_date", startDate)
        .lte("movement_date", endDate)
        .order("movement_date", { ascending: false })
        .order("movement_time", { ascending: false });

      if (error) throw error;
      return (data || []) as EquipmentMovement[];
    },
    enabled: !!startDate && !!endDate,
  });
}
