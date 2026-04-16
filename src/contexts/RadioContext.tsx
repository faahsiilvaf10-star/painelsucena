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

// Deterministic seeded shuffle — all clients get the same order for the same day
function getDailySeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  const random = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
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
  const [shuffleAll, setShuffleAllState] = useState(() => {
    try { return localStorage.getItem("radio_shuffle_all") === "true"; } catch { return false; }
  });
  const [syncedTrackId, setSyncedTrackId] = useState<string | null>(null);
  const [syncedStartedAt, setSyncedStartedAt] = useState<string | null>(null);
  const userInteractedRef = useRef(false);
  const currentTrackUrlRef = useRef<string | null>(null);
  const advancingRef = useRef(false);
  const allTracksRef = useRef<PlaylistTrack[]>([]);
  const shuffleAllRef = useRef(shuffleAll);
  const currentHourRef = useRef(currentHour);

  // Keep refs in sync
  useEffect(() => { allTracksRef.current = allTracks; }, [allTracks]);
  useEffect(() => { shuffleAllRef.current = shuffleAll; }, [shuffleAll]);
  useEffect(() => { currentHourRef.current = currentHour; }, [currentHour]);

  // Build deterministic playlist for display
  const playlist = shuffleAll
    ? seededShuffle(allTracks, getDailySeed())
    : allTracks.filter(t => t.time_slot === currentHour);

  // Current track comes from DB state — look up in ALL tracks
  const currentTrack = allTracks.find(t => t.id === syncedTrackId) || null;

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

  // Load & subscribe to radio_now_playing (live sync)
  useEffect(() => {
    const loadState = async () => {
      const { data } = await supabase
        .from("radio_now_playing" as any)
        .select("track_id, started_at")
        .eq("id", "singleton")
        .maybeSingle();
      if (data) {
        setSyncedTrackId((data as any).track_id);
        setSyncedStartedAt((data as any).started_at);
      }
    };
    loadState();

    const channel = supabase
      .channel("radio-now-playing")
      .on("postgres_changes", { event: "*", schema: "public", table: "radio_now_playing" }, (payload) => {
        const row = payload.new as any;
        if (row?.track_id) {
          setSyncedTrackId(row.track_id);
          setSyncedStartedAt(row.started_at);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Helper: get current playlist from refs (avoids stale closures)
  const getPlaylist = useCallback(() => {
    const tracks = allTracksRef.current;
    if (shuffleAllRef.current) return seededShuffle(tracks, getDailySeed());
    return tracks.filter(t => t.time_slot === currentHourRef.current);
  }, []);

  // Advance to a specific track in the DB
  const advanceToTrack = useCallback(async (trackId: string) => {
    if (advancingRef.current) return;
    advancingRef.current = true;
    try {
      const now = new Date().toISOString();
      await supabase
        .from("radio_now_playing" as any)
        .upsert({ id: "singleton", track_id: trackId, started_at: now, updated_at: now } as any, { onConflict: "id" });
      setSyncedTrackId(trackId);
      setSyncedStartedAt(now);
    } finally {
      advancingRef.current = false;
    }
  }, []);

  // When tracks load and no synced track exists, initialize with the first track
  useEffect(() => {
    if (allTracks.length > 0 && !syncedTrackId) {
      const pl = getPlaylist();
      if (pl.length > 0) advanceToTrack(pl[0].id);
    }
  }, [allTracks.length, syncedTrackId]);

  // Audio playback — sync to the DB-provided track and seek to correct position
  useEffect(() => {
    if (!currentTrack) {
      if (globalAudio) { globalAudio.pause(); }
      currentTrackUrlRef.current = null;
      return;
    }

    // Same track already playing — don't restart
    if (currentTrackUrlRef.current === currentTrack.file_url && globalAudio) {
      return;
    }

    // Destroy old audio
    if (globalAudio) { globalAudio.pause(); globalAudio.removeAttribute("src"); globalAudio.load(); }

    globalAudio = new Audio(currentTrack.file_url);
    globalAudio.volume = isPlaying ? volume : 0;
    currentTrackUrlRef.current = currentTrack.file_url;

    const handleLoaded = () => {
      if (!globalAudio || !syncedStartedAt) return;
      const elapsed = (Date.now() - new Date(syncedStartedAt).getTime()) / 1000;
      if (globalAudio.duration && elapsed > 0 && elapsed < globalAudio.duration) {
        globalAudio.currentTime = elapsed;
      } else if (globalAudio.duration && elapsed >= globalAudio.duration) {
        // Track should have already ended — advance
        advanceNext();
        return;
      }
    };

    const advanceNext = () => {
      const pl = getPlaylist();
      if (pl.length === 0) return;
      const idx = pl.findIndex(t => t.id === currentTrack.id);
      const nextIdx = idx < 0 ? 0 : (idx + 1) % pl.length;
      advanceToTrack(pl[nextIdx].id);
    };

    globalAudio.addEventListener("loadedmetadata", handleLoaded);
    globalAudio.addEventListener("ended", advanceNext);

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
      globalAudio?.removeEventListener("loadedmetadata", handleLoaded);
      globalAudio?.removeEventListener("ended", advanceNext);
    };
  }, [currentTrack?.file_url, syncedStartedAt]);

  // Mute/unmute on play/pause toggle — audio keeps running for sync
  useEffect(() => {
    if (globalAudio) globalAudio.volume = isPlaying ? volume : 0;
  }, [isPlaying]);

  // Volume sync
  useEffect(() => {
    if (globalAudio && isPlaying) globalAudio.volume = volume;
  }, [volume]);

  // Check hour change every 60s
  useEffect(() => {
    const interval = setInterval(() => {
      const hour = getCurrentHour();
      if (hour !== currentHour) setCurrentHour(hour);
    }, 60000);
    return () => clearInterval(interval);
  }, [currentHour]);

  // Persist local prefs
  useEffect(() => { localStorage.setItem("radio_playing", String(isPlaying)); }, [isPlaying]);
  useEffect(() => { localStorage.setItem("radio_volume", String(volume)); }, [volume]);
  useEffect(() => { localStorage.setItem("radio_shuffle_all", String(shuffleAll)); }, [shuffleAll]);

  const setShuffleAll = useCallback((v: boolean) => setShuffleAllState(v), []);
  const setVolume = useCallback((v: number) => setVolumeState(Math.max(0, Math.min(1, v))), []);

  const toggleRadio = useCallback(() => {
    userInteractedRef.current = true;
    setIsPlaying(prev => !prev);
  }, []);

  const nextTrackFn = useCallback(() => {
    const pl = getPlaylist();
    const trackId = syncedTrackId;
    if (pl.length === 0) return;
    const idx = pl.findIndex(t => t.id === trackId);
    const nextIdx = idx < 0 ? 0 : (idx + 1) % pl.length;
    advanceToTrack(pl[nextIdx].id);
  }, [syncedTrackId, getPlaylist, advanceToTrack]);

  const prevTrackFn = useCallback(() => {
    const pl = getPlaylist();
    const trackId = syncedTrackId;
    if (pl.length === 0) return;
    const idx = pl.findIndex(t => t.id === trackId);
    const prevIdx = idx <= 0 ? pl.length - 1 : idx - 1;
    advanceToTrack(pl[prevIdx].id);
  }, [syncedTrackId, getPlaylist, advanceToTrack]);

  return (
    <RadioContext.Provider value={{
      isPlaying, volume, setVolume, currentTrack, playlistTracks: playlist,
      toggleRadio, nextTrack: nextTrackFn, prevTrack: prevTrackFn, currentHour,
      shuffleAll, setShuffleAll,
    }}>
      {children}
    </RadioContext.Provider>
  );
};
