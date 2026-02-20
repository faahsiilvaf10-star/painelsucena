import { ReactNode, useEffect, useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useIsMobile } from "@/hooks/use-mobile";

interface PersistentSidebarProps {
  children: ReactNode;
}

// Driver roles that should have the sidebar hidden
const DRIVER_ROLES = ["motorista_pipa", "motorista_munk"];

export const PersistentSidebar = ({ children }: PersistentSidebarProps) => {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const isMobile = useIsMobile();
  const [justCompletedTransition, setJustCompletedTransition] = useState(false);

  // Check if user has a driver role - hide sidebar for drivers
  const isDriver = profile?.cargo && DRIVER_ROLES.includes(profile.cargo);

  // Check if user has no avatar - block sidebar
  const isAvatarBlocked = user && profile && (!profile.avatar_url || profile.avatar_url.trim().length === 0);

  // Listen for transition completion to trigger fade-in
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

  // Always provide SidebarProvider context, but only render sidebar when authenticated and not a driver
  return (
    <SidebarProvider defaultOpen={isAvatarBlocked ? false : true}>
      <div className="h-screen flex flex-row w-full bg-background overflow-x-clip overflow-y-hidden">
        {user && !isDriver && (
          <div className={`overflow-visible ${justCompletedTransition ? "animate-fade-in" : ""}`}>
            <AppSidebar lockedCollapsed={!!isAvatarBlocked} />
          </div>
        )}
        <div
          className={`flex-1 flex flex-col min-w-0 h-full overflow-hidden ${
            justCompletedTransition ? "animate-fade-in" : ""
          }`}
        >
          {children}
        </div>
      </div>
    </SidebarProvider>
  );
};
