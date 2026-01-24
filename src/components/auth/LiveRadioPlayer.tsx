import { useState, useRef, useEffect } from "react";
import { Radio, VolumeX, Volume2 } from "lucide-react";

interface LiveRadioPlayerProps {
  radioUrl?: string;
  autoPlay?: boolean;
}

export function LiveRadioPlayer({ 
  radioUrl = "https://radiosaovivo.net/", 
  autoPlay = true 
}: LiveRadioPlayerProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  // Auto-start on mount if autoPlay is true
  useEffect(() => {
    if (autoPlay) {
      setIsVisible(true);
    }
  }, [autoPlay]);

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <button
        onClick={toggleMute}
        className={`
          group relative flex items-center gap-2 px-4 py-2.5 rounded-full
          backdrop-blur-md border border-white/20 shadow-lg
          transition-all duration-300 ease-out
          ${!isMuted 
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
              !isMuted ? "text-green-400" : "text-white/70"
            }`} 
          />
          {!isMuted && (
            <>
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full animate-ping" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full" />
            </>
          )}
        </div>

        {/* Volume icon */}
        {!isMuted ? (
          <Volume2 className="w-4 h-4 text-green-400" />
        ) : (
          <VolumeX className="w-4 h-4 text-white/50" />
        )}

        {/* Label */}
        <span className={`text-xs font-medium transition-colors duration-300 ${
          !isMuted ? "text-green-300" : "text-white/60"
        }`}>
          {!isMuted ? "Ao Vivo" : "Mudo"}
        </span>

        {/* Sound wave animation when playing */}
        {!isMuted && (
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

      {/* Iframe for radio - hidden when muted */}
      {isVisible && !isMuted && (
        <iframe
          ref={iframeRef}
          src={radioUrl}
          className="fixed bottom-0 left-0 w-0 h-0 opacity-0 pointer-events-none"
          allow="autoplay; encrypted-media"
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
