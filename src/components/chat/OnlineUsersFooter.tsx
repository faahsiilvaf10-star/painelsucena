import { useState, useRef, useEffect } from "react";
import { useOnlineUsers, OnlineUser } from "@/hooks/useOnlineUsers";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, Radio, VolumeX, Volume2, Play, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface OnlineUsersFooterProps {
  onUserClick: (user: OnlineUser) => void;
}

const cargoLabels: Record<string, string> = {
  preposto: "Preposto",
  encarregado_geral: "Enc. Geral",
  encarregado_i: "Enc. I",
  encarregado_ii: "Enc. II",
  tecnico_seguranca_i: "TST I",
  tecnico_seguranca_ii: "TST II",
  tecnico_meio_ambiente: "TMA",
  aux_administrativo: "Aux. Adm.",
  aux_almoxarifado: "Aux. Almox.",
  planejador: "Planejador",
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
};

// Available radio stations
const RADIO_STATIONS = [
  { id: "jbfm", name: "JB FM 99.9", genre: "Hits", url: "https://27343.live.streamtheworld.com/JBFM.mp3" },
  { id: "sertanejo", name: "Sertanejo", genre: "Sertanejo", url: "https://stream.vagalume.fm/hls/14619606471054026608/aac.m3u8" },
  { id: "pagode", name: "Pagode", genre: "Pagode", url: "https://stream.vagalume.fm/hls/147015499779090/aac.m3u8" },
  { id: "melody", name: "Melody", genre: "Romântico", url: "https://stream.vagalume.fm/hls/1499715905423293/aac.m3u8" },
  { id: "brega", name: "Brega do Pará", genre: "Brega", url: "https://stream.zeno.fm/0r0xa792kwzuv" },
];

export const OnlineUsersFooter = ({ onUserClick }: OnlineUsersFooterProps) => {
  const { onlineUsers } = useOnlineUsers();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedStation, setSelectedStation] = useState(RADIO_STATIONS[0]);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio element and autoplay
  useEffect(() => {
    audioRef.current = new Audio(selectedStation.url);
    audioRef.current.volume = 0.5;
    audioRef.current.preload = "auto";

    // Try to autoplay on load
    const tryAutoplay = async () => {
      if (audioRef.current) {
        try {
          await audioRef.current.play();
          setIsPlaying(true);
          setIsMuted(false);
        } catch (error) {
          // Autoplay blocked by browser - user needs to click
          console.log("Autoplay blocked, waiting for user interaction");
        }
      }
    };
    
    tryAutoplay();

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
    };
  }, []);

  // Handle station change
  const handleStationChange = (station: typeof RADIO_STATIONS[0]) => {
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
    setSelectorOpen(false);
    
    // Resume playing if it was playing before
    if (wasPlaying) {
      audioRef.current.play().catch((error) => {
        console.log("Playback failed:", error);
        setIsPlaying(false);
      });
    }
  };

  // Handle play/pause state
  useEffect(() => {
    if (!audioRef.current) return;

    if (isPlaying && !isMuted) {
      audioRef.current.play().catch((error) => {
        console.log("Autoplay blocked:", error);
        setIsPlaying(false);
      });
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, isMuted]);

  const handleRadioToggle = () => {
    if (!isPlaying) {
      setIsPlaying(true);
      setIsMuted(false);
    } else if (!isMuted) {
      setIsMuted(true);
    } else {
      setIsMuted(false);
    }
  };

  const isRadioActive = isPlaying && !isMuted;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40">
      <div className="flex items-center gap-3 px-4 py-2 overflow-x-auto">
        {/* Radio Player */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleRadioToggle}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-l-full transition-all duration-300",
              isRadioActive 
                ? "bg-green-500/20 hover:bg-green-500/30 border border-r-0 border-green-400/40" 
                : "bg-secondary/50 hover:bg-secondary border border-r-0 border-transparent"
            )}
            aria-label={!isPlaying ? "Iniciar rádio" : (isMuted ? "Ativar som" : "Silenciar")}
          >
            <div className="relative">
              <Radio 
                className={cn(
                  "h-4 w-4 transition-colors",
                  isRadioActive ? "text-green-500" : "text-muted-foreground"
                )} 
              />
              {isRadioActive && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
              )}
            </div>
            
            {!isPlaying ? (
              <Play className="h-3 w-3 text-muted-foreground" />
            ) : isRadioActive ? (
              <Volume2 className="h-3 w-3 text-green-500" />
            ) : (
              <VolumeX className="h-3 w-3 text-muted-foreground" />
            )}
            
            <span className={cn(
              "text-xs font-medium transition-colors",
              isRadioActive ? "text-green-500" : "text-muted-foreground"
            )}>
              {isRadioActive ? "Ao Vivo" : (isPlaying ? "Mudo" : selectedStation.name)}
            </span>

            {/* Sound wave animation */}
            {isRadioActive && (
              <div className="flex items-end gap-0.5 h-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-0.5 bg-green-500 rounded-full animate-sound-wave"
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
                  "flex items-center gap-1 px-2 py-1.5 rounded-r-full transition-all duration-300",
                  isRadioActive 
                    ? "bg-green-500/20 hover:bg-green-500/30 border border-l-0 border-green-400/40" 
                    : "bg-secondary/50 hover:bg-secondary border border-l-0 border-transparent"
                )}
                aria-label="Selecionar rádio"
              >
                <ChevronDown className={cn(
                  "h-3 w-3 transition-transform",
                  selectorOpen && "rotate-180",
                  isRadioActive ? "text-green-500" : "text-muted-foreground"
                )} />
              </button>
            </PopoverTrigger>
            <PopoverContent 
              className="w-56 p-2" 
              align="start"
              side="top"
              sideOffset={8}
            >
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground px-2 py-1">
                  Selecione uma rádio
                </p>
                {RADIO_STATIONS.map((station) => (
                  <button
                    key={station.id}
                    onClick={() => handleStationChange(station)}
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

        <div className="h-6 w-px bg-border shrink-0" />

        {/* Online Users Section */}
        <div className="flex items-center gap-2 text-muted-foreground shrink-0">
          <Users className="h-4 w-4" />
          <span className="text-xs font-medium">Online</span>
          <Badge variant="secondary" className="text-xs">
            {onlineUsers.length}
          </Badge>
        </div>

        <div className="h-6 w-px bg-border shrink-0" />

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {onlineUsers.length === 0 ? (
            <span className="text-xs text-muted-foreground">
              Nenhum usuário online
            </span>
          ) : (
            onlineUsers.map((user) => (
              <button
                key={user.user_id}
                onClick={() => onUserClick(user)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full",
                  "bg-secondary/50 hover:bg-secondary transition-colors",
                  "shrink-0 group"
                )}
              >
                <div className="relative">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                      {getInitials(user.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-card" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-xs font-medium group-hover:text-primary transition-colors">
                    {user.full_name.split(" ")[0]}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {cargoLabels[user.cargo] || user.cargo}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
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
};