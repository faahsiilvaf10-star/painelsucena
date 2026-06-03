import { ReactNode, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { DockNavigation } from "./DockNavigation";
import { TopNavigation } from "./TopNavigation";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";


interface PersistentSidebarProps {
  children: ReactNode;
}

const DRIVER_ROLES = ["motorista_pipa", "motorista_munk"];

export const PersistentSidebar = ({ children }: PersistentSidebarProps) => {
  const { user, loading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { settings, isLoading: settingsLoading } = useSiteSettings();
  const isMobile = useIsMobile();
  const location = useLocation();
  const [justCompletedTransition, setJustCompletedTransition] = useState(false);

  const isAuthPage = location.pathname === "/auth";
  const isEnvSelectionPage = location.pathname === "/selecao-ambiente";
  const isDriver = profile?.cargo && DRIVER_ROLES.includes(profile.cargo);
  const isAvatarBlocked = user && profile && (!profile.avatar_url || profile.avatar_url.trim().length === 0) && !isDriver;
  
  const uiTheme = settings?.ui_theme || "classic";
  const useDock = user && !isDriver && !isAvatarBlocked && !isEnvSelectionPage && uiTheme === "macos-dock";
  const useAura = user && !isDriver && !isAvatarBlocked && !isEnvSelectionPage && uiTheme === "aura";

  const [isLoginTransitioning, setIsLoginTransitioning] = useState(
    () => sessionStorage.getItem("loginTransitionInProgress") === "true"
  );

  useEffect(() => {
    const handler = () => {
      setIsLoginTransitioning(sessionStorage.getItem("loginTransitionInProgress") === "true");
    };
    window.addEventListener("login-transition", handler);
    return () => window.removeEventListener("login-transition", handler);
  }, []);

  useEffect(() => {
    const primaryColor = settings?.primary_color;
    if (primaryColor) {
      document.documentElement.style.setProperty("--primary", primaryColor);
      document.documentElement.style.setProperty("--ring", primaryColor);
    } else {
      document.documentElement.style.removeProperty("--primary");
      document.documentElement.style.removeProperty("--ring");
    }
    return () => {
      document.documentElement.style.removeProperty("--primary");
      document.documentElement.style.removeProperty("--ring");
    };
  }, [settings?.primary_color]);

  const layoutReady = isAuthPage || (!authLoading && (!user || (!profileLoading && !settingsLoading)));


  useEffect(() => {
    const handler = () => {
      const isActive = sessionStorage.getItem("loginTransitionInProgress") === "true";
      if (!isActive && user) {
        setJustCompletedTransition(true);
        const timeout = setTimeout(() => setJustCompletedTransition(false), 600);
        return () => clearTimeout(timeout);
      }
    };
    window.addEventListener("login-transition", handler);
    return () => window.removeEventListener("login-transition", handler);
  }, [user]);

  if (!layoutReady) {
    return (
      <div className="h-screen w-full grid place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isLoginTransitioning) return null;

  return (
    <SidebarProvider defaultOpen={isAvatarBlocked ? false : !isMobile}>
      <div className={cn(
        "h-screen flex flex-row w-full overflow-x-clip overflow-y-hidden",
        useAura ? "bg-[#1a1814]" : "bg-background"
      )}>

        {user && !isDriver && !useDock && !useAura && !isAuthPage && !isEnvSelectionPage && (
          <div className={`overflow-visible ${justCompletedTransition ? "animate-fade-in" : ""}`}>
            <AppSidebar lockedCollapsed={!!isAvatarBlocked} />
          </div>
        )}

        <div
          className={`flex-1 flex flex-col min-w-0 h-full overflow-hidden ${
            justCompletedTransition ? "animate-fade-in" : ""
          } ${useAura ? "pt-0 !border-none !shadow-none !m-0 !rounded-none after:hidden before:hidden" : ""}`}
        >

          {useAura && <TopNavigation />}
          {children}
        </div>



        {useDock && !isAuthPage && <DockNavigation />}
      </div>
    </SidebarProvider>
  );
};

