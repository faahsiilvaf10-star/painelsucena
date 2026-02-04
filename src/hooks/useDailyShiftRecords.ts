import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export interface RefuelingPoint {
  point: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
}

export interface StatusHistoryEntry {
  status: string;
  timestamp: string;
  changed_by: string | null;
}

export interface DailyShiftRecord {
  id: string;
  equipment_id: string;
  equipment_name: string;
  plate: string;
  shift_date: string;
  driver_name: string;
  helper_name: string | null;
  initial_horimeter: number | null;
  initial_km: number | null;
  initial_fuel_level: string | null;
  shift_start_time: string | null;
  final_horimeter: number | null;
  final_km: number | null;
  final_fuel_level: string | null;
  shift_end_time: string | null;
  refueling_points: RefuelingPoint[];
  status_history: StatusHistoryEntry[];
  created_at: string;
  updated_at: string;
}

export interface CreateShiftRecordData {
  equipment_id: string;
  equipment_name: string;
  plate: string;
  driver_name: string;
  helper_name?: string;
  initial_horimeter?: number;
  initial_km?: number;
  initial_fuel_level?: string;
}

export interface UpdateShiftRecordData {
  id?: string;
  equipment_id?: string;
  shift_date?: string;
  final_horimeter?: number;
  final_km?: number;
  final_fuel_level?: string;
  shift_end_time?: string;
  refueling_points?: RefuelingPoint[];
  status_history?: StatusHistoryEntry[];
}

// Helper to parse JSON data safely
const parseShiftRecord = (data: any): DailyShiftRecord => {
  return {
    ...data,
    refueling_points: Array.isArray(data.refueling_points) ? data.refueling_points : [],
    status_history: Array.isArray(data.status_history) ? data.status_history : [],
  };
};

// Get all daily shift records
export function useDailyShiftRecords(date?: string) {
  return useQuery({
    queryKey: ["daily-shift-records", date],
    queryFn: async () => {
      let query = supabase
        .from("daily_shift_records")
        .select("*")
        .order("shift_date", { ascending: false });

      if (date) {
        query = query.eq("shift_date", date);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(parseShiftRecord);
    },
  });
}

// Get a specific shift record by equipment and date
export function useShiftRecordByEquipment(equipmentId: string | null, date?: string) {
  const today = date || new Date().toISOString().split("T")[0];
  
  return useQuery({
    queryKey: ["daily-shift-record", equipmentId, today],
    queryFn: async () => {
      if (!equipmentId) return null;
      
      const { data, error } = await supabase
        .from("daily_shift_records")
        .select("*")
        .eq("equipment_id", equipmentId)
        .eq("shift_date", today)
        .maybeSingle();

      if (error) throw error;
      return data ? parseShiftRecord(data) : null;
    },
    enabled: !!equipmentId,
  });
}

// Create or update shift record when starting shift
export function useCreateShiftRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateShiftRecordData) => {
      const today = new Date().toISOString().split("T")[0];
      const now = new Date().toISOString();

      const statusHistory: Json = [
        {
          status: "operando",
          timestamp: now,
          changed_by: data.driver_name,
        },
      ];

      // Try to upsert (insert or update on conflict)
      const { data: result, error } = await supabase
        .from("daily_shift_records")
        .upsert(
          {
            equipment_id: data.equipment_id,
            equipment_name: data.equipment_name,
            plate: data.plate,
            shift_date: today,
            driver_name: data.driver_name,
            helper_name: data.helper_name || null,
            initial_horimeter: data.initial_horimeter || null,
            initial_km: data.initial_km || null,
            initial_fuel_level: data.initial_fuel_level || null,
            shift_start_time: now,
            status_history: statusHistory,
          },
          {
            onConflict: "equipment_id,shift_date",
          }
        )
        .select()
        .single();

      if (error) throw error;
      return parseShiftRecord(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-shift-records"] });
      queryClient.invalidateQueries({ queryKey: ["daily-shift-record"] });
    },
    onError: (error) => {
      console.error("Error creating shift record:", error);
      toast.error("Erro ao registrar início de turno");
    },
  });
}

// Update shift record (for status changes, end of shift, etc.)
export function useUpdateShiftRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateShiftRecordData) => {
      const { id, equipment_id, shift_date, refueling_points, status_history, ...rest } = data;
      
      const updateData: Record<string, any> = { ...rest };
      if (refueling_points) {
        updateData.refueling_points = refueling_points as unknown as Json;
      }
      if (status_history) {
        updateData.status_history = status_history as unknown as Json;
      }
      
      let query;
      
      if (id) {
        query = supabase
          .from("daily_shift_records")
          .update(updateData)
          .eq("id", id);
      } else if (equipment_id && shift_date) {
        query = supabase
          .from("daily_shift_records")
          .update(updateData)
          .eq("equipment_id", equipment_id)
          .eq("shift_date", shift_date);
      } else {
        throw new Error("Either id or equipment_id with shift_date is required");
      }

      const { data: result, error } = await query.select().single();
      if (error) throw error;
      return parseShiftRecord(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-shift-records"] });
      queryClient.invalidateQueries({ queryKey: ["daily-shift-record"] });
    },
    onError: (error) => {
      console.error("Error updating shift record:", error);
    },
  });
}

// Add status change to history
export function useAddStatusToHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      equipmentId,
      status,
      changedBy,
    }: {
      equipmentId: string;
      status: string;
      changedBy: string | null;
    }) => {
      const today = new Date().toISOString().split("T")[0];
      const now = new Date().toISOString();

      // First get the current record
      const { data: current, error: fetchError } = await supabase
        .from("daily_shift_records")
        .select("status_history")
        .eq("equipment_id", equipmentId)
        .eq("shift_date", today)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!current) return null; // No record for today

      const currentHistory = Array.isArray(current.status_history) 
        ? (current.status_history as unknown as StatusHistoryEntry[])
        : [];
      
      const newEntry = {
        status,
        timestamp: now,
        changed_by: changedBy,
      };
      
      const newHistory = [...currentHistory, newEntry] as unknown as Json;

      const { data: result, error } = await supabase
        .from("daily_shift_records")
        .update({ status_history: newHistory })
        .eq("equipment_id", equipmentId)
        .eq("shift_date", today)
        .select()
        .single();

      if (error) throw error;
      return parseShiftRecord(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-shift-records"] });
      queryClient.invalidateQueries({ queryKey: ["daily-shift-record"] });
    },
  });
}

// Add refueling point
export function useAddRefuelingPoint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      equipmentId,
      point,
      action,
    }: {
      equipmentId: string;
      point: string;
      action: "start" | "end";
    }) => {
      const today = new Date().toISOString().split("T")[0];
      const now = new Date().toISOString();

      // First get the current record
      const { data: current, error: fetchError } = await supabase
        .from("daily_shift_records")
        .select("refueling_points")
        .eq("equipment_id", equipmentId)
        .eq("shift_date", today)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!current) return null;

      let refuelingPoints: RefuelingPoint[] = Array.isArray(current.refueling_points) 
        ? (current.refueling_points as unknown as RefuelingPoint[])
        : [];

      if (action === "start") {
        refuelingPoints.push({
          point,
          started_at: now,
          ended_at: null,
          duration_minutes: null,
        });
      } else {
        // Find the last open refueling at this point and close it
        const lastOpenIndex = refuelingPoints.findIndex(
          (r) => r.point === point && r.ended_at === null
        );
        if (lastOpenIndex !== -1) {
          const startTime = new Date(refuelingPoints[lastOpenIndex].started_at);
          const endTime = new Date(now);
          const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
          
          refuelingPoints[lastOpenIndex] = {
            ...refuelingPoints[lastOpenIndex],
            ended_at: now,
            duration_minutes: durationMinutes,
          };
        }
      }

      const { data: result, error } = await supabase
        .from("daily_shift_records")
        .update({ refueling_points: refuelingPoints as unknown as Json })
        .eq("equipment_id", equipmentId)
        .eq("shift_date", today)
        .select()
        .single();

      if (error) throw error;
      return parseShiftRecord(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-shift-records"] });
      queryClient.invalidateQueries({ queryKey: ["daily-shift-record"] });
    },
  });
}
