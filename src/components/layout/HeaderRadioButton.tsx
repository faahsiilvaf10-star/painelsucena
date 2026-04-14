import { useState } from "react";
import { Radio, VolumeX, Volume2, ChevronDown } from "lucide-react";
import { useRadio } from "@/contexts/RadioContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const HeaderRadioButton = () => {
  const [selectorOpen, setSelectorOpen] = useState(false);
  const { isPlaying, isMuted, selectedStation, stations, toggleRadio, changeStation, isRadioActive } = useRadio();

  return (
    <Popover open={selectorOpen} onOpenChange={setSelectorOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-7 w-7 relative",
                isRadioActive
                  ? "text-green-500 hover:text-green-400"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Radio className="h-4 w-4" />
              {isRadioActive && (
                <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              )}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">{isRadioActive ? `Rádio: ${selectedStation.name}` : "Rádio"}</p>
        </TooltipContent>
      </Tooltip>

      <PopoverContent className="w-56 p-2" align="start" side="bottom">
        <div className="space-y-1">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rádio</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={toggleRadio}
            >
              {isRadioActive ? (isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />) : <Radio className="h-3.5 w-3.5" />}
            </Button>
          </div>
          <div className="border-t border-border my-1" />
          {stations.map((station) => (
            <button
              key={station.id}
              onClick={() => {
                changeStation(station);
                setSelectorOpen(false);
              }}
              className={cn(
                "w-full text-left px-2 py-1.5 rounded-md text-xs transition-colors flex items-center justify-between",
                selectedStation.id === station.id
                  ? "bg-primary/10 text-primary font-medium"
                  : "hover:bg-muted text-foreground"
              )}
            >
              <div>
                <div className="font-medium">{station.name}</div>
                <div className="text-[10px] text-muted-foreground">{station.genre}</div>
              </div>
              {selectedStation.id === station.id && isRadioActive && (
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
