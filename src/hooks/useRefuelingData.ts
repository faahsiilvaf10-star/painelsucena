import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, format } from "date-fns";

const LITERS_PER_REFUEL = 20000;

interface RefuelingRecord {
  id: string;
  equipment_id: string;
  stop_reason: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  defect_description: string | null;
  changed_by_driver: string | null;
}

interface EquipmentInfo {
  id: string;
  name: string;
  plate: string;
}

export interface RefuelingByPoint {
  point: string;
  count: number;
  liters: number;
}

export interface RefuelingByVehicle {
  vehicleName: string;
  plate: string;
  count: number;
  liters: number;
}

export interface MonthlyRefueling {
  month: string;
  monthName: string;
  count: number;
  liters: number;
}

export interface DailyRefuelingByVehicle {
  vehicleName: string;
  plate: string;
  date: string;
  count: number;
  liters: number;
}

export interface RefuelingByVehicleWithPoints {
  vehicleName: string;
  plate: string;
  count: number;
  liters: number;
  byPoint: {
    "46": number;
    "3C": number;
    "3D": number;
  };
}

export function useRefuelingData(year?: number, month?: number) {
  const currentDate = new Date();
  const targetYear = year ?? currentDate.getFullYear();
  const targetMonth = month ?? currentDate.getMonth();

  return useQuery({
    queryKey: ["refueling-data", targetYear, targetMonth],
    queryFn: async () => {
      // Get all refueling records
      const { data: refuelingRecords, error: refError } = await supabase
        .from("equipment_stop_history")
        .select("*")
        .eq("stop_reason", "abastecimento")
        .not("ended_at", "is", null)
        .order("started_at", { ascending: false });

      if (refError) throw refError;

      // Get equipment info
      const { data: equipmentData, error: eqError } = await supabase
        .from("equipment")
        .select("id, name, plate")
        .in("equipment_type", ["pipa"]);

      if (eqError) throw eqError;

      const equipmentMap = new Map<string, EquipmentInfo>();
      (equipmentData || []).forEach((eq) => {
        equipmentMap.set(eq.id, eq);
      });

      const records = (refuelingRecords || []) as RefuelingRecord[];

      // Calculate by point
      const byPoint: Record<string, number> = { "46": 0, "3C": 0, "3D": 0 };
      records.forEach((record) => {
        const pointMatch = record.defect_description?.match(/Ponto:\s*(.+)/i);
        if (pointMatch) {
          const point = pointMatch[1].trim().toUpperCase();
          if (byPoint[point] !== undefined) {
            byPoint[point]++;
          } else if (point === "46") {
            byPoint["46"]++;
          } else if (point === "3C" || point === "3c") {
            byPoint["3C"]++;
          } else if (point === "3D" || point === "3d") {
            byPoint["3D"]++;
          }
        }
      });

      const refuelingByPoint: RefuelingByPoint[] = Object.entries(byPoint).map(
        ([point, count]) => ({
          point: `Ponto ${point}`,
          count,
          liters: count * LITERS_PER_REFUEL,
        })
      );

      // Calculate by vehicle with point breakdown
      const byVehicle: Record<string, { 
        name: string; 
        plate: string; 
        count: number;
        byPoint: { "46": number; "3C": number; "3D": number };
      }> = {};
      
      records.forEach((record) => {
        const eq = equipmentMap.get(record.equipment_id);
        if (eq) {
          if (!byVehicle[eq.id]) {
            byVehicle[eq.id] = { 
              name: eq.name, 
              plate: eq.plate, 
              count: 0,
              byPoint: { "46": 0, "3C": 0, "3D": 0 }
            };
          }
          byVehicle[eq.id].count++;
          
          // Extract point from defect_description
          const pointMatch = record.defect_description?.match(/Ponto:\s*(.+)/i);
          if (pointMatch) {
            const point = pointMatch[1].trim().toUpperCase();
            if (point === "46") {
              byVehicle[eq.id].byPoint["46"]++;
            } else if (point === "3C") {
              byVehicle[eq.id].byPoint["3C"]++;
            } else if (point === "3D") {
              byVehicle[eq.id].byPoint["3D"]++;
            }
          }
        }
      });

      const refuelingByVehicle: RefuelingByVehicle[] = Object.values(byVehicle).map(
        (v) => ({
          vehicleName: v.name,
          plate: v.plate,
          count: v.count,
          liters: v.count * LITERS_PER_REFUEL,
        })
      );
      
      const refuelingByVehicleWithPoints: RefuelingByVehicleWithPoints[] = Object.values(byVehicle).map(
        (v) => ({
          vehicleName: v.name,
          plate: v.plate,
          count: v.count,
          liters: v.count * LITERS_PER_REFUEL,
          byPoint: v.byPoint,
        })
      );

      // Calculate monthly totals for the year
      const monthlyData: Record<string, number> = {};
      const monthNames = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
      ];

      // Initialize all months
      for (let m = 0; m < 12; m++) {
        monthlyData[`${targetYear}-${String(m + 1).padStart(2, "0")}`] = 0;
      }

      records.forEach((record) => {
        const date = new Date(record.started_at);
        if (date.getFullYear() === targetYear) {
          const key = `${targetYear}-${String(date.getMonth() + 1).padStart(2, "0")}`;
          monthlyData[key]++;
        }
      });

      const monthlyRefueling: MonthlyRefueling[] = Object.entries(monthlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, count]) => {
          const monthIndex = parseInt(key.split("-")[1]) - 1;
          return {
            month: key,
            monthName: monthNames[monthIndex],
            count,
            liters: count * LITERS_PER_REFUEL,
          };
        });

      // Filter records for the selected month
      const monthStart = startOfMonth(new Date(targetYear, targetMonth));
      const monthEnd = endOfMonth(new Date(targetYear, targetMonth));
      
      const currentMonthRecords = records.filter((record) => {
        const date = new Date(record.started_at);
        return date >= monthStart && date <= monthEnd;
      });

      // Daily refueling by vehicle for the selected month
      const dailyByVehicle: Record<string, DailyRefuelingByVehicle> = {};
      currentMonthRecords.forEach((record) => {
        const eq = equipmentMap.get(record.equipment_id);
        if (eq) {
          const date = format(new Date(record.started_at), "yyyy-MM-dd");
          const key = `${eq.id}-${date}`;
          if (!dailyByVehicle[key]) {
            dailyByVehicle[key] = {
              vehicleName: eq.name,
              plate: eq.plate,
              date,
              count: 0,
              liters: 0,
            };
          }
          dailyByVehicle[key].count++;
          dailyByVehicle[key].liters = dailyByVehicle[key].count * LITERS_PER_REFUEL;
        }
      });

      // Summary stats
      const totalRefuelings = records.length;
      const totalLiters = totalRefuelings * LITERS_PER_REFUEL;
      const currentMonthRefuelings = currentMonthRecords.length;
      const currentMonthLiters = currentMonthRefuelings * LITERS_PER_REFUEL;

      return {
        refuelingByPoint,
        refuelingByVehicle,
        refuelingByVehicleWithPoints,
        monthlyRefueling,
        dailyByVehicle: Object.values(dailyByVehicle),
        totalRefuelings,
        totalLiters,
        currentMonthRefuelings,
        currentMonthLiters,
        litersPerRefuel: LITERS_PER_REFUEL,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
