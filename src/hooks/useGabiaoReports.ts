import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface GabiaoReport {
  id: string;
  report_date: string;
  created_by: string;
  local_servico: string;
  limpeza_canaleta_m: number | null;
  limpeza_canaleta_berma: number | null;
  recomposicao_gabiao_m: number | null;
  recomposicao_gabiao_berma: number | null;
  manutencao_drenagem_m: number | null;
  manutencao_drenagem_berma: number | null;
  limpeza_bueiro_unidade: number | null;
  limpeza_bueiro_berma: number | null;
  reparo_cerca_m: number | null;
  reparo_cerca_berma: number | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface GabiaoReportInsert {
  report_date: string;
  local_servico: string;
  limpeza_canaleta_m?: number;
  limpeza_canaleta_berma?: number;
  recomposicao_gabiao_m?: number;
  recomposicao_gabiao_berma?: number;
  manutencao_drenagem_m?: number;
  manutencao_drenagem_berma?: number;
  limpeza_bueiro_unidade?: number;
  limpeza_bueiro_berma?: number;
  reparo_cerca_m?: number;
  reparo_cerca_berma?: number;
  observacoes?: string;
}

export function useGabiaoReports() {
  return useQuery({
    queryKey: ["gabiao-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_gabiao_reports")
        .select("*")
        .order("report_date", { ascending: false });

      if (error) throw error;
      return data as GabiaoReport[];
    },
  });
}

export function useGabiaoReportByDate(date: string) {
  return useQuery({
    queryKey: ["gabiao-report", date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_gabiao_reports")
        .select("*")
        .eq("report_date", date);

      if (error) throw error;
      return data?.[0] as GabiaoReport | null;
    },
  });
}

export function useSaveGabiaoReport() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (report: GabiaoReportInsert) => {
      if (!user) throw new Error("User not authenticated");

      // Check if report exists for this date
      const { data: existing } = await supabase
        .from("daily_gabiao_reports")
        .select("id")
        .eq("report_date", report.report_date)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from("daily_gabiao_reports")
          .update({
            ...report,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from("daily_gabiao_reports")
          .insert({
            ...report,
            created_by: user.id,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gabiao-reports"] });
      queryClient.invalidateQueries({ queryKey: ["gabiao-report"] });
    },
  });
}

export function useDeleteGabiaoReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("daily_gabiao_reports")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gabiao-reports"] });
      queryClient.invalidateQueries({ queryKey: ["gabiao-report"] });
    },
  });
}

export const formatGabiaoForRDO = (report: GabiaoReport | null): string => {
  if (!report) return "";

  const lines: string[] = [];
  
  const formatBerma = (berma: number | null | undefined): string => {
    return berma ? ` (Berma ${berma})` : "";
  };
  
  if (report.limpeza_canaleta_m && report.limpeza_canaleta_m > 0) {
    lines.push(`* Limpeza de Canaleta - ${report.limpeza_canaleta_m} m${formatBerma(report.limpeza_canaleta_berma)}`);
  }
  if (report.recomposicao_gabiao_m && report.recomposicao_gabiao_m > 0) {
    lines.push(`* Recomposição de Gabião - ${report.recomposicao_gabiao_m} m${formatBerma(report.recomposicao_gabiao_berma)}`);
  }
  if (report.manutencao_drenagem_m && report.manutencao_drenagem_m > 0) {
    lines.push(`* Manutenção de Drenagem - ${report.manutencao_drenagem_m} m${formatBerma(report.manutencao_drenagem_berma)}`);
  }
  if (report.limpeza_bueiro_unidade && report.limpeza_bueiro_unidade > 0) {
    lines.push(`* Limpeza de Bueiro - ${report.limpeza_bueiro_unidade} unidade(s)${formatBerma(report.limpeza_bueiro_berma)}`);
  }
  if (report.reparo_cerca_m && report.reparo_cerca_m > 0) {
    lines.push(`* Reparo de Cerca - ${report.reparo_cerca_m} m${formatBerma(report.reparo_cerca_berma)}`);
  }
  if (report.observacoes) {
    lines.push(`* Observações: ${report.observacoes}`);
  }

  return lines.join("\n");
};
