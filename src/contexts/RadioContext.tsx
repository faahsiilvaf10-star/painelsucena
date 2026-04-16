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
  shuffleAll: boolean;
  setShuffleAll: (v: boolean) => void;
}

const RadioContext = createContext<RadioContextType | null>(null);

export const useRadio = () => {
  const context = useContext(RadioContext);
  if (!context) {
    return {
      isPlaying: false, volume: 0.5, setVolume: () => {},
      currentTrack: null, playlistTracks: [], toggleRadio: () => {},
      nextTrack: () => {}, prevTrack: () => {}, currentHour: new Date().getHours(),
      shuffleAll: false, setShuffleAll: () => {},
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
  const [shuffleAll, setShuffleAllState] = useState(() => {
    try { return localStorage.getItem("radio_shuffle_all") === "true"; } catch { return false; }
  });
  const [shuffledOrder, setShuffledOrder] = useState<number[]>([]);
  const userInteractedRef = useRef(false);

  // When shuffle mode or tracks change, build a shuffled index array
  useEffect(() => {
    if (shuffleAll && allTracks.length > 0) {
      const indices = Array.from({ length: allTracks.length }, (_, i) => i);
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      setShuffledOrder(indices);
      setCurrentTrackIndex(0);
    } else if (!shuffleAll) {
      setShuffledOrder([]);
    }
  }, [shuffleAll, allTracks.length]);

  const activeTracks = shuffleAll ? allTracks : allTracks.filter(t => t.time_slot === currentHour);
  const playlistTracks = activeTracks;

  const currentTrack = (() => {
    if (shuffleAll) {
      if (allTracks.length === 0) return null;
      if (shuffledOrder.length > 0) {
        const idx = shuffledOrder[currentTrackIndex % shuffledOrder.length];
        return allTracks[idx] || allTracks[0];
      }
      // Fallback: shuffledOrder not yet built, pick first track
      return allTracks[currentTrackIndex % allTracks.length] || null;
    }
    if (activeTracks.length === 0) return null;
    return activeTracks[currentTrackIndex % activeTracks.length] || null;
  })();

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
  useEffect(() => { localStorage.setItem("radio_shuffle_all", String(shuffleAll)); }, [shuffleAll]);

  const setShuffleAll = useCallback((v: boolean) => {
    setShuffleAllState(v);
  }, []);

  const currentTrackUrlRef = useRef<string | null>(null);

  // Always keep audio playing — mute/unmute on toggle
  useEffect(() => {
    if (!currentTrack) {
      if (globalAudio) { globalAudio.pause(); }
      currentTrackUrlRef.current = null;
      return;
    }

    // Only create new audio if the track URL actually changed
    if (currentTrackUrlRef.current === currentTrack.file_url && globalAudio) {
      return;
    }

    // Different track — destroy old, create new
    if (globalAudio) { globalAudio.pause(); globalAudio.removeAttribute("src"); globalAudio.load(); }
    globalAudio = new Audio(currentTrack.file_url);
    globalAudio.volume = isPlaying ? volume : 0;
    currentTrackUrlRef.current = currentTrack.file_url;

    const len = shuffleAll ? shuffledOrder.length : activeTracks.length;
    const handleEnded = () => {
      if (len > 0) setCurrentTrackIndex(prev => (prev + 1) % len);
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
  }, [currentTrack?.file_url, shuffleAll]);

  // Mute/unmute on play/pause toggle — audio keeps running
  useEffect(() => {
    if (!globalAudio) return;
    globalAudio.volume = isPlaying ? volume : 0;
  }, [isPlaying]);

  // Volume sync
  useEffect(() => {
    if (globalAudio) globalAudio.volume = volume;
  }, [volume]);

  const setVolume = useCallback((v: number) => {
    setVolumeState(Math.max(0, Math.min(1, v)));
  }, []);

  const toggleRadio = useCallback(() => {
    userInteractedRef.current = true;
    setIsPlaying(prev => !prev);
  }, []);

  const totalLen = shuffleAll ? shuffledOrder.length : playlistTracks.length;

  const nextTrack = useCallback(() => {
    if (totalLen === 0) return;
    setCurrentTrackIndex(prev => (prev + 1) % totalLen);
  }, [totalLen]);

  const prevTrack = useCallback(() => {
    if (totalLen === 0) return;
    setCurrentTrackIndex(prev => prev === 0 ? totalLen - 1 : prev - 1);
  }, [totalLen]);

  return (
    <RadioContext.Provider value={{
      isPlaying, volume, setVolume, currentTrack, playlistTracks,
      toggleRadio, nextTrack, prevTrack, currentHour,
      shuffleAll, setShuffleAll,
    }}>
      {children}
    </RadioContext.Provider>
  );
};
