import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";

interface PersistentSidebarProps {
  children: ReactNode;
}

export const PersistentSidebar = ({ children }: PersistentSidebarProps) => {
  const { user } = useAuth();

  // Read synchronously to avoid a 1-frame flash right after SIGNED_IN.
  const isTransitioning = sessionStorage.getItem("loginTransitionInProgress") === "true";

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
