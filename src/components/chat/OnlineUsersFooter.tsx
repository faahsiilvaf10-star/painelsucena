import { useState } from "react";
import { NewsTicker } from "@/components/footer/NewsTicker";
import { Radio, VolumeX, Volume2, Play, ChevronDown, SkipBack, SkipForward, Music } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useRadio } from "@/contexts/RadioContext";
import { useSidebar } from "@/components/ui/sidebar";

interface OnlineUsersFooterProps {
  onUserClick: (user: any) => void;
}

export const OnlineUsersFooter = ({
  onUserClick
}: OnlineUsersFooterProps) => {
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const {
    state
  } = useSidebar();
  const {
    isPlaying,
    isMuted,
    selectedStation,
    stations,
    toggleRadio,
    changeStation,
    isRadioActive,
    isPlaylist,
    currentTrack,
    nextTrack,
    prevTrack,
  } = useRadio();
  const isCollapsedSidebar = state === "collapsed";
  return <div className={cn("fixed bottom-0 right-0 z-40 transition-[left] duration-200 ease-linear", isMinimized ? "bg-transparent border-t-0" : "bg-card border-t border-border", isCollapsedSidebar ? "left-[48px]" : "left-[256px]", "max-md:left-0")}>
      {/* Mobile minimize toggle button - always centered */}
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
      {!isMinimized && <div className="flex items-center gap-1 md:gap-3 px-2 md:px-4 py-1.5 md:py-2 overflow-x-auto scrollbar-none">
        {/* Radio Player */}
        <div className="flex items-center gap-0.5 md:gap-1 shrink-0">
          <button onClick={toggleRadio} className={cn("flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 rounded-l-full transition-all duration-300", isRadioActive ? "bg-green-500/20 hover:bg-green-500/30 border border-r-0 border-green-400/40" : "bg-secondary/50 hover:bg-secondary border border-r-0 border-transparent")} aria-label={!isPlaying ? "Iniciar rádio" : isMuted ? "Ativar som" : "Silenciar"}>
            <div className="relative">
              {isPlaylist ? (
                <Music className={cn("h-4 w-4 transition-colors", isRadioActive ? "text-green-500" : "text-muted-foreground")} />
              ) : (
                <Radio className={cn("h-4 w-4 transition-colors", isRadioActive ? "text-green-500" : "text-muted-foreground")} />
              )}
              {isRadioActive && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />}
            </div>
            
            {!isPlaying ? <Play className="h-3 w-3 text-muted-foreground" /> : isRadioActive ? <Volume2 className="h-3 w-3 text-green-500" /> : <VolumeX className="h-3 w-3 text-muted-foreground" />}
            
            <span className={cn("text-xs font-medium transition-colors max-w-[120px] truncate", isRadioActive ? "text-green-500" : "text-muted-foreground")}>
              {isRadioActive
                ? (isPlaylist && currentTrack ? currentTrack.file_name.replace(/\.[^/.]+$/, "") : isPlaylist ? "Playlist" : "Ao Vivo")
                : isPlaying ? "Mudo" : selectedStation.name}
            </span>

            {/* Sound wave animation */}
            {isRadioActive && <div className="flex items-end gap-0.5 h-3">
                {[1, 2, 3].map(i => <div key={i} className="w-0.5 bg-green-500 rounded-full animate-sound-wave" style={{
              animationDelay: `${i * 0.15}s`,
              height: "100%"
            }} />)}
              </div>}
          </button>

          {/* Playlist skip controls */}
          {isPlaylist && isRadioActive && (
            <div className="flex items-center">
              <button onClick={prevTrack} className="p-1 hover:bg-secondary/50 rounded transition-colors" aria-label="Anterior">
                <SkipBack className="h-3 w-3 text-green-500" />
              </button>
              <button onClick={nextTrack} className="p-1 hover:bg-secondary/50 rounded transition-colors" aria-label="Próxima">
                <SkipForward className="h-3 w-3 text-green-500" />
              </button>
            </div>
          )}

          {/* Station Selector */}
          <Popover open={selectorOpen} onOpenChange={setSelectorOpen}>
            <PopoverTrigger asChild>
              <button className={cn("flex items-center gap-0.5 md:gap-1 px-1.5 md:px-2 py-1 md:py-1.5 rounded-r-full transition-all duration-300", isRadioActive ? "bg-green-500/20 hover:bg-green-500/30 border border-l-0 border-green-400/40" : "bg-secondary/50 hover:bg-secondary border border-l-0 border-transparent")} aria-label="Selecionar rádio">
                <ChevronDown className={cn("h-3 w-3 transition-transform", selectorOpen && "rotate-180", isRadioActive ? "text-green-500" : "text-muted-foreground")} />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start" side="top" sideOffset={8}>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground px-2 py-1">
                  Selecione uma rádio
                </p>
                {stations.map(station => <button key={station.id} onClick={() => {
                changeStation(station);
                setSelectorOpen(false);
              }} className={cn("w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors", selectedStation.id === station.id ? "bg-primary text-primary-foreground" : "hover:bg-secondary")}>
                    <span className="font-medium">{station.name}</span>
                    <span className={cn("text-xs", selectedStation.id === station.id ? "text-primary-foreground/70" : "text-muted-foreground")}>
                      {station.genre}
                    </span>
                  </button>)}
              </div>
            </PopoverContent>
          </Popover>
        </div>




        {/* News Ticker Divider */}
        <div className="h-6 w-px bg-border shrink-0" />
        <NewsTicker />
      </div>}

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
        
        @keyframes online-pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(34, 197, 94, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
          }
        }
        
        .animate-online-pulse {
          animation: online-pulse 1s ease-out 3;
        }
      `}</style>
    </div>;
};