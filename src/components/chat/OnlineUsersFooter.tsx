import { useState } from "react";
import { NewsTicker } from "@/components/footer/NewsTicker";
import { ChevronDown, Play, RefreshCw, Pencil, PencilOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { hardRefreshToLatest } from "@/lib/appRefresh";

import { useSidebar } from "@/components/ui/sidebar";
import { getBrazilNorthMonth } from "@/lib/timezone";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAllUsers } from "@/hooks/useAllUsers";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useEditMode } from "@/contexts/EditModeContext";




const FORBIDDEN_COLORS: Record<number, { name: string; bgClass: string }> = {
  0: { name: "Vermelha", bgClass: "bg-red-500" },
  1: { name: "Azul", bgClass: "bg-blue-500" },
  2: { name: "Amarela", bgClass: "bg-yellow-400" },
  3: { name: "Verde", bgClass: "bg-green-500" },
  4: { name: "Vermelha", bgClass: "bg-red-500" },
  5: { name: "Azul", bgClass: "bg-blue-500" },
  6: { name: "Amarela", bgClass: "bg-yellow-400" },
  7: { name: "Verde", bgClass: "bg-green-500" },
  8: { name: "Vermelha", bgClass: "bg-red-500" },
  9: { name: "Azul", bgClass: "bg-blue-500" },
  10: { name: "Amarela", bgClass: "bg-yellow-400" },
  11: { name: "Verde", bgClass: "bg-green-500" },
};

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

interface OnlineUsersFooterProps {
  onUserClick: (user: any) => void;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export const OnlineUsersFooter = ({ onUserClick, onToggleSidebar, isSidebarOpen }: OnlineUsersFooterProps) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [colorDialogOpen, setColorDialogOpen] = useState(false);
  const [isLoginTransitioning, setIsLoginTransitioning] = useState(
    () => sessionStorage.getItem("loginTransitionInProgress") === "true"
  );
  const { state } = useSidebar();
  const { settings } = useSiteSettings();
  const { allUsers } = useAllUsers();
  const { isEditMode, toggleEditMode, canEdit } = useEditMode();
  
  useEffect(() => {
    const handler = () => {
      setIsLoginTransitioning(sessionStorage.getItem("loginTransitionInProgress") === "true");
    };
    window.addEventListener("login-transition", handler);
    return () => window.removeEventListener("login-transition", handler);
  }, []);

  
  const isAuraTheme = settings?.ui_theme === "aura";


  
  const onlineCount = allUsers.filter(u => u.isOnline && !u.isCurrentUser && !u.cargo?.startsWith("motorista_")).length;

  const currentMonth = getBrazilNorthMonth();
  const isCollapsedSidebar = state === "collapsed";
  const forbiddenColor = FORBIDDEN_COLORS[currentMonth];

  return (
    <div className={cn(
      "fixed bottom-0 right-0 z-40 overflow-hidden transition-[left,background-color] duration-200 ease-linear",
      isMinimized ? "bg-transparent border-t-0" : isAuraTheme ? "bg-black/60 backdrop-blur-xl border-t border-white/10 shadow-2xl" : "bg-card border-t border-border",
      isAuraTheme ? "left-0" : isCollapsedSidebar ? "left-[48px]" : "left-[256px]",
      "max-md:left-0",

      "flex items-center"
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
        <div className="flex w-full min-w-0 items-center gap-1 md:gap-3 px-2 md:px-4 py-1.5 md:py-2 overflow-hidden relative min-h-[36px] md:min-h-[40px]">
          {isAuraTheme && (
            <div className="flex shrink-0 items-center gap-1 relative z-[60]">
              <NotificationBell />
              {canEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleEditMode();
                  }}
                  className={cn(
                    "p-2 rounded-full transition-all group/edit",
                    isEditMode 
                      ? "text-primary bg-primary/20" 
                      : "text-white/50 hover:text-white hover:bg-white/5"
                  )}
                  title={isEditMode ? "Desativar modo edição" : "Ativar modo edição"}
                >
                  {isEditMode ? <PencilOff className="w-4 h-4" /> : <Pencil className="w-4 h-4 group-hover/edit:scale-110 transition-transform" />}
                </button>
              )}
            </div>
          )}

          {/* Link ForMusic removido */}


          <div className="flex-1 min-w-0 overflow-hidden">
            <NewsTicker />
          </div>

          {/* Botão Recarregar Centralizado */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[60]">
            <button
              onClick={async (e) => {
                e.stopPropagation();
                await hardRefreshToLatest({ clearVisualState: true });
              }}
              className={cn(
                "pointer-events-auto flex items-center gap-2 px-4 py-1 rounded-full transition-all shadow-lg border whitespace-nowrap",
                isAuraTheme 
                  ? "bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md" 
                  : "bg-background hover:bg-accent text-foreground border-border"
              )}
              aria-label="Recarregar e limpar cache visual"
            >
              <RefreshCw className="h-4 w-4 animate-[spin_3s_linear_infinite] group-hover:animate-spin" />
              <span className="text-[10px] font-bold tracking-wider uppercase">Recarregar</span>
            </button>
          </div>

          <div className="flex shrink-0 items-center gap-2 relative z-10">

            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleSidebar();
              }}
              className="relative p-1 hover:bg-muted/50 rounded-full transition-all group"
              title={isSidebarOpen ? "Fechar conversas" : "Abrir conversas"}
            >
              <img 
                src="/whatsapp-api-icon.png" 
                className={cn(
                  "w-6 h-6 object-contain animate-bounce cursor-pointer group-hover:scale-110 transition-transform",
                  isSidebarOpen && "animate-none scale-110"
                )} 
                alt="WhatsApp"
              />
              <span className={cn(
                "absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white shadow-sm",
                onlineCount > 0 ? "bg-green-500" : "bg-gray-400"
              )}>
                {onlineCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setColorDialogOpen(true)}
              className="flex shrink-0 items-center gap-1.5 px-2 py-1 rounded-full bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
              title={`Cor proibida do mês: ${forbiddenColor.name} — clique para ver todas`}
            >
              <span className={cn("w-3.5 h-3.5 rounded-full shadow-sm", forbiddenColor.bgClass)} />
              <span
                className={cn(
                  "text-[11px] font-medium whitespace-nowrap hidden md:inline",
                  isAuraTheme ? "text-white/70" : "text-muted-foreground",
                  !isAuraTheme && isCollapsedSidebar && "md:hidden"
                )}
              >

                Cor proibida: {forbiddenColor.name}
              </span>
            </button>
          </div>
        </div>
      )}

      <Dialog open={colorDialogOpen} onOpenChange={setColorDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cores proibidas do ano</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
            {MONTH_NAMES.map((month, idx) => {
              const c = FORBIDDEN_COLORS[idx];
              const isCurrent = idx === currentMonth;
              return (
                <div
                  key={month}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border p-2.5 transition-colors",
                    isCurrent
                      ? "border-primary bg-primary/10"
                      : "border-border bg-muted/30"
                  )}
                >
                  <span className={cn("w-4 h-4 rounded-full shadow-sm shrink-0", c.bgClass)} />
                  <div className="flex flex-col min-w-0">
                    <span className={cn(
                      "text-xs font-semibold",
                      isCurrent && "text-primary"
                    )}>
                      {month}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {c.name}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
