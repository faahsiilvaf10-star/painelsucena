import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export interface MusicTrack {
  id: string;
  title: string;
  artist: string | null;
  file_url: string;
  file_name: string;
  duration_seconds: number | null;
  sort_order: number;
  created_at: string;
}

export const useMusicTracks = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["music-tracks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_tracks")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as MusicTrack[];
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("music-tracks-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "music_tracks" }, () => {
        queryClient.invalidateQueries({ queryKey: ["music-tracks"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return query;
};

export const useUploadMusicTrack = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, title, artist }: { file: File; title: string; artist?: string }) => {
      const ext = file.name.split(".").pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("music-files")
        .upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("music-files")
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from("music_tracks")
        .insert({
          title,
          artist: artist || null,
          file_url: urlData.publicUrl,
          file_name: file.name,
          uploaded_by: (await supabase.auth.getUser()).data.user?.id,
        });
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["music-tracks"] });
    },
  });
};

export const useDeleteMusicTrack = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (track: MusicTrack) => {
      // Extract file path from URL
      const urlParts = track.file_url.split("/music-files/");
      if (urlParts[1]) {
        await supabase.storage.from("music-files").remove([urlParts[1]]);
      }
      const { error } = await supabase.from("music_tracks").delete().eq("id", track.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["music-tracks"] });
    },
  });
};
