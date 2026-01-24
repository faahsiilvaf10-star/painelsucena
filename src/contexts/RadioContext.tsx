import { createContext, useContext, useState, useRef, useEffect, ReactNode } from "react";

const RADIO_STATIONS = [
  { id: "jbfm", name: "JB FM 99.9", genre: "Hits", url: "https://27343.live.streamtheworld.com/JBFM.mp3" },
  { id: "sertanejo", name: "Sertanejo", genre: "Sertanejo", url: "https://stream.vagalume.fm/hls/14619606471054026608/aac.m3u8" },
  { id: "pagode", name: "Pagode", genre: "Pagode", url: "https://stream.vagalume.fm/hls/147015499779090/aac.m3u8" },
  { id: "melody", name: "Melody", genre: "Romântico", url: "https://stream.vagalume.fm/hls/1499715905423293/aac.m3u8" },
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

export const useRadio = () => {
  const context = useContext(RadioContext);
  if (!context) {
    throw new Error("useRadio must be used within a RadioProvider");
  }
  return context;
};

export const RadioProvider = ({ children }: { children: ReactNode }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedStation, setSelectedStation] = useState(RADIO_STATIONS[0]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasAutoplayedRef = useRef(false);

  // Initialize audio element once
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(selectedStation.url);
      audioRef.current.volume = 0.5;
      audioRef.current.preload = "auto";
    }

    // Try to autoplay on first load only
    if (!hasAutoplayedRef.current) {
      hasAutoplayedRef.current = true;
      const tryAutoplay = async () => {
        if (audioRef.current) {
          try {
            await audioRef.current.play();
            setIsPlaying(true);
            setIsMuted(false);
          } catch (error) {
            console.log("Autoplay blocked, waiting for user interaction");
          }
        }
      };
      tryAutoplay();
    }

    return () => {
      // Don't cleanup audio on unmount to persist across navigation
    };
  }, []);

  // Handle play/pause state
  useEffect(() => {
    if (!audioRef.current) return;

    if (isPlaying && !isMuted) {
      audioRef.current.play().catch((error) => {
        console.log("Playback failed:", error);
        setIsPlaying(false);
      });
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, isMuted]);

  const toggleRadio = () => {
    if (!isPlaying) {
      setIsPlaying(true);
      setIsMuted(false);
    } else if (!isMuted) {
      setIsMuted(true);
    } else {
      setIsMuted(false);
    }
  };

  const changeStation = (station: RadioStation) => {
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
        setIsPlaying(false);
      });
    }
  };

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
