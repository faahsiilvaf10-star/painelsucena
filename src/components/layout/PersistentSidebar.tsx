import { ReactNode, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { DockNavigation } from "./DockNavigation";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Loader2 } from "lucide-react";

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
  
  // Use global theme from site_settings
  const uiTheme = settings?.ui_theme || "classic";
  const useDock = user && !isDriver && !isAvatarBlocked && !isEnvSelectionPage && uiTheme === "macos-dock";

  // Apply global theme colors and background settings from site_settings
  useEffect(() => {
    const primaryColor = settings?.primary_color;
    if (primaryColor) {
      document.documentElement.style.setProperty("--primary", primaryColor);
      document.documentElement.style.setProperty("--ring", primaryColor);
    } else {
      document.documentElement.style.removeProperty("--primary");
      document.documentElement.style.removeProperty("--ring");
    }

    if (settings?.global_background_url) {
      document.documentElement.style.setProperty("--bg-opacity", "0.85");
    } else {
      document.documentElement.style.setProperty("--bg-opacity", "1");
    }

    return () => {
      document.documentElement.style.removeProperty("--primary");
      document.documentElement.style.removeProperty("--ring");
      document.documentElement.style.removeProperty("--bg-opacity");
    };
  }, [settings?.primary_color, settings?.global_background_url]);

  // Wait for auth + profile + settings to load before rendering layout
  // Skip the loading gate entirely on the auth page to avoid flashing
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

  return (
    <SidebarProvider defaultOpen={isAvatarBlocked ? false : !isMobile}>
      <div 
        className={`h-screen flex flex-row w-full overflow-x-clip overflow-y-hidden ${
          settings?.global_background_url ? "bg-transparent" : "bg-background"
        }`}
        data-has-global-bg={!!settings?.global_background_url}
      >
        {user && !isDriver && !useDock && !isAuthPage && !isEnvSelectionPage && (
          <div className={`overflow-visible ${justCompletedTransition ? "animate-fade-in" : ""}`}>
            <AppSidebar lockedCollapsed={!!isAvatarBlocked} />
          </div>
        )}
        <div
          className={`flex-1 flex flex-col min-w-0 h-full overflow-hidden relative ${
            justCompletedTransition ? "animate-fade-in" : ""
          }`}
        >
          {settings?.global_background_url && (
            <div 
              className="fixed inset-0 pointer-events-none z-0 bg-center bg-cover bg-no-repeat transition-opacity duration-300"
              style={{ 
                backgroundImage: `url(${settings.global_background_url})`,
                opacity: settings.global_background_opacity ?? 0.1
              }}
            />
          )}
          <div className="relative z-10 flex-1 flex flex-col min-w-0 h-full overflow-hidden">
            <SidebarTrigger className="fixed top-1/2 -translate-y-1/2 left-0 z-[101] md:hidden h-8 w-8 rounded-full bg-sidebar-accent/90 backdrop-blur-sm border border-sidebar-border/50 text-sidebar-foreground/80 shadow-lg p-0 flex items-center justify-center translate-x-1" />
            {children}
          </div>
        </div>
        {useDock && !isAuthPage && <DockNavigation />}
      </div>
    </SidebarProvider>
  );
};
