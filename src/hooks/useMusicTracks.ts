import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export interface MusicTrack {
  id: string;
  file_url: string;
  file_name: string;
  time_slot: number;
  created_at: string;
}

export const TIME_SLOT_LABELS = Array.from({ length: 24 }, (_, i) => {
  const start = `${String(i).padStart(2, "0")}:00`;
  const end = `${String((i + 1) % 24).padStart(2, "0")}:00`;
  return { value: i, label: `${start} - ${end}` };
});

export const useMusicTracks = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["music-tracks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_tracks")
        .select("*")
        .order("time_slot", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as MusicTrack[];
    },
  });

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
    mutationFn: async ({ file, timeSlot }: { file: File; timeSlot: number }) => {
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
          file_url: urlData.publicUrl,
          file_name: file.name,
          time_slot: timeSlot,
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
