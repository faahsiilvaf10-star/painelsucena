import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";

interface PersistentSidebarProps {
  children: ReactNode;
}

export const PersistentSidebar = ({ children }: PersistentSidebarProps) => {
  const { user } = useAuth();

  // Don't render sidebar wrapper if not authenticated
  if (!user) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        {children}
      </div>
    </SidebarProvider>
  );
};
