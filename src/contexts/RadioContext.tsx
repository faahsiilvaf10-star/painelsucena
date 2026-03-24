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

export const RadioProvider = ({ children }: { children: ReactNode }) => {
  const [isPlaying, setIsPlaying] = useState(getSavedPlayingState);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedStation, setSelectedStation] = useState(getSavedStation);
  const audioRef = useRef<HTMLAudioElement | null>(null);
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
    if (!audioRef.current) {
      audioRef.current = new Audio(selectedStation.url);
      audioRef.current.volume = 0.5;
      audioRef.current.preload = "auto";
    }

    // Try autoplay if was playing before
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      
      if (isPlaying) {
        const tryAutoplay = async () => {
          if (audioRef.current) {
            try {
              await audioRef.current.play();
              userInteractedRef.current = true;
            } catch (error) {
              console.log("Autoplay blocked, waiting for user interaction");
              // Set up listener for first user interaction
              const handleFirstInteraction = async () => {
                if (!userInteractedRef.current && audioRef.current && isPlaying && !isMuted) {
                  userInteractedRef.current = true;
                  try {
                    await audioRef.current.play();
                  } catch (e) {
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
          }
        };
        tryAutoplay();
      }
    }

    return () => {
      // Don't cleanup audio on unmount to persist across navigation
    };
  }, []);

  // Handle play/pause state changes
  useEffect(() => {
    if (!audioRef.current || !hasInitializedRef.current) return;

    if (isPlaying && !isMuted) {
      audioRef.current.play().catch((error) => {
        console.log("Playback failed:", error);
      });
    } else {
      audioRef.current.pause();
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

    // Stop current audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }

    // Create new audio with selected station
    audioRef.current = new Audio(station.url);
    audioRef.current.volume = 0.5;

    setSelectedStation(station);

    // Resume playing if it was playing before
    if (wasPlaying) {
      audioRef.current.play().catch((error) => {
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
