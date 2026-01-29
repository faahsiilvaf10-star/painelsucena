import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface RDOReport {
  id: string;
  created_by: string;
  report_date: string;
  weather_morning: string;
  weather_afternoon: string;
  jardinagem_location: string | null;
  jardinagem_activities: string | null;
  gabiao_location: string | null;
  gabiao_activities: string | null;
  difficulties: string | null;
  photo_urls: string[];
  report_text: string;
  efetivo_gabiao_text: string | null;
  efetivo_jardinagem_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface RDOReportInsert {
  report_date: string;
  weather_morning: string;
  weather_afternoon: string;
  jardinagem_location?: string;
  jardinagem_activities?: string;
  gabiao_location?: string;
  gabiao_activities?: string;
  difficulties?: string;
  photo_urls?: string[];
  report_text: string;
  efetivo_gabiao_text?: string;
  efetivo_jardinagem_text?: string;
}

export const useRDOReports = (filterDate?: string) => {
  return useQuery({
    queryKey: ["rdo-reports", filterDate],
    queryFn: async () => {
      let query = supabase
        .from("rdo_reports")
        .select("*")
        .order("report_date", { ascending: false });

      if (filterDate) {
        query = query.eq("report_date", filterDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as RDOReport[];
    },
  });
};

export const useRDOReport = (date: string) => {
  return useQuery({
    queryKey: ["rdo-report", date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rdo_reports")
        .select("*")
        .eq("report_date", date)
        .maybeSingle();

      if (error) throw error;
      return data as RDOReport | null;
    },
    enabled: !!date,
  });
};

export const useSaveRDOReport = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (report: RDOReportInsert) => {
      if (!user?.id) throw new Error("User not authenticated");

      // Check if report for this date already exists
      const { data: existing } = await supabase
        .from("rdo_reports")
        .select("id")
        .eq("report_date", report.report_date)
        .maybeSingle();

      if (existing) {
        // Update existing report
        const { data, error } = await supabase
          .from("rdo_reports")
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
        // Create new report
        const { data, error } = await supabase
          .from("rdo_reports")
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
      queryClient.invalidateQueries({ queryKey: ["rdo-reports"] });
      queryClient.invalidateQueries({ queryKey: ["rdo-report"] });
    },
  });
};

export const useDeleteRDOReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("rdo_reports")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rdo-reports"] });
      queryClient.invalidateQueries({ queryKey: ["rdo-report"] });
    },
  });
};

export const useSaveEfetivoToRDO = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      report_date: string;
      efetivo_gabiao_text?: string;
      efetivo_jardinagem_text?: string;
    }) => {
      if (!user?.id) throw new Error("User not authenticated");

      // Check if report for this date already exists
      const { data: existing } = await supabase
        .from("rdo_reports")
        .select("id, efetivo_gabiao_text, efetivo_jardinagem_text")
        .eq("report_date", data.report_date)
        .maybeSingle();

      if (existing) {
        // Build update object only with non-empty fields to avoid overwriting existing data
        const updateFields: {
          updated_at: string;
          efetivo_gabiao_text?: string;
          efetivo_jardinagem_text?: string;
        } = {
          updated_at: new Date().toISOString(),
        };
        
        // Only update gabiao text if provided and not empty
        if (data.efetivo_gabiao_text && data.efetivo_gabiao_text.trim() !== "") {
          updateFields.efetivo_gabiao_text = data.efetivo_gabiao_text;
        }
        
        // Only update jardinagem text if provided and not empty
        if (data.efetivo_jardinagem_text && data.efetivo_jardinagem_text.trim() !== "") {
          updateFields.efetivo_jardinagem_text = data.efetivo_jardinagem_text;
        }

        // Update existing report with efetivo data (only non-empty fields)
        const { data: updated, error } = await supabase
          .from("rdo_reports")
          .update(updateFields)
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;
        return updated;
      } else {
        // Create new report with just efetivo data
        const { data: created, error } = await supabase
          .from("rdo_reports")
          .insert({
            report_date: data.report_date,
            created_by: user.id,
            weather_morning: "sol",
            weather_afternoon: "sol",
            report_text: "",
            efetivo_gabiao_text: data.efetivo_gabiao_text && data.efetivo_gabiao_text.trim() !== "" 
              ? data.efetivo_gabiao_text 
              : null,
            efetivo_jardinagem_text: data.efetivo_jardinagem_text && data.efetivo_jardinagem_text.trim() !== "" 
              ? data.efetivo_jardinagem_text 
              : null,
          })
          .select()
          .single();

        if (error) throw error;
        return created;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rdo-reports"] });
      queryClient.invalidateQueries({ queryKey: ["rdo-report"] });
    },
  });
};

export const useUploadRDOPhotos = () => {
  const { user } = useAuth();

  return async (files: File[]): Promise<string[]> => {
    if (!user?.id) throw new Error("User not authenticated");

    const urls: string[] = [];

    for (const file of files) {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("rdo-photos")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("rdo-photos")
        .getPublicUrl(fileName);

      urls.push(urlData.publicUrl);
    }

    return urls;
  };
};
