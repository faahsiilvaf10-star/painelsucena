import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { EquipmentType } from "@/components/equipamentos/VehicleIcons";

export type StopReason = "none" | "maintenance" | "waiting" | "rain" | "end_of_shift" | "end_of_day";

export interface Equipment {
  id: string;
  name: string;
  plate: string;
  driver: string;
  helper: string;
  equipment_type: EquipmentType;
  start_hour: number;
  end_hour: number;
  stop_reason: StopReason;
  stop_start_time: string | null;
  created_at: string;
  updated_at: string;
}

export interface EquipmentStopHistory {
  id: string;
  equipment_id: string;
  stop_reason: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  defect_description: string | null;
  created_at: string;
}

export function useEquipment() {
  return useQuery({
    queryKey: ["equipment"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as Equipment[];
    },
  });
}

export function useUpdateEquipmentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      stop_reason,
      stop_start_time,
      previousStopReason,
      previousStopStartTime,
      defect_description,
    }: {
      id: string;
      stop_reason: StopReason;
      stop_start_time: string | null;
      previousStopReason?: StopReason;
      previousStopStartTime?: string | null;
      defect_description?: string | null;
    }) => {
      const now = new Date();

      // If there was a previous stop (not "none"), end it and log to history
      if (previousStopReason && previousStopReason !== "none" && previousStopStartTime) {
        const startedAt = new Date(previousStopStartTime);
        const durationMinutes = Math.floor((now.getTime() - startedAt.getTime()) / 60000);

        await supabase.from("equipment_stop_history").insert({
          equipment_id: id,
          stop_reason: previousStopReason,
          started_at: previousStopStartTime,
          ended_at: now.toISOString(),
          duration_minutes: durationMinutes,
        });
      }

      // If we're starting a new stop (not "none"), create a history entry marked as "in progress"
      if (stop_reason !== "none") {
        await supabase.from("equipment_stop_history").insert({
          equipment_id: id,
          stop_reason: stop_reason,
          started_at: stop_start_time || now.toISOString(),
          ended_at: null,
          duration_minutes: null,
          defect_description: stop_reason === "maintenance" ? defect_description : null,
        });
      }

      const { data, error } = await supabase
        .from("equipment")
        .update({ stop_reason, stop_start_time })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-stop-history"] });
    },
  });
}

export function useUpdateEquipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      plate?: string;
      driver?: string;
      helper?: string;
      name?: string;
    }) => {
      const { data, error } = await supabase
        .from("equipment")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
    },
  });
}

export function useCreateEquipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (equipment: Omit<Equipment, "id" | "created_at" | "updated_at" | "stop_reason" | "stop_start_time">) => {
      const { data, error } = await supabase
        .from("equipment")
        .insert(equipment)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
    },
  });
}

export function useDeleteEquipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("equipment")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
    },
  });
}

export function useEquipmentStopHistory(equipmentId?: string) {
  return useQuery({
    queryKey: ["equipment-stop-history", equipmentId],
    queryFn: async () => {
      let query = supabase
        .from("equipment_stop_history")
        .select("*")
        .order("started_at", { ascending: false });

      if (equipmentId) {
        query = query.eq("equipment_id", equipmentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as EquipmentStopHistory[];
    },
    enabled: !!equipmentId || equipmentId === undefined,
  });
}
