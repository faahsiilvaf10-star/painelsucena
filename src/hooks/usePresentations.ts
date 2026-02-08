import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface SlideData {
  title: string;
  content: string;
  notes?: string;
  layout: "title" | "content" | "two-column" | "image" | "quote" | "stats";
  stats?: { label: string; value: string }[];
  quote?: { text: string; author: string };
}

export interface Presentation {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  slides: SlideData[];
  created_at: string;
  updated_at: string;
}

export function usePresentations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const presentationsQuery = useQuery({
    queryKey: ["presentations", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("presentations")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((p: any) => ({
        ...p,
        slides: (typeof p.slides === "string" ? JSON.parse(p.slides) : p.slides) as SlideData[],
      })) as Presentation[];
    },
    enabled: !!user,
  });

  const savePresentation = useMutation({
    mutationFn: async (presentation: {
      id?: string;
      title: string;
      description?: string;
      slides: SlideData[];
    }) => {
      if (!user) throw new Error("Not authenticated");
      if (presentation.id) {
        const { error } = await supabase
          .from("presentations")
          .update({
            title: presentation.title,
            description: presentation.description || null,
            slides: JSON.stringify(presentation.slides) as any,
          })
          .eq("id", presentation.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("presentations")
          .insert({
            user_id: user.id,
            title: presentation.title,
            description: presentation.description || null,
            slides: JSON.stringify(presentation.slides) as any,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["presentations"] });
      toast.success("Apresentação salva!");
    },
    onError: (err: any) => {
      toast.error("Erro ao salvar: " + err.message);
    },
  });

  const deletePresentation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("presentations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["presentations"] });
      toast.success("Apresentação excluída!");
    },
    onError: (err: any) => {
      toast.error("Erro ao excluir: " + err.message);
    },
  });

  return {
    presentations: presentationsQuery.data || [],
    isLoading: presentationsQuery.isLoading,
    savePresentation,
    deletePresentation,
  };
}
