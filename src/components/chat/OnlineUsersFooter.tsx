import { useState } from "react";
import { useAllUsers, UserWithStatus } from "@/hooks/useAllUsers";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, Radio, VolumeX, Volume2, Play, ChevronDown, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRadio } from "@/contexts/RadioContext";
import { useSidebar } from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface OnlineUsersFooterProps {
  onUserClick: (user: UserWithStatus) => void;
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

export const OnlineUsersFooter = ({ onUserClick }: OnlineUsersFooterProps) => {
  const { allUsers, onlineCount, offlineCount, isLoading } = useAllUsers();
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [usersPopoverOpen, setUsersPopoverOpen] = useState(false);
  const { state } = useSidebar();
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

  return (
    <div 
      className={cn(
        "fixed bottom-0 right-0 bg-card border-t border-border z-40 transition-[left] duration-200 ease-linear",
        isCollapsedSidebar ? "left-[48px]" : "left-[256px]",
        "max-md:left-0"
      )}
    >
      <div className="flex items-center gap-3 px-4 py-2 overflow-x-auto">
        {/* Radio Player */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={toggleRadio}
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

        <div className="h-6 w-px bg-border shrink-0" />

        {/* Users Section with Popover */}
        <Popover open={usersPopoverOpen} onOpenChange={setUsersPopoverOpen}>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-2 text-muted-foreground shrink-0 hover:text-foreground transition-colors">
              <Users className="h-4 w-4" />
              <span className="text-xs font-medium">Usuários</span>
              <div className="flex items-center gap-1">
                <Badge variant="default" className="text-xs bg-green-500/20 text-green-500 border-green-500/30">
                  {onlineCount}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {offlineCount}
                </Badge>
              </div>
              <ChevronDown className={cn(
                "h-3 w-3 transition-transform",
                usersPopoverOpen && "rotate-180"
              )} />
            </button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-80 p-0" 
            align="start"
            side="top"
            sideOffset={8}
          >
            <div className="p-3 border-b border-border">
              <h4 className="font-semibold text-sm">Todos os Usuários</h4>
              <p className="text-xs text-muted-foreground">
                {onlineCount} online · {offlineCount} offline
              </p>
            </div>
            <ScrollArea className="h-64">
              <div className="p-2 space-y-1">
                {isLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : allUsers.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Nenhum usuário cadastrado
                  </p>
                ) : (
                  allUsers.map((user) => (
                    <button
                      key={user.user_id}
                      onClick={() => {
                        if (!user.isCurrentUser) {
                          onUserClick(user);
                          setUsersPopoverOpen(false);
                        }
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                        user.isCurrentUser 
                          ? "bg-primary/10 cursor-default" 
                          : "hover:bg-secondary/80",
                        user.isOnline && !user.isCurrentUser && "bg-green-500/5"
                      )}
                    >
                      <div className="relative">
                        <Avatar className={cn(
                          "h-8 w-8",
                          user.isCurrentUser && "ring-2 ring-primary"
                        )}>
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                            {getInitials(user.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <Circle 
                          className={cn(
                            "absolute -bottom-0.5 -right-0.5 h-3 w-3 fill-current",
                            user.isOnline 
                              ? "text-green-500" 
                              : "text-muted-foreground/50"
                          )}
                        />
                      </div>
                      <div className="flex-1 text-left">
                        <p className={cn(
                          "text-sm font-medium",
                          user.isCurrentUser && "text-primary",
                          user.isOnline && !user.isCurrentUser && "text-green-600 dark:text-green-400"
                        )}>
                          {user.full_name}
                          {user.isCurrentUser && <span className="text-xs ml-1">(você)</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {cargoLabels[user.cargo] || user.cargo}
                          {user.isOnline && (
                            <span className="ml-2 text-green-500">• Online</span>
                          )}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>

        <div className="h-6 w-px bg-border shrink-0" />

        {/* Online Users Group */}
        <TooltipProvider delayDuration={200}>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] text-green-500 font-medium mr-1">Online</span>
            <div className="flex items-center -space-x-2">
              {allUsers.filter(u => u.isOnline).length === 0 ? (
                <span className="text-xs text-muted-foreground ml-2">—</span>
              ) : (
                allUsers.filter(u => u.isOnline).slice(0, 8).map((user) => (
                  <Tooltip key={user.user_id}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => !user.isCurrentUser && onUserClick(user)}
                        className={cn(
                          "relative hover:z-10 transition-transform hover:scale-110",
                          user.isCurrentUser && "cursor-default"
                        )}
                      >
                        <Avatar className={cn(
                          "h-7 w-7 ring-2 ring-card",
                          user.isCurrentUser 
                            ? "border-2 border-primary ring-primary/30" 
                            : "border-2 border-green-500/50"
                        )}>
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback className={cn(
                            "text-[10px]",
                            user.isCurrentUser 
                              ? "bg-primary text-primary-foreground" 
                              : "bg-green-500/20 text-green-600 dark:text-green-400"
                          )}>
                            {getInitials(user.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        {user.isCurrentUser && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full border border-card" />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-card border">
                      <p className="font-medium">
                        {user.full_name}
                        {user.isCurrentUser && <span className="text-primary ml-1">(você)</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">{cargoLabels[user.cargo] || user.cargo}</p>
                    </TooltipContent>
                  </Tooltip>
                ))
              )}
              {allUsers.filter(u => u.isOnline).length > 8 && (
                <span className="text-[10px] text-green-500 ml-2">+{allUsers.filter(u => u.isOnline).length - 8}</span>
              )}
            </div>
          </div>

          <div className="h-6 w-px bg-border shrink-0" />

          {/* Offline Users Group */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] text-muted-foreground font-medium mr-1">Offline</span>
            <div className="flex items-center -space-x-2">
              {allUsers.filter(u => !u.isOnline).length === 0 ? (
                <span className="text-xs text-muted-foreground ml-2">—</span>
              ) : (
                allUsers.filter(u => !u.isOnline).slice(0, 6).map((user) => (
                  <Tooltip key={user.user_id}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => onUserClick(user)}
                        className="relative hover:z-10 transition-transform hover:scale-110"
                      >
                        <Avatar className="h-7 w-7 border-2 border-muted/50 ring-2 ring-card opacity-60 grayscale">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
                            {getInitials(user.full_name)}
                          </AvatarFallback>
                        </Avatar>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-card border">
                      <p className="font-medium">{user.full_name}</p>
                      <p className="text-xs text-muted-foreground">{cargoLabels[user.cargo] || user.cargo}</p>
                    </TooltipContent>
                  </Tooltip>
                ))
              )}
              {allUsers.filter(u => !u.isOnline).length > 6 && (
                <span className="text-[10px] text-muted-foreground ml-2">+{allUsers.filter(u => !u.isOnline).length - 6}</span>
              )}
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
      `}</style>
    </div>
  );
};