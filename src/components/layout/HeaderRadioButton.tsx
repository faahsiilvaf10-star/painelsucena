import { Music, Play, Pause } from "lucide-react";
import { useRadio } from "@/contexts/RadioContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const HeaderRadioButton = () => {
  const { isPlaying, toggleRadio, currentTrack } = useRadio();

  const trackName = currentTrack
    ? currentTrack.file_name.replace(/\.[^/.]+$/, "")
    : "Rádio";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleRadio}
          className={cn(
            "h-7 w-7 relative",
            isPlaying
              ? "text-green-500 hover:text-green-400"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Music className="h-4 w-4" />}
          {isPlaying && (
            <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p className="text-xs">{isPlaying ? `♫ ${trackName}` : "Rádio"}</p>
      </TooltipContent>
    </Tooltip>
  );
};
