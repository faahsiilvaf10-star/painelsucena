import { useState } from "react";
import { NewsTicker } from "@/components/footer/NewsTicker";
import { Play, Pause, ChevronDown, Music, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRadio } from "@/contexts/RadioContext";
import { useSidebar } from "@/components/ui/sidebar";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface OnlineUsersFooterProps {
  onUserClick: (user: any) => void;
}

export const OnlineUsersFooter = ({ onUserClick }: OnlineUsersFooterProps) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const { state } = useSidebar();
  const {
    isPlaying, volume, setVolume, currentTrack, toggleRadio, currentHour,
  } = useRadio();

  const isCollapsedSidebar = state === "collapsed";
  const trackName = currentTrack
    ? currentTrack.file_name.replace(/\.[^/.]+$/, "")
    : `Sem músicas (${String(currentHour).padStart(2, "0")}:00)`;

  return (
    <div className={cn(
      "fixed bottom-0 right-0 z-40 transition-[left] duration-200 ease-linear",
      isMinimized ? "bg-transparent border-t-0" : "bg-card border-t border-border",
      isCollapsedSidebar ? "left-[48px]" : "left-[256px]",
      "max-md:left-0"
    )}>
      {/* Mobile minimize toggle */}
      <button
        onClick={() => setIsMinimized(!isMinimized)}
        className={cn(
          "md:hidden absolute left-1/2 -translate-x-1/2 z-50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all",
          isMinimized
            ? "bottom-2 w-11 h-11 rounded-full bg-card border border-border shadow-lg"
            : "-top-5 w-10 h-5 rounded-t-lg bg-card border border-b-0 border-border"
        )}
        aria-label={isMinimized ? "Expandir barra" : "Minimizar barra"}
      >
        <ChevronDown className={cn("h-4 w-4 transition-transform", isMinimized && "rotate-180")} />
      </button>

      {!isMinimized && (
        <div className="flex items-center gap-1 md:gap-3 px-2 md:px-4 py-1.5 md:py-2 overflow-x-auto scrollbar-none">
          {/* Radio Player */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Play/Pause */}
            <button
              onClick={toggleRadio}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all duration-300",
                isPlaying
                  ? "bg-green-500/20 hover:bg-green-500/30 border border-green-400/40"
                  : "bg-secondary/50 hover:bg-secondary border border-transparent"
              )}
              aria-label={isPlaying ? "Pausar" : "Tocar"}
            >
              <div className="relative">
                <Music className={cn("h-4 w-4 transition-colors", isPlaying ? "text-green-500" : "text-muted-foreground")} />
                {isPlaying && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />}
              </div>

              {isPlaying
                ? <Pause className="h-3.5 w-3.5 text-green-500" />
                : <Play className="h-3.5 w-3.5 text-muted-foreground" />}

              <span className={cn(
                "text-xs font-medium transition-colors max-w-[140px] truncate",
                isPlaying ? "text-green-500" : "text-muted-foreground"
              )}>
                {trackName}
              </span>

              {/* Sound wave */}
              {isPlaying && currentTrack && (
                <div className="flex items-end gap-0.5 h-3">
                  {[1, 2, 3].map(i => (
                    <div
                      key={i}
                      className="w-0.5 bg-green-500 rounded-full animate-sound-wave"
                      style={{ animationDelay: `${i * 0.15}s`, height: "100%" }}
                    />
                  ))}
                </div>
              )}
            </button>



            )}

            {/* Volume */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="p-1 hover:bg-secondary/50 rounded transition-colors" aria-label="Volume">
                  <Volume2 className={cn("h-3.5 w-3.5", isPlaying ? "text-green-500" : "text-muted-foreground")} />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-36 p-3" align="start" side="top" sideOffset={8}>
                <div className="flex items-center gap-2">
                  <Volume2 className="h-3 w-3 text-muted-foreground shrink-0" />
                  <Slider
                    value={[volume * 100]}
                    onValueChange={([v]) => setVolume(v / 100)}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* News Ticker Divider */}
          <div className="h-6 w-px bg-border shrink-0" />
          <NewsTicker />
        </div>
      )}

      {/* Animation styles */}
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
};
