import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export interface MaintenancePlanEquipment {
  id: string;
  equipment_id: string;
  plate: string;
  equipment_name: string;
  base_horimeter: number;
  target_hours: number;
  last_maintenance_date: string | null;
  last_maintenance_horimeter: number | null;
  created_at: string;
  updated_at: string;
  // Computed fields
  current_horimeter: number | null;
  hours_used: number;
  hours_remaining: number;
  estimated_maintenance_date: Date | null;
  days_until_maintenance: number | null;
  avg_hours_per_day: number;
  status: "ok" | "warning" | "critical";
}

interface DailyShiftRecord {
  equipment_id: string;
  shift_date: string;
  initial_horimeter: number | null;
  final_horimeter: number | null;
}

export function useMaintenancePlan() {
  const queryClient = useQueryClient();

  // Fetch all equipment
  const { data: equipment } = useQuery({
    queryKey: ["equipment-for-maintenance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment")
        .select("id, name, plate, equipment_type")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch maintenance plan records
  const { data: maintenancePlans, isLoading: isLoadingPlans } = useQuery({
    queryKey: ["maintenance-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment_maintenance_plan")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  // Fetch daily shift records for horimeter data (last 30 days for average calculation)
  const { data: shiftRecords } = useQuery({
    queryKey: ["shift-records-for-maintenance"],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data, error } = await supabase
        .from("daily_shift_records")
        .select("equipment_id, shift_date, initial_horimeter, final_horimeter")
        .gte("shift_date", thirtyDaysAgo.toISOString().split("T")[0])
        .order("shift_date", { ascending: false });
      if (error) throw error;
      return data as DailyShiftRecord[];
    },
  });

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel("maintenance-plan-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "equipment_maintenance_plan" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["maintenance-plans"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "equipment_stop_history" },
        (payload) => {
          // Check if this is a preventive maintenance completion
          const newRecord = payload.new as { stop_reason?: string; ended_at?: string } | undefined;
          if (
            payload.eventType === "UPDATE" &&
            newRecord?.stop_reason === "manutencao_preventiva" &&
            newRecord?.ended_at
          ) {
            queryClient.invalidateQueries({ queryKey: ["maintenance-plans"] });
            queryClient.invalidateQueries({ queryKey: ["shift-records-for-maintenance"] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Calculate maintenance status for each equipment
  const maintenanceData: MaintenancePlanEquipment[] = (equipment || []).map((eq) => {
    const plan = maintenancePlans?.find((p) => p.equipment_id === eq.id);
    const equipmentShifts = (shiftRecords || []).filter((s) => s.equipment_id === eq.id);
    
    // Get latest horimeter reading
    const latestShift = equipmentShifts.find((s) => s.final_horimeter != null || s.initial_horimeter != null);
    const currentHorimeter = latestShift?.final_horimeter ?? latestShift?.initial_horimeter ?? null;
    
    // Calculate base horimeter (from plan or first record)
    const baseHorimeter = plan?.base_horimeter ?? 0;
    const targetHours = plan?.target_hours ?? 700;
    
    // Hours used since base
    const hoursUsed = currentHorimeter != null ? Math.max(0, currentHorimeter - baseHorimeter) : 0;
    const hoursRemaining = Math.max(0, targetHours - hoursUsed);
    
    // Calculate average hours per day from shift records
    let avgHoursPerDay = 0;
    if (equipmentShifts.length >= 2) {
      const shiftsWithHorimeter = equipmentShifts
        .filter((s) => s.initial_horimeter != null && s.final_horimeter != null)
        .slice(0, 14); // Last 14 days with data
      
      if (shiftsWithHorimeter.length >= 2) {
        const totalHours = shiftsWithHorimeter.reduce((sum, s) => {
          return sum + ((s.final_horimeter ?? 0) - (s.initial_horimeter ?? 0));
        }, 0);
        avgHoursPerDay = totalHours / shiftsWithHorimeter.length;
      }
    }
    
    // Estimate maintenance date
    let estimatedMaintenanceDate: Date | null = null;
    let daysUntilMaintenance: number | null = null;
    
    if (avgHoursPerDay > 0 && hoursRemaining > 0) {
      const daysNeeded = Math.ceil(hoursRemaining / avgHoursPerDay);
      estimatedMaintenanceDate = new Date();
      estimatedMaintenanceDate.setDate(estimatedMaintenanceDate.getDate() + daysNeeded);
      daysUntilMaintenance = daysNeeded;
    }
    
    // Determine status
    let status: "ok" | "warning" | "critical" = "ok";
    if (hoursRemaining <= 0) {
      status = "critical";
    } else if (daysUntilMaintenance != null && daysUntilMaintenance <= 5) {
      status = "warning";
    } else if (hoursRemaining <= 50) {
      status = "warning";
    }
    
    return {
      id: plan?.id ?? "",
      equipment_id: eq.id,
      plate: eq.plate,
      equipment_name: eq.name,
      base_horimeter: baseHorimeter,
      target_hours: targetHours,
      last_maintenance_date: plan?.last_maintenance_date ?? null,
      last_maintenance_horimeter: plan?.last_maintenance_horimeter ?? null,
      created_at: plan?.created_at ?? "",
      updated_at: plan?.updated_at ?? "",
      current_horimeter: currentHorimeter,
      hours_used: hoursUsed,
      hours_remaining: hoursRemaining,
      estimated_maintenance_date: estimatedMaintenanceDate,
      days_until_maintenance: daysUntilMaintenance,
      avg_hours_per_day: avgHoursPerDay,
      status,
    };
  });

  // Initialize maintenance plan for equipment
  const initializePlan = useMutation({
    mutationFn: async ({
      equipmentId,
      plate,
      equipmentName,
      baseHorimeter,
    }: {
      equipmentId: string;
      plate: string;
      equipmentName: string;
      baseHorimeter: number;
    }) => {
      const { data, error } = await supabase
        .from("equipment_maintenance_plan")
        .upsert(
          {
            equipment_id: equipmentId,
            plate,
            equipment_name: equipmentName,
            base_horimeter: baseHorimeter,
            target_hours: 700,
          },
          { onConflict: "equipment_id" }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-plans"] });
    },
  });

  // Reset maintenance (after preventive maintenance is completed)
  const resetMaintenance = useMutation({
    mutationFn: async ({
      equipmentId,
      currentHorimeter,
    }: {
      equipmentId: string;
      currentHorimeter: number;
    }) => {
      const { data, error } = await supabase
        .from("equipment_maintenance_plan")
        .update({
          base_horimeter: currentHorimeter,
          last_maintenance_date: new Date().toISOString(),
          last_maintenance_horimeter: currentHorimeter,
        })
        .eq("equipment_id", equipmentId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-plans"] });
    },
  });

  // Equipment needing attention (warning or critical)
  const alertEquipment = maintenanceData.filter(
    (eq) => eq.status === "warning" || eq.status === "critical"
  );

  return {
    maintenanceData,
    alertEquipment,
    isLoading: isLoadingPlans,
    initializePlan,
    resetMaintenance,
  };
}
