import { createContext, useContext, useState, useRef, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PlaylistTrack {
  id: string;
  file_url: string;
  file_name: string;
  time_slot: number;
}

interface RadioContextType {
  isPlaying: boolean;
  volume: number;
  setVolume: (v: number) => void;
  currentTrack: PlaylistTrack | null;
  playlistTracks: PlaylistTrack[];
  toggleRadio: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  currentHour: number;
}

const RadioContext = createContext<RadioContextType | null>(null);

export const useRadio = () => {
  const context = useContext(RadioContext);
  if (!context) {
    return {
      isPlaying: false, volume: 0.5, setVolume: () => {},
      currentTrack: null, playlistTracks: [], toggleRadio: () => {},
      nextTrack: () => {}, prevTrack: () => {}, currentHour: new Date().getHours(),
    };
  }
  return context;
};

function getCurrentHour(): number {
  return new Date().getHours();
}

let globalAudio: HTMLAudioElement | null = null;

export const RadioProvider = ({ children }: { children: ReactNode }) => {
  const [isPlaying, setIsPlaying] = useState(() => {
    try { return localStorage.getItem("radio_playing") === "true"; } catch { return false; }
  });
  const [volume, setVolumeState] = useState(() => {
    try { return parseFloat(localStorage.getItem("radio_volume") || "0.5"); } catch { return 0.5; }
  });
  const [allTracks, setAllTracks] = useState<PlaylistTrack[]>([]);
  const [currentHour, setCurrentHour] = useState(getCurrentHour);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const userInteractedRef = useRef(false);

  const playlistTracks = allTracks.filter(t => t.time_slot === currentHour);
  const currentTrack = playlistTracks.length > 0
    ? playlistTracks[currentTrackIndex % playlistTracks.length] || null
    : null;

  // Load tracks
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("music_tracks")
        .select("id, file_url, file_name, time_slot")
        .order("time_slot")
        .order("created_at");
      if (data) setAllTracks(data as PlaylistTrack[]);
    };
    load();
    const channel = supabase
      .channel("radio-music-tracks")
      .on("postgres_changes", { event: "*", schema: "public", table: "music_tracks" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Check hour change every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      const hour = getCurrentHour();
      if (hour !== currentHour) {
        setCurrentHour(hour);
        setCurrentTrackIndex(0);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [currentHour]);

  // Persist state
  useEffect(() => { localStorage.setItem("radio_playing", String(isPlaying)); }, [isPlaying]);
  useEffect(() => { localStorage.setItem("radio_volume", String(volume)); }, [volume]);

  const currentTrackUrlRef = useRef<string | null>(null);

  // Always keep audio playing — mute/unmute on toggle
  useEffect(() => {
    if (playlistTracks.length === 0) {
      if (globalAudio) { globalAudio.pause(); }
      currentTrackUrlRef.current = null;
      return;
    }

    const track = playlistTracks[currentTrackIndex % playlistTracks.length];
    if (!track) return;

    // Only create new audio if the track URL actually changed
    if (currentTrackUrlRef.current === track.file_url && globalAudio) {
      return; // already playing this track
    }

    // Different track — destroy old, create new
    if (globalAudio) { globalAudio.pause(); globalAudio.removeAttribute("src"); globalAudio.load(); }
    globalAudio = new Audio(track.file_url);
    globalAudio.volume = isPlaying ? volume : 0;
    currentTrackUrlRef.current = track.file_url;

    const handleEnded = () => {
      setCurrentTrackIndex(prev => (prev + 1) % playlistTracks.length);
    };
    globalAudio.addEventListener("ended", handleEnded);

    // Always play — audio runs continuously like a live radio
    globalAudio.play().catch(err => {
      console.log("Playback failed:", err);
      if (!userInteractedRef.current) {
        const handler = () => {
          userInteractedRef.current = true;
          if (globalAudio) globalAudio.play().catch(() => {});
          document.removeEventListener("click", handler);
          document.removeEventListener("touchstart", handler);
        };
        document.addEventListener("click", handler, { once: true });
        document.addEventListener("touchstart", handler, { once: true });
      }
    });

    return () => {
      globalAudio?.removeEventListener("ended", handleEnded);
    };
  }, [currentTrackIndex, currentHour, playlistTracks.length]);

  // Mute/unmute on play/pause toggle — audio keeps running
  useEffect(() => {
    if (!globalAudio) return;
    globalAudio.volume = isPlaying ? volume : 0;
  }, [isPlaying]);

  // Volume sync — only apply real volume when "playing" (unmuted)
  useEffect(() => {
    if (globalAudio && isPlaying) globalAudio.volume = volume;
  }, [volume, isPlaying]);

  const setVolume = useCallback((v: number) => {
    setVolumeState(Math.max(0, Math.min(1, v)));
  }, []);

  const toggleRadio = useCallback(() => {
    userInteractedRef.current = true;
    setIsPlaying(prev => !prev);
  }, []);

  const nextTrack = useCallback(() => {
    if (playlistTracks.length === 0) return;
    setCurrentTrackIndex(prev => (prev + 1) % playlistTracks.length);
  }, [playlistTracks.length]);

  const prevTrack = useCallback(() => {
    if (playlistTracks.length === 0) return;
    setCurrentTrackIndex(prev => prev === 0 ? playlistTracks.length - 1 : prev - 1);
  }, [playlistTracks.length]);

  return (
    <RadioContext.Provider value={{
      isPlaying, volume, setVolume, currentTrack, playlistTracks,
      toggleRadio, nextTrack, prevTrack, currentHour,
    }}>
      {children}
    </RadioContext.Provider>
  );
};
