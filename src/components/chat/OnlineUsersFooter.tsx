import { useState } from "react";
import { NewsTicker } from "@/components/footer/NewsTicker";
import { ChevronDown, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";

interface OnlineUsersFooterProps {
  onUserClick: (user: any) => void;
}

export const OnlineUsersFooter = ({ onUserClick }: OnlineUsersFooterProps) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const { state } = useSidebar();

  const isCollapsedSidebar = state === "collapsed";

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
          <NewsTicker />
        </div>
      )}
    </div>
  );
};
