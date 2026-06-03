import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEnvironment } from "./useEnvironment";

export interface SiteSettings {
  id: string;
  logo_url: string | null;
  sidebar_color: string;
  transition_logo_url: string | null;
  nav_order: string[];
  show_signup_button: boolean;
  ui_theme: string;
  primary_color: string | null;
  instacena_gif_position: { x: number; y: number } | null;
  instacena_gif_size: number;
  instacena_gif_height: number | null;
  instacena_gif_url: string | null;
  instacena_gif_right_url: string | null;
  instacena_gif_right_position: { x: number; y: number } | null;
  instacena_gif_right_size: number;
  instacena_gif_right_height: number | null;
  instacena_gif_opacity: number;
  instacena_gif_right_opacity: number;
  screensaver_enabled: boolean;
  screensaver_timeout: number;
  login_background_url: string | null;
  login_particles_enabled: boolean;
  login_particles_color: string;
  login_particles_color2: string | null;
  login_particles_color3: string | null;
  login_particles_count: number;
  login_particles_speed: number;
  updated_at: string;
  updated_by: string | null;
}

const DEFAULT_SETTINGS: Omit<SiteSettings, "id" | "updated_at" | "updated_by"> & { id: string; updated_at: string; updated_by: null } = {
  id: "",
  logo_url: null,
  transition_logo_url: null,
  sidebar_color: "#1e2235",
  nav_order: [
    "atividades", "atividades-ii", "destaques", "campanhas", "dds", "documentos", "entrada-saida",
    "estoque", "lembretes", "parte-diaria", "presenca", "matriz", "pedidos", "rdo", "relatorio",
    "rh", "vistorias", "homologados", "vistoria-cintas", "arquivos-seguranca",
    "consumo-abastecimento", "plano-manutencao", "slides", "instacena", "inspecao-canteiro",
    "calendario-hydro", "games", "desvios", "emergencia"
  ],
  show_signup_button: false,
  ui_theme: "classic",
  primary_color: null,
  instacena_gif_position: { x: 16, y: 80 },
  instacena_gif_size: 200,
  instacena_gif_height: null,
  instacena_gif_url: null,
  instacena_gif_right_url: null,
  instacena_gif_right_position: { x: 1000, y: 80 },
  instacena_gif_right_size: 200,
  instacena_gif_right_height: null,
  instacena_gif_opacity: 1,
  instacena_gif_right_opacity: 1,
  screensaver_enabled: true,
  screensaver_timeout: 5,
  login_background_url: null,
  login_particles_enabled: true,
  login_particles_color: "white",
  login_particles_color2: null,
  login_particles_color3: null,
  login_particles_count: 100,
  login_particles_speed: 1.0,
  updated_at: new Date().toISOString(),
  updated_by: null,
};

export function useSiteSettings() {
  const queryClient = useQueryClient();
  const { environment } = useEnvironment();
  // Se não houver ambiente selecionado, tentamos buscar uma configuração global ou de Barcarena por padrão
  const currentEnv = environment || "barcarena";

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ["site-settings", currentEnv],
    queryFn: async (): Promise<SiteSettings> => {
      // Se não temos ambiente ainda, fazemos um fallback para Barcarena para carregar configs básicas como o botão de cadastro
      const envToFetch = currentEnv;

      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .eq("environment", envToFetch)
        .maybeSingle();

      if (error) {
        console.error("Error fetching site settings:", error);
        throw error;
      }

      if (!data) {
        return { ...DEFAULT_SETTINGS, environment: envToFetch } as any;
      }

      const navOrder = Array.isArray(data.nav_order) 
        ? (data.nav_order as unknown as string[]) 
        : DEFAULT_SETTINGS.nav_order;

      const d = data as any;
      return {
        ...data,
        nav_order: navOrder,
        ui_theme: d.ui_theme || "classic",
        primary_color: d.primary_color || null,
        instacena_gif_position: d.instacena_gif_position || { x: 16, y: 80 },
        instacena_gif_size: d.instacena_gif_size || 200,
        instacena_gif_height: d.instacena_gif_height || null,
        instacena_gif_url: d.instacena_gif_url || null,
        instacena_gif_right_url: d.instacena_gif_right_url || null,
        instacena_gif_right_position: d.instacena_gif_right_position || { x: 1000, y: 80 },
        instacena_gif_right_size: d.instacena_gif_right_size || 200,
        instacena_gif_right_height: d.instacena_gif_right_height || null,
        instacena_gif_opacity: d.instacena_gif_opacity ?? 1,
        instacena_gif_right_opacity: d.instacena_gif_right_opacity ?? 1,
        screensaver_enabled: d.screensaver_enabled ?? true,
        screensaver_timeout: d.screensaver_timeout ?? 5,
        login_background_url: d.login_background_url || null,
        login_particles_enabled: d.login_particles_enabled ?? true,
        login_particles_color: d.login_particles_color || "white",
        login_particles_count: d.login_particles_count ?? 100,
        login_particles_speed: d.login_particles_speed ?? 1.0,
        transition_logo_url: d.transition_logo_url || null,
      };
    },
    staleTime: 1000 * 60 * 5,
    retry: 2,
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<Omit<SiteSettings, "id" | "updated_at" | "updated_by">>) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (settings?.id) {
        const { error } = await supabase
          .from("site_settings")
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
            updated_by: user?.id,
          })
          .eq("id", settings.id);

        if (error) throw error;
      } else {
        // Criar novas configurações para este ambiente se não existirem
        const { error } = await supabase
          .from("site_settings")
          .insert({
            ...DEFAULT_SETTINGS,
            ...updates,
            environment: currentEnv,
            updated_at: new Date().toISOString(),
            updated_by: user?.id,
          });

        if (error) throw error;
      }
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
    settings: settings ?? { ...DEFAULT_SETTINGS },
    isLoading,
    error,
    updateSettings,
    uploadLogo,
  };
}
