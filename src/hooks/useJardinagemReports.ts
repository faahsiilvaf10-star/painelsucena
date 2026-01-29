import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { getBrazilNorthTodayString } from "@/lib/timezone";

export interface JardinagemReport {
  id: string;
  created_by: string;
  report_date: string;
  local_faixa: string;
  rocagem_m2: number | null;
  rocagem_berma: number | null;
  rocagem_faixa: string | null;
  podagem_unidade: number | null;
  podagem_berma: number | null;
  coroamento_unidade: number | null;
  coroamento_berma: number | null;
  adubagem_unidade: number | null;
  adubagem_berma: number | null;
  plantio_unidade: number | null;
  plantio_berma: number | null;
  limpeza_manual_m2: number | null;
  limpeza_manual_berma: number | null;
  limpeza_assoprador_m2: number | null;
  limpeza_assoprador_berma: number | null;
  manutencao_canteiro: string | null;
  controle_invasoras_unidade: number | null;
  controle_invasoras_nome: string | null;
  controle_invasoras_berma: number | null;
  retirada_mudas_unidade: number | null;
  irrigacao_pipas: boolean | null;
  irrigacao_carretel: boolean | null;
  irrigacao_carretel_bermas: number[] | null;
  plantio_grama_m2: number | null;
  plantio_grama_faixa: string | null;
  plantio_grama_berma: number | null;
  atividades_manuais: string | null;
  photo_urls: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface JardinagemReportInsert {
  report_date?: string;
  local_faixa: string;
  rocagem_m2?: number;
  rocagem_berma?: number;
  rocagem_faixa?: string;
  podagem_unidade?: number;
  podagem_berma?: number;
  coroamento_unidade?: number;
  coroamento_berma?: number;
  adubagem_unidade?: number;
  adubagem_berma?: number;
  plantio_unidade?: number;
  plantio_berma?: number;
  limpeza_manual_m2?: number;
  limpeza_manual_berma?: number;
  limpeza_assoprador_m2?: number;
  limpeza_assoprador_berma?: number;
  manutencao_canteiro?: string;
  controle_invasoras_unidade?: number;
  controle_invasoras_nome?: string;
  controle_invasoras_berma?: number;
  retirada_mudas_unidade?: number;
  irrigacao_pipas?: boolean;
  irrigacao_carretel?: boolean;
  irrigacao_carretel_bermas?: number[];
  plantio_grama_m2?: number;
  plantio_grama_faixa?: string;
  plantio_grama_berma?: number;
  atividades_manuais?: string;
  photo_urls?: string[];
}

export const useJardinagemReports = (filterDate?: string) => {
  return useQuery({
    queryKey: ["jardinagem-reports", filterDate],
    queryFn: async () => {
      let query = supabase
        .from("daily_jardinagem_reports")
        .select("*")
        .order("report_date", { ascending: false });

      if (filterDate) {
        query = query.eq("report_date", filterDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as JardinagemReport[];
    },
  });
};

export const useTodayJardinagemReport = () => {
  const todayStr = getBrazilNorthTodayString();
  return useQuery({
    queryKey: ["jardinagem-report-today", todayStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_jardinagem_reports")
        .select("*")
        .eq("report_date", todayStr)
        .maybeSingle();

      if (error) throw error;
      return data as JardinagemReport | null;
    },
  });
};

export const useJardinagemReportByDate = (date: string) => {
  return useQuery({
    queryKey: ["jardinagem-report", date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_jardinagem_reports")
        .select("*")
        .eq("report_date", date)
        .maybeSingle();

      if (error) throw error;
      return data as JardinagemReport | null;
    },
    enabled: !!date,
  });
};

export const useSaveJardinagemReport = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (report: JardinagemReportInsert) => {
      if (!user?.id) throw new Error("User not authenticated");

      const reportDate = report.report_date || getBrazilNorthTodayString();

      // Check if report for this date already exists
      const { data: existing } = await supabase
        .from("daily_jardinagem_reports")
        .select("id")
        .eq("report_date", reportDate)
        .maybeSingle();

      if (existing) {
        // Update existing report
        const { data, error } = await supabase
          .from("daily_jardinagem_reports")
          .update({
            ...report,
            report_date: reportDate,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new report
        const { data, error } = await supabase
          .from("daily_jardinagem_reports")
          .insert({
            ...report,
            report_date: reportDate,
            created_by: user.id,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jardinagem-reports"] });
      queryClient.invalidateQueries({ queryKey: ["jardinagem-report"] });
      queryClient.invalidateQueries({ queryKey: ["jardinagem-report-today"] });
    },
  });
};

export const useDeleteJardinagemReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("daily_jardinagem_reports")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jardinagem-reports"] });
      queryClient.invalidateQueries({ queryKey: ["jardinagem-report"] });
      queryClient.invalidateQueries({ queryKey: ["jardinagem-report-today"] });
    },
  });
};

// Helper function to format jardinagem report for RDO
export const formatJardinagemForRDO = (report: JardinagemReport | null): string => {
  if (!report) return "";

  const lines: string[] = [];
  
  // Include the faixa (location) at the beginning
  // Using Unicode escape sequence for WhatsApp compatibility (📍 = \uD83D\uDCCD)
  if (report.local_faixa && report.local_faixa.trim()) {
    lines.push(`\uD83D\uDCCD Local: ${report.local_faixa}`);
    lines.push(""); // Empty line for separation
  }
  
  // Helper function to format berma text
  const formatBerma = (berma: number | null | undefined): string => {
    return berma ? ` (Berma ${berma})` : "";
  };
  
  if (report.rocagem_m2 && report.rocagem_m2 > 0) {
    const faixaText = report.rocagem_faixa ? ` - ${report.rocagem_faixa}` : "";
    lines.push(`* Roçagem - ${report.rocagem_m2} m²${formatBerma(report.rocagem_berma)}${faixaText}`);
  }
  if (report.podagem_unidade && report.podagem_unidade > 0) {
    lines.push(`* Podagem - ${report.podagem_unidade} unidade(s)${formatBerma(report.podagem_berma)}`);
  }
  if (report.coroamento_unidade && report.coroamento_unidade > 0) {
    lines.push(`* Coroamento - ${report.coroamento_unidade} unidade(s)${formatBerma(report.coroamento_berma)}`);
  }
  if (report.adubagem_unidade && report.adubagem_unidade > 0) {
    lines.push(`* Adubagem - ${report.adubagem_unidade} unidade(s)${formatBerma(report.adubagem_berma)}`);
  }
  if (report.plantio_unidade && report.plantio_unidade > 0) {
    lines.push(`* Plantio - ${report.plantio_unidade} unidade(s)${formatBerma(report.plantio_berma)}`);
  }
  if (report.limpeza_manual_m2 && report.limpeza_manual_m2 > 0) {
    lines.push(`* Limpeza Manual - ${report.limpeza_manual_m2} m²${formatBerma(report.limpeza_manual_berma)}`);
  }
  if (report.limpeza_assoprador_m2 && report.limpeza_assoprador_m2 > 0) {
    lines.push(`* Limpeza com Assoprador - ${report.limpeza_assoprador_m2} m²${formatBerma(report.limpeza_assoprador_berma)}`);
  }
  
  // Handle invasoras - can be JSON array or single value
  if (report.controle_invasoras_nome && report.controle_invasoras_nome.startsWith("[")) {
    try {
      const invasoras = JSON.parse(report.controle_invasoras_nome) as { nome: string; unidade: string }[];
      invasoras.forEach(inv => {
        if (inv.unidade && parseInt(inv.unidade) > 0) {
          const nomeInvasora = inv.nome ? ` (${inv.nome})` : "";
          lines.push(`* Controle de Invasoras${nomeInvasora} - ${inv.unidade} unidade(s)${formatBerma(report.controle_invasoras_berma)}`);
        }
      });
    } catch {
      // Fallback to single value
      if (report.controle_invasoras_unidade && report.controle_invasoras_unidade > 0) {
        const nomeInvasora = report.controle_invasoras_nome ? ` (${report.controle_invasoras_nome})` : "";
        lines.push(`* Controle de Invasoras${nomeInvasora} - ${report.controle_invasoras_unidade} unidade(s)${formatBerma(report.controle_invasoras_berma)}`);
      }
    }
  } else if (report.controle_invasoras_unidade && report.controle_invasoras_unidade > 0) {
    const nomeInvasora = report.controle_invasoras_nome ? ` (${report.controle_invasoras_nome})` : "";
    lines.push(`* Controle de Invasoras${nomeInvasora} - ${report.controle_invasoras_unidade} unidade(s)${formatBerma(report.controle_invasoras_berma)}`);
  }
  
  if (report.retirada_mudas_unidade && report.retirada_mudas_unidade > 0) {
    lines.push(`* Retirada de Mudas (Árvores) - ${report.retirada_mudas_unidade} unidade(s)`);
  }
  
  // Plantio de Grama
  if (report.plantio_grama_m2 && report.plantio_grama_m2 > 0) {
    const faixaText = report.plantio_grama_faixa ? ` - ${report.plantio_grama_faixa}` : "";
    const bermaText = report.plantio_grama_berma ? ` (Berma ${report.plantio_grama_berma})` : "";
    lines.push(`* Plantio de Grama - ${report.plantio_grama_m2} m²${bermaText}${faixaText}`);
  }
  
  // Atividades manuais
  if (report.atividades_manuais) {
    lines.push(`* ${report.atividades_manuais}`);
  }
  
  if (report.manutencao_canteiro) {
    lines.push(`* Manutenção de Canteiro: ${report.manutencao_canteiro}`);
  }
  
  // Irrigation activities
  if (report.irrigacao_pipas) {
    lines.push(`* Irrigação com Pipas nas Faixas 3 e 4 e Mirante`);
  }
  if (report.irrigacao_carretel && report.irrigacao_carretel_bermas && report.irrigacao_carretel_bermas.length > 0) {
    const bermasText = report.irrigacao_carretel_bermas.sort((a, b) => a - b).join(", ");
    lines.push(`* Irrigação com Carretel (Bermas: ${bermasText})`);
  } else if (report.irrigacao_carretel) {
    lines.push(`* Irrigação com Carretel`);
  }

  return lines.join("\n");
};
