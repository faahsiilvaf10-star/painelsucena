import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface OvertimeRecord {
  id: string;
  user_id: string;
  user_name: string;
  cargo: string;
  record_date: string;
  entry_time: string;
  exit_time: string;
  is_overtime: boolean;
  created_at: string;
  updated_at: string;
}

export interface OvertimeRecordInsert {
  user_id: string;
  user_name: string;
  cargo: string;
  record_date: string;
  entry_time: string;
  exit_time: string;
  is_overtime: boolean;
}

export const useOvertimeRecords = (filters?: {
  cargo?: string;
  month?: string; // YYYY-MM format
  weekStart?: string; // YYYY-MM-DD format
  weekEnd?: string; // YYYY-MM-DD format
}) => {
  return useQuery({
    queryKey: ["overtime-records", filters],
    queryFn: async () => {
      let query = supabase
        .from("overtime_records")
        .select("*")
        .order("record_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (filters?.cargo) {
        query = query.eq("cargo", filters.cargo);
      }

      if (filters?.month) {
        const [year, month] = filters.month.split("-");
        const startDate = `${year}-${month}-01`;
        const endDate = new Date(parseInt(year), parseInt(month), 0)
          .toISOString()
          .split("T")[0];
        query = query.gte("record_date", startDate).lte("record_date", endDate);
      }

      if (filters?.weekStart && filters?.weekEnd) {
        query = query
          .gte("record_date", filters.weekStart)
          .lte("record_date", filters.weekEnd);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as OvertimeRecord[];
    },
  });
};

export const useCreateOvertimeRecords = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (records: OvertimeRecordInsert[]) => {
      const { data, error } = await supabase
        .from("overtime_records")
        .insert(records)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["overtime-records"] });
      toast.success("Registros salvos com sucesso!");
    },
    onError: (error) => {
      console.error("Error saving overtime records:", error);
      toast.error("Erro ao salvar registros");
    },
  });
};

export const useDeleteOvertimeRecord = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("overtime_records")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["overtime-records"] });
      toast.success("Registro excluído!");
    },
    onError: (error) => {
      console.error("Error deleting overtime record:", error);
      toast.error("Erro ao excluir registro");
    },
  });
};

export const useDistinctCargos = () => {
  return useQuery({
    queryKey: ["overtime-distinct-cargos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("overtime_records")
        .select("cargo")
        .order("cargo");

      if (error) throw error;

      // Get unique cargos
      const uniqueCargos = [...new Set(data.map((item) => item.cargo))];
      return uniqueCargos;
    },
  });
};
