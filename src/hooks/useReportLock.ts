import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useReportLock = (date: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check if report is locked for this date
  const { data: lockData, isLoading } = useQuery({
    queryKey: ["report_lock", date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_report_locks")
        .select("*")
        .eq("date", date)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const isLocked = !!lockData;

  // Lock the report
  const lockReport = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("attendance_report_locks")
        .insert({
          date,
          locked_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report_lock", date] });
      queryClient.invalidateQueries({ queryKey: ["attendance_records"] });
    },
  });

  // Unlock the report (only by the person who locked it)
  const unlockReport = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("attendance_report_locks")
        .delete()
        .eq("date", date)
        .eq("locked_by", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report_lock", date] });
      queryClient.invalidateQueries({ queryKey: ["attendance_records"] });
    },
  });

  return {
    isLocked,
    lockData,
    isLoading,
    lockReport,
    unlockReport,
    canUnlock: lockData?.locked_by === user?.id,
  };
};
