import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";

interface PersistentSidebarProps {
  children: ReactNode;
}

export const PersistentSidebar = ({ children }: PersistentSidebarProps) => {
  const { user } = useAuth();

  // Always provide SidebarProvider context, but only render sidebar when authenticated
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="h-screen flex flex-row w-full bg-background overflow-hidden">
        {user && <AppSidebar />}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {children}
        </div>
      </div>
    </SidebarProvider>
  );
};
