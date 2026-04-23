import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEnvironment } from "@/hooks/useEnvironment";

export type AttendanceArea = "gabiao" | "jardinagem" | "adm";

export interface AreaAssignment {
  id: string;
  employee_id: number;
  employee_name: string;
  area: AttendanceArea;
  environment: string;
}

export const useAttendanceAreaAssignments = () => {
  const queryClient = useQueryClient();
  const { environment } = useEnvironment();
  const env = environment ?? "barcarena";

  const query = useQuery({
    queryKey: ["attendance-area-assignments", env],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_area_assignments")
        .select("*")
        .eq("environment", env);
      if (error) throw error;
      return (data ?? []) as AreaAssignment[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`attendance-area-assignments-${env}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "attendance_area_assignments" },
        () => {
          queryClient.invalidateQueries({
            queryKey: ["attendance-area-assignments", env],
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, env]);

  const assignMutation = useMutation({
    mutationFn: async (params: {
      employee_id: number;
      employee_name: string;
      area: AttendanceArea;
    }) => {
      const { error } = await supabase
        .from("attendance_area_assignments")
        .upsert(
          {
            employee_id: params.employee_id,
            employee_name: params.employee_name,
            area: params.area,
          },
          { onConflict: "employee_id,environment" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["attendance-area-assignments", env],
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (employee_id: number) => {
      const { error } = await supabase
        .from("attendance_area_assignments")
        .delete()
        .eq("employee_id", employee_id)
        .eq("environment", env);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["attendance-area-assignments", env],
      });
    },
  });

  return { ...query, assignMutation, removeMutation };
};
