import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SiteSettings {
  id: string;
  logo_url: string | null;
  sidebar_color: string;
  nav_order: string[];
  show_signup_button: boolean;
  ui_theme: string;
  primary_color: string | null;
  instacena_gif_position: { x: number; y: number } | null;
  instacena_gif_size: number;
  instacena_gif_url: string | null;
  updated_at: string;
  updated_by: string | null;
}

const DEFAULT_NAV_ORDER = [
  "atividades", "atividades-ii", "destaques", "campanhas", "dds", "documentos", "entrada-saida",
  "estoque", "lembretes", "parte-diaria", "presenca", "matriz", "pedidos", "rdo", "relatorio",
  "rh", "vistorias", "homologados", "vistoria-cintas", "arquivos-seguranca",
  "consumo-abastecimento", "plano-manutencao", "slides", "instacena", "inspecao-canteiro",
  "calendario-hydro", "games", "desvios", "planejamento", "emergencia"
];

export function useSiteSettings() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ["site-settings"],
    queryFn: async (): Promise<SiteSettings> => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching site settings:", error);
        throw error;
      }

      if (!data) {
        return {
          id: "",
          logo_url: null,
          sidebar_color: "#1e2235",
          nav_order: DEFAULT_NAV_ORDER,
          show_signup_button: false,
          ui_theme: "classic",
          primary_color: null,
          instacena_gif_position: { x: 16, y: 80 },
          instacena_gif_size: 200,
          instacena_gif_url: null,
          updated_at: new Date().toISOString(),
          updated_by: null,
        };
      }

      const navOrder = Array.isArray(data.nav_order) 
        ? (data.nav_order as unknown as string[]) 
        : DEFAULT_NAV_ORDER;

      return {
        ...data,
        nav_order: navOrder,
        ui_theme: (data as any).ui_theme || "classic",
        primary_color: (data as any).primary_color || null,
        instacena_gif_position: (data as any).instacena_gif_position || { x: 16, y: 80 },
      };
    },
    staleTime: 1000 * 60 * 5,
    retry: 2,
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<Pick<SiteSettings, "logo_url" | "sidebar_color" | "nav_order" | "show_signup_button" | "ui_theme" | "primary_color" | "instacena_gif_position">>) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!settings?.id) {
        throw new Error("Settings not loaded yet");
      }
      
      const { error } = await supabase
        .from("site_settings")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
          updated_by: user?.id,
        })
        .eq("id", settings.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      queryClient.invalidateQueries({ queryKey: ["global-nav-order"] });
    },
  });

  const uploadLogo = async (file: File): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `logo-${Date.now()}.${fileExt}`;
    const filePath = `logos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("site-assets")
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from("site-assets")
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  return {
    settings: settings ?? {
      id: "",
      logo_url: null,
      sidebar_color: "#1e2235",
      nav_order: DEFAULT_NAV_ORDER,
      show_signup_button: false,
      ui_theme: "classic",
      primary_color: null,
      instacena_gif_position: { x: 16, y: 80 },
      updated_at: new Date().toISOString(),
      updated_by: null,
    },
    isLoading,
    error,
    updateSettings,
    uploadLogo,
  };
}
