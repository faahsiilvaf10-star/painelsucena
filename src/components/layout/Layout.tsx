import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import ForbiddenColorIndicator from "@/components/ForbiddenColorIndicator";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { PersonalizationButton } from "@/components/personalization/PersonalizationButton";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { Menu } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { preferences } = useUserPreferences();

  return (
    <SidebarProvider defaultOpen={true}>
      <div 
        className="min-h-screen flex w-full"
        style={{ 
          backgroundColor: preferences.page_background_color 
        }}
      >
        <AppSidebar userPreferences={preferences} />
        <SidebarInset>
          {/* Header with notification bell and personalization */}
          <header className="flex h-14 items-center justify-between gap-4 border-b bg-background px-4">
            <div className="flex items-center gap-4 md:hidden">
              <SidebarTrigger>
                <Menu className="h-5 w-5" />
              </SidebarTrigger>
              <span className="font-semibold">Painel Sucena</span>
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-1">
              <PersonalizationButton />
              <NotificationBell />
            </div>
          </header>
          <main className="flex-1">
            {children}
          </main>
          <ForbiddenColorIndicator />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Layout;
