import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AbsenceReasonType =
  | "Falta"
  | "Atestado"
  | "Treinamento"
  | "Folga por Exame"
  | "Folga"
  | "Afastado"
  | "Licença Maternidade/Paternidade"
  | "INSS"
  | "Folga de Campo"
  | "Licença Casamento"
  | "Licença Morte";

export const ABSENCE_REASONS: AbsenceReasonType[] = [
  "Falta",
  "Atestado",
  "Treinamento",
  "Folga por Exame",
  "Folga",
  "Afastado",
  "Licença Maternidade/Paternidade",
  "INSS",
  "Folga de Campo",
  "Licença Casamento",
  "Licença Morte",
];

export interface AbsenceReason {
  id: string;
  employee_id: string;
  date: string;
  reason: string;
  days_count: number;
  cid: string | null;
  notes: string | null;
  environment: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

const addDays = (iso: string, n: number): string => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

export const useAbsenceReasons = (date?: string) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["absence_reasons", date ?? "all"],
    queryFn: async () => {
      let q = supabase.from("attendance_absence_reasons").select("*");
      if (date) q = q.lte("date", date);
      const { data, error } = await q.order("date", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as AbsenceReason[];
      if (!date) return rows;
      // Filter to absences that cover the given date (date <= target < date+days)
      return rows.filter((r) => {
        const end = addDays(r.date, r.days_count);
        return r.date <= date && date < end;
      });
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("absence-reasons-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "attendance_absence_reasons" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["absence_reasons"] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
};

interface SaveAbsenceInput {
  employee_id: string;
  date: string; // first day
  reason: AbsenceReasonType | string;
  days_count: number;
  cid?: string | null;
  notes?: string | null;
}

export const useSaveAbsenceReason = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveAbsenceInput) => {
      // Insert one row per day (so each day is independently visible/editable)
      const days = Math.max(1, input.days_count);
      const rows = Array.from({ length: days }).map((_, i) => ({
        employee_id: input.employee_id,
        date: addDays(input.date, i),
        reason: input.reason,
        days_count: days,
        cid: input.cid ?? null,
        notes: input.notes ?? null,
      }));

      // Upsert each (employee_id, date) — replace if existing
      const { error } = await supabase
        .from("attendance_absence_reasons")
        .upsert(rows, { onConflict: "employee_id,date,environment" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["absence_reasons"] });
      queryClient.invalidateQueries({ queryKey: ["attendance_records"] });
    },
  });
};

export const useDeleteAbsenceReason = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("attendance_absence_reasons")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["absence_reasons"] });
    },
  });
};
