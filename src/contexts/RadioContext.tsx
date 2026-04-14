import { createContext, useContext, useState, useRef, useEffect, ReactNode, useCallback } from "react";

const RADIO_STATIONS = [
  { id: "pop-hits", name: "Pop Hits", genre: "Pop/Internacional", url: "https://live.hunter.fm/pop_high" },
  { id: "liberal", name: "Liberal FM", genre: "Hits", url: "https://stream.zeno.fm/4d6hhyp8cv8uv" },
  { id: "reggaeton", name: "Reggaeton", genre: "Reggaeton", url: "https://stream.zeno.fm/8wup8yd9dm0uv" },
  { id: "sertanejo", name: "Sertaneja Hits", genre: "Sertanejo", url: "https://live.hunter.fm/sertanejo_high" },
  { id: "pagode", name: "Pagode Hits", genre: "Pagode", url: "https://live.hunter.fm/pagode_high" },
  { id: "gospel", name: "Gospel", genre: "Gospel", url: "https://stream.zeno.fm/yn65fsaurfhvv" },
  { id: "piseiro", name: "Piseiro", genre: "Piseiro", url: "https://stream.zeno.fm/f3wvnrg2e98uv" },
];

export type RadioStation = typeof RADIO_STATIONS[0];

interface RadioContextType {
  isPlaying: boolean;
  isMuted: boolean;
  selectedStation: RadioStation;
  stations: RadioStation[];
  toggleRadio: () => void;
  changeStation: (station: RadioStation) => void;
  isRadioActive: boolean;
}

const RadioContext = createContext<RadioContextType | null>(null);

// Get saved station from localStorage
const getSavedStation = (): RadioStation => {
  try {
    const saved = localStorage.getItem("radio_station");
    if (saved) {
      const parsed = JSON.parse(saved);
      const found = RADIO_STATIONS.find(s => s.id === parsed.id);
      if (found) return found;
    }
  } catch (e) {
    console.log("Error loading saved station");
  }
  return RADIO_STATIONS[0];
};

// Get saved playing state
const getSavedPlayingState = (): boolean => {
  try {
    return localStorage.getItem("radio_playing") === "true";
  } catch (e) {
    return false;
  }
};

// Safe hook that doesn't throw during HMR reloads
export const useRadio = () => {
  const context = useContext(RadioContext);
  if (!context) {
    // Return a fallback during HMR reloads to prevent crashes
    return {
      isPlaying: false,
      isMuted: false,
      selectedStation: RADIO_STATIONS[0],
      stations: RADIO_STATIONS,
      toggleRadio: () => {},
      changeStation: () => {},
      isRadioActive: false,
    };
  }
  return context;
};

// Global singleton audio to survive HMR / re-mounts
let globalAudio: HTMLAudioElement | null = null;
let globalAudioStation: string | null = null;

function getOrCreateAudio(url: string, stationId: string): HTMLAudioElement {
  // If the same station audio already exists, reuse it
  if (globalAudio && globalAudioStation === stationId) {
    return globalAudio;
  }
  // Stop & discard previous audio
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

  // Save state to localStorage
  useEffect(() => {
    localStorage.setItem("radio_playing", String(isPlaying && !isMuted));
  }, [isPlaying, isMuted]);

  useEffect(() => {
    localStorage.setItem("radio_station", JSON.stringify(selectedStation));
  }, [selectedStation]);

  // Initialize audio element once
  useEffect(() => {
    const audio = getOrCreateAudio(selectedStation.url, selectedStation.id);

    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;

      if (isPlaying) {
        const tryAutoplay = async () => {
          try {
            await audio.play();
            userInteractedRef.current = true;
          } catch {
            console.log("Autoplay blocked, waiting for user interaction");
            const handleFirstInteraction = async () => {
              if (!userInteractedRef.current && globalAudio && isPlaying && !isMuted) {
                userInteractedRef.current = true;
                try {
                  await globalAudio.play();
                } catch {
                  console.log("Playback failed after interaction");
                }
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

  // Handle play/pause state changes
  useEffect(() => {
    if (!hasInitializedRef.current || !globalAudio) return;

    if (isPlaying && !isMuted) {
      globalAudio.play().catch((error) => {
        console.log("Playback failed:", error);
      });
    } else {
      globalAudio.pause();
    }
  }, [isPlaying, isMuted]);

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

    // Create/switch to new station audio (stops the old one internally)
    const audio = getOrCreateAudio(station.url, station.id);
    setSelectedStation(station);

    if (wasPlaying) {
      audio.play().catch((error) => {
        console.log("Playback failed:", error);
      });
    }
  }, [isPlaying, isMuted]);

  const isRadioActive = isPlaying && !isMuted;

  return (
    <RadioContext.Provider
      value={{
        isPlaying,
        isMuted,
        selectedStation,
        stations: RADIO_STATIONS,
        toggleRadio,
        changeStation,
        isRadioActive,
      }}
    >
      {children}
    </RadioContext.Provider>
  );
};
