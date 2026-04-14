import { Music, Play, Pause } from "lucide-react";
import { useRadio } from "@/contexts/RadioContext";
import { cn } from "@/lib/utils";

export function LiveRadioPlayer() {
  const { isPlaying, toggleRadio, currentTrack } = useRadio();

  const trackName = currentTrack
    ? currentTrack.file_name.replace(/\.[^/.]+$/, "")
    : "Rádio";

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <button
        onClick={toggleRadio}
        className={cn(
          "group relative flex items-center gap-2 px-4 py-2.5 rounded-full",
          "backdrop-blur-md border border-white/20 shadow-lg",
          "transition-all duration-300 ease-out",
          isPlaying
            ? "bg-green-500/20 hover:bg-green-500/30 border-green-400/40"
            : "bg-white/10 hover:bg-white/20"
        )}
        aria-label={isPlaying ? "Pausar rádio" : "Tocar rádio"}
      >
        <div className="relative">
          <Music className={cn("w-5 h-5 transition-colors duration-300", isPlaying ? "text-green-400" : "text-white/70")} />
          {isPlaying && (
            <>
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full animate-ping" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full" />
            </>
          )}
        </div>

        {isPlaying
          ? <Pause className="w-4 h-4 text-green-400" />
          : <Play className="w-4 h-4 text-white/70" />}

        <span className={cn("text-xs font-medium transition-colors duration-300", isPlaying ? "text-green-300" : "text-white/60")}>
          {isPlaying && currentTrack ? trackName : "Rádio"}
        </span>

        {isPlaying && currentTrack && (
          <div className="flex items-end gap-0.5 h-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-0.5 bg-green-400 rounded-full animate-sound-wave"
                style={{ animationDelay: `${i * 0.15}s`, height: "100%" }}
              />
            ))}
          </div>
        )}
      </button>

      <style>{`
        @keyframes sound-wave {
          0%, 100% { transform: scaleY(0.3); }
          50% { transform: scaleY(1); }
        }
        .animate-sound-wave {
          animation: sound-wave 0.8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
