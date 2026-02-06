import { useState } from "react";
import { useAllUsers, UserWithStatus } from "@/hooks/useAllUsers";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NeonAvatar } from "@/components/ui/NeonAvatar";
import { Badge } from "@/components/ui/badge";
import { Radio, VolumeX, Volume2, Play, ChevronDown, Circle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useRadio } from "@/contexts/RadioContext";
import { useSidebar } from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCargoLabel } from "@/lib/cargoUtils";
import { useGlobalTypingIndicator } from "@/hooks/useGlobalTypingIndicator";

interface OnlineUsersFooterProps {
  onUserClick: (user: UserWithStatus) => void;
}
const getInitials = (name: string) => {
  return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
};

const formatLastSeen = (lastSeen?: string) => {
  if (!lastSeen) return null;
  try {
    return formatDistanceToNow(new Date(lastSeen), { addSuffix: true, locale: ptBR });
  } catch {
    return null;
  }
};
export const OnlineUsersFooter = ({
  onUserClick
}: OnlineUsersFooterProps) => {
  const {
    allUsers,
    onlineCount,
    offlineCount,
    isLoading
  } = useAllUsers();
  const { isUserTyping } = useGlobalTypingIndicator();
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [usersPopoverOpen, setUsersPopoverOpen] = useState(false);
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
    isRadioActive
  } = useRadio();
  const isCollapsedSidebar = state === "collapsed";
  return <div className={cn("fixed bottom-0 right-0 bg-card border-t border-border z-40 transition-[left] duration-200 ease-linear", isCollapsedSidebar ? "left-[48px]" : "left-[256px]", "max-md:left-0")}>
      <div className="flex items-center gap-1 md:gap-3 px-2 md:px-4 py-1.5 md:py-2 overflow-x-auto scrollbar-none">
        {/* Radio Player */}
        <div className="flex items-center gap-0.5 md:gap-1 shrink-0">
          <button onClick={toggleRadio} className={cn("flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 rounded-l-full transition-all duration-300", isRadioActive ? "bg-green-500/20 hover:bg-green-500/30 border border-r-0 border-green-400/40" : "bg-secondary/50 hover:bg-secondary border border-r-0 border-transparent")} aria-label={!isPlaying ? "Iniciar rádio" : isMuted ? "Ativar som" : "Silenciar"}>
            <div className="relative">
              <Radio className={cn("h-4 w-4 transition-colors", isRadioActive ? "text-green-500" : "text-muted-foreground")} />
              {isRadioActive && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />}
            </div>
            
            {!isPlaying ? <Play className="h-3 w-3 text-muted-foreground" /> : isRadioActive ? <Volume2 className="h-3 w-3 text-green-500" /> : <VolumeX className="h-3 w-3 text-muted-foreground" />}
            
            <span className={cn("text-xs font-medium transition-colors", isRadioActive ? "text-green-500" : "text-muted-foreground")}>
              {isRadioActive ? "Ao Vivo" : isPlaying ? "Mudo" : selectedStation.name}
            </span>

            {/* Sound wave animation */}
            {isRadioActive && <div className="flex items-end gap-0.5 h-3">
                {[1, 2, 3].map(i => <div key={i} className="w-0.5 bg-green-500 rounded-full animate-sound-wave" style={{
              animationDelay: `${i * 0.15}s`,
              height: "100%"
            }} />)}
              </div>}
          </button>

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

        {/* Reload & Clear Visual Cache */}
        <div className="h-6 w-px bg-border shrink-0" />
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => {
                if ('caches' in window) {
                  caches.keys().then(names => {
                    names.forEach(name => caches.delete(name));
                  });
                }
                const keysToRemove: string[] = [];
                for (let i = 0; i < localStorage.length; i++) {
                  const key = localStorage.key(i);
                  if (key && (key.startsWith('theme') || key.startsWith('sidebar') || key.startsWith('vite-'))) {
                    keysToRemove.push(key);
                  }
                }
                keysToRemove.forEach(k => localStorage.removeItem(k));
                window.location.reload();
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0 min-h-[36px] md:min-h-[auto]"
              aria-label="Recarregar e limpar cache visual"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="text-[10px] font-medium hidden sm:inline">Recarregar</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-card border hidden sm:block">
            <p className="text-xs">Recarregar e limpar cache visual</p>
          </TooltipContent>
        </Tooltip>


        {/* Users Section with Popover */}
        <Popover open={usersPopoverOpen} onOpenChange={setUsersPopoverOpen}>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-1 md:gap-2 text-muted-foreground shrink-0 hover:text-foreground transition-colors min-h-[36px] md:min-h-[auto]">
              <span className="text-[10px] md:text-xs font-medium">Usuários</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start" side="top" sideOffset={8}>
            <div className="p-3 border-b border-border">
              <h4 className="font-semibold text-sm">Todos os Usuários</h4>
              <p className="text-xs text-muted-foreground">
                {onlineCount} online · {offlineCount} offline
              </p>
            </div>
            <ScrollArea className="h-64">
              <div className="p-2 space-y-1">
                {isLoading ? <div className="flex items-center justify-center py-4">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div> : allUsers.length === 0 ? <p className="text-xs text-muted-foreground text-center py-4">
                    Nenhum usuário cadastrado
                  </p> : allUsers.map(user => <button key={user.user_id} onClick={() => {
                if (!user.isCurrentUser) {
                  onUserClick(user);
                  setUsersPopoverOpen(false);
                }
              }} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors", user.isCurrentUser ? "bg-primary/10 cursor-default" : "hover:bg-secondary/80", user.isOnline && !user.isCurrentUser && "bg-green-500/5")}>
                      <div className="relative">
                        <NeonAvatar
                          src={user.avatar_url}
                          name={user.full_name}
                          frameColor={user.frame_color}
                          neonColor={user.neon_color}
                          frameAnimation={user.frame_animation}
                          size="sm"
                          className={cn(user.isCurrentUser && "ring-2 ring-primary")}
                        />
                        <Circle className={cn("absolute -bottom-0.5 -right-0.5 h-3 w-3 fill-current", user.isOnline ? "text-green-500" : "text-muted-foreground/50")} />
                        {user.isAdmin && (
                          <div className="absolute -top-1 -right-1">
                            <VerifiedBadge size="xs" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <div className={cn("flex items-center gap-1", user.isCurrentUser && "text-primary", user.isOnline && !user.isCurrentUser && "text-green-600 dark:text-green-400")}>
                          <p className="text-sm font-medium">
                            {user.full_name}
                            {user.isCurrentUser && <span className="text-xs ml-1">(você)</span>}
                          </p>
                          {user.isAdmin && <VerifiedBadge size="xs" />}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatCargoLabel(user.cargo, true)}
                          {user.isOnline && <span className="ml-2 text-green-500">• Online</span>}
                        </p>
                      </div>
                    </button>)}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>

        

        {/* Online Users Group */}
        <TooltipProvider delayDuration={200}>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] text-green-500 font-medium mr-1 hidden sm:inline">Online</span>
            <div className="flex items-center -space-x-2">
              {allUsers.filter(u => u.isOnline).length === 0 ? <span className="text-xs text-muted-foreground ml-2">—</span> : allUsers.filter(u => u.isOnline).map(user => {
                const lastSeenText = formatLastSeen(user.lastSeen);
                const userIsTyping = isUserTyping(user.user_id);
                return (
                  <Tooltip key={user.user_id}>
                    <TooltipTrigger asChild>
                      <button onClick={() => !user.isCurrentUser && onUserClick(user)} className={cn("relative hover:z-10 transition-transform hover:scale-110 min-w-[28px] min-h-[28px] md:min-w-[32px] md:min-h-[32px]", user.isCurrentUser && "cursor-default")}>
                        <NeonAvatar
                          src={user.avatar_url}
                          name={user.full_name}
                          frameColor={user.frame_color}
                          neonColor={user.neon_color}
                          frameAnimation={user.frame_animation}
                          size="xs"
                          className={cn(
                            "transition-all duration-300",
                            user.isCurrentUser 
                              ? "ring-2 ring-primary/30" 
                              : userIsTyping
                                ? "ring-2 ring-blue-500/40 shadow-[0_0_8px_2px_rgba(59,130,246,0.4)]"
                                : "ring-2 ring-green-500/40 shadow-[0_0_8px_2px_rgba(34,197,94,0.4)]",
                            user.justCameOnline && "animate-online-pulse"
                          )}
                        />
                        {user.isCurrentUser && <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full border border-card" />}
                        {userIsTyping && !user.isCurrentUser && (
                          <span className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center">
                            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                          </span>
                        )}
                        {user.justCameOnline && !user.isCurrentUser && !userIsTyping && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full animate-ping" />
                        )}
                        {user.isAdmin && (
                          <div className="absolute -top-1 -right-1 hidden sm:block">
                            <VerifiedBadge size="xs" />
                          </div>
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-card border hidden sm:block">
                      <p className="font-medium">
                        {user.full_name}
                        {user.isCurrentUser && <span className="text-primary ml-1">(você)</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatCargoLabel(user.cargo, true)}</p>
                      {userIsTyping ? (
                        <p className="text-xs text-blue-500 mt-0.5 flex items-center gap-1">
                          <span className="flex items-center gap-0.5">
                            <span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                          </span>
                          Digitando...
                        </p>
                      ) : user.justCameOnline ? (
                        <p className="text-xs text-green-500 mt-0.5">🟢 Acabou de entrar!</p>
                      ) : lastSeenText && (
                        <p className="text-xs text-green-500/80 mt-0.5">
                          Ativo {lastSeenText}
                        </p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>

          <div className="h-6 w-px bg-border shrink-0" />

          {/* Offline Users Group */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] text-muted-foreground font-medium mr-1 hidden sm:inline">Offline</span>
            <div className="flex items-center -space-x-2">
              {allUsers.filter(u => !u.isOnline).length === 0 ? <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">—</span> : allUsers.filter(u => !u.isOnline).map(user => {
                const lastSeenText = formatLastSeen(user.lastSeen);
                return (
                  <Tooltip key={user.user_id}>
                    <TooltipTrigger asChild>
                      <button onClick={() => onUserClick(user)} className="relative hover:z-10 transition-transform hover:scale-110 min-w-[24px] min-h-[24px] md:min-w-[28px] md:min-h-[28px]">
                        <div className="opacity-60 grayscale">
                          <NeonAvatar
                            src={user.avatar_url}
                            name={user.full_name}
                            frameColor={user.frame_color}
                            neonColor={user.neon_color}
                            frameAnimation={user.frame_animation}
                            size="xs"
                          />
                        </div>
                        {user.isAdmin && (
                          <div className="absolute -top-1 -right-1 opacity-60 hidden sm:block">
                            <VerifiedBadge size="xs" />
                          </div>
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-card border hidden sm:block">
                      <p className="font-medium">{user.full_name}</p>
                      <p className="text-xs text-muted-foreground">{formatCargoLabel(user.cargo, true)}</p>
                      <p className="text-xs text-muted-foreground/70 mt-0.5">
                        {lastSeenText ? `Visto ${lastSeenText}` : "Offline"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        </TooltipProvider>
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