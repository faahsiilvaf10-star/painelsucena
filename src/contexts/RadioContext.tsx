import { createContext, useContext, useState, useRef, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const RADIO_STATIONS = [
  { id: "pop-hits", name: "Pop Hits", genre: "Pop/Internacional", url: "https://live.hunter.fm/pop_high" },
  { id: "liberal", name: "Liberal FM", genre: "Hits", url: "https://stream.zeno.fm/4d6hhyp8cv8uv" },
  { id: "reggaeton", name: "Reggaeton", genre: "Reggaeton", url: "https://stream.zeno.fm/8wup8yd9dm0uv" },
  { id: "sertanejo", name: "Sertaneja Hits", genre: "Sertanejo", url: "https://live.hunter.fm/sertanejo_high" },
  { id: "pagode", name: "Pagode Hits", genre: "Pagode", url: "https://live.hunter.fm/pagode_high" },
  { id: "gospel", name: "Gospel", genre: "Gospel", url: "https://stream.zeno.fm/yn65fsaurfhvv" },
  { id: "piseiro", name: "Piseiro", genre: "Piseiro", url: "https://stream.zeno.fm/f3wvnrg2e98uv" },
];

// Special playlist station ID
const PLAYLIST_STATION_ID = "my-playlist";
const PLAYLIST_STATION = {
  id: PLAYLIST_STATION_ID,
  name: "Minhas Músicas",
  genre: "Playlist",
  url: "",
};

export type RadioStation = typeof RADIO_STATIONS[0];

interface PlaylistTrack {
  id: string;
  title: string;
  artist: string | null;
  file_url: string;
}

interface RadioContextType {
  isPlaying: boolean;
  isMuted: boolean;
  selectedStation: RadioStation;
  stations: RadioStation[];
  toggleRadio: () => void;
  changeStation: (station: RadioStation) => void;
  isRadioActive: boolean;
  // Playlist-specific
  isPlaylist: boolean;
  currentTrack: PlaylistTrack | null;
  playlistTracks: PlaylistTrack[];
  nextTrack: () => void;
  prevTrack: () => void;
}

const RadioContext = createContext<RadioContextType | null>(null);

const getSavedStation = (): RadioStation => {
  try {
    const saved = localStorage.getItem("radio_station");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.id === PLAYLIST_STATION_ID) return PLAYLIST_STATION;
      const found = RADIO_STATIONS.find(s => s.id === parsed.id);
      if (found) return found;
    }
  } catch (e) {
    console.log("Error loading saved station");
  }
  return RADIO_STATIONS[0];
};

const getSavedPlayingState = (): boolean => {
  try {
    return localStorage.getItem("radio_playing") === "true";
  } catch (e) {
    return false;
  }
};

export const useRadio = () => {
  const context = useContext(RadioContext);
  if (!context) {
    return {
      isPlaying: false,
      isMuted: false,
      selectedStation: RADIO_STATIONS[0],
      stations: RADIO_STATIONS,
      toggleRadio: () => {},
      changeStation: () => {},
      isRadioActive: false,
      isPlaylist: false,
      currentTrack: null,
      playlistTracks: [],
      nextTrack: () => {},
      prevTrack: () => {},
    };
  }
  return context;
};

// Global singleton audio to survive HMR / re-mounts
let globalAudio: HTMLAudioElement | null = null;
let globalAudioStation: string | null = null;

function getOrCreateAudio(url: string, stationId: string): HTMLAudioElement {
  if (globalAudio && globalAudioStation === stationId && !stationId.startsWith("playlist-")) {
    return globalAudio;
  }
  if (globalAudio) {
    globalAudio.pause();
    globalAudio.removeAttribute("src");
    globalAudio.load();
    globalAudio = null;
  }
  globalAudio = new Audio(url);
  globalAudio.volume = 0.5;
  globalAudioStation = stationId;
  return globalAudio;
}

export const RadioProvider = ({ children }: { children: ReactNode }) => {
  const [isPlaying, setIsPlaying] = useState(getSavedPlayingState);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedStation, setSelectedStation] = useState(getSavedStation);
  const hasInitializedRef = useRef(false);
  const userInteractedRef = useRef(false);

  // Playlist state
  const [playlistTracks, setPlaylistTracks] = useState<PlaylistTrack[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const isPlaylist = selectedStation.id === PLAYLIST_STATION_ID;
  const currentTrack = isPlaylist && playlistTracks.length > 0 ? playlistTracks[currentTrackIndex] || null : null;

  // Build stations list including playlist if tracks exist
  const allStations = [...RADIO_STATIONS, ...(playlistTracks.length > 0 ? [PLAYLIST_STATION] : [])];

  // Load playlist tracks from DB
  useEffect(() => {
    const loadTracks = async () => {
      const { data } = await supabase
        .from("music_tracks")
        .select("id, title, artist, file_url")
        .order("sort_order")
        .order("created_at");
      if (data) setPlaylistTracks(data);
    };
    loadTracks();

    const channel = supabase
      .channel("radio-music-tracks")
      .on("postgres_changes", { event: "*", schema: "public", table: "music_tracks" }, () => {
        loadTracks();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Save state
  useEffect(() => {
    localStorage.setItem("radio_playing", String(isPlaying && !isMuted));
  }, [isPlaying, isMuted]);

  useEffect(() => {
    localStorage.setItem("radio_station", JSON.stringify(selectedStation));
  }, [selectedStation]);

  // Handle playlist track ended -> play next
  useEffect(() => {
    if (!isPlaylist || !globalAudio) return;
    const handleEnded = () => {
      setCurrentTrackIndex(prev => {
        const next = (prev + 1) % playlistTracks.length;
        return next;
      });
    };
    globalAudio.addEventListener("ended", handleEnded);
    return () => {
      globalAudio?.removeEventListener("ended", handleEnded);
    };
  }, [isPlaylist, playlistTracks.length]);

  // Play playlist track when index changes
  useEffect(() => {
    if (!isPlaylist || playlistTracks.length === 0) return;
    if (!isPlaying || isMuted) return;

    const track = playlistTracks[currentTrackIndex];
    if (!track) return;

    const audio = getOrCreateAudio(track.file_url, `playlist-${track.id}`);

    // Re-attach ended listener
    const handleEnded = () => {
      setCurrentTrackIndex(prev => (prev + 1) % playlistTracks.length);
    };
    audio.addEventListener("ended", handleEnded);

    audio.play().catch(err => console.log("Playlist playback failed:", err));

    return () => {
      audio.removeEventListener("ended", handleEnded);
    };
  }, [currentTrackIndex, isPlaylist, playlistTracks, isPlaying, isMuted]);

  // Initialize audio (stream stations only)
  useEffect(() => {
    if (isPlaylist) return; // Playlist handled separately
    const audio = getOrCreateAudio(selectedStation.url, selectedStation.id);

    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      if (isPlaying) {
        const tryAutoplay = async () => {
          try {
            await audio.play();
            userInteractedRef.current = true;
          } catch {
            const handleFirstInteraction = async () => {
              if (!userInteractedRef.current && globalAudio && isPlaying && !isMuted) {
                userInteractedRef.current = true;
                try { await globalAudio.play(); } catch {}
              }
              document.removeEventListener("click", handleFirstInteraction);
              document.removeEventListener("keydown", handleFirstInteraction);
              document.removeEventListener("touchstart", handleFirstInteraction);
            };
            document.addEventListener("click", handleFirstInteraction, { once: true });
            document.addEventListener("keydown", handleFirstInteraction, { once: true });
            document.addEventListener("touchstart", handleFirstInteraction, { once: true });
          }
        };
        tryAutoplay();
      }
    }
  }, []);

  // Handle play/pause for stream stations
  useEffect(() => {
    if (isPlaylist) return;
    if (!hasInitializedRef.current || !globalAudio) return;

    if (isPlaying && !isMuted) {
      globalAudio.play().catch(err => console.log("Playback failed:", err));
    } else {
      globalAudio.pause();
    }
  }, [isPlaying, isMuted, isPlaylist]);

  // Handle play/pause for playlist
  useEffect(() => {
    if (!isPlaylist || !globalAudio) return;
    if (isPlaying && !isMuted) {
      globalAudio.play().catch(err => console.log("Playlist playback failed:", err));
    } else {
      globalAudio.pause();
    }
  }, [isPlaying, isMuted, isPlaylist]);

  const toggleRadio = useCallback(() => {
    userInteractedRef.current = true;
    if (!isPlaying) {
      setIsPlaying(true);
      setIsMuted(false);
    } else if (!isMuted) {
      setIsMuted(true);
    } else {
      setIsMuted(false);
    }
  }, [isPlaying, isMuted]);

  const changeStation = useCallback((station: RadioStation) => {
    userInteractedRef.current = true;
    const wasPlaying = isPlaying && !isMuted;

    if (station.id === PLAYLIST_STATION_ID) {
      // Switch to playlist mode
      if (globalAudio) {
        globalAudio.pause();
        globalAudio.removeAttribute("src");
        globalAudio.load();
        globalAudio = null;
      }
      setSelectedStation(station);
      setCurrentTrackIndex(0);
      if (wasPlaying && playlistTracks.length > 0) {
        const track = playlistTracks[0];
        const audio = getOrCreateAudio(track.file_url, `playlist-${track.id}`);
        const handleEnded = () => {
          setCurrentTrackIndex(prev => (prev + 1) % playlistTracks.length);
        };
        audio.addEventListener("ended", handleEnded);
        audio.play().catch(err => console.log("Playback failed:", err));
      }
    } else {
      // Switch to stream station
      const audio = getOrCreateAudio(station.url, station.id);
      setSelectedStation(station);
      if (wasPlaying) {
        audio.play().catch(err => console.log("Playback failed:", err));
      }
    }
  }, [isPlaying, isMuted, playlistTracks]);

  const nextTrack = useCallback(() => {
    if (!isPlaylist || playlistTracks.length === 0) return;
    setCurrentTrackIndex(prev => (prev + 1) % playlistTracks.length);
  }, [isPlaylist, playlistTracks.length]);

  const prevTrack = useCallback(() => {
    if (!isPlaylist || playlistTracks.length === 0) return;
    setCurrentTrackIndex(prev => prev === 0 ? playlistTracks.length - 1 : prev - 1);
  }, [isPlaylist, playlistTracks.length]);

  const isRadioActive = isPlaying && !isMuted;

  return (
    <RadioContext.Provider
      value={{
        isPlaying,
        isMuted,
        selectedStation,
        stations: allStations,
        toggleRadio,
        changeStation,
        isRadioActive,
        isPlaylist,
        currentTrack,
        playlistTracks,
        nextTrack,
        prevTrack,
      }}
    >
      {children}
    </RadioContext.Provider>
  );
};
