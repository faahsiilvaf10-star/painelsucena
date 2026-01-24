import { useState, useRef, useEffect } from "react";
import { Radio, VolumeX, Volume2 } from "lucide-react";

interface LiveRadioPlayerProps {
  radioUrl?: string;
}

export function LiveRadioPlayer({ radioUrl = "https://radiosaovivo.net/" }: LiveRadioPlayerProps) {
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const toggleMute = () => {
    if (!isPlaying) {
      // First click starts the radio
      setIsPlaying(true);
      setIsMuted(false);
    } else {
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <button
        onClick={toggleMute}
        className={`
          group relative flex items-center gap-2 px-4 py-2.5 rounded-full
          backdrop-blur-md border border-white/20 shadow-lg
          transition-all duration-300 ease-out
          ${isPlaying && !isMuted 
            ? "bg-green-500/20 hover:bg-green-500/30 border-green-400/40" 
            : "bg-white/10 hover:bg-white/20"
          }
        `}
        aria-label={isMuted ? "Ativar rádio ao vivo" : "Silenciar rádio"}
      >
        {/* Radio icon with pulse animation when playing */}
        <div className="relative">
          <Radio 
            className={`w-5 h-5 transition-colors duration-300 ${
              isPlaying && !isMuted ? "text-green-400" : "text-white/70"
            }`} 
          />
          {isPlaying && !isMuted && (
            <>
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full animate-ping" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full" />
            </>
          )}
        </div>

        {/* Volume icon */}
        {isPlaying && !isMuted ? (
          <Volume2 className="w-4 h-4 text-green-400" />
        ) : (
          <VolumeX className="w-4 h-4 text-white/50" />
        )}

        {/* Label */}
        <span className={`text-xs font-medium transition-colors duration-300 ${
          isPlaying && !isMuted ? "text-green-300" : "text-white/60"
        }`}>
          {isPlaying && !isMuted ? "Ao Vivo" : "Rádio"}
        </span>

        {/* Sound wave animation when playing */}
        {isPlaying && !isMuted && (
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

      {/* Hidden iframe for audio playback */}
      {isPlaying && (
        <iframe
          ref={iframeRef}
          src={isMuted ? "about:blank" : radioUrl}
          className="hidden"
          allow="autoplay"
          title="Rádio ao vivo"
        />
      )}

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
