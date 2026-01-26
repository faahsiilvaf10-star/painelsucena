import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface VehicleInspection {
  id: string;
  placa: string;
  modelo_veiculo: string;
  numero_cracha: string;
  validade_cracha: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export function useVehicleInspections() {
  return useQuery({
    queryKey: ["vehicle-inspections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_inspections")
        .select("*")
        .order("placa", { ascending: true });

      if (error) throw error;
      return data as VehicleInspection[];
    },
  });
}

export function useCreateVehicleInspection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      inspection: Omit<VehicleInspection, "id" | "created_at" | "updated_at">
    ) => {
      const { data, error } = await supabase
        .from("vehicle_inspections")
        .insert(inspection)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-inspections"] });
    },
  });
}

export function useUpdateVehicleInspection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      placa?: string;
      modelo_veiculo?: string;
      numero_cracha?: string;
      validade_cracha?: string;
    }) => {
      const { data, error } = await supabase
        .from("vehicle_inspections")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-inspections"] });
    },
  });
}

export function useDeleteVehicleInspection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("vehicle_inspections")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-inspections"] });
    },
  });
}
