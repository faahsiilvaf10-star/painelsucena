import { ReactNode, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";

interface PersistentSidebarProps {
  children: ReactNode;
}

// Routes where sidebar should be hidden
const SIDEBAR_HIDDEN_ROUTES = ['/painel-motorista'];

export const PersistentSidebar = ({ children }: PersistentSidebarProps) => {
  const { user } = useAuth();
  const location = useLocation();
  const [justCompletedTransition, setJustCompletedTransition] = useState(false);

  // Check if sidebar should be hidden on current route
  const shouldHideSidebar = SIDEBAR_HIDDEN_ROUTES.includes(location.pathname);

  // Listen for transition completion to trigger fade-in
  useEffect(() => {
    const handler = () => {
      // Check if transition just ended (flag was cleared)
      const isActive = sessionStorage.getItem("loginTransitionInProgress") === "true";
      if (!isActive && user) {
        setJustCompletedTransition(true);
        // Remove the animation class after it plays
        const timeout = setTimeout(() => setJustCompletedTransition(false), 600);
        return () => clearTimeout(timeout);
      }
    };

    window.addEventListener("login-transition", handler);
    return () => window.removeEventListener("login-transition", handler);
  }, [user]);

  // Always provide SidebarProvider context, but only render sidebar when authenticated and not hidden
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="h-screen flex flex-row w-full bg-background overflow-hidden">
        {user && !shouldHideSidebar && (
          <div className={justCompletedTransition ? "animate-fade-in" : ""}>
            <AppSidebar />
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
