import { useState, useRef, useEffect } from "react";
import { Radio, VolumeX, Volume2, Play } from "lucide-react";

interface LiveRadioPlayerProps {
  streamUrl?: string;
  autoPlay?: boolean;
}

// Direct audio stream URLs for Brazilian radio stations
const RADIO_STREAMS = {
  jbfm: "https://27343.live.streamtheworld.com/JBFM.mp3",
  antena1: "https://antena1.newradio.it/stream2",
  mixfm: "https://26573.live.streamtheworld.com/MIXRIO.mp3",
  jovempan: "https://19293.live.streamtheworld.com/JP_SP_FM_SC",
  globofm: "http://streaming13.hstbr.net:8072/live",
};

export function LiveRadioPlayer({ 
  streamUrl = RADIO_STREAMS.jbfm,
  autoPlay = false 
}: LiveRadioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio(streamUrl);
    audioRef.current.volume = 0.5;
    audioRef.current.preload = "none";

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
    };
  }, [streamUrl]);

  // Handle play/pause state
  useEffect(() => {
    if (!audioRef.current) return;

    if (isPlaying && !isMuted) {
      audioRef.current.play().catch((error) => {
        console.log("Autoplay blocked, user interaction required:", error);
        setIsPlaying(false);
      });
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, isMuted]);

  const handleToggle = () => {
    setHasInteracted(true);
    
    if (!isPlaying) {
      setIsPlaying(true);
      setIsMuted(false);
    } else if (!isMuted) {
      setIsMuted(true);
    } else {
      setIsMuted(false);
    }
  };

  const isActive = isPlaying && !isMuted;

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <button
        onClick={handleToggle}
        className={`
          group relative flex items-center gap-2 px-4 py-2.5 rounded-full
          backdrop-blur-md border border-white/20 shadow-lg
          transition-all duration-300 ease-out
          ${isActive 
            ? "bg-green-500/20 hover:bg-green-500/30 border-green-400/40" 
            : "bg-white/10 hover:bg-white/20"
          }
        `}
        aria-label={!hasInteracted ? "Iniciar rádio ao vivo" : (isMuted ? "Ativar som" : "Silenciar rádio")}
      >
        {/* Radio icon with pulse animation when playing */}
        <div className="relative">
          <Radio 
            className={`w-5 h-5 transition-colors duration-300 ${
              isActive ? "text-green-400" : "text-white/70"
            }`} 
          />
          {isActive && (
            <>
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full animate-ping" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full" />
            </>
          )}
        </div>

        {/* Volume/Play icon */}
        {!hasInteracted ? (
          <Play className="w-4 h-4 text-white/70" />
        ) : isActive ? (
          <Volume2 className="w-4 h-4 text-green-400" />
        ) : (
          <VolumeX className="w-4 h-4 text-white/50" />
        )}

        {/* Label */}
        <span className={`text-xs font-medium transition-colors duration-300 ${
          isActive ? "text-green-300" : "text-white/60"
        }`}>
          {!hasInteracted ? "JB FM" : (isActive ? "Ao Vivo" : "Mudo")}
        </span>

        {/* Sound wave animation when playing */}
        {isActive && (
          <div className="flex items-end gap-0.5 h-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-0.5 bg-green-400 rounded-full animate-sound-wave"
                style={{
                  animationDelay: `${i * 0.15}s`,
                  height: "100%",
                }}
              />
            ))}
          </div>
        )}
      </button>

      {/* Animation styles */}
      <style>{`
        @keyframes sound-wave {
          0%, 100% {
            transform: scaleY(0.3);
          }
          50% {
            transform: scaleY(1);
          }
        }
        
        .animate-sound-wave {
          animation: sound-wave 0.8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
