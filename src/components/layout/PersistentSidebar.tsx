import { ReactNode, useEffect, useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";

interface PersistentSidebarProps {
  children: ReactNode;
}

export const PersistentSidebar = ({ children }: PersistentSidebarProps) => {
  const { user } = useAuth();
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Check if login transition is in progress
  useEffect(() => {
    const checkTransition = () => {
      const transitioning = sessionStorage.getItem("loginTransitionInProgress") === "true";
      setIsTransitioning(transitioning);
    };

    checkTransition();

    // Poll for transition state changes
    const interval = setInterval(checkTransition, 50);
    return () => clearInterval(interval);
  }, []);

  // Hide sidebar and content during transition to prevent flash
  const showContent = user && !isTransitioning;

  // Always provide SidebarProvider context, but only render sidebar when authenticated and not transitioning
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="h-screen flex flex-row w-full bg-background overflow-hidden">
        {showContent && <AppSidebar />}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {children}
        </div>
      </div>
    </SidebarProvider>
  );
};
