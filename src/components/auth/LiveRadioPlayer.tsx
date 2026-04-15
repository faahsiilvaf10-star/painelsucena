import { useState } from "react";
import { Radio, VolumeX, Volume2, Play, ChevronDown } from "lucide-react";
import { useRadio } from "@/contexts/RadioContext";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function LiveRadioPlayer() {
  const [selectorOpen, setSelectorOpen] = useState(false);
  const { 
    isPlaying, 
    isMuted, 
    selectedStation, 
    stations, 
    toggleRadio, 
    changeStation, 
    isRadioActive 
  } = useRadio();

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <div className="flex items-center">
        <button
          onClick={toggleRadio}
          className={cn(
            "group relative flex items-center gap-2 px-4 py-2.5 rounded-l-full",
            "backdrop-blur-md border border-r-0 border-white/20 shadow-lg",
            "transition-all duration-300 ease-out",
            isRadioActive 
              ? "bg-green-500/20 hover:bg-green-500/30 border-green-400/40" 
              : "bg-white/10 hover:bg-white/20"
          )}
          aria-label={!isPlaying ? "Iniciar rádio ao vivo" : (isMuted ? "Ativar som" : "Silenciar rádio")}
        >
          {/* Radio icon with pulse animation when playing */}
          <div className="relative">
            <Radio 
              className={cn(
                "w-5 h-5 transition-colors duration-300",
                isRadioActive ? "text-green-400" : "text-white/70"
              )} 
            />
            {isRadioActive && (
              <>
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full animate-ping" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full" />
              </>
            )}
          </div>

          {/* Volume/Play icon */}
          {!isPlaying ? (
            <Play className="w-4 h-4 text-white/70" />
          ) : isRadioActive ? (
            <Volume2 className="w-4 h-4 text-green-400" />
          ) : (
            <VolumeX className="w-4 h-4 text-white/50" />
          )}

          {/* Label */}
          <span className={cn(
            "text-xs font-medium transition-colors duration-300",
            isRadioActive ? "text-green-300" : "text-white/60"
          )}>
            {!isPlaying ? selectedStation.name : (isRadioActive ? "Ao Vivo" : "Mudo")}
          </span>

          {/* Sound wave animation when playing */}
          {isRadioActive && (
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

        {/* Station Selector */}
        <Popover open={selectorOpen} onOpenChange={setSelectorOpen}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "flex items-center gap-1 px-3 py-2.5 rounded-r-full",
                "backdrop-blur-md border border-l-0 border-white/20 shadow-lg",
                "transition-all duration-300 ease-out",
                isRadioActive 
                  ? "bg-green-500/20 hover:bg-green-500/30 border-green-400/40" 
                  : "bg-white/10 hover:bg-white/20"
              )}
              aria-label="Selecionar rádio"
            >
              <ChevronDown className={cn(
                "h-4 w-4 transition-transform",
                selectorOpen && "rotate-180",
                isRadioActive ? "text-green-400" : "text-white/60"
              )} />
            </button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-56 p-2 bg-card/95 backdrop-blur-md border-white/20" 
            align="end"
            side="top"
            sideOffset={8}
          >
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground px-2 py-1">
                Selecione uma rádio
              </p>
              {stations.map((station) => (
                <button
                  key={station.id}
                  onClick={() => { changeStation(station); setSelectorOpen(false); }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
                    selectedStation.id === station.id 
                      ? "bg-primary text-primary-foreground" 
                      : "hover:bg-secondary"
                  )}
                >
                  <span className="font-medium">{station.name}</span>
                  <span className={cn(
                    "text-xs",
                    selectedStation.id === station.id 
                      ? "text-primary-foreground/70" 
                      : "text-muted-foreground"
                  )}>
                    {station.genre}
                  </span>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

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
