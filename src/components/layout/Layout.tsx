import { ReactNode, useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import ForbiddenColorIndicator from "@/components/ForbiddenColorIndicator";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { OnlineUsersFooter } from "@/components/chat/OnlineUsersFooter";
import { ChatDialog } from "@/components/chat/ChatDialog";
import { OnlineUser } from "@/hooks/useOnlineUsers";
import { useAuth } from "@/hooks/useAuth";
import { Menu } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { user } = useAuth();
  const [selectedUser, setSelectedUser] = useState<OnlineUser | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  const handleUserClick = (onlineUser: OnlineUser) => {
    setSelectedUser(onlineUser);
    setChatOpen(true);
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <SidebarInset>
          {/* Header with notification bell and theme toggle */}
          <header className="flex h-14 items-center justify-between gap-4 border-b bg-background px-4">
            <div className="flex items-center gap-4 md:hidden">
              <SidebarTrigger>
                <Menu className="h-5 w-5" />
              </SidebarTrigger>
              <span className="font-semibold">Painel Sucena</span>
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <NotificationBell />
            </div>
          </header>
          <main className="flex-1 pb-14">
            {children}
          </main>
          <ForbiddenColorIndicator />
          
          {/* Online Users Footer */}
          {user && <OnlineUsersFooter onUserClick={handleUserClick} />}
          
          {/* Chat Dialog */}
          <ChatDialog
            open={chatOpen}
            onOpenChange={setChatOpen}
            selectedUser={selectedUser}
          />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Layout;
