import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface UserPreferences {
  id: string;
  user_id: string;
  sidebar_color: string;
  sidebar_font_color: string;
  active_tab_color: string;
  page_background_color: string;
  notification_sound: string;
  created_at: string;
  updated_at: string;
}

const DEFAULT_PREFERENCES: Omit<UserPreferences, "id" | "user_id" | "created_at" | "updated_at"> = {
  sidebar_color: "#1e2235",
  sidebar_font_color: "#f8fafc",
  active_tab_color: "#f5a524",
  page_background_color: "#0f1419",
  notification_sound: "default",
};

export const NOTIFICATION_SOUNDS = [
  { id: "default", label: "Padrão (MSN)", file: "/sounds/notification.mp3" },
  { id: "chime", label: "Sino", file: "/sounds/chime.mp3" },
  { id: "pop", label: "Pop", file: "/sounds/pop.mp3" },
  { id: "ding", label: "Ding", file: "/sounds/ding.mp3" },
  { id: "none", label: "Sem som", file: null },
];

export function useUserPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: preferences, isLoading, error } = useQuery({
    queryKey: ["user-preferences", user?.id],
    queryFn: async (): Promise<UserPreferences> => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching user preferences:", error);
        throw error;
      }

      // If no preferences exist, create default ones
      if (!data) {
        const { data: newData, error: insertError } = await supabase
          .from("user_preferences")
          .insert({
            user_id: user.id,
            ...DEFAULT_PREFERENCES,
          })
          .select()
          .single();

        if (insertError) {
          console.error("Error creating user preferences:", insertError);
          throw insertError;
        }

        return newData as UserPreferences;
      }

      return data as UserPreferences;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  const updatePreferences = useMutation({
    mutationFn: async (updates: Partial<Omit<UserPreferences, "id" | "user_id" | "created_at" | "updated_at">>) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("user_preferences")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-preferences", user?.id] });
    },
  });

  const playNotificationSound = (soundId?: string) => {
    const id = soundId || preferences?.notification_sound || "default";
    const sound = NOTIFICATION_SOUNDS.find((s) => s.id === id);
    
    if (sound?.file) {
      const audio = new Audio(sound.file);
      audio.volume = 0.5;
      audio.play().catch((err) => {
        console.log("Audio play failed:", err);
      });
    }
  };

  return {
    preferences: preferences ?? {
      id: "",
      user_id: user?.id ?? "",
      ...DEFAULT_PREFERENCES,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    isLoading,
    error,
    updatePreferences,
    playNotificationSound,
  };
}
