import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useIsAdmin } from "./useUserRole";

export type AreaType = "gabiao" | "jardinagem";

export interface AreaLockData {
  id: string;
  date: string;
  area: string;
  locked_by: string;
  locked_at: string;
}

export const useReportLock = (date: string) => {
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const queryClient = useQueryClient();

  // Check if reports are locked for this date (both areas)
  const { data: lockData, isLoading } = useQuery({
    queryKey: ["report_lock", date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_report_locks")
        .select("*")
        .eq("date", date);

      if (error) throw error;
      return data as AreaLockData[];
    },
  });

  // Check if specific area is locked
  const isAreaLocked = (area: AreaType) => {
    if (!lockData) return false;
    return lockData.some(lock => lock.area === area);
  };

  // Check if user can unlock specific area (owner or admin)
  const canUnlockArea = (area: AreaType) => {
    if (!lockData || !user) return false;
    // Admins can unlock any area
    if (isAdmin) return true;
    const areaLock = lockData.find(lock => lock.area === area);
    return areaLock?.locked_by === user.id;
  };

  // Get lock data for specific area
  const getAreaLockData = (area: AreaType) => {
    if (!lockData) return null;
    return lockData.find(lock => lock.area === area) || null;
  };

  // Lock specific area
  const lockArea = useMutation({
    mutationFn: async (area: AreaType) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("attendance_report_locks")
        .insert({
          date,
          area,
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

  // Unlock specific area (by the person who locked it OR admin)
  const unlockArea = useMutation({
    mutationFn: async (area: AreaType) => {
      if (!user) throw new Error("User not authenticated");

      // If admin, delete regardless of who locked it
      if (isAdmin) {
        const { error } = await supabase
          .from("attendance_report_locks")
          .delete()
          .eq("date", date)
          .eq("area", area);

        if (error) throw error;
      } else {
        // Regular user can only unlock their own locks
        const { error } = await supabase
          .from("attendance_report_locks")
          .delete()
          .eq("date", date)
          .eq("area", area)
          .eq("locked_by", user.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report_lock", date] });
      queryClient.invalidateQueries({ queryKey: ["attendance_records"] });
    },
  });

  // Legacy compatibility: check if any area is locked
  const isLocked = lockData && lockData.length > 0;
  const isFullyLocked = lockData && lockData.length >= 2;

  return {
    lockData,
    isLoading,
    isLocked,
    isFullyLocked,
    isAreaLocked,
    canUnlockArea,
    getAreaLockData,
    lockArea,
    unlockArea,
    isAdmin,
  };
};
