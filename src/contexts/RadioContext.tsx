import { createContext, useContext, useState, useRef, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PlaylistTrack {
  id: string;
  file_url: string;
  file_name: string;
  time_slot: number;
}

interface RadioState {
  track_id: string;
  started_at: string;
  queue: string[];
  played_ids: string[];
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

/** Fisher-Yates shuffle (random, not seeded) */
function shuffleArray<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
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

  // Synced state from DB
  const [syncedTrackId, setSyncedTrackId] = useState<string | null>(null);
  const [syncedStartedAt, setSyncedStartedAt] = useState<string | null>(null);
  const [syncedQueue, setSyncedQueue] = useState<string[]>([]);
  const [syncedPlayed, setSyncedPlayed] = useState<string[]>([]);

  const userInteractedRef = useRef(false);
  const currentTrackUrlRef = useRef<string | null>(null);
  const advancingRef = useRef(false);
  const allTracksRef = useRef<PlaylistTrack[]>([]);
  const syncedQueueRef = useRef<string[]>([]);
  const syncedPlayedRef = useRef<string[]>([]);

  // Keep refs in sync
  useEffect(() => { allTracksRef.current = allTracks; }, [allTracks]);
  useEffect(() => { syncedQueueRef.current = syncedQueue; }, [syncedQueue]);
  useEffect(() => { syncedPlayedRef.current = syncedPlayed; }, [syncedPlayed]);

  // Current track from DB state
  const currentTrack = allTracks.find(t => t.id === syncedTrackId) || null;
  const playlistTracks = allTracks;

  // ─── Load tracks ───
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

  // ─── Load & subscribe to radio_now_playing ───
  useEffect(() => {
    const loadState = async () => {
      const { data } = await supabase
        .from("radio_now_playing" as any)
        .select("track_id, started_at, queue, played_ids")
        .eq("id", "singleton")
        .maybeSingle();
      if (data) {
        const d = data as any;
        setSyncedTrackId(d.track_id);
        setSyncedStartedAt(d.started_at);
        setSyncedQueue(Array.isArray(d.queue) ? d.queue : []);
        setSyncedPlayed(Array.isArray(d.played_ids) ? d.played_ids : []);
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
          setSyncedQueue(Array.isArray(row.queue) ? row.queue : []);
          setSyncedPlayed(Array.isArray(row.played_ids) ? row.played_ids : []);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // ─── Build a new shuffled queue from all tracks, excluding already-played ───
  const buildQueue = useCallback((tracks: PlaylistTrack[], played: string[], excludeId?: string): string[] => {
    // Find tracks not yet played in this cycle
    const playedSet = new Set(played);
    if (excludeId) playedSet.add(excludeId);
    let remaining = tracks.filter(t => !playedSet.has(t.id)).map(t => t.id);

    if (remaining.length === 0) {
      // All tracks played — start a new cycle with fresh shuffle
      remaining = tracks.map(t => t.id);
      // Avoid starting with the same track that just finished
      if (excludeId && remaining.length > 1) {
        remaining = remaining.filter(id => id !== excludeId);
      }
    }

    return shuffleArray(remaining);
  }, []);

  // ─── Write state to DB ───
  const writeState = useCallback(async (trackId: string, queue: string[], playedIds: string[]) => {
    if (advancingRef.current) return;
    advancingRef.current = true;
    try {
      const now = new Date().toISOString();
      await supabase
        .from("radio_now_playing" as any)
        .upsert({
          id: "singleton",
          track_id: trackId,
          started_at: now,
          updated_at: now,
          queue: queue,
          played_ids: playedIds,
        } as any, { onConflict: "id" });
      setSyncedTrackId(trackId);
      setSyncedStartedAt(now);
      setSyncedQueue(queue);
      setSyncedPlayed(playedIds);
    } finally {
      advancingRef.current = false;
    }
  }, []);

  // ─── Advance to next track (pop from queue, add current to played) ───
  const advanceNext = useCallback(() => {
    const tracks = allTracksRef.current;
    if (tracks.length === 0) return;

    let queue = [...syncedQueueRef.current];
    let played = [...syncedPlayedRef.current];

    // Add current track to played history
    const currentId = currentTrackUrlRef.current
      ? tracks.find(t => t.file_url === currentTrackUrlRef.current)?.id
      : null;
    if (currentId && !played.includes(currentId)) {
      played.push(currentId);
    }

    // If queue is empty or all played → new cycle
    if (queue.length === 0) {
      // Check if all tracks have been played
      if (played.length >= tracks.length) {
        // Full cycle complete — reset played, new shuffle
        played = [];
      }
      queue = buildQueue(tracks, played, currentId || undefined);
    }

    // Also inject any NEW tracks that weren't in played and aren't in queue
    const knownIds = new Set([...played, ...queue]);
    const newTracks = tracks.filter(t => !knownIds.has(t.id)).map(t => t.id);
    if (newTracks.length > 0) {
      // Insert new tracks at random positions in the queue
      for (const id of newTracks) {
        const pos = Math.floor(Math.random() * (queue.length + 1));
        queue.splice(pos, 0, id);
      }
    }

    if (queue.length === 0) return;

    const nextId = queue.shift()!;
    writeState(nextId, queue, played);
  }, [buildQueue, writeState]);

  // ─── Initialize when tracks load and no state exists ───
  useEffect(() => {
    if (allTracks.length > 0 && !syncedTrackId) {
      const queue = buildQueue(allTracks, []);
      if (queue.length > 0) {
        const firstId = queue.shift()!;
        writeState(firstId, queue, []);
      }
    }
  }, [allTracks.length, syncedTrackId]);

  // ─── Inject new tracks into existing queue when track list grows ───
  useEffect(() => {
    if (allTracks.length === 0 || !syncedTrackId) return;
    const knownIds = new Set([...syncedPlayed, ...syncedQueue, syncedTrackId]);
    const newTracks = allTracks.filter(t => !knownIds.has(t.id)).map(t => t.id);
    if (newTracks.length > 0) {
      const updatedQueue = [...syncedQueue];
      for (const id of newTracks) {
        const pos = Math.floor(Math.random() * (updatedQueue.length + 1));
        updatedQueue.splice(pos, 0, id);
      }
      // Update queue in DB without changing current track
      const now = new Date().toISOString();
      supabase
        .from("radio_now_playing" as any)
        .update({ queue: updatedQueue, updated_at: now } as any)
        .eq("id", "singleton")
        .then(() => {
          setSyncedQueue(updatedQueue);
        });
    }
  }, [allTracks.length]);

  // ─── Audio playback — sync to DB track with seek ───
  useEffect(() => {
    if (!currentTrack) {
      if (globalAudio) { globalAudio.pause(); }
      currentTrackUrlRef.current = null;
      return;
    }

    if (currentTrackUrlRef.current === currentTrack.file_url && globalAudio) {
      return;
    }

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
        advanceNext();
        return;
      }
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

  // Mute/unmute
  useEffect(() => {
    if (globalAudio) globalAudio.volume = isPlaying ? volume : 0;
  }, [isPlaying]);

  useEffect(() => {
    if (globalAudio && isPlaying) globalAudio.volume = volume;
  }, [volume]);

  // Hour check
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
    advanceNext();
  }, [advanceNext]);

  const prevTrackFn = useCallback(() => {
    // Go back to the last played track
    const played = [...syncedPlayedRef.current];
    if (played.length === 0) return;
    const prevId = played.pop()!;
    const queue = [syncedTrackId!, ...syncedQueueRef.current].filter(Boolean);
    writeState(prevId, queue, played);
  }, [syncedTrackId, writeState]);

  return (
    <RadioContext.Provider value={{
      isPlaying, volume, setVolume, currentTrack, playlistTracks,
      toggleRadio, nextTrack: nextTrackFn, prevTrack: prevTrackFn, currentHour,
      shuffleAll, setShuffleAll,
    }}>
      {children}
    </RadioContext.Provider>
  );
};
