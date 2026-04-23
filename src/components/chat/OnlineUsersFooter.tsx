import { useState } from "react";
import { NewsTicker } from "@/components/footer/NewsTicker";
import { ChevronDown, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";
import { getBrazilNorthMonth } from "@/lib/timezone";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
}

export const OnlineUsersFooter = ({ onUserClick }: OnlineUsersFooterProps) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [colorDialogOpen, setColorDialogOpen] = useState(false);
  const { state } = useSidebar();

  const currentMonth = getBrazilNorthMonth();
  const isCollapsedSidebar = state === "collapsed";
  const forbiddenColor = FORBIDDEN_COLORS[currentMonth];

  return (
    <div className={cn(
      "fixed bottom-0 right-0 z-40 overflow-hidden transition-[left] duration-200 ease-linear",
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
        <div className="flex w-full min-w-0 items-center gap-1 md:gap-3 px-2 md:px-4 py-1.5 md:py-2 overflow-hidden">
          <a
            href="https://formusic.lovable.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex shrink-0 items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
            aria-label="Abrir ForMusic"
            title="Abrir ForMusic"
          >
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground">
              <Play className="h-2.5 w-2.5 fill-current" />
            </span>
            <span className="text-[11px] font-medium whitespace-nowrap hidden sm:inline">
              Clique no play para ouvir na plataforma ForMusic
            </span>
          </a>
          <div className="flex-1 min-w-0 overflow-hidden">
            <NewsTicker />
          </div>
          <div
            className="flex shrink-0 items-center gap-1.5 px-2 py-1 rounded-full bg-muted/50"
            title={`Cor proibida do mês: ${forbiddenColor.name}`}
          >
            <span className={cn("w-3.5 h-3.5 rounded-full shadow-sm", forbiddenColor.bgClass)} />
            <span
              className={cn(
                "text-[11px] font-medium whitespace-nowrap text-muted-foreground hidden md:inline",
                isCollapsedSidebar && "md:hidden"
              )}
            >
              Cor proibida: {forbiddenColor.name}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
