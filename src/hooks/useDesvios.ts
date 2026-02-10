import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useProfile } from "./useProfile";
import { toast } from "sonner";

export interface Desvio {
  id: string;
  description: string;
  photo_urls: string[];
  correction_photo_urls: string[];
  mentioned_user_id: string | null;
  mentioned_user_name: string | null;
  due_date: string | null;
  status: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export function useDesvios() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["desvios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("desvios")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Desvio[];
    },
    enabled: !!user,
  });

  return query;
}

export function useCreateDesvio() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async (params: {
      description: string;
      photo_urls: string[];
      mentioned_user_id: string | null;
      mentioned_user_name: string | null;
      due_date: string | null;
    }) => {
      if (!user) throw new Error("Não autenticado");
      const { data, error } = await supabase
        .from("desvios")
        .insert({
          description: params.description,
          photo_urls: params.photo_urls,
          mentioned_user_id: params.mentioned_user_id,
          mentioned_user_name: params.mentioned_user_name,
          due_date: params.due_date,
          created_by: user.id,
          created_by_name: profile?.full_name || "Usuário",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["desvios"] });
      toast.success("Desvio registrado com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao registrar desvio");
    },
  });
}

export function useUploadDesvioPhoto() {
  return useMutation({
    mutationFn: async (file: File) => {
      const ext = file.name.split(".").pop();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("desvios")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("desvios").getPublicUrl(path);
      return urlData.publicUrl;
    },
  });
}

export function useAddCorrectionPhoto() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ desvioId, photoUrl }: { desvioId: string; photoUrl: string }) => {
      // First get current correction photos
      const { data: current, error: fetchError } = await supabase
        .from("desvios")
        .select("correction_photo_urls, mentioned_user_id")
        .eq("id", desvioId)
        .single();
      if (fetchError) throw fetchError;

      // Only mentioned user can add correction
      if (current.mentioned_user_id !== user?.id) {
        throw new Error("Apenas a pessoa mencionada pode adicionar foto de correção");
      }

      const updatedPhotos = [...(current.correction_photo_urls || []), photoUrl];
      const { error } = await supabase
        .from("desvios")
        .update({ correction_photo_urls: updatedPhotos })
        .eq("id", desvioId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["desvios"] });
      toast.success("Foto de correção adicionada!");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro ao adicionar foto de correção");
    },
  });
}

export function useUpdateDesvioStatus() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ desvioId, status }: { desvioId: string; status: string }) => {
      const { error } = await supabase
        .from("desvios")
        .update({ status })
        .eq("id", desvioId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["desvios"] });
      toast.success("Status atualizado!");
    },
    onError: () => {
      toast.error("Erro ao atualizar status");
    },
  });
}

export function useDeleteDesvio() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (desvioId: string) => {
      const { error } = await supabase
        .from("desvios")
        .delete()
        .eq("id", desvioId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["desvios"] });
      toast.success("Desvio excluído!");
    },
    onError: () => {
      toast.error("Erro ao excluir desvio");
    },
  });
}
