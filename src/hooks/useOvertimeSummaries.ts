import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OvertimeSummary {
  id: string;
  user_id: string;
  user_name: string;
  cargo: string;
  period_start: string;
  period_end: string;
  total_records: number;
  total_overtime_records: number;
  total_hours_worked: number;
  total_overtime_hours: number;
  created_at: string;
}

export const useOvertimeSummaries = () => {
  return useQuery({
    queryKey: ["overtime-summaries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("overtime_summaries")
        .select("*")
        .order("period_end", { ascending: false })
        .order("user_name", { ascending: true });

      if (error) throw error;
      return data as OvertimeSummary[];
    },
  });
};

export const useCurrentPeriodSummaries = () => {
  return useQuery({
    queryKey: ["overtime-summaries-current"],
    queryFn: async () => {
      // Calculate current period dates
      const now = new Date();
      const currentDay = now.getDate();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      let periodStart: Date;
      let periodEnd: Date;

      if (currentDay >= 20) {
        if (currentMonth === 0) {
          periodStart = new Date(currentYear - 1, 11, 21);
        } else {
          periodStart = new Date(currentYear, currentMonth - 1, 21);
        }
        periodEnd = new Date(currentYear, currentMonth, 20);
      } else {
        if (currentMonth === 0) {
          periodStart = new Date(currentYear - 1, 10, 21);
          periodEnd = new Date(currentYear - 1, 11, 20);
        } else if (currentMonth === 1) {
          periodStart = new Date(currentYear - 1, 11, 21);
          periodEnd = new Date(currentYear, 0, 20);
        } else {
          periodStart = new Date(currentYear, currentMonth - 2, 21);
          periodEnd = new Date(currentYear, currentMonth - 1, 20);
        }
      }

      const periodStartStr = periodStart.toISOString().split("T")[0];
      const periodEndStr = periodEnd.toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("overtime_summaries")
        .select("*")
        .eq("period_start", periodStartStr)
        .eq("period_end", periodEndStr)
        .order("user_name", { ascending: true });

      if (error) throw error;
      return {
        summaries: data as OvertimeSummary[],
        period: { start: periodStartStr, end: periodEndStr },
      };
    },
  });
};

export const useCalculateOvertimeSummary = () => {
  const calculateSummary = async () => {
    const { data, error } = await supabase.functions.invoke(
      "calculate-overtime-summary"
    );

    if (error) throw error;
    return data;
  };

  return { calculateSummary };
};
