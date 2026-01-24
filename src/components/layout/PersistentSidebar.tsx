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
      <div className="min-h-screen flex w-full bg-background">
        {user && <AppSidebar />}
        {children}
      </div>
    </SidebarProvider>
  );
};
